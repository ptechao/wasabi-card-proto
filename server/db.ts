import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  kycRecords, InsertKycRecord, KycRecord,
  virtualCards, InsertVirtualCard, VirtualCard,
  transactions, InsertTransaction, Transaction,
  webhookEvents, InsertWebhookEvent,
  threeDsVerifications, InsertThreeDsVerification,
  atmWithdrawals, InsertAtmWithdrawal, AtmWithdrawal,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================
// User helpers
// ============================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// KYC helpers
// ============================================================
export async function createKycRecord(data: InsertKycRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(kycRecords).values(data);
  const result = await db.select().from(kycRecords).where(eq(kycRecords.merchantOrderNo, data.merchantOrderNo!)).limit(1);
  return result[0];
}

export async function getKycByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(kycRecords).where(eq(kycRecords.userId, userId)).orderBy(desc(kycRecords.createdAt)).limit(1);
  return result[0] || null;
}

export async function updateKycStatus(wasabiHolderId: string, status: "pending" | "submitted" | "approved" | "rejected", rejectReason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kycRecords).set({ status, rejectReason: rejectReason || null }).where(eq(kycRecords.wasabiHolderId, wasabiHolderId));
}

export async function updateKycHolderId(merchantOrderNo: string, holderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kycRecords).set({ wasabiHolderId: holderId, status: "submitted" }).where(eq(kycRecords.merchantOrderNo, merchantOrderNo));
}

export async function updateKycStatusByOrderNo(merchantOrderNo: string, status: "pending" | "submitted" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(kycRecords).set({ status }).where(eq(kycRecords.merchantOrderNo, merchantOrderNo));
}

// ============================================================
// Virtual Card helpers
// ============================================================
export async function createVirtualCard(data: InsertVirtualCard) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(virtualCards).values(data);
  const result = await db.select().from(virtualCards).where(eq(virtualCards.merchantOrderNo, data.merchantOrderNo!)).limit(1);
  return result[0];
}

export async function getCardsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(virtualCards).where(eq(virtualCards.userId, userId)).orderBy(desc(virtualCards.createdAt));
}

export async function getCardById(cardId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(virtualCards).where(and(eq(virtualCards.id, cardId), eq(virtualCards.userId, userId))).limit(1);
  return result[0] || null;
}

export async function updateCardStatus(cardId: number, status: "pending" | "active" | "frozen" | "cancelled") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(virtualCards).set({ status }).where(eq(virtualCards.id, cardId));
}

export async function updateCardByWasabiNo(wasabiCardNo: string, data: Partial<InsertVirtualCard>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(virtualCards).set(data).where(eq(virtualCards.wasabiCardNo, wasabiCardNo));
}

export async function updateCardBalance(cardId: number, balance: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(virtualCards).set({ availableBalance: balance }).where(eq(virtualCards.id, cardId));
}

export async function updateCardByMerchantOrderNo(merchantOrderNo: string, data: Partial<InsertVirtualCard>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(virtualCards).set(data).where(eq(virtualCards.merchantOrderNo, merchantOrderNo));
}

// ============================================================
// Transaction helpers
// ============================================================
export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(transactions).values(data);
}

export async function getTransactionsByCardId(cardId: number, page: number = 1, pageSize: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const offset = (page - 1) * pageSize;
  const records = await db.select().from(transactions).where(eq(transactions.cardId, cardId)).orderBy(desc(transactions.createdAt)).limit(pageSize).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.cardId, cardId));
  return { records, total: countResult[0]?.count || 0 };
}

export async function getTransactionsByUserId(userId: number, page: number = 1, pageSize: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const offset = (page - 1) * pageSize;
  const records = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(pageSize).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.userId, userId));
  return { records, total: countResult[0]?.count || 0 };
}

// ============================================================
// Webhook Event helpers
// ============================================================
export async function createWebhookEvent(data: InsertWebhookEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(webhookEvents).values(data);
}

export async function updateWebhookEventStatus(id: number, status: "received" | "processed" | "failed", errorMessage?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(webhookEvents).set({ status, errorMessage: errorMessage || null }).where(eq(webhookEvents.id, id));
}

// ============================================================
// 3DS Verification helpers
// ============================================================
export async function create3dsVerification(data: InsertThreeDsVerification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(threeDsVerifications).values(data);
}

export async function getLatest3dsVerification(cardNo: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const result = await db.select().from(threeDsVerifications)
    .where(and(eq(threeDsVerifications.cardNo, cardNo), eq(threeDsVerifications.isRead, 0), gte(threeDsVerifications.expiresAt, now)))
    .orderBy(desc(threeDsVerifications.createdAt)).limit(1);
  if (result[0]) {
    await db.update(threeDsVerifications).set({ isRead: 1 }).where(eq(threeDsVerifications.id, result[0].id));
  }
  return result[0] || null;
}

// ============================================================
// ATM Withdrawal helpers
// ============================================================
export async function createAtmWithdrawal(data: InsertAtmWithdrawal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(atmWithdrawals).values(data);
  const result = await db.select().from(atmWithdrawals).where(eq(atmWithdrawals.merchantOrderNo, data.merchantOrderNo!)).limit(1);
  return result[0];
}

export async function getAtmWithdrawalsByUserId(userId: number, page: number = 1, pageSize: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const offset = (page - 1) * pageSize;
  const records = await db.select().from(atmWithdrawals).where(eq(atmWithdrawals.userId, userId)).orderBy(desc(atmWithdrawals.createdAt)).limit(pageSize).offset(offset);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(atmWithdrawals).where(eq(atmWithdrawals.userId, userId));
  return { records, total: countResult[0]?.count || 0 };
}

export async function updateAtmWithdrawalStatus(id: number, status: "pending" | "processing" | "completed" | "failed", activationCode?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Partial<InsertAtmWithdrawal> = { status };
  if (activationCode) updateData.activationCode = activationCode;
  await db.update(atmWithdrawals).set(updateData).where(eq(atmWithdrawals.id, id));
}

// ============================================================
// Dashboard summary helpers
// ============================================================
export async function getUserDashboardSummary(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cards = await db.select().from(virtualCards).where(eq(virtualCards.userId, userId));
  const kyc = await getKycByUserId(userId);
  const recentTxResult = await db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(5);

  const totalBalance = cards.reduce((sum, c) => sum + parseFloat(c.availableBalance || "0"), 0);
  const activeCards = cards.filter(c => c.status === "active").length;
  const frozenCards = cards.filter(c => c.status === "frozen").length;

  return {
    kycStatus: kyc?.status || "none",
    totalBalance: totalBalance.toFixed(2),
    totalCards: cards.length,
    activeCards,
    frozenCards,
    recentTransactions: recentTxResult,
  };
}
