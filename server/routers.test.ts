import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

type CookieCall = { name: string; options: Record<string, unknown> };

function createAuthContext(user?: AuthenticatedUser): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: user || createMockUser(),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ============================================================
// Auth 測試
// ============================================================
describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const user = createMockUser();
    const { ctx } = createAuthContext(user);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-open-id");
    expect(result?.name).toBe("Test User");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ============================================================
// Dashboard 測試
// ============================================================
describe("dashboard.summary", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.summary()).rejects.toThrow();
  });
});

// ============================================================
// KYC 測試
// ============================================================
describe("kyc", () => {
  it("getStatus requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.kyc.getStatus()).rejects.toThrow();
  });

  it("submit validates required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // Missing required fields should fail validation
    await expect(
      caller.kyc.submit({
        firstName: "",
        lastName: "Doe",
        dob: "1990-01-01",
        nationality: "TW",
      })
    ).rejects.toThrow();
  });

  it("submit validates dob format", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.kyc.submit({
        firstName: "John",
        lastName: "Doe",
        dob: "invalid-date",
        nationality: "TW",
      })
    ).rejects.toThrow();
  });
});

// ============================================================
// Cards 測試
// ============================================================
describe("cards", () => {
  it("list requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cards.list()).rejects.toThrow();
  });

  it("issue validates required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.cards.issue({
        cardTypeId: "",
        amount: 0,
        accountId: "default",
      })
    ).rejects.toThrow();
  });

  it("freeze requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cards.freeze({ cardId: 1 })).rejects.toThrow();
  });

  it("unfreeze requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.cards.unfreeze({ cardId: 1 })).rejects.toThrow();
  });
});

// ============================================================
// Transactions 測試
// ============================================================
describe("transactions", () => {
  it("list requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.transactions.list({ page: 1, pageSize: 20 })).rejects.toThrow();
  });

  it("list validates pagination params", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.transactions.list({ page: 0, pageSize: 20 })
    ).rejects.toThrow();
  });
});

// ============================================================
// ATM 測試
// ============================================================
describe("atm", () => {
  it("list requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.atm.list({ page: 1, pageSize: 20 })).rejects.toThrow();
  });

  it("requestWithdrawal requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.atm.requestWithdrawal({ cardId: 1, amount: 100 })
    ).rejects.toThrow();
  });

  it("requestWithdrawal validates minimum amount", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.atm.requestWithdrawal({ cardId: 1, amount: 0 })
    ).rejects.toThrow();
  });
});

// ============================================================
// Wallet 測試
// ============================================================
describe("wallet", () => {
  it("getDepositAddress requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.wallet.getDepositAddress({ amount: 100, chain: "TRC20" })
    ).rejects.toThrow();
  });

  it("getTransactions requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.wallet.getTransactions({ page: 1, pageSize: 20 })
    ).rejects.toThrow();
  });
});

// ============================================================
// 3DS 測試
// ============================================================
describe("threeds", () => {
  it("getLatest requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.threeds.getLatest({ cardId: 1 })).rejects.toThrow();
  });
});
