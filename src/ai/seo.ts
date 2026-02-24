import type { Env, SEOData } from "../types";

// ─── Main SEO generation ──────────────────────────────────────────────────────
export async function generateSEO(
  env: Env,
  title: string,
  content: string,
  niche: string
): Promise<SEOData> {
  // Strip HTML tags from content before sending to AI (handles incomplete tags too)
  let strippedContent = content;
  let prev: string;
  do {
    prev = strippedContent;
    strippedContent = strippedContent.replace(/<[^>]*(>|$)/g, "");
  } while (strippedContent !== prev);
  const contentSnippet = strippedContent.slice(0, 2000);

  const prompt = `Analyse this blog article and generate SEO metadata. Return ONLY valid JSON.

Article title: "${title}"
Niche: "${niche}"
Content snippet: "${contentSnippet}"

Return this exact JSON structure:
{
  "title_tag": "50-60 char SEO title",
  "meta_description": "150-160 char compelling meta description with primary keyword",
  "primary_keyword": "main focus keyword",
  "lsi_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "longtail_variations": ["long tail 1", "long tail 2", "long tail 3"],
  "og_title": "Open Graph title",
  "og_description": "Open Graph description 200 chars max",
  "twitter_title": "Twitter card title",
  "twitter_description": "Twitter card description 200 chars max"
}`;

  const response = await (env.AI.run as (model: string, inputs: Record<string, unknown>) => Promise<unknown>)(
    "@cf/meta/llama-3.1-8b-instruct",
    {
      messages: [
        {
          role: "system",
          content: "You are an SEO expert. Return only valid JSON, no markdown code blocks.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1024,
    }
  );

  const raw =
    typeof response === "object" && response !== null && "response" in response
      ? String((response as { response: unknown }).response)
      : "{}";

  let parsed: Partial<SEOData>;
  try {
    // Strip any markdown code fences
    const cleaned = raw.replace(/```json?\s*/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<SEOData>) : {};
  } catch {
    parsed = {};
  }

  const primaryKeyword = parsed.primary_keyword ?? extractPrimaryKeyword(title);

  const schemaJson = buildSchemaJson(title, parsed.meta_description ?? "", niche, primaryKeyword);

  return {
    title_tag: truncate(parsed.title_tag ?? title, 60),
    meta_description: truncate(parsed.meta_description ?? "", 160),
    primary_keyword: primaryKeyword,
    lsi_keywords: parsed.lsi_keywords ?? [],
    longtail_variations: parsed.longtail_variations ?? [],
    schema_json: schemaJson,
    og_title: parsed.og_title ?? title,
    og_description: truncate(parsed.og_description ?? "", 200),
    twitter_title: parsed.twitter_title ?? title,
    twitter_description: truncate(parsed.twitter_description ?? "", 200),
  };
}

// ─── Schema.org JSON-LD builder ───────────────────────────────────────────────
function buildSchemaJson(
  title: string,
  description: string,
  niche: string,
  keyword: string
): string {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    keywords: keyword,
    articleSection: niche,
    inLanguage: "en",
    author: {
      "@type": "Person",
      name: `${niche} Expert`,
    },
    publisher: {
      "@type": "Organization",
      name: niche,
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: niche,
        item: `/category/${niche.toLowerCase().replace(/\s+/g, "-")}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is the best ${keyword}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: description,
        },
      },
    ],
  };

  return JSON.stringify([article, breadcrumb, faq]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

function extractPrimaryKeyword(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .filter((w) => w.length > 3)
    .slice(0, 3)
    .join(" ");
}
