import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as wasabi from "./wasabiClient";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    registerWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        firstName: z.string().min(1),
        lastName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Mock] Email registration: ${input.email}`);
        return {
          success: true,
          message: "Registration successful! Please login with Manus OAuth",
          email: input.email,
        };
      }),
  }),

  // ============================================================
  // Dashboard
  // ============================================================
  dashboard: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserDashboardSummary(ctx.user.id);
    }),
    merchantBalance: protectedProcedure.query(async () => {
      try {
        const accounts = await wasabi.getAccountList();
        return { accounts: accounts?.records || [] };
      } catch (e) {
        return { accounts: [], error: (e as Error).message };
      }
    }),
  }),

  // ============================================================
  // KYC 管理
  // ============================================================
  kyc: router({
    getStatus: protectedProcedure.query(async ({ ctx }) => {
      return db.getKycByUserId(ctx.user.id);
    }),

    submit: protectedProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        nationality: z.string().min(2).max(8),
        mobileAreaCode: z.string().optional(),
        mobilePhone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postalCode: z.string().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 檢查是否已有 KYC 記錄
        const existing = await db.getKycByUserId(ctx.user.id);
        if (existing && (existing.status === "approved" || existing.status === "submitted")) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "您已有進行中或已通過的 KYC 申請" });
        }

        const merchantOrderNo = wasabi.generateMerchantOrderNo("KYC");

        // 先存入本地資料庫
        const kycRecord = await db.createKycRecord({
          userId: ctx.user.id,
          merchantOrderNo,
          firstName: input.firstName,
          lastName: input.lastName,
          dob: input.dob,
          nationality: input.nationality,
          mobileAreaCode: input.mobileAreaCode,
          mobilePhone: input.mobilePhone,
          email: input.email || ctx.user.email || undefined,
          address: input.address,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          idType: input.idType,
          idNumber: input.idNumber,
          status: "pending",
        });

        // 呼叫 WasabiCard API 創建持卡人
        try {
          const result = await wasabi.createCardHolder({
            merchantOrderNo,
            firstName: input.firstName,
            lastName: input.lastName,
            dob: input.dob,
            nationality: input.nationality,
            mobileAreaCode: input.mobileAreaCode,
            mobilePhoneNumber: input.mobilePhone,
            email: input.email || ctx.user.email || undefined,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            idType: input.idType,
            idNumber: input.idNumber,
          });

          // 更新本地記錄：設定 holderId 與狀態
          if (result?.holderId) {
            await db.updateKycHolderId(merchantOrderNo, String(result.holderId));
            // Mock 模式下 API 直接返回 approved，同步更新本地狀態
            if (result.status === "approved") {
              await db.updateKycStatusByOrderNo(merchantOrderNo, "approved");
            }
          }

          return { success: true, kycRecord, wasabiResult: result };
        } catch (e) {
          return { success: false, kycRecord, error: (e as Error).message };
        }
      }),
  }),

  // ============================================================
  // 卡片管理
  // ============================================================
  cards: router({
    getTypes: protectedProcedure.query(async () => {
      try {
        const types = await wasabi.getCardTypes();
        return { types: types?.records || types || [] };
      } catch (e) {
        return { types: [], error: (e as Error).message };
      }
    }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getCardsByUserId(ctx.user.id);
    }),

    issue: protectedProcedure
      .input(z.object({
        cardTypeId: z.string().min(1),
        amount: z.number().min(0),
        accountId: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // 檢查 KYC 狀態
        const kyc = await db.getKycByUserId(ctx.user.id);
        if (!kyc || kyc.status !== "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "請先完成 KYC 認證" });
        }
        if (!kyc.wasabiHolderId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "KYC 持卡人 ID 不存在" });
        }

        const merchantOrderNo = wasabi.generateMerchantOrderNo("CARD");

        // 先建立本地記錄
        const card = await db.createVirtualCard({
          userId: ctx.user.id,
          merchantOrderNo,
          cardTypeId: input.cardTypeId,
          holderId: kyc.wasabiHolderId,
          status: "pending",
        });

        // 呼叫 WasabiCard API 開卡
        try {
          const result = await wasabi.createCard({
            merchantOrderNo,
            cardTypeId: input.cardTypeId,
            amount: input.amount,
            accountId: input.accountId,
            holderId: kyc.wasabiHolderId,
          });

          if (result?.cardNo) {
            // 更新本地卡片資訊
            await db.updateCardByMerchantOrderNo(merchantOrderNo, {
              wasabiCardNo: result.cardNo,
              cardLast4: result.cardNo.slice(-4),
              cardBin: result.bankCardBin || result.cardNo.substring(0, 4),
              status: "active",
              availableBalance: String(input.amount),
            });
          }

          // 記錄開卡交易
          if (card) {
            await db.createTransaction({
              cardId: card.id,
              userId: ctx.user.id,
              wasabiTxId: result?.orderNo || null,
              merchantOrderNo,
              type: "create",
              amount: String(input.amount),
              currency: "USD",
              status: "success",
              description: `開卡成功 (BIN: ${result?.bankCardBin || "-"})`,
            });
          }

          return { success: true, card, wasabiResult: result };
        } catch (e) {
          return { success: false, card, error: (e as Error).message };
        }
      }),

    getBalance: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
        if (!card.wasabiCardNo) return { balance: card.availableBalance || "0.00" };

        try {
          const result = await wasabi.getCardBalance(card.wasabiCardNo);
          const balance = result?.availableBalance || "0.00";
          await db.updateCardBalance(card.id, String(balance));
          return { balance: String(balance) };
        } catch (e) {
          return { balance: card.availableBalance || "0.00", error: (e as Error).message };
        }
      }),

    freeze: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
        if (!card.wasabiCardNo) throw new TRPCError({ code: "BAD_REQUEST", message: "卡片尚未激活" });
        if (card.status === "frozen") throw new TRPCError({ code: "BAD_REQUEST", message: "卡片已凍結" });

        try {
          await wasabi.freezeCard(card.wasabiCardNo);
          await db.updateCardStatus(card.id, "frozen");
          return { success: true };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),

    unfreeze: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
        if (!card.wasabiCardNo) throw new TRPCError({ code: "BAD_REQUEST", message: "卡片尚未激活" });
        if (card.status !== "frozen") throw new TRPCError({ code: "BAD_REQUEST", message: "卡片未處於凍結狀態" });

        try {
          await wasabi.unfreezeCard(card.wasabiCardNo);
          await db.updateCardStatus(card.id, "active");
          return { success: true };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),

    recharge: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        amount: z.number().min(1),
        accountId: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
        if (!card.wasabiCardNo) throw new TRPCError({ code: "BAD_REQUEST", message: "卡片尚未激活" });

        const merchantOrderNo = wasabi.generateMerchantOrderNo("RECHARGE");

        try {
          const result = await wasabi.depositCard({
            merchantOrderNo,
            cardNo: card.wasabiCardNo,
            amount: input.amount,
            accountId: input.accountId,
          });

          // 更新卡片餘額
          const currentBalance = parseFloat(card.availableBalance || "0");
          const newBalance = currentBalance + input.amount;
          await db.updateCardBalance(card.id, newBalance.toFixed(2));

          // 記錄交易
          await db.createTransaction({
            cardId: card.id,
            userId: ctx.user.id,
            wasabiTxId: result?.orderNo || null,
            merchantOrderNo,
            type: "deposit",
            amount: String(input.amount),
            fee: result?.fee || "0.00",
            currency: "USD",
            status: "success",
            description: "卡片充值",
          });

          return { success: true, wasabiResult: result };
        } catch (e) {
          await db.createTransaction({
            cardId: card.id,
            userId: ctx.user.id,
            merchantOrderNo,
            type: "deposit",
            amount: String(input.amount),
            currency: "USD",
            status: "failed",
            description: `充值失敗: ${(e as Error).message}`,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),

    getSensitiveInfo: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
        if (!card.wasabiCardNo) throw new TRPCError({ code: "BAD_REQUEST", message: "卡片尚未激活" });

        try {
          const info = await wasabi.getCardSensitiveInfo(card.wasabiCardNo);
          return info;
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),
  }),

  // ============================================================
  // 交易記錄
  // ============================================================
  transactions: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        cardId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (input.cardId) {
          const card = await db.getCardById(input.cardId, ctx.user.id);
          if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在" });
          return db.getTransactionsByCardId(input.cardId, input.page, input.pageSize);
        }
        return db.getTransactionsByUserId(ctx.user.id, input.page, input.pageSize);
      }),

    syncFromWasabi: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card || !card.wasabiCardNo) throw new TRPCError({ code: "NOT_FOUND", message: "卡片不存在或未激活" });

        try {
          const result = await wasabi.getCardTransactions({ cardNo: card.wasabiCardNo, page: 1, pageSize: 50 });
          return { success: true, transactions: result?.records || [] };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      }),
  }),

  // ============================================================
  // 錢包管理
  // ============================================================
  wallet: router({
    getDepositAddress: protectedProcedure
      .input(z.object({
        amount: z.number().min(1),
        chain: z.string().default("TRC20"),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await wasabi.getWalletDepositAddress({
            amount: input.amount,
            chain: input.chain,
          });
          return { success: true, ...result };
        } catch (e) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
        }
      }),

    getTransactions: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ input }) => {
        try {
          const result = await wasabi.getWalletTransactions({
            page: input.page,
            pageSize: input.pageSize,
          });
          return { success: true, ...result };
        } catch (e) {
          return { success: false, records: [], error: (e as Error).message };
        }
      }),
  }),

  // ============================================================
  // ATM 提領管理
  // ============================================================
  atm: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        return db.getAtmWithdrawalsByUserId(ctx.user.id, input.page, input.pageSize);
      }),
  }),

  // ============================================================
  // 3DS 驗證碼
  // ============================================================
  threeds: router({
    getLatest: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ ctx, input }) => {
        const card = await db.getCardById(input.cardId, ctx.user.id);
        if (!card || !card.wasabiCardNo) return null;
        return db.getLatest3dsVerification(card.wasabiCardNo);
      }),
  }),

  i18n: router({
    getLanguages: publicProcedure.query(() => {
      return {
        languages: [
          { code: "zh-TW", name: "繁體中文" },
          { code: "zh-CN", name: "簡體中文" },
          { code: "en", name: "English" },
          { code: "ja", name: "日本語" },
        ],
      };
    }),
  }),

  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
