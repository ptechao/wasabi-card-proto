/**
 * WasabiCard API 客戶端
 * 當 WASABI_API_KEY 未設定時，自動使用模擬數據層 (Mock Mode)
 * 當 WASABI_API_KEY 已設定時，使用真實 API 呼叫
 */
import axios, { AxiosInstance, AxiosError } from "axios";
import crypto from "crypto";
import { ENV } from "./_core/env";

// ============================================================
// 共用工具
// ============================================================

export class WasabiApiError extends Error {
  code: number;
  rawData: unknown;
  constructor(message: string, code: number, rawData?: unknown) {
    super(message);
    this.name = "WasabiApiError";
    this.code = code;
    this.rawData = rawData;
  }
}

/** 生成唯一的商戶訂單號 */
export function generateMerchantOrderNo(prefix: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  return `${prefix}-${timestamp}-${random}`;
}

/** 使用 WasabiCard 公鑰驗證回應簽名 */
export function verifySignature(payload: string, signature: string): boolean {
  const publicKey = ENV.wasabiPublicKey;
  if (!publicKey || !signature) return false;
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(payload);
    verify.end();
    return verify.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

/** 判斷是否使用模擬模式 */
function isMockMode(): boolean {
  return !ENV.wasabiApiKey;
}

// ============================================================
// 模擬數據層 (Mock Service)
// ============================================================

/** 模擬延遲，模仿真實 API 回應時間 */
function mockDelay(ms: number = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 模擬卡號生成 */
function mockCardNo(): string {
  const bins = ["4859", "5329", "4532", "5412"];
  const bin = bins[Math.floor(Math.random() * bins.length)];
  const rest = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  return bin + rest;
}

/** 模擬 CVV */
function mockCvv(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

/** 模擬有效期 */
function mockExpiry(): string {
  const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, "0");
  const year = String(new Date().getFullYear() + 3).slice(-2);
  return `${month}/${year}`;
}

// 模擬內存狀態 (重啟後重置)
const mockState = {
  holderId: 0,
  cardCounter: 0,
  accountBalance: 50000.00,
  cards: new Map<string, { cardNo: string; balance: number; status: string; bin: string }>(),
};

const mockService = {
  async getAccountList() {
    await mockDelay();
    return {
      records: [
        {
          accountId: "MOCK-ACC-001",
          accountName: "主帳戶 (USDT)",
          currency: "USD",
          availableBalance: mockState.accountBalance.toFixed(2),
          frozenBalance: "0.00",
          totalBalance: mockState.accountBalance.toFixed(2),
        },
      ],
    };
  },

  async getCardTypes() {
    await mockDelay();
    return {
      records: [
        {
          id: "CT-VISA-001",
          cardTypeId: "CT-VISA-001",
          name: "Visa 虛擬卡 (標準)",
          cardTypeName: "Visa Virtual Standard",
          bankCardBin: "4859",
          currency: "USD",
          minAmount: 5,
          maxAmount: 10000,
          issueFee: 1.5,
          rechargeFee: 1.0,
          monthlyFee: 0,
        },
        {
          id: "CT-MC-001",
          cardTypeId: "CT-MC-001",
          name: "Mastercard 虛擬卡 (高級)",
          cardTypeName: "Mastercard Virtual Premium",
          bankCardBin: "5329",
          currency: "USD",
          minAmount: 10,
          maxAmount: 50000,
          issueFee: 2.0,
          rechargeFee: 0.8,
          monthlyFee: 1.0,
        },
        {
          id: "CT-VISA-002",
          cardTypeId: "CT-VISA-002",
          name: "Visa 虛擬卡 (3DS)",
          cardTypeName: "Visa Virtual 3DS",
          bankCardBin: "4532",
          currency: "USD",
          minAmount: 5,
          maxAmount: 20000,
          issueFee: 2.0,
          rechargeFee: 1.0,
          monthlyFee: 0.5,
        },
      ],
    };
  },

  async createCardHolder(params: Record<string, unknown>) {
    await mockDelay(500);
    mockState.holderId++;
    const holderId = `MOCK-HOLDER-${String(mockState.holderId).padStart(6, "0")}`;
    console.log(`[Mock] 創建持卡人: ${holderId}, 姓名: ${params.firstName} ${params.lastName}`);
    return {
      holderId,
      status: "approved",
      firstName: params.firstName,
      lastName: params.lastName,
    };
  },

  async getCardHolderInfo(holderId: string) {
    await mockDelay();
    return {
      holderId,
      status: "approved",
      firstName: "Mock",
      lastName: "User",
    };
  },

  async createCard(params: Record<string, unknown>) {
    await mockDelay(800);
    mockState.cardCounter++;
    const cardNo = mockCardNo();
    const amount = Number(params.amount) || 0;
    const fee = 1.5;

    // 扣除商戶餘額
    if (mockState.accountBalance < amount + fee) {
      throw new WasabiApiError("商戶餘額不足", 4001);
    }
    mockState.accountBalance -= (amount + fee);

    mockState.cards.set(cardNo, {
      cardNo,
      balance: amount,
      status: "active",
      bin: cardNo.substring(0, 4),
    });

    console.log(`[Mock] 開卡成功: ${cardNo}, 初始餘額: $${amount}, 手續費: $${fee}`);
    return {
      cardNo,
      orderNo: `WSB-${Date.now()}`,
      bankCardBin: cardNo.substring(0, 4),
      status: "success",
    };
  },

  async depositCard(params: Record<string, unknown>) {
    await mockDelay(500);
    const cardNo = String(params.cardNo);
    const amount = Number(params.amount) || 0;
    const fee = amount * 0.01; // 1% 手續費

    if (mockState.accountBalance < amount + fee) {
      throw new WasabiApiError("商戶餘額不足", 4001);
    }

    const card = mockState.cards.get(cardNo);
    if (card) {
      card.balance += amount;
      mockState.accountBalance -= (amount + fee);
    }

    console.log(`[Mock] 充值成功: ${cardNo}, 金額: $${amount}, 手續費: $${fee.toFixed(2)}`);
    return {
      orderNo: `WSB-DEP-${Date.now()}`,
      status: "success",
      amount,
      fee: fee.toFixed(2),
    };
  },

  async getCardBalance(cardNo: string) {
    await mockDelay();
    const card = mockState.cards.get(cardNo);
    return {
      cardNo,
      availableBalance: card ? card.balance.toFixed(2) : "0.00",
      frozenBalance: "0.00",
      currency: "USD",
    };
  },

  async freezeCard(cardNo: string) {
    await mockDelay(300);
    const card = mockState.cards.get(cardNo);
    if (card) card.status = "frozen";
    console.log(`[Mock] 凍結卡片: ${cardNo}`);
    return { success: true, status: "frozen" };
  },

  async unfreezeCard(cardNo: string) {
    await mockDelay(300);
    const card = mockState.cards.get(cardNo);
    if (card) card.status = "active";
    console.log(`[Mock] 解凍卡片: ${cardNo}`);
    return { success: true, status: "active" };
  },

  async getCardTransactions(params: { cardNo: string; page?: number; pageSize?: number }) {
    await mockDelay();
    const now = Date.now();
    return {
      records: [
        {
          tradeNo: `TXN-${now - 86400000}`,
          type: "purchase",
          amount: "29.99",
          currency: "USD",
          status: "success",
          merchantName: "Netflix",
          transactionTime: now - 86400000,
        },
        {
          tradeNo: `TXN-${now - 172800000}`,
          type: "purchase",
          amount: "12.50",
          currency: "USD",
          status: "success",
          merchantName: "Spotify",
          transactionTime: now - 172800000,
        },
        {
          tradeNo: `TXN-${now - 259200000}`,
          type: "refund",
          amount: "5.00",
          currency: "USD",
          status: "success",
          merchantName: "Amazon",
          transactionTime: now - 259200000,
        },
      ],
      total: 3,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
  },

  async getCardSensitiveInfo(cardNo: string) {
    await mockDelay();
    return {
      cardNo,
      cvv: mockCvv(),
      expireDate: mockExpiry(),
      holderName: "MOCK USER",
    };
  },

  async getWalletDepositAddress(params: { amount: number; chain?: string }) {
    await mockDelay(500);
    const chain = params.chain || "TRC20";
    const addresses: Record<string, string> = {
      TRC20: "TN7gR3BKxMqJbz9WbXPvVzMEFGFHnLWoMR",
      BEP20: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
      ERC20: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    };
    return {
      toAddress: addresses[chain] || addresses.TRC20,
      chain,
      amount: params.amount,
      actualDepositAmount: params.amount,
      orderNo: `WSB-WAL-${Date.now()}`,
      expireSecond: 1800,
      status: "pending",
    };
  },

  async getWalletTransactions(params: { page?: number; pageSize?: number }) {
    await mockDelay();
    const now = Date.now();
    return {
      records: [
        {
          orderNo: `WAL-${now - 3600000}`,
          type: "deposit",
          amount: "500.00",
          chain: "TRC20",
          status: "confirmed",
          txHash: "a1b2c3d4e5f6...mock_hash",
          createdAt: now - 3600000,
        },
        {
          orderNo: `WAL-${now - 86400000}`,
          type: "deposit",
          amount: "1000.00",
          chain: "TRC20",
          status: "confirmed",
          txHash: "f6e5d4c3b2a1...mock_hash",
          createdAt: now - 86400000,
        },
      ],
      total: 2,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
    };
  },

  async getLedgerTransactions(params: { accountId: string; page?: number; pageSize?: number }) {
    await mockDelay();
    return { records: [], total: 0 };
  },
};

// ============================================================
// 真實 API 客戶端
// ============================================================

function signPayload(payload: Record<string, unknown>): string {
  const privateKey = ENV.wasabiPrivateKey;
  if (!privateKey) throw new WasabiApiError("WASABI_PRIVATE_KEY 未設定", 0);
  const dataStr = JSON.stringify(payload);
  const sign = crypto.createSign("SHA256");
  sign.update(dataStr);
  sign.end();
  return sign.sign(privateKey, "base64");
}

function createWasabiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: ENV.wasabiApiUrl,
    headers: { "Content-Type": "application/json" },
    timeout: 30000,
  });

  client.interceptors.request.use((config) => {
    if (ENV.wasabiApiKey) config.headers["X-WSB-API-KEY"] = ENV.wasabiApiKey;
    if (config.data && typeof config.data === "object") {
      try {
        config.headers["X-WSB-SIGNATURE"] = signPayload(config.data);
      } catch (e) {
        console.warn("[WasabiClient] 簽名失敗，跳過:", (e as Error).message);
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const data = response.data;
      if (data && data.success === false) {
        throw new WasabiApiError(data.msg || "WasabiCard API 請求失敗", data.code || 400, data);
      }
      return response;
    },
    (error: AxiosError) => {
      if (error.response) {
        const data = error.response.data as Record<string, unknown>;
        throw new WasabiApiError((data?.msg as string) || `HTTP ${error.response.status}`, error.response.status, data);
      }
      throw new WasabiApiError(error.message || "網路錯誤", 0, null);
    }
  );

  return client;
}

const wasabiClient = createWasabiClient();

// ============================================================
// 統一匯出：自動選擇 Mock 或 Real
// ============================================================

export async function getAccountList() {
  if (isMockMode()) return mockService.getAccountList();
  const res = await wasabiClient.post("/merchant/core/mcb/account/list");
  return res.data.data;
}

export async function getCardTypes() {
  if (isMockMode()) return mockService.getCardTypes();
  const res = await wasabiClient.post("/merchant/core/mcb/card/v2/cardTypes");
  return res.data.data;
}

export async function createCardHolder(params: {
  merchantOrderNo: string;
  firstName: string;
  lastName: string;
  dob: string;
  nationality: string;
  mobileAreaCode?: string;
  mobilePhoneNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  idType?: string;
  idNumber?: string;
  idFrontUrl?: string;
  idBackUrl?: string;
  selfieUrl?: string;
}) {
  if (isMockMode()) return mockService.createCardHolder(params as unknown as Record<string, unknown>);
  const res = await wasabiClient.post("/merchant/core/mcb/card/holder/v2/create", params);
  return res.data.data;
}

export async function getCardHolderInfo(holderId: string) {
  if (isMockMode()) return mockService.getCardHolderInfo(holderId);
  const res = await wasabiClient.post("/merchant/core/mcb/card/holder/v2/info", { holderId });
  return res.data.data;
}

export async function createCard(params: {
  merchantOrderNo: string;
  cardTypeId: string;
  amount: number;
  accountId: string;
  holderId: string;
}) {
  if (isMockMode()) return mockService.createCard(params as unknown as Record<string, unknown>);
  const res = await wasabiClient.post("/merchant/core/mcb/card/v2/createCard", params);
  return res.data.data;
}

export async function depositCard(params: {
  merchantOrderNo: string;
  cardNo: string;
  amount: number;
  accountId: string;
}) {
  if (isMockMode()) return mockService.depositCard(params as unknown as Record<string, unknown>);
  const res = await wasabiClient.post("/merchant/core/mcb/card/deposit", params);
  return res.data.data;
}

export async function getCardBalance(cardNo: string) {
  if (isMockMode()) return mockService.getCardBalance(cardNo);
  const res = await wasabiClient.post("/merchant/core/mcb/card/balance", { cardNo });
  return res.data.data;
}

export async function freezeCard(cardNo: string) {
  if (isMockMode()) return mockService.freezeCard(cardNo);
  const res = await wasabiClient.post("/merchant/core/mcb/card/freezeCard", { cardNo });
  return res.data.data;
}

export async function unfreezeCard(cardNo: string) {
  if (isMockMode()) return mockService.unfreezeCard(cardNo);
  const res = await wasabiClient.post("/merchant/core/mcb/card/unFreezeCard", { cardNo });
  return res.data.data;
}

export async function getCardTransactions(params: {
  cardNo: string;
  page?: number;
  pageSize?: number;
}) {
  if (isMockMode()) return mockService.getCardTransactions(params);
  const res = await wasabiClient.post("/merchant/core/mcb/card/operationTransactionV2", {
    cardNo: params.cardNo,
    page: params.page || 1,
    pageSize: params.pageSize || 20,
  });
  return res.data.data;
}

export async function getCardSensitiveInfo(cardNo: string) {
  if (isMockMode()) return mockService.getCardSensitiveInfo(cardNo);
  const res = await wasabiClient.post("/merchant/core/mcb/card/v2/info", { cardNo });
  return res.data.data;
}

export async function getWalletDepositAddress(params: {
  amount: number;
  chain?: string;
}) {
  if (isMockMode()) return mockService.getWalletDepositAddress(params);
  const res = await wasabiClient.post("/merchant/core/mcb/account/walletDeposit", {
    amount: params.amount,
    chain: params.chain || "TRC20",
  });
  return res.data.data;
}

export async function getWalletTransactions(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  startTime?: number;
  endTime?: number;
}) {
  if (isMockMode()) return mockService.getWalletTransactions(params);
  const res = await wasabiClient.post("/merchant/core/mcb/account/walletDepositTransaction", params);
  return res.data.data;
}

export async function getLedgerTransactions(params: {
  accountId: string;
  page?: number;
  pageSize?: number;
}) {
  if (isMockMode()) return mockService.getLedgerTransactions(params);
  const res = await wasabiClient.post("/merchant/core/mcb/account/ledgerTransaction", params);
  return res.data.data;
}
