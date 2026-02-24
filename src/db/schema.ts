// ─── D1 schema constants ──────────────────────────────────────────────────────
export const SCHEMA_VERSION = 1;

// Table names
export const TABLES = {
  CONFIG: "config",
  ARTICLES: "articles",
  AFFILIATES: "affiliates",
  ANALYTICS: "analytics",
  CONTENT_CALENDAR: "content_calendar",
  PREMIUM_ACCESS: "premium_access",
  ARTICLES_FTS: "articles_fts",
} as const;

// Config keys
export const CONFIG_KEYS = {
  SITE_NAME: "site_name",
  SITE_URL: "site_url",
  NICHE: "niche",
  LANGUAGE: "language",
  TIMEZONE: "timezone",
  ARTICLES_PER_WEEK: "articles_per_week",
  PUBLISH_DAYS: "publish_days",
  TARGET_AUDIENCE: "target_audience",
  ADMIN_EMAIL: "admin_email",
  ADMIN_PASSWORD_HASH: "admin_password_hash",
  INSTALLED_AT: "installed_at",
  ADSENSE_ID: "adsense_id",
  GA_ID: "ga_id",
  RESEND_API_KEY: "resend_api_key",
  YOCO_PUBLIC_KEY: "yoco_public_key",
  YOCO_SECRET_KEY: "yoco_secret_key",
  YOCO_WEBHOOK_SECRET: "yoco_webhook_secret",
  LUMA_API_KEY: "luma_api_key",
  YOUTUBE_API_KEY: "youtube_api_key",
  BOOKING_AFFILIATE_ID: "booking_affiliate_id",
  GETYOURGUIDE_AFFILIATE_ID: "getyourguide_affiliate_id",
  VIATOR_AFFILIATE_ID: "viator_affiliate_id",
  AMAZON_ASSOCIATE_ID: "amazon_associate_id",
} as const;

// ─── Schema check ─────────────────────────────────────────────────────────────
export async function isInstalled(db: D1Database): Promise<boolean> {
  try {
    const result = await db
      .prepare("SELECT value FROM config WHERE key = 'installed_at' LIMIT 1")
      .first<{ value: string }>();
    return result !== null;
  } catch {
    return false;
  }
}

// ─── Config helpers ───────────────────────────────────────────────────────────
export async function getConfigValue(
  db: D1Database,
  key: string
): Promise<string | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM config WHERE key = ? LIMIT 1")
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setConfigValue(
  db: D1Database,
  key: string,
  value: string
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .bind(key, value)
    .run();
}

export async function setConfigBatch(
  db: D1Database,
  entries: Record<string, string>
): Promise<void> {
  const stmt = db.prepare(
    "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  const batch = Object.entries(entries).map(([key, value]) =>
    stmt.bind(key, value)
  );

  await db.batch(batch);
}

export async function getAllConfig(
  db: D1Database
): Promise<Record<string, string>> {
  const result = await db
    .prepare("SELECT key, value FROM config")
    .all<{ key: string; value: string }>();

  const config: Record<string, string> = {};
  for (const row of result.results) {
    config[row.key] = row.value;
  }
  return config;
}
