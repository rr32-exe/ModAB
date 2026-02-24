import { Hono } from "hono";
import type { Env } from "../types";
import {
  listArticles,
  getArticle,
  searchArticles,
  incrementViewCount,
  listPublishedArticles,
} from "../db/articles";
import { getAffiliateById, trackClick } from "../db/affiliates";
import { trackEvent } from "../db/analytics";
import { getAllConfig } from "../db/schema";
import { renderLayout } from "../templates/layout";
import { renderHomePage } from "../templates/home";
import { renderArticlePage } from "../templates/article";

export const publicRoutes = new Hono<{ Bindings: Env }>();

// ─── Homepage ─────────────────────────────────────────────────────────────────
publicRoutes.get("/", async (c) => {
  const cacheKey = "page:home";
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) return c.html(cached);

  const [articles, config] = await Promise.all([
    listArticles(c.env.DB, { status: "published", limit: 9 }),
    getAllConfig(c.env.DB),
  ]);

  const siteName = config["site_name"] ?? c.env.SITE_NAME;
  const html = renderHomePage(articles, siteName, config);
  await c.env.CACHE.put(cacheKey, html, { expirationTtl: 300 });
  return c.html(html);
});

// ─── Article page ─────────────────────────────────────────────────────────────
publicRoutes.get("/articles/:slug", async (c) => {
  const slug = c.req.param("slug");
  const cacheKey = `page:article:${slug}`;

  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) {
    // Track view without blocking response
    const article = await getArticle(c.env.DB, slug);
    if (article) {
      const ip = c.req.header("CF-Connecting-IP") ?? "";
      c.executionCtx.waitUntil(
        Promise.all([
          incrementViewCount(c.env.DB, article.id),
          trackEvent(c.env.DB, "pageview", { article_id: article.id, ip }),
        ])
      );
    }
    return c.html(cached);
  }

  const article = await getArticle(c.env.DB, slug);
  if (!article) return c.notFound();
  if (article.status !== "published") return c.notFound();

  const config = await getAllConfig(c.env.DB);
  const html = renderArticlePage(article, config);

  await c.env.CACHE.put(cacheKey, html, { expirationTtl: 3600 });

  const ip = c.req.header("CF-Connecting-IP") ?? "";
  c.executionCtx.waitUntil(
    Promise.all([
      incrementViewCount(c.env.DB, article.id),
      trackEvent(c.env.DB, "pageview", { article_id: article.id, ip }),
    ])
  );

  return c.html(html);
});

// ─── Category page ────────────────────────────────────────────────────────────
publicRoutes.get("/category/:slug", async (c) => {
  const slug = c.req.param("slug");
  const articles = await listArticles(c.env.DB, { status: "published", limit: 20 });
  const config = await getAllConfig(c.env.DB);
  const siteName = config["site_name"] ?? c.env.SITE_NAME;

  const filtered = articles.filter(
    (a) => a.primary_keyword?.toLowerCase().includes(slug.replace(/-/g, " "))
  );

  const html = renderLayout(
    `${slug} Articles | ${siteName}`,
    `<section class="category-page container">
      <h1>${slug.replace(/-/g, " ")}</h1>
      <div class="article-grid">
        ${filtered
          .map(
            (a) => `<article class="card">
          <h2><a href="/articles/${a.slug}">${a.title}</a></h2>
          <p>${a.excerpt}</p>
        </article>`
          )
          .join("")}
      </div>
    </section>`,
    config
  );

  return c.html(html);
});

// ─── Search ───────────────────────────────────────────────────────────────────
publicRoutes.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const config = await getAllConfig(c.env.DB);
  const siteName = config["site_name"] ?? c.env.SITE_NAME;

  let articles = [] as Awaited<ReturnType<typeof searchArticles>>;

  if (q.length >= 2) {
    try {
      articles = await searchArticles(c.env.DB, q);
    } catch {
      articles = [];
    }
    c.executionCtx.waitUntil(trackEvent(c.env.DB, "search"));
  }

  const html = renderLayout(
    `Search: ${q} | ${siteName}`,
    `<section class="search-page container">
      <h1>Search Results</h1>
      <form method="get" action="/search" class="search-form">
        <input type="search" name="q" value="${escapeHtml(q)}" placeholder="Search articles…" />
        <button type="submit">Search</button>
      </form>
      ${
        q
          ? `<p>${articles.length} result(s) for "<strong>${escapeHtml(q)}</strong>"</p>
         <div class="article-grid">
           ${articles
             .map(
               (a) => `<article class="card">
             <h2><a href="/articles/${a.slug}">${a.title}</a></h2>
             <p>${a.excerpt}</p>
           </article>`
             )
             .join("")}
         </div>`
          : ""
      }
    </section>`,
    config
  );

  return c.html(html);
});

// ─── Affiliate redirect ───────────────────────────────────────────────────────
publicRoutes.get("/go/:affiliateId", async (c) => {
  const id = parseInt(c.req.param("affiliateId"), 10);
  if (isNaN(id)) return c.notFound();

  const affiliate = await getAffiliateById(c.env.DB, id);
  if (!affiliate || !affiliate.active) return c.notFound();

  const ip = c.req.header("CF-Connecting-IP") ?? "";
  c.executionCtx.waitUntil(
    Promise.all([
      trackClick(c.env.DB, id),
      trackEvent(c.env.DB, "affiliate_click", { affiliate_id: id, ip }),
    ])
  );

  // Build URL with tracking params
  let redirectUrl = affiliate.base_url;
  try {
    const params = JSON.parse(affiliate.tracking_params) as Record<string, string>;
    const url = new URL(affiliate.base_url);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    redirectUrl = url.toString();
  } catch {
    // Use base URL as-is
  }

  return c.redirect(redirectUrl, 302);
});

// ─── Sitemap ──────────────────────────────────────────────────────────────────
publicRoutes.get("/sitemap.xml", async (c) => {
  const cacheKey = "sitemap:xml";
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) {
    return c.body(cached, 200, { "Content-Type": "application/xml" });
  }

  const config = await getAllConfig(c.env.DB);
  const siteUrl = config["site_url"] ?? c.env.SITE_URL ?? "https://example.com";
  const articles = await listPublishedArticles(c.env.DB);

  const urls = [
    `<url><loc>${siteUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...articles.map(
      (a) =>
        `<url><loc>${siteUrl}/articles/${a.slug}</loc><lastmod>${
          a.published_at?.split("T")[0] ?? new Date().toISOString().split("T")[0]
        }</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`
    ),
  ].join("\n  ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;

  await c.env.CACHE.put(cacheKey, xml, { expirationTtl: 3600 });
  return c.body(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

// ─── RSS Feed ─────────────────────────────────────────────────────────────────
publicRoutes.get("/feed.xml", async (c) => {
  const cacheKey = "feed:rss";
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) {
    return c.body(cached, 200, { "Content-Type": "application/rss+xml" });
  }

  const config = await getAllConfig(c.env.DB);
  const siteUrl = config["site_url"] ?? c.env.SITE_URL ?? "https://example.com";
  const siteName = config["site_name"] ?? c.env.SITE_NAME;
  const articles = await listArticles(c.env.DB, { status: "published", limit: 20 });

  const items = articles
    .map(
      (a) =>
        `<item>
      <title>${escapeXml(a.title)}</title>
      <link>${siteUrl}/articles/${a.slug}</link>
      <description>${escapeXml(a.excerpt)}</description>
      <pubDate>${new Date(a.published_at ?? a.created_at).toUTCString()}</pubDate>
      <guid isPermaLink="true">${siteUrl}/articles/${a.slug}</guid>
    </item>`
    )
    .join("\n  ");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteName)} - Latest Articles</description>
    <language>${config["language"] ?? "en"}</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  await c.env.CACHE.put(cacheKey, xml, { expirationTtl: 3600 });
  return c.body(xml, 200, { "Content-Type": "application/rss+xml; charset=utf-8" });
});

// ─── Robots.txt ───────────────────────────────────────────────────────────────
publicRoutes.get("/robots.txt", async (c) => {
  const config = await getAllConfig(c.env.DB);
  const siteUrl = config["site_url"] ?? c.env.SITE_URL ?? "https://example.com";

  return c.text(
    `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /install

Sitemap: ${siteUrl}/sitemap.xml
`
  );
});

// ─── Payment pages ────────────────────────────────────────────────────────────
publicRoutes.get("/payment/success", async (c) => {
  const config = await getAllConfig(c.env.DB);
  return c.html(
    renderLayout(
      "Payment Successful",
      `<div class="container" style="text-align:center;padding:4rem 1rem">
        <h1>🎉 Thank you!</h1>
        <p>Your premium access has been granted. Enjoy the content!</p>
        <a href="/" class="btn">Back to Home</a>
      </div>`,
      config
    )
  );
});

publicRoutes.get("/payment/cancel", async (c) => {
  const config = await getAllConfig(c.env.DB);
  return c.html(
    renderLayout(
      "Payment Cancelled",
      `<div class="container" style="text-align:center;padding:4rem 1rem">
        <h1>Payment Cancelled</h1>
        <p>Your payment was not completed. No charges were made.</p>
        <a href="/" class="btn">Back to Home</a>
      </div>`,
      config
    )
  );
});

// ─── Yoco checkout creation ───────────────────────────────────────────────────
publicRoutes.post("/payment/checkout", async (c) => {
  const config = await getAllConfig(c.env.DB);
  const yocoSecretKey = config["yoco_secret_key"] ?? c.env.YOCO_SECRET_KEY;
  const siteUrl = config["site_url"] ?? c.env.SITE_URL;

  if (!yocoSecretKey) {
    return c.json({ error: "Payment not configured" }, 503);
  }

  let body: { article_id?: number; amount_cents?: number };
  try {
    body = await c.req.json<{ article_id?: number; amount_cents?: number }>();
  } catch {
    return c.json({ error: "Invalid request" }, 400);
  }

  const response = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${yocoSecretKey}`,
    },
    body: JSON.stringify({
      amount: body.amount_cents ?? 500,
      currency: "ZAR",
      successUrl: `${siteUrl}/payment/success`,
      cancelUrl: `${siteUrl}/payment/cancel`,
      metadata: {
        article_id: String(body.article_id ?? ""),
      },
    }),
  });

  if (!response.ok) {
    return c.json({ error: "Failed to create checkout" }, 502);
  }

  const data = await response.json();
  return c.json(data);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
