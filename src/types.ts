// ─── Core environment bindings ──────────────────────────────────────────────
export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  CACHE: KVNamespace;
  AI: Ai;

  // Site identity
  SITE_NAME: string;
  SITE_URL: string;
  NICHE: string;
  LANGUAGE: string;
  TIMEZONE: string;

  // Content settings
  ARTICLES_PER_WEEK: string;

  // Monetisation
  ADSENSE_ID: string;
  YOCO_PUBLIC_KEY: string;
  YOCO_SECRET_KEY: string;
  YOCO_WEBHOOK_SECRET: string;

  // Analytics / marketing
  GA_ID: string;
  RESEND_API_KEY: string;

  // AI / media APIs
  LUMA_API_KEY: string;
  YOUTUBE_API_KEY: string;

  // Affiliate networks
  BOOKING_AFFILIATE_ID: string;
  GETYOURGUIDE_AFFILIATE_ID: string;
  VIATOR_AFFILIATE_ID: string;
  AMAZON_ASSOCIATE_ID: string;
}

// ─── Article ─────────────────────────────────────────────────────────────────
export type ArticleStatus = "draft" | "queued" | "published" | "archived";

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  raw_markdown: string;
  primary_keyword: string;
  keywords: string; // JSON-encoded string[]
  meta_description: string;
  schema_json: string; // JSON-LD blob
  cover_image_url: string;
  images: string; // JSON-encoded ImageData[]
  video_url: string;
  affiliate_links: string; // JSON-encoded AffiliateLink[]
  word_count: number;
  read_time: number;
  status: ArticleStatus;
  is_premium: number; // 0 | 1 (D1 stores booleans as integers)
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export interface AffiliateLink {
  text: string;
  url: string;
  network: AffiliateNetwork;
}

// ─── Affiliate ───────────────────────────────────────────────────────────────
export type AffiliateNetwork =
  | "booking"
  | "getyourguide"
  | "viator"
  | "amazon"
  | "custom";

export interface Affiliate {
  id: number;
  name: string;
  network: AffiliateNetwork;
  affiliate_id: string;
  base_url: string;
  tracking_params: string; // JSON-encoded Record<string,string>
  niche_keywords: string; // comma-separated
  click_count: number;
  active: number; // 0 | 1
}

// ─── Content Calendar ────────────────────────────────────────────────────────
export type CalendarStatus = "planned" | "queued" | "generating" | "done" | "skipped";

export interface CalendarEntry {
  id: number;
  scheduled_date: string; // ISO date YYYY-MM-DD
  title: string;
  primary_keyword: string;
  content_angle: string;
  target_affiliate: string;
  status: CalendarStatus;
  article_id: number | null;
}

export interface ContentCalendarItem {
  date: string;
  title: string;
  primary_keyword: string;
  content_angle: string;
  affiliate_opportunity: string;
  search_intent: "informational" | "commercial" | "transactional" | "navigational";
}

// ─── Analytics ───────────────────────────────────────────────────────────────
export type AnalyticsEvent =
  | "pageview"
  | "affiliate_click"
  | "premium_purchase"
  | "search"
  | "share";

export interface Analytics {
  id: number;
  article_id: number | null;
  event: AnalyticsEvent;
  affiliate_id: number | null;
  amount_cents: number | null;
  ip_hash: string | null;
  created_at: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────
export interface Config {
  site_name: string;
  site_url: string;
  niche: string;
  language: string;
  timezone: string;
  articles_per_week: number;
  publish_days: string[]; // e.g. ["monday","wednesday"]
  target_audience: string;
  admin_email: string;
  admin_password_hash: string;
  installed_at: string;
  adsense_id: string;
  ga_id: string;
  resend_api_key: string;
  yoco_public_key: string;
  yoco_secret_key: string;
  yoco_webhook_secret: string;
  luma_api_key: string;
  youtube_api_key: string;
  booking_affiliate_id: string;
  getyourguide_affiliate_id: string;
  viator_affiliate_id: string;
  amazon_associate_id: string;
}

// ─── Premium Access ──────────────────────────────────────────────────────────
export interface PremiumAccess {
  id: number;
  article_id: number;
  email: string | null;
  ip_hash: string | null;
  yoco_payment_id: string;
  granted_at: string;
}

// ─── Install ─────────────────────────────────────────────────────────────────
export interface InstallConfig {
  site_name: string;
  niche: string;
  site_url: string;
  articles_per_week: number;
  publish_days: string[];
  target_audience: string;
  language: string;
  booking_affiliate_id: string;
  getyourguide_affiliate_id: string;
  viator_affiliate_id: string;
  amazon_associate_id: string;
  yoco_public_key: string;
  yoco_secret_key: string;
  yoco_webhook_secret: string;
  ga_id: string;
  adsense_id: string;
  resend_api_key: string;
  admin_email: string;
  admin_password: string;
  generate_initial_articles: boolean;
}

// ─── SEO ─────────────────────────────────────────────────────────────────────
export interface SEOData {
  title_tag: string;
  meta_description: string;
  primary_keyword: string;
  lsi_keywords: string[];
  longtail_variations: string[];
  schema_json: string; // JSON-LD
  og_title: string;
  og_description: string;
  twitter_title: string;
  twitter_description: string;
}

// ─── Images ──────────────────────────────────────────────────────────────────
export interface ImageData {
  alt: string;
  base64: string;
  width: number;
  height: number;
  position: "cover" | "inline" | "sidebar";
}

// ─── Video ───────────────────────────────────────────────────────────────────
export type VideoSource = "luma" | "youtube";

export interface VideoData {
  source: VideoSource;
  embed_id: string; // YouTube video ID or Luma generation ID
  embed_url: string;
  title: string;
  thumbnail_url: string;
}

// ─── Yoco ────────────────────────────────────────────────────────────────────
export interface YocoCheckoutResponse {
  id: string;
  redirectUrl: string;
  status: string;
}

export interface YocoWebhookPayload {
  id: string;
  type: string;
  createdDate: string;
  payload: {
    id: string;
    status: "successful" | "failed" | "cancelled";
    amount: number;
    currency: string;
    metadata?: Record<string, string>;
  };
}
