import type { Env, Article, Affiliate, AffiliateLink } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Strip all HTML tags including incomplete ones (e.g. `<script` without `>`). */
function stripHtml(str: string): string {
  // Iteratively remove tags until none remain, handling malformed/incomplete tags
  let result = str;
  let prev: string;
  do {
    prev = result;
    result = result.replace(/<[^>]*(>|$)/g, "");
  } while (result !== prev);
  return result;
}

// ─── Main generation ─────────────────────────────────────────────────────────
export async function generateArticle(
  env: Env,
  topic: string,
  keyword: string,
  angle: string,
  affiliates: Affiliate[]
): Promise<Omit<Article, "id" | "created_at" | "view_count" | "published_at">> {
  const affiliateContext = affiliates
    .map((a) => `- ${a.name}: ${a.base_url}`)
    .join("\n");

  const systemPrompt = `You are an expert travel/lifestyle blogger who writes SEO-optimised, 
engaging long-form articles. Write in a friendly, authoritative tone. 
Always use proper HTML formatting with h1, h2, h3 tags and paragraph tags.`;

  const userPrompt = `Write a comprehensive, SEO-optimised blog article about: "${topic}"

Primary keyword: "${keyword}"
Content angle: "${angle}"

Requirements:
- MINIMUM 2500 words
- Start with a compelling H1 title
- Include 5-8 major H2 sections
- Add H3 sub-sections where relevant
- Write a 2-3 sentence excerpt/intro hook before the first H2
- Include a "Table of Contents" section after the intro
- Include practical tips, specific recommendations, and actionable advice
- End with a strong conclusion and call-to-action
- Use proper HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>

Available affiliate products/services to naturally mention where relevant:
${affiliateContext || "No specific affiliates – write general recommendations"}

Return ONLY the HTML article content, starting with the <h1> tag.`;

  const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    }
  );

  const rawContent =
    typeof response === "object" && response !== null && "response" in response
      ? String((response as { response: unknown }).response)
      : "";

  // Extract H1 title from content
  const titleMatch = rawContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? stripHtml(titleMatch[1] ?? "") : topic;
  const slug = slugify(title);

  // Extract excerpt (first <p> after h1)
  const excerptMatch = rawContent.match(/<h1[^>]*>.*?<\/h1>\s*<p>(.*?)<\/p>/is);
  const excerpt = excerptMatch
    ? stripHtml(excerptMatch[1] ?? "").slice(0, 300)
    : `Discover everything you need to know about ${topic}.`;

  // Second AI pass: insert affiliate links naturally
  const contentWithAffiliates = await insertAffiliateLinks(
    env,
    rawContent,
    affiliates
  );

  // Build Table of Contents
  const toc = buildTableOfContents(contentWithAffiliates);
  const finalContent = injectTableOfContents(contentWithAffiliates, toc);

  // Author bio
  const authorBio = await generateAuthorBio(env, env.NICHE);

  const wordCount = finalContent.split(/\s+/).length;

  return {
    title,
    slug,
    excerpt,
    content: finalContent,
    raw_markdown: finalContent, // Store HTML as raw for simplicity
    primary_keyword: keyword,
    keywords: JSON.stringify([keyword]),
    meta_description: excerpt.slice(0, 160),
    schema_json: "{}",
    cover_image_url: "",
    images: "[]",
    video_url: "",
    affiliate_links: JSON.stringify(
      affiliates.map(
        (a): AffiliateLink => ({
          text: a.name,
          url: a.base_url,
          network: a.network,
        })
      )
    ),
    word_count: wordCount,
    read_time: estimateReadTime(finalContent),
    status: "draft",
    is_premium: 0,
  };
}

// ─── Affiliate link injection ─────────────────────────────────────────────────
async function insertAffiliateLinks(
  env: Env,
  content: string,
  affiliates: Affiliate[]
): Promise<string> {
  if (affiliates.length === 0) return content;

  const affiliateList = affiliates
    .map((a) => `${a.name}: ${a.base_url} (keywords: ${a.niche_keywords})`)
    .join("\n");

  const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content:
            "You are an HTML editor. Insert affiliate links naturally into blog content. Return only the modified HTML.",
        },
        {
          role: "user",
          content: `Insert these affiliate links naturally into the article where contextually relevant. 
Use <a href="URL" rel="sponsored noopener" target="_blank">anchor text</a> format. 
Insert each link no more than twice. Do not change any other content.

Affiliates:
${affiliateList}

Article HTML:
${content.slice(0, 3000)}`,
        },
      ],
      max_tokens: 4096,
    }
  );

  const modified =
    typeof response === "object" && response !== null && "response" in response
      ? String((response as { response: unknown }).response)
      : "";

  return modified.length > 500 ? modified : content;
}

// ─── Table of Contents ────────────────────────────────────────────────────────
interface TocItem {
  level: number;
  text: string;
  id: string;
}

function buildTableOfContents(content: string): TocItem[] {
  const headingRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  const items: TocItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = parseInt(match[1] ?? "2", 10);
    const text = stripHtml(match[2] ?? "");
    const id = slugify(text);
    items.push({ level, text, id });
  }

  return items;
}

function injectTableOfContents(content: string, toc: TocItem[]): string {
  if (toc.length === 0) return content;

  const tocHtml = `<nav class="toc" aria-label="Table of contents">
  <h2>Table of Contents</h2>
  <ol>
    ${toc
      .map(
        (item) =>
          `<li style="margin-left:${(item.level - 2) * 20}px">
      <a href="#${item.id}">${item.text}</a>
    </li>`
      )
      .join("\n    ")}
  </ol>
</nav>`;

  // Add IDs to headings
  let result = content.replace(
    /<h([23])([^>]*)>(.*?)<\/h[23]>/gi,
    (_match, level, attrs, text) => {
      const cleanText = stripHtml(text as string);
      const id = slugify(cleanText);
      return `<h${level}${attrs} id="${id}">${text}</h${level}>`;
    }
  );

  // Inject TOC after first <h1>
  result = result.replace(/(<\/h1>)/, `$1\n${tocHtml}\n`);

  return result;
}

// ─── Author bio ───────────────────────────────────────────────────────────────
async function generateAuthorBio(env: Env, niche: string): Promise<string> {
  const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "user",
          content: `Write a 2-sentence author bio for a ${niche} blogger. 
Make it friendly and credible. Return only the bio text, no quotes.`,
        },
      ],
      max_tokens: 128,
    }
  );

  return typeof response === "object" && response !== null && "response" in response
    ? String((response as { response: unknown }).response)
    : `A passionate ${niche} enthusiast sharing tips and experiences from around the world.`;
}
