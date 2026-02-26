import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

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
});
