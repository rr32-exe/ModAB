import type { Env, CalendarEntry, ContentCalendarItem } from "../types";

// ─── Generate calendar ────────────────────────────────────────────────────────
export async function generateCalendar(
  env: Env,
  niche: string,
  audience: string,
  articlesPerWeek: number
): Promise<ContentCalendarItem[]> {
  const prompt = `Create a 30-day content calendar for a ${niche} blog targeting ${audience}.
Generate ${articlesPerWeek} articles per week.

Return ONLY a valid JSON array (no markdown) with exactly ${Math.ceil((articlesPerWeek / 7) * 30)} items.
Each item must follow this structure:
{
  "date": "YYYY-MM-DD",
  "title": "Compelling blog post title",
  "primary_keyword": "target SEO keyword",
  "content_angle": "unique angle or hook for this article",
  "affiliate_opportunity": "which affiliate product/service fits naturally",
  "search_intent": "informational|commercial|transactional|navigational"
}

Start dates from today: ${new Date().toISOString().split("T")[0]}
Space articles ${Math.round(7 / articlesPerWeek)} days apart.
Vary topics to cover different aspects of ${niche}.
Focus on high search volume, low competition keywords.`;

  const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content:
            "You are a content strategist. Return only valid JSON arrays, no markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
    }
  );

  const raw =
    typeof response === "object" && response !== null && "response" in response
      ? String((response as { response: unknown }).response)
      : "[]";

  let items: ContentCalendarItem[] = [];

  try {
    const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
    const arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      items = JSON.parse(arrMatch[0]) as ContentCalendarItem[];
    }
  } catch {
    // Return fallback calendar if AI response is malformed
    items = buildFallbackCalendar(niche, articlesPerWeek);
  }

  return items.slice(0, 30);
}

// ─── Persist calendar to D1 ───────────────────────────────────────────────────
export async function saveCalendarToDb(
  db: D1Database,
  items: ContentCalendarItem[],
  markQueued = false
): Promise<void> {
  const status = markQueued ? "queued" : "planned";

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO content_calendar 
     (scheduled_date, title, primary_keyword, content_angle, target_affiliate, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const batch = items.map((item) =>
    stmt.bind(
      item.date,
      item.title,
      item.primary_keyword,
      item.content_angle,
      item.affiliate_opportunity,
      status
    )
  );

  await db.batch(batch);
}

// ─── Fallback calendar ────────────────────────────────────────────────────────
function buildFallbackCalendar(
  niche: string,
  articlesPerWeek: number
): ContentCalendarItem[] {
  const templates = [
    {
      titleFn: (n: string) => `The Ultimate Guide to ${n}`,
      keyword: `best ${niche} guide`,
      angle: "comprehensive guide for beginners",
      affiliate: "amazon",
      intent: "informational" as const,
    },
    {
      titleFn: (n: string) => `Top 10 ${n} Tips for 2025`,
      keyword: `${niche} tips`,
      angle: "listicle with actionable advice",
      affiliate: "booking",
      intent: "commercial" as const,
    },
    {
      titleFn: (n: string) => `How to Save Money on ${n}`,
      keyword: `cheap ${niche}`,
      angle: "budget-focused guide",
      affiliate: "getyourguide",
      intent: "transactional" as const,
    },
    {
      titleFn: (n: string) => `${n} for Beginners: Everything You Need to Know`,
      keyword: `${niche} for beginners`,
      angle: "beginner-friendly walkthrough",
      affiliate: "viator",
      intent: "informational" as const,
    },
  ];

  const items: ContentCalendarItem[] = [];
  const today = new Date();
  const intervalDays = Math.round(7 / articlesPerWeek);
  const count = Math.min(30, Math.ceil((articlesPerWeek / 7) * 30));

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]!;
    const date = new Date(today);
    date.setDate(today.getDate() + i * intervalDays);

    items.push({
      date: date.toISOString().split("T")[0] as string,
      title: template.titleFn(niche),
      primary_keyword: template.keyword,
      content_angle: template.angle,
      affiliate_opportunity: template.affiliate,
      search_intent: template.intent,
    });
  }

  return items;
}

// ─── Re-export CalendarEntry for convenience ──────────────────────────────────
export type { CalendarEntry };
