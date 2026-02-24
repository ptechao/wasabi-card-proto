import { bigint, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * KYC 資料表 - 儲存用戶的 KYC 申請資料與審核狀態
 */
export const kycRecords = mysqlTable("kyc_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** WasabiCard 返回的持卡人 ID */
  wasabiHolderId: varchar("wasabiHolderId", { length: 64 }),
  /** 商戶訂單號 */
  merchantOrderNo: varchar("merchantOrderNo", { length: 128 }).unique(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  /** 出生日期 YYYY-MM-DD */
  dob: varchar("dob", { length: 10 }).notNull(),
  nationality: varchar("nationality", { length: 8 }).notNull(),
  /** 手機區號 */
  mobileAreaCode: varchar("mobileAreaCode", { length: 8 }),
  mobilePhone: varchar("mobilePhone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 128 }),
  postalCode: varchar("postalCode", { length: 32 }),
  /** 證件類型 */
  idType: varchar("idType", { length: 32 }),
  /** 證件號碼 */
  idNumber: varchar("idNumber", { length: 128 }),
  /** 證件正面照片 URL */
  idFrontUrl: text("idFrontUrl"),
  /** 證件背面照片 URL */
  idBackUrl: text("idBackUrl"),
  /** 自拍照 URL */
  selfieUrl: text("selfieUrl"),
  /** KYC 狀態: pending, submitted, approved, rejected */
  status: mysqlEnum("status", ["pending", "submitted", "approved", "rejected"]).default("pending").notNull(),
  /** 拒絕原因 */
  rejectReason: text("rejectReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KycRecord = typeof kycRecords.$inferSelect;
export type InsertKycRecord = typeof kycRecords.$inferInsert;

/**
 * 虛擬卡片表 - 儲存用戶的虛擬卡資訊
 */
export const virtualCards = mysqlTable("virtual_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** WasabiCard 卡號 */
  wasabiCardNo: varchar("wasabiCardNo", { length: 64 }),
  /** 商戶訂單號 */
  merchantOrderNo: varchar("merchantOrderNo", { length: 128 }).unique(),
  /** 卡號後四位 */
  cardLast4: varchar("cardLast4", { length: 4 }),
  /** 卡片 BIN */
  cardBin: varchar("cardBin", { length: 8 }),
  /** 卡片類型 ID */
  cardTypeId: varchar("cardTypeId", { length: 64 }),
  /** 卡片類型名稱 */
  cardTypeName: varchar("cardTypeName", { length: 128 }),
  /** 持卡人 ID */
  holderId: varchar("holderId", { length: 64 }),
  /** 卡片狀態: pending, active, frozen, cancelled */
  status: mysqlEnum("status", ["pending", "active", "frozen", "cancelled"]).default("pending").notNull(),
  /** 卡片可用餘額 (USD) */
  availableBalance: decimal("availableBalance", { precision: 18, scale: 2 }).default("0.00"),
  /** 卡片貨幣 */
  currency: varchar("currency", { length: 8 }).default("USD"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VirtualCard = typeof virtualCards.$inferSelect;
export type InsertVirtualCard = typeof virtualCards.$inferInsert;

/**
 * 交易記錄表 - 儲存卡片的所有交易記錄
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  cardId: int("cardId").notNull(),
  userId: int("userId").notNull(),
  /** WasabiCard 交易 ID / 訂單號 */
  wasabiTxId: varchar("wasabiTxId", { length: 128 }),
  /** 商戶訂單號 */
  merchantOrderNo: varchar("merchantOrderNo", { length: 128 }),
  /** 交易類型: deposit, withdrawal, purchase, refund, fee */
  type: mysqlEnum("type", ["deposit", "withdrawal", "purchase", "refund", "fee", "create"]).notNull(),
  /** 交易金額 */
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  /** 手續費 */
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0.00"),
  /** 貨幣 */
  currency: varchar("currency", { length: 8 }).default("USD"),
  /** 交易狀態: pending, success, failed */
  status: mysqlEnum("txStatus", ["pending", "success", "failed"]).default("pending").notNull(),
  /** 商家名稱（消費交易時） */
  merchantName: varchar("merchantName", { length: 256 }),
  /** 交易描述 */
  description: text("description"),
  /** WasabiCard 交易時間 (毫秒時間戳) */
  transactionTime: bigint("transactionTime", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Webhook 事件記錄表 - 記錄所有接收到的 Webhook 事件
 */
export const webhookEvents = mysqlTable("webhook_events", {
  id: int("id").autoincrement().primaryKey(),
  /** Webhook 事件類別 */
  category: varchar("category", { length: 64 }).notNull(),
  /** 原始 payload JSON */
  payload: text("payload").notNull(),
  /** 處理狀態: received, processed, failed */
  status: mysqlEnum("webhookStatus", ["received", "processed", "failed"]).default("received").notNull(),
  /** 處理錯誤信息 */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = typeof webhookEvents.$inferInsert;

/**
 * 3DS 驗證碼表 - 暫存 3DS 驗證碼供前端輪詢
 */
export const threeDsVerifications = mysqlTable("three_ds_verifications", {
  id: int("id").autoincrement().primaryKey(),
  /** 關聯卡號 */
  cardNo: varchar("cardNo", { length: 64 }).notNull(),
  /** 交易號 */
  tradeNo: varchar("tradeNo", { length: 128 }),
  /** 驗證類型: otp, auth_url */
  verificationType: mysqlEnum("verificationType", ["otp", "auth_url"]).notNull(),
  /** 驗證碼或 URL */
  verificationValue: text("verificationValue").notNull(),
  /** 是否已被讀取 */
  isRead: int("isRead").default(0),
  /** 過期時間 */
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ThreeDsVerification = typeof threeDsVerifications.$inferSelect;
export type InsertThreeDsVerification = typeof threeDsVerifications.$inferInsert;

/**
 * ATM 提領記錄表
 */
export const atmWithdrawals = mysqlTable("atm_withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  cardId: int("cardId").notNull(),
  /** WasabiCard 訂單號 */
  wasabiOrderNo: varchar("wasabiOrderNo", { length: 128 }),
  /** 商戶訂單號 */
  merchantOrderNo: varchar("merchantOrderNo", { length: 128 }).unique(),
  /** 提領金額 */
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  /** 手續費 */
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 8 }).default("USD"),
  /** 提領狀態: pending, processing, completed, failed */
  status: mysqlEnum("atmStatus", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  /** 激活碼 */
  activationCode: varchar("activationCode", { length: 64 }),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AtmWithdrawal = typeof atmWithdrawals.$inferSelect;
export type InsertAtmWithdrawal = typeof atmWithdrawals.$inferInsert;
