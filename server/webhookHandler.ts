/**
 * WasabiCard Webhook 處理器
 * 處理卡片交易、授權交易、3DS 驗證、KYC 狀態更新等事件
 */
import { Router, Request, Response } from "express";
import * as db from "./db";
import { verifySignature } from "./wasabiClient";

const webhookRouter = Router();

webhookRouter.post("/api/webhooks/wasabi", async (req: Request, res: Response) => {
  const signature = req.headers["x-wsb-signature"] as string;
  const category = req.headers["x-wsb-category"] as string;
  const payload = req.body;

  console.log(`[Webhook] 收到事件, 類別: ${category}`);

  // 驗證簽名
  const payloadStr = JSON.stringify(payload);
  if (signature && !verifySignature(payloadStr, signature)) {
    console.warn("[Webhook] 簽名驗證失敗");
    res.status(401).json({ success: false, code: 401, msg: "Signature verification failed" });
    return;
  }

  // 記錄 Webhook 事件
  let eventId: number | null = null;
  try {
    // 先存入 webhook_events 表
    const dbInstance = await db.getDb();
    if (dbInstance) {
      const { webhookEvents } = await import("../drizzle/schema");
      const result = await dbInstance.insert(webhookEvents).values({
        category: category || "unknown",
        payload: payloadStr,
        status: "received",
      });
      eventId = Number(result[0].insertId);
    }
  } catch (e) {
    console.error("[Webhook] 記錄事件失敗:", e);
  }

  try {
    switch (category) {
      case "card_transaction":
        await handleCardTransaction(payload);
        break;
      case "card_auth_transaction":
        await handleCardAuthTransaction(payload);
        break;
      case "card_3ds_transaction":
        await handleCard3dsTransaction(payload);
        break;
      case "card_holder":
        await handleCardHolder(payload);
        break;
      default:
        console.warn(`[Webhook] 未知事件類別: ${category}`);
    }

    // 更新事件狀態為已處理
    if (eventId) {
      await db.updateWebhookEventStatus(eventId, "processed");
    }

    res.status(200).json({ success: true, code: 200, msg: null, data: null });
  } catch (error) {
    console.error("[Webhook] 處理事件錯誤:", error);
    if (eventId) {
      await db.updateWebhookEventStatus(eventId, "failed", (error as Error).message);
    }
    res.status(200).json({ success: true, code: 200, msg: null, data: null });
  }
});

/** 處理卡片操作交易事件（開卡、充值、凍結等） */
async function handleCardTransaction(payload: Record<string, unknown>) {
  const { orderNo, merchantOrderNo, cardNo, type, status, amount, currency, transactionTime } = payload;
  console.log(`[Webhook] 卡片交易: type=${type}, status=${status}, cardNo=${cardNo}`);

  if (type === "create" && status === "success" && cardNo) {
    // 開卡成功，更新卡片狀態
    await db.updateCardByWasabiNo(String(cardNo), {
      status: "active",
      cardLast4: String(cardNo).slice(-4),
    });
  } else if (type === "deposit" && status === "success") {
    // 充值成功
    console.log(`[Webhook] 卡片 ${cardNo} 充值成功: ${amount} ${currency}`);
  } else if (type === "freeze" && status === "success") {
    if (cardNo) await db.updateCardByWasabiNo(String(cardNo), { status: "frozen" });
  } else if (type === "unfreeze" && status === "success") {
    if (cardNo) await db.updateCardByWasabiNo(String(cardNo), { status: "active" });
  }
}

/** 處理卡片授權交易事件（消費扣款、退款等） */
async function handleCardAuthTransaction(payload: Record<string, unknown>) {
  const { tradeNo, cardNo, type, status, amount, currency, merchantName, transactionTime } = payload;
  console.log(`[Webhook] 授權交易: type=${type}, status=${status}, amount=${amount}`);

  // 查找對應的卡片
  const dbInstance = await db.getDb();
  if (!dbInstance || !cardNo) return;

  const { virtualCards } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const cards = await dbInstance.select().from(virtualCards).where(eq(virtualCards.wasabiCardNo, String(cardNo))).limit(1);
  if (cards.length === 0) return;

  const card = cards[0];

  // 映射交易類型
  let txType: "purchase" | "refund" | "fee" = "purchase";
  if (String(type).includes("refund")) txType = "refund";
  else if (String(type).includes("fee")) txType = "fee";

  await db.createTransaction({
    cardId: card.id,
    userId: card.userId,
    wasabiTxId: String(tradeNo || ""),
    type: txType,
    amount: String(amount || 0),
    currency: String(currency || "USD"),
    status: String(status) === "success" ? "success" : "pending",
    merchantName: String(merchantName || ""),
    description: `${txType === "purchase" ? "消費" : txType === "refund" ? "退款" : "手續費"} - ${merchantName || ""}`,
    transactionTime: transactionTime ? Number(transactionTime) : Date.now(),
  });
}

/** 處理 3DS 驗證事件 */
async function handleCard3dsTransaction(payload: Record<string, unknown>) {
  const { cardNo, tradeNo, values, type } = payload;
  console.log(`[Webhook] 3DS 驗證: type=${type}, cardNo=${cardNo}`);

  if (!cardNo || !values) return;

  const verificationType = String(type) === "third_3ds_otp" ? "otp" as const : "auth_url" as const;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分鐘過期

  await db.create3dsVerification({
    cardNo: String(cardNo),
    tradeNo: tradeNo ? String(tradeNo) : null,
    verificationType,
    verificationValue: String(values),
    expiresAt,
  });
}

/** 處理持卡人狀態更新事件（KYC 審批結果） */
async function handleCardHolder(payload: Record<string, unknown>) {
  const { holderId, status, description } = payload;
  console.log(`[Webhook] 持卡人狀態: holderId=${holderId}, status=${status}`);

  if (!holderId) return;

  let kycStatus: "approved" | "rejected" = "approved";
  if (String(status).toLowerCase().includes("reject") || String(status).toLowerCase().includes("fail")) {
    kycStatus = "rejected";
  }

  await db.updateKycStatus(String(holderId), kycStatus, description ? String(description) : undefined);
}

export { webhookRouter };
