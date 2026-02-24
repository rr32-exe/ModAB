import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import type { Env, InstallConfig } from "../types";
import { isInstalled, setConfigBatch, CONFIG_KEYS } from "../db/schema";
import { generateCalendar, saveCalendarToDb } from "../ai/calendar";
import { seedAffiliatesFromConfig } from "../db/affiliates";
import { renderInstallPage } from "../templates/install";

export const installRoutes = new Hono<{ Bindings: Env }>();

// ─── GET /install ─────────────────────────────────────────────────────────────
installRoutes.get("/", async (c) => {
  const installed = await isInstalled(c.env.DB);
  if (installed) {
    return c.redirect("/admin");
  }
  return c.html(renderInstallPage());
});

// ─── POST /install ────────────────────────────────────────────────────────────
installRoutes.post("/", async (c) => {
  const installed = await isInstalled(c.env.DB);
  if (installed) {
    return c.redirect("/admin");
  }

  let body: Record<string, string>;
  try {
    body = await c.req.parseBody() as Record<string, string>;
  } catch {
    return c.html(renderInstallPage("Failed to parse form data."), 400);
  }

  const config: InstallConfig = {
    site_name: (body["site_name"] ?? "").trim(),
    niche: (body["niche"] ?? "").trim(),
    site_url: (body["site_url"] ?? "").trim().replace(/\/$/, ""),
    articles_per_week: parseInt(body["articles_per_week"] ?? "2", 10) || 2,
    publish_days: body["publish_days"]
      ? (Array.isArray(body["publish_days"])
          ? (body["publish_days"] as string[])
          : [body["publish_days"] as string])
      : ["monday"],
    target_audience: (body["target_audience"] ?? "").trim(),
    language: (body["language"] ?? "en").trim(),
    booking_affiliate_id: (body["booking_affiliate_id"] ?? "").trim(),
    getyourguide_affiliate_id: (body["getyourguide_affiliate_id"] ?? "").trim(),
    viator_affiliate_id: (body["viator_affiliate_id"] ?? "").trim(),
    amazon_associate_id: (body["amazon_associate_id"] ?? "").trim(),
    yoco_public_key: (body["yoco_public_key"] ?? "").trim(),
    yoco_secret_key: (body["yoco_secret_key"] ?? "").trim(),
    yoco_webhook_secret: (body["yoco_webhook_secret"] ?? "").trim(),
    ga_id: (body["ga_id"] ?? "").trim(),
    adsense_id: (body["adsense_id"] ?? "").trim(),
    resend_api_key: (body["resend_api_key"] ?? "").trim(),
    admin_email: (body["admin_email"] ?? "").trim(),
    admin_password: body["admin_password"] ?? "",
    generate_initial_articles: body["generate_initial_articles"] === "on",
  };

  // Validate required fields
  if (!config.site_name || !config.niche || !config.admin_email || !config.admin_password) {
    return c.html(
      renderInstallPage("Please fill in all required fields (site name, niche, email, password)."),
      400
    );
  }

  // Hash password using Web Crypto
  const passwordHash = await hashPassword(config.admin_password);

  // Persist config to D1
  const configEntries: Record<string, string> = {
    [CONFIG_KEYS.SITE_NAME]: config.site_name,
    [CONFIG_KEYS.SITE_URL]: config.site_url,
    [CONFIG_KEYS.NICHE]: config.niche,
    [CONFIG_KEYS.LANGUAGE]: config.language,
    [CONFIG_KEYS.ARTICLES_PER_WEEK]: String(config.articles_per_week),
    [CONFIG_KEYS.PUBLISH_DAYS]: JSON.stringify(config.publish_days),
    [CONFIG_KEYS.TARGET_AUDIENCE]: config.target_audience,
    [CONFIG_KEYS.ADMIN_EMAIL]: config.admin_email,
    [CONFIG_KEYS.ADMIN_PASSWORD_HASH]: passwordHash,
    [CONFIG_KEYS.INSTALLED_AT]: new Date().toISOString(),
    [CONFIG_KEYS.ADSENSE_ID]: config.adsense_id,
    [CONFIG_KEYS.GA_ID]: config.ga_id,
    [CONFIG_KEYS.RESEND_API_KEY]: config.resend_api_key,
    [CONFIG_KEYS.YOCO_PUBLIC_KEY]: config.yoco_public_key,
    [CONFIG_KEYS.YOCO_SECRET_KEY]: config.yoco_secret_key,
    [CONFIG_KEYS.YOCO_WEBHOOK_SECRET]: config.yoco_webhook_secret,
    [CONFIG_KEYS.LUMA_API_KEY]: "",
    [CONFIG_KEYS.YOUTUBE_API_KEY]: "",
    [CONFIG_KEYS.BOOKING_AFFILIATE_ID]: config.booking_affiliate_id,
    [CONFIG_KEYS.GETYOURGUIDE_AFFILIATE_ID]: config.getyourguide_affiliate_id,
    [CONFIG_KEYS.VIATOR_AFFILIATE_ID]: config.viator_affiliate_id,
    [CONFIG_KEYS.AMAZON_ASSOCIATE_ID]: config.amazon_associate_id,
  };

  await setConfigBatch(c.env.DB, configEntries);

  // Seed affiliate records
  await seedAffiliatesFromConfig(c.env.DB, {
    booking_affiliate_id: config.booking_affiliate_id,
    getyourguide_affiliate_id: config.getyourguide_affiliate_id,
    viator_affiliate_id: config.viator_affiliate_id,
    amazon_associate_id: config.amazon_associate_id,
    niche: config.niche,
  });

  // Generate 30-day content calendar
  try {
    const calendarItems = await generateCalendar(
      c.env,
      config.niche,
      config.target_audience || `${config.niche} enthusiasts`,
      config.articles_per_week
    );

    const markQueued = config.generate_initial_articles;
    await saveCalendarToDb(c.env.DB, calendarItems, markQueued);

    // Queue the first 10 items if the toggle is on
    if (config.generate_initial_articles) {
      await c.env.DB
        .prepare(
          `UPDATE content_calendar SET status = 'queued'
           WHERE id IN (SELECT id FROM content_calendar ORDER BY scheduled_date ASC LIMIT 10)`
        )
        .run();
    }
  } catch (err) {
    console.error("Calendar generation failed:", err);
    // Non-fatal – installation continues
  }

  // Auto-login: create session
  const token = crypto.randomUUID();
  await c.env.CACHE.put(
    `session:${token}`,
    JSON.stringify({ email: config.admin_email }),
    { expirationTtl: 86400 * 7 }
  );

  setCookie(c, "session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 86400 * 7,
    path: "/",
  });

  return c.redirect("/admin");
});

// ─── Password hashing ─────────────────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
