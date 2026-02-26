import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AdminUser = NonNullable<TrpcContext["user"]> & { role: "admin" };

function createAdminContext(): { ctx: TrpcContext; adminUser: AdminUser } {
  const adminUser: AdminUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user: adminUser,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx, adminUser };
}

function createUserContext(): { ctx: TrpcContext } {
  const user = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Admin Router", () => {
  describe("KYC Management", () => {
    it("should allow admin to list KYC records", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.kyc.list({
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(result.records).toBeDefined();
      expect(Array.isArray(result.records)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should deny regular users from accessing KYC list", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.kyc.list({
          page: 1,
          pageSize: 20,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
        expect(error.message).toContain("只有管理員");
      }
    });

    it("should allow admin to filter KYC by status", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.kyc.list({
        status: "pending",
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(result.records).toBeDefined();
    });

    it("should allow admin to approve KYC", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // 假設 ID 1 是有效的 KYC 記錄
      const result = await caller.admin.kyc.approve({ id: 1 });

      expect(result.success).toBe(true);
      expect(result.message).toContain("已批准");
    });

    it("should allow admin to reject KYC with reason", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.kyc.reject({
        id: 1,
        reason: "文件不清楚",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("已拒絕");
    });
  });

  describe("User Management", () => {
    it("should allow admin to list users", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.list({
        page: 1,
        pageSize: 20,
      });

      expect(result).toBeDefined();
      expect(result.records).toBeDefined();
      expect(Array.isArray(result.records)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should deny regular users from accessing user list", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.users.list({
          page: 1,
          pageSize: 20,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
        expect(error.message).toContain("只有管理員");
      }
    });

    it("should allow admin to get user details", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // 假設 ID 1 是有效的用戶
      const result = await caller.admin.users.getDetail({ id: 1 });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should allow admin to get user KYC history", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.users.getKycHistory({ userId: 1 });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Permission Control", () => {
    it("should prevent non-admin users from accessing admin routes", async () => {
      const { ctx } = createUserContext();
      const caller = appRouter.createCaller(ctx);

      const routes = [
        () => caller.admin.kyc.list({ page: 1, pageSize: 20 }),
        () => caller.admin.users.list({ page: 1, pageSize: 20 }),
      ];

      for (const route of routes) {
        try {
          await route();
          expect.fail("Should have thrown FORBIDDEN error");
        } catch (error: any) {
          expect(error.code).toBe("FORBIDDEN");
        }
      }
    });
  });
});
