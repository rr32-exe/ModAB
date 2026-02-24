import type { Article, ArticleStatus, CalendarStatus } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────
type CreateArticleData = Omit<Article, "id" | "created_at" | "view_count">;

interface ListOptions {
  status?: ArticleStatus;
  limit?: number;
  offset?: number;
  category?: string;
}

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createArticle(
  db: D1Database,
  data: CreateArticleData
): Promise<Article> {
  const result = await db
    .prepare(
      `INSERT INTO articles
       (title, slug, excerpt, content, raw_markdown, primary_keyword, keywords,
        meta_description, schema_json, cover_image_url, images, video_url,
        affiliate_links, word_count, read_time, status, is_premium, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      data.title,
      data.slug,
      data.excerpt,
      data.content,
      data.raw_markdown,
      data.primary_keyword,
      data.keywords,
      data.meta_description,
      data.schema_json,
      data.cover_image_url,
      data.images,
      data.video_url,
      data.affiliate_links,
      data.word_count,
      data.read_time,
      data.status,
      data.is_premium,
      data.published_at ?? null
    )
    .first<Article>();

  if (!result) throw new Error("Failed to create article");
  return result;
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function getArticle(
  db: D1Database,
  slug: string
): Promise<Article | null> {
  return db
    .prepare("SELECT * FROM articles WHERE slug = ? LIMIT 1")
    .bind(slug)
    .first<Article>();
}

export async function getArticleById(
  db: D1Database,
  id: number
): Promise<Article | null> {
  return db
    .prepare("SELECT * FROM articles WHERE id = ? LIMIT 1")
    .bind(id)
    .first<Article>();
}

export async function listArticles(
  db: D1Database,
  options: ListOptions = {}
): Promise<Article[]> {
  const { status = "published", limit = 10, offset = 0 } = options;

  const result = await db
    .prepare(
      `SELECT * FROM articles WHERE status = ?
       ORDER BY published_at DESC, created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(status, limit, offset)
    .all<Article>();

  return result.results;
}

export async function listAllArticles(
  db: D1Database,
  limit = 50,
  offset = 0
): Promise<Article[]> {
  const result = await db
    .prepare(
      `SELECT * FROM articles
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all<Article>();

  return result.results;
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function updateArticle(
  db: D1Database,
  id: number,
  data: Partial<CreateArticleData>
): Promise<void> {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => data[f] ?? null);

  await db
    .prepare(`UPDATE articles SET ${setClause} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function publishArticle(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `UPDATE articles 
       SET status = 'published', published_at = datetime('now')
       WHERE id = ?`
    )
    .bind(id)
    .run();

  // Keep FTS in sync
  await db
    .prepare(
      `INSERT OR REPLACE INTO articles_fts(rowid, title, content, keywords)
       SELECT id, title, content, keywords FROM articles WHERE id = ?`
    )
    .bind(id)
    .run();
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteArticle(db: D1Database, id: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM articles_fts WHERE rowid = ?").bind(id),
    db.prepare("DELETE FROM articles WHERE id = ?").bind(id),
  ]);
}

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchArticles(
  db: D1Database,
  query: string
): Promise<Article[]> {
  const result = await db
    .prepare(
      `SELECT a.* FROM articles a
       INNER JOIN articles_fts fts ON fts.rowid = a.id
       WHERE articles_fts MATCH ?
       ORDER BY rank
       LIMIT 20`
    )
    .bind(query)
    .all<Article>();

  return result.results;
}

// ─── Related articles ─────────────────────────────────────────────────────────
export async function getRelatedArticles(
  db: D1Database,
  keywords: string,
  excludeId: number
): Promise<Article[]> {
  const result = await db
    .prepare(
      `SELECT * FROM articles
       WHERE status = 'published'
         AND id != ?
         AND (keywords LIKE ? OR primary_keyword LIKE ?)
       ORDER BY published_at DESC
       LIMIT 4`
    )
    .bind(excludeId, `%${keywords}%`, `%${keywords}%`)
    .all<Article>();

  return result.results;
}

// ─── Increment view count ─────────────────────────────────────────────────────
export async function incrementViewCount(
  db: D1Database,
  id: number
): Promise<void> {
  await db
    .prepare("UPDATE articles SET view_count = view_count + 1 WHERE id = ?")
    .bind(id)
    .run();
}

// ─── Content calendar ─────────────────────────────────────────────────────────
import type { CalendarEntry } from "../types";

export async function listCalendarByDate(
  db: D1Database,
  date: string
): Promise<CalendarEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM content_calendar
       WHERE (status = 'queued' OR scheduled_date = ?)
         AND status NOT IN ('generating', 'done')
       ORDER BY scheduled_date ASC
       LIMIT 5`
    )
    .bind(date)
    .all<CalendarEntry>();

  return result.results;
}

export async function listCalendar(
  db: D1Database,
  limit = 30
): Promise<CalendarEntry[]> {
  const result = await db
    .prepare(
      `SELECT * FROM content_calendar
       ORDER BY scheduled_date ASC
       LIMIT ?`
    )
    .bind(limit)
    .all<CalendarEntry>();

  return result.results;
}

export async function updateCalendarStatus(
  db: D1Database,
  id: number,
  status: CalendarStatus,
  articleId?: number
): Promise<void> {
  if (articleId !== undefined) {
    await db
      .prepare(
        "UPDATE content_calendar SET status = ?, article_id = ? WHERE id = ?"
      )
      .bind(status, articleId, id)
      .run();
  } else {
    await db
      .prepare("UPDATE content_calendar SET status = ? WHERE id = ?")
      .bind(status, id)
      .run();
  }
}

// ─── Sitemap data ─────────────────────────────────────────────────────────────
export async function listPublishedArticles(
  db: D1Database
): Promise<Pick<Article, "slug" | "published_at">[]> {
  const result = await db
    .prepare(
      "SELECT slug, published_at FROM articles WHERE status = 'published' ORDER BY published_at DESC"
    )
    .all<Pick<Article, "slug" | "published_at">>();

  return result.results;
}
