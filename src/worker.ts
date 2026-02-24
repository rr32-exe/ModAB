import { Hono } from "hono";
import type { Env } from "./types";
import { publicRoutes } from "./routes/public";
import { adminRoutes } from "./routes/admin";
import { installRoutes } from "./routes/install";
import { webhookRoutes } from "./routes/webhooks";
import { listCalendarByDate, updateCalendarStatus } from "./db/articles";
import { generateArticle } from "./ai/content";
import { generateSEO } from "./ai/seo";
import { generateArticleImages } from "./ai/images";
import { generateVideo } from "./ai/video";
import { createArticle, publishArticle } from "./db/articles";
import { getAffiliatesByNiche } from "./db/affiliates";

const app = new Hono<{ Bindings: Env }>();

// ─── Install ──────────────────────────────────────────────────────────────────
app.route("/install", installRoutes);

// ─── Public ───────────────────────────────────────────────────────────────────
app.route("/", publicRoutes);

// ─── Admin ────────────────────────────────────────────────────────────────────
app.route("/admin", adminRoutes);

// ─── Webhooks ─────────────────────────────────────────────────────────────────
app.route("/webhooks", webhookRoutes);

// ─── Scheduled handler ────────────────────────────────────────────────────────
async function handleScheduled(env: Env): Promise<void> {
  const today = new Date().toISOString().split("T")[0] as string;

  // Fetch calendar items that are queued or scheduled for today
  const items = await listCalendarByDate(env.DB, today);

  for (const item of items) {
    try {
      // Mark as generating to prevent duplicate runs
      await updateCalendarStatus(env.DB, item.id, "generating");

      const affiliates = await getAffiliatesByNiche(env.DB, item.primary_keyword);
      const article = await generateArticle(
        env,
        item.title,
        item.primary_keyword,
        item.content_angle,
        affiliates
      );

      const [seo, images] = await Promise.all([
        generateSEO(env, article.title, article.content, env.NICHE),
        generateArticleImages(env, item.primary_keyword, article.title),
      ]);

      let videoData;
      try {
        videoData = await generateVideo(env, item.primary_keyword, { title: article.title });
      } catch {
        // video generation is best-effort
      }

      const saved = await createArticle(env.DB, {
        ...article,
        meta_description: seo.meta_description,
        schema_json: seo.schema_json,
        keywords: JSON.stringify(seo.lsi_keywords),
        primary_keyword: seo.primary_keyword,
        images: JSON.stringify(images),
        cover_image_url: images[0] ? `data:image/png;base64,${images[0].base64}` : "",
        video_url: videoData?.embed_url ?? "",
        status: "published",
        published_at: new Date().toISOString(),
      });

      await publishArticle(env.DB, saved.id);
      await updateCalendarStatus(env.DB, item.id, "done", saved.id);

      // Ping search engines
      const sitemapUrl = encodeURIComponent(`${env.SITE_URL}/sitemap.xml`);
      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`),
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`),
      ]);
    } catch (err) {
      console.error(`Failed to generate article for calendar item ${item.id}:`, err);
      await updateCalendarStatus(env.DB, item.id, "planned");
    }
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    await handleScheduled(env);
  },
};
