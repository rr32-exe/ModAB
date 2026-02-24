import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, Article } from "../types";
import {
  listArticles,
  listAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  listCalendar,
} from "../db/articles";
import {
  getAffiliates,
  createAffiliate,
  updateAffiliate,
  deleteAffiliate,
} from "../db/affiliates";
import { getStats, getRevenueStats, getTopArticles } from "../db/analytics";
import { getAllConfig, setConfigBatch, getConfigValue } from "../db/schema";
import { renderAdminDashboard } from "../templates/admin";

export const adminRoutes = new Hono<{ Bindings: Env }>();

// ─── Session middleware ────────────────────────────────────────────────────────
adminRoutes.use("/*", async (c, next) => {
  // Allow login POST without session
  if (c.req.path === "/admin/login" && c.req.method === "POST") {
    return next();
  }

  const token = getCookie(c, "session");
  if (!token) {
    return c.redirect("/admin/login");
  }

  const session = await c.env.CACHE.get(`session:${token}`);
  if (!session) {
    return c.redirect("/admin/login");
  }

  return next();
});

// ─── Login page ───────────────────────────────────────────────────────────────
adminRoutes.get("/login", (c) => {
  return c.html(renderLoginPage());
});

adminRoutes.post("/login", async (c) => {
  const body = await c.req.parseBody() as Record<string, string>;
  const email = (body["email"] ?? "").trim();
  const password = body["password"] ?? "";

  const storedHash = await getConfigValue(c.env.DB, "admin_password_hash");
  const storedEmail = await getConfigValue(c.env.DB, "admin_email");

  const passwordHash = await hashPassword(password);

  if (email !== storedEmail || passwordHash !== storedHash) {
    return c.html(renderLoginPage("Invalid email or password."), 401);
  }

  const token = crypto.randomUUID();
  await c.env.CACHE.put(
    `session:${token}`,
    JSON.stringify({ email }),
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

adminRoutes.post("/logout", async (c) => {
  const token = getCookie(c, "session");
  if (token) {
    await c.env.CACHE.delete(`session:${token}`);
  }
  deleteCookie(c, "session", { path: "/" });
  return c.redirect("/admin/login");
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
adminRoutes.get("/", async (c) => {
  const [stats, revenue, topArticles, articles, config] = await Promise.all([
    getStats(c.env.DB),
    getRevenueStats(c.env.DB),
    getTopArticles(c.env.DB),
    listArticles(c.env.DB, { status: "published", limit: 5 }),
    getAllConfig(c.env.DB),
  ]);

  return c.html(
    renderAdminDashboard("dashboard", { stats, revenue, topArticles, articles, config })
  );
});

// ─── Articles list ────────────────────────────────────────────────────────────
adminRoutes.get("/articles", async (c) => {
  const articles = await listAllArticles(c.env.DB, 50);
  const config = await getAllConfig(c.env.DB);
  return c.html(renderAdminDashboard("articles", { articles, config }));
});

adminRoutes.post("/articles/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.parseBody() as Record<string, string>;

  await updateArticle(c.env.DB, id, {
    title: body["title"],
    excerpt: body["excerpt"],
    status: body["status"] as Article["status"],
    meta_description: body["meta_description"],
  });

  // Invalidate cache
  const article = await getArticleById(c.env.DB, id);
  if (article) {
    await c.env.CACHE.delete(`page:article:${article.slug}`);
    await c.env.CACHE.delete("page:home");
  }

  return c.redirect("/admin/articles");
});

adminRoutes.delete("/articles/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const article = await getArticleById(c.env.DB, id);

  await deleteArticle(c.env.DB, id);

  if (article) {
    await c.env.CACHE.delete(`page:article:${article.slug}`);
    await c.env.CACHE.delete("page:home");
  }

  return c.json({ success: true });
});

// ─── Content calendar ─────────────────────────────────────────────────────────
adminRoutes.get("/calendar", async (c) => {
  const [calendar, config] = await Promise.all([
    listCalendar(c.env.DB, 30),
    getAllConfig(c.env.DB),
  ]);
  return c.html(renderAdminDashboard("calendar", { calendar, config }));
});

// ─── Generate article manually ────────────────────────────────────────────────
adminRoutes.post("/generate", async (c) => {
  const body = await c.req.parseBody() as Record<string, string>;
  const calendarId = parseInt(body["calendar_id"] ?? "0", 10);

  if (calendarId) {
    // Queue a specific calendar item
    await c.env.DB
      .prepare("UPDATE content_calendar SET status = 'queued' WHERE id = ?")
      .bind(calendarId)
      .run();
    return c.json({ success: true, message: "Article queued for generation" });
  }

  return c.json({ error: "No calendar_id provided" }, 400);
});

// ─── Affiliates ───────────────────────────────────────────────────────────────
adminRoutes.get("/affiliates", async (c) => {
  const [affiliates, config] = await Promise.all([
    getAffiliates(c.env.DB),
    getAllConfig(c.env.DB),
  ]);
  return c.html(renderAdminDashboard("affiliates", { affiliates, config }));
});

adminRoutes.post("/affiliates", async (c) => {
  const body = await c.req.parseBody() as Record<string, string>;

  await createAffiliate(c.env.DB, {
    name: body["name"] ?? "",
    network: (body["network"] as import("../types").AffiliateNetwork) ?? "custom",
    affiliate_id: body["affiliate_id"] ?? "",
    base_url: body["base_url"] ?? "",
    tracking_params: body["tracking_params"] ?? "{}",
    niche_keywords: body["niche_keywords"] ?? "",
    active: 1,
  });

  return c.redirect("/admin/affiliates");
});

adminRoutes.post("/affiliates/:id/delete", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  await deleteAffiliate(c.env.DB, id);
  return c.redirect("/admin/affiliates");
});

// ─── Settings ─────────────────────────────────────────────────────────────────
adminRoutes.get("/settings", async (c) => {
  const config = await getAllConfig(c.env.DB);
  return c.html(renderAdminDashboard("settings", { config }));
});

adminRoutes.post("/settings", async (c) => {
  const body = await c.req.parseBody() as Record<string, string>;

  const allowed = [
    "site_name", "site_url", "niche", "language", "articles_per_week",
    "target_audience", "adsense_id", "ga_id", "resend_api_key",
    "yoco_public_key", "yoco_secret_key", "yoco_webhook_secret",
    "luma_api_key", "youtube_api_key",
    "booking_affiliate_id", "getyourguide_affiliate_id",
    "viator_affiliate_id", "amazon_associate_id",
  ];

  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key] as string;
    }
  }

  await setConfigBatch(c.env.DB, updates);

  // Flush all caches
  await c.env.CACHE.delete("page:home");
  await c.env.CACHE.delete("sitemap:xml");
  await c.env.CACHE.delete("feed:rss");

  return c.redirect("/admin/settings");
});

// ─── Analytics ────────────────────────────────────────────────────────────────
adminRoutes.get("/analytics", async (c) => {
  const [stats, revenue, topArticles, config] = await Promise.all([
    getStats(c.env.DB),
    getRevenueStats(c.env.DB),
    getTopArticles(c.env.DB),
    getAllConfig(c.env.DB),
  ]);
  return c.html(
    renderAdminDashboard("analytics", { stats, revenue, topArticles, config })
  );
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function renderLoginPage(error?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Admin Login</title>
  <link rel="stylesheet" href="/admin.css"/>
  <style>
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5}
    .login-card{background:#fff;padding:2rem;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.1);width:100%;max-width:380px}
    .login-card h1{margin:0 0 1.5rem;font-size:1.5rem;text-align:center}
    .form-group{margin-bottom:1rem}
    label{display:block;font-size:.875rem;font-weight:600;margin-bottom:.25rem;color:#374151}
    input{width:100%;padding:.625rem .75rem;border:1px solid #d1d5db;border-radius:8px;font-size:1rem;box-sizing:border-box}
    .btn{width:100%;padding:.75rem;background:#4f46e5;color:#fff;border:none;border-radius:8px;font-size:1rem;cursor:pointer;margin-top:.5rem}
    .error{background:#fee2e2;color:#dc2626;padding:.75rem;border-radius:8px;margin-bottom:1rem;font-size:.875rem}
  </style>
</head>
<body>
  <div class="login-card">
    <h1>🔐 Admin Login</h1>
    ${error ? `<div class="error">${error}</div>` : ""}
    <form method="post" action="/admin/login">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="username"/>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autocomplete="current-password"/>
      </div>
      <button type="submit" class="btn">Login</button>
    </form>
  </div>
</body>
</html>`;
}
