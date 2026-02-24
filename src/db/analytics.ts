import type { Analytics, AnalyticsEvent } from "../types";

// ─── Track event ──────────────────────────────────────────────────────────────
export async function trackEvent(
  db: D1Database,
  event: AnalyticsEvent,
  data: {
    article_id?: number;
    affiliate_id?: number;
    amount_cents?: number;
    ip?: string;
  } = {}
): Promise<void> {
  const ipHash = data.ip ? await hashIp(data.ip) : null;

  await db
    .prepare(
      `INSERT INTO analytics (article_id, event, affiliate_id, amount_cents, ip_hash)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      data.article_id ?? null,
      event,
      data.affiliate_id ?? null,
      data.amount_cents ?? null,
      ipHash
    )
    .run();
}

// ─── Site-wide stats ──────────────────────────────────────────────────────────
export async function getStats(db: D1Database): Promise<{
  total_articles: number;
  total_views: number;
  total_affiliate_clicks: number;
  total_revenue_cents: number;
  articles_today: number;
}> {
  const [articles, views, clicks, revenue, today] = await Promise.all([
    db
      .prepare("SELECT COUNT(*) as c FROM articles WHERE status = 'published'")
      .first<{ c: number }>(),
    db
      .prepare("SELECT COALESCE(SUM(view_count), 0) as c FROM articles")
      .first<{ c: number }>(),
    db
      .prepare("SELECT COUNT(*) as c FROM analytics WHERE event = 'affiliate_click'")
      .first<{ c: number }>(),
    db
      .prepare(
        "SELECT COALESCE(SUM(amount_cents), 0) as c FROM analytics WHERE event = 'premium_purchase'"
      )
      .first<{ c: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as c FROM articles WHERE DATE(created_at) = DATE('now')"
      )
      .first<{ c: number }>(),
  ]);

  return {
    total_articles: articles?.c ?? 0,
    total_views: views?.c ?? 0,
    total_affiliate_clicks: clicks?.c ?? 0,
    total_revenue_cents: revenue?.c ?? 0,
    articles_today: today?.c ?? 0,
  };
}

// ─── Per-article stats ────────────────────────────────────────────────────────
export async function getArticleStats(
  db: D1Database,
  articleId: number
): Promise<{
  view_count: number;
  affiliate_clicks: number;
  pageviews_7d: number;
}> {
  const [views, clicks, week] = await Promise.all([
    db
      .prepare("SELECT view_count FROM articles WHERE id = ?")
      .bind(articleId)
      .first<{ view_count: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as c FROM analytics WHERE article_id = ? AND event = 'affiliate_click'"
      )
      .bind(articleId)
      .first<{ c: number }>(),
    db
      .prepare(
        `SELECT COUNT(*) as c FROM analytics
         WHERE article_id = ? AND event = 'pageview'
           AND created_at >= datetime('now', '-7 days')`
      )
      .bind(articleId)
      .first<{ c: number }>(),
  ]);

  return {
    view_count: views?.view_count ?? 0,
    affiliate_clicks: clicks?.c ?? 0,
    pageviews_7d: week?.c ?? 0,
  };
}

// ─── Revenue stats ────────────────────────────────────────────────────────────
export async function getRevenueStats(db: D1Database): Promise<{
  total_revenue_cents: number;
  revenue_this_month: number;
  transactions: number;
}> {
  const [total, month, txCount] = await Promise.all([
    db
      .prepare(
        "SELECT COALESCE(SUM(amount_cents), 0) as c FROM analytics WHERE event = 'premium_purchase'"
      )
      .first<{ c: number }>(),
    db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) as c FROM analytics
         WHERE event = 'premium_purchase'
           AND created_at >= datetime('now', 'start of month')`
      )
      .first<{ c: number }>(),
    db
      .prepare(
        "SELECT COUNT(*) as c FROM analytics WHERE event = 'premium_purchase'"
      )
      .first<{ c: number }>(),
  ]);

  return {
    total_revenue_cents: total?.c ?? 0,
    revenue_this_month: month?.c ?? 0,
    transactions: txCount?.c ?? 0,
  };
}

// ─── Top articles ─────────────────────────────────────────────────────────────
export async function getTopArticles(db: D1Database): Promise<
  Array<{ id: number; title: string; slug: string; view_count: number }>
> {
  const result = await db
    .prepare(
      `SELECT id, title, slug, view_count FROM articles
       WHERE status = 'published'
       ORDER BY view_count DESC
       LIMIT 10`
    )
    .all<{ id: number; title: string; slug: string; view_count: number }>();

  return result.results;
}

// ─── Recent events ────────────────────────────────────────────────────────────
export async function getRecentEvents(
  db: D1Database,
  limit = 20
): Promise<Analytics[]> {
  const result = await db
    .prepare(
      "SELECT * FROM analytics ORDER BY created_at DESC LIMIT ?"
    )
    .bind(limit)
    .all<Analytics>();

  return result.results;
}

// ─── IP hashing (privacy-safe) ────────────────────────────────────────────────
async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "modab-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
