import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";

export const adminRouter = router({
  // KYC 審核管理
  kyc: router({
    list: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getAllKycRecords(input.status, input.page, input.pageSize);
      }),

    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getKycRecordById(input.id);
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        await db.approveKyc(input.id);
        return { success: true, message: "KYC 已批准" };
      }),

    reject: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        await db.rejectKyc(input.id, input.reason);
        return { success: true, message: "KYC 已拒絕" };
      }),

    // 批量批准 KYC 申請
    batchApprove: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        let successCount = 0;
        let failureCount = 0;
        for (const id of input.ids) {
          try {
            await db.approveKyc(id);
            successCount++;
          } catch (error) {
            failureCount++;
          }
        }
        return {
          success: true,
          message: `已批准 ${successCount} 個申請${failureCount > 0 ? `，失敗 ${failureCount} 個` : ""}`,
          successCount,
          failureCount,
        };
      }),

    // 批量拒絕 KYC 申請
    batchReject: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        let successCount = 0;
        let failureCount = 0;
        for (const id of input.ids) {
          try {
            await db.rejectKyc(id, input.reason);
            successCount++;
          } catch (error) {
            failureCount++;
          }
        }
        return {
          success: true,
          message: `已拒絕 ${successCount} 個申請${failureCount > 0 ? `，失敗 ${failureCount} 個` : ""}`,
          successCount,
          failureCount,
        };
      }),
  }),

  // 用戶管理
  users: router({
    list: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getAllUsers(input.page, input.pageSize);
      }),

    getDetail: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        const user = await db.getUserById(input.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "用戶不存在" });
        return user;
      }),

    getKycHistory: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getUserKycHistory(input.userId);
      }),
  }),

  // 審核日誌與統計
  auditLogs: router({
    list: protectedProcedure
      .input(z.object({
        kycId: z.number().optional(),
        operatorId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getKycAuditLogs(input.kycId, input.operatorId, input.page, input.pageSize);
      }),

    statistics: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getKycStatistics();
      }),

    reviewerPerformance: protectedProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "只有管理員可以訪問" });
        return db.getReviewerPerformance(input.page, input.pageSize);
      }),
  }),

  // 文件上傳
  files: router({
    uploadKycDocument: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileData: z.string(), // base64 編碼的文件數據
        documentType: z.enum(["id_front", "id_back", "selfie"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "未登入" });
        
        try {
          // 將 base64 轉換為 Buffer
          const buffer = Buffer.from(input.fileData, "base64");
          
          // 生成唯一的文件名
          const timestamp = Date.now();
          const fileKey = `kyc/${ctx.user.id}/${input.documentType}-${timestamp}-${input.fileName}`;
          
          // 上傳到 S3
          const { url } = await storagePut(fileKey, buffer, "image/jpeg");
          
          return {
            success: true,
            url,
            fileKey,
            message: "文件上傳成功",
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "文件上傳失敗",
          });
        }
      }),
  }),
});
