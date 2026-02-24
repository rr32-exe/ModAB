import { Hono } from "hono";
import type { Env, YocoWebhookPayload } from "../types";
import { getConfigValue } from "../db/schema";
import { trackEvent } from "../db/analytics";

export const webhookRoutes = new Hono<{ Bindings: Env }>();

// ─── Yoco webhook ─────────────────────────────────────────────────────────────
webhookRoutes.post("/yoco", async (c) => {
  const rawBody = await c.req.text();

  // Verify Yoco signature
  const signature = c.req.header("X-Yoco-Signature") ?? "";
  const webhookSecret = await getConfigValue(c.env.DB, "yoco_webhook_secret")
    ?? c.env.YOCO_WEBHOOK_SECRET;

  if (webhookSecret) {
    const isValid = await verifyYocoSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  let payload: YocoWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as YocoWebhookPayload;
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  if (payload.type === "payment.succeeded" || payload.payload?.status === "successful") {
    const paymentId = payload.payload?.id ?? payload.id;
    const amountCents = payload.payload?.amount ?? 0;
    const articleId = payload.payload?.metadata?.["article_id"]
      ? parseInt(payload.payload.metadata["article_id"], 10)
      : undefined;
    const email = payload.payload?.metadata?.["email"] ?? null;
    const ip = c.req.header("CF-Connecting-IP") ?? null;

    // Grant premium access
    if (articleId) {
      await grantPremiumAccess(c.env.DB, {
        articleId,
        email,
        ip: ip ?? undefined,
        paymentId,
      });
    }

    // Track revenue event
    await trackEvent(c.env.DB, "premium_purchase", {
      article_id: articleId,
      amount_cents: amountCents,
      ip: ip ?? undefined,
    });
  }

  return c.json({ received: true });
});

// ─── Grant premium access ─────────────────────────────────────────────────────
async function grantPremiumAccess(
  db: D1Database,
  data: {
    articleId: number;
    email: string | null;
    ip?: string;
    paymentId: string;
  }
): Promise<void> {
  let ipHash: string | null = null;
  if (data.ip) {
    const encoder = new TextEncoder();
    const buf = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(data.ip + "modab-salt")
    );
    ipHash = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  await db
    .prepare(
      `INSERT OR IGNORE INTO premium_access
       (article_id, email, ip_hash, yoco_payment_id)
       VALUES (?, ?, ?, ?)`
    )
    .bind(data.articleId, data.email, ipHash, data.paymentId)
    .run();
}

// ─── Yoco HMAC-SHA256 signature verification ──────────────────────────────────
async function verifyYocoSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(body);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuffer = await crypto.subtle.sign("HMAC", key, msgData);
    const computed = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === signature;
  } catch {
    return false;
  }
}
