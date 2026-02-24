import type { Article } from "../types";
import { renderLayout, escapeHtml } from "./layout";

export function renderArticlePage(
  article: Article,
  config: Record<string, string>
): string {
  const siteUrl = config["site_url"] ?? "";
  const adsenseId = config["adsense_id"] ?? "";
  const yocoPublicKey = config["yoco_public_key"] ?? "";

  const publishedDate = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const coverImage = article.cover_image_url
    ? `<div class="article-hero">
        <img src="${article.cover_image_url}" 
             alt="${escapeHtml(article.title)}" 
             width="1200" height="630"
             loading="eager"
             fetchpriority="high"/>
      </div>`
    : "";

  const videoEmbed = buildVideoEmbed(article.video_url);

  const affiliateDisclosure = article.affiliate_links && article.affiliate_links !== "[]"
    ? `<aside class="affiliate-disclosure-banner">
        <strong>💼 Affiliate Disclosure:</strong> This article contains affiliate links. 
        We may earn a commission if you make a purchase – at no extra cost to you.
      </aside>`
    : "";

  const premiumLock = article.is_premium
    ? buildPremiumLock(article.id, yocoPublicKey, config["site_url"] ?? "")
    : "";

  const adSlot = (id: string) =>
    adsenseId
      ? `<ins class="adsbygoogle" style="display:block" data-ad-client="${adsenseId}" data-ad-slot="${id}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`
      : "";

  const schemaData = (() => {
    try {
      return JSON.parse(article.schema_json) as unknown[];
    } catch {
      return [];
    }
  })();

  const content = `
<article class="article-page" itemscope itemtype="https://schema.org/Article">
  <div class="container article-container">

    <header class="article-header">
      ${coverImage}
      <div class="article-meta">
        <span class="article-category">${escapeHtml(article.primary_keyword)}</span>
        <h1 class="article-title" itemprop="headline">${escapeHtml(article.title)}</h1>
        <div class="article-byline">
          <span class="article-author" itemprop="author">By <strong>${escapeHtml(config["site_name"] ?? "Editor")}</strong></span>
          ${publishedDate ? `<time class="article-date" itemprop="datePublished" datetime="${article.published_at ?? ""}">${publishedDate}</time>` : ""}
          <span class="article-read-time">⏱ ${article.read_time} min read</span>
          <span class="article-words">${article.word_count.toLocaleString()} words</span>
        </div>
      </div>
    </header>

    ${adSlot("header-ad")}
    ${affiliateDisclosure}

    <div class="article-layout">
      <div class="article-content" itemprop="articleBody">
        ${premiumLock || article.content}
      </div>

      <aside class="article-sidebar">
        ${adSlot("sidebar-ad")}
        ${buildTipJar(article.id, yocoPublicKey, config["site_url"] ?? "")}
        ${buildShareButtons(article, siteUrl)}
      </aside>
    </div>

    ${videoEmbed}
    ${adSlot("mid-content-ad")}

    <section class="author-bio">
      <div class="author-avatar">✍️</div>
      <div class="author-info">
        <strong>${escapeHtml(config["site_name"] ?? "Editor")}</strong>
        <p>${escapeHtml(config["target_audience"] ?? `A passionate ${config["niche"] ?? ""} enthusiast and writer.`)}</p>
      </div>
    </section>

  </div>
</article>`;

  return renderLayout(
    article.title,
    content,
    config,
    {
      canonical: `${siteUrl}/articles/${article.slug}`,
      og_image: article.cover_image_url,
      og_type: "article",
      schema_json: schemaData.length > 0 ? JSON.stringify(schemaData) : undefined,
    }
  );
}

// ─── Video embed ──────────────────────────────────────────────────────────────
function buildVideoEmbed(videoUrl: string): string {
  if (!videoUrl) return "";

  const isYoutube =
    videoUrl.includes("youtube.com/embed") || videoUrl.includes("youtu.be");

  if (isYoutube) {
    return `<div class="video-embed">
      <div class="video-wrapper">
        <iframe src="${videoUrl}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
                loading="lazy"
                title="Related video"></iframe>
      </div>
    </div>`;
  }

  // Luma or direct video
  return `<div class="video-embed">
    <video src="${videoUrl}" controls preload="metadata" style="width:100%;border-radius:8px">
      Your browser does not support video.
    </video>
  </div>`;
}

// ─── Premium lock ─────────────────────────────────────────────────────────────
function buildPremiumLock(
  articleId: number,
  yocoPublicKey: string,
  siteUrl: string
): string {
  return `<div class="premium-lock-overlay">
    <div class="premium-lock-content">
      <span class="lock-icon">🔒</span>
      <h3>Premium Content</h3>
      <p>Unlock this full article for a one-time payment.</p>
      ${
        yocoPublicKey
          ? `<button class="btn btn-premium" 
              onclick="unlockArticle(${articleId})">
              Unlock for R5 🇿🇦
            </button>
            <script>
              async function unlockArticle(id){
                const res = await fetch('/payment/checkout',{
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({article_id:id,amount_cents:500})
                });
                const data = await res.json();
                if(data.redirectUrl) window.location.href = data.redirectUrl;
              }
            </script>`
          : `<p><em>Premium payment not configured.</em></p>`
      }
    </div>
  </div>`;
}

// ─── Tip jar ──────────────────────────────────────────────────────────────────
function buildTipJar(
  articleId: number,
  yocoPublicKey: string,
  siteUrl: string
): string {
  if (!yocoPublicKey) return "";

  return `<div class="tip-jar">
    <h4>☕ Enjoyed this article?</h4>
    <p>Buy me a coffee to support more great content!</p>
    <button class="btn btn-tip" onclick="tipAuthor(${articleId})">
      Tip R10 ☕
    </button>
    <script>
      async function tipAuthor(id){
        const res = await fetch('/payment/checkout',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({article_id:id,amount_cents:1000})
        });
        const data = await res.json();
        if(data.redirectUrl) window.location.href = data.redirectUrl;
      }
    </script>
  </div>`;
}

// ─── Social share buttons ─────────────────────────────────────────────────────
function buildShareButtons(article: Article, siteUrl: string): string {
  const url = encodeURIComponent(`${siteUrl}/articles/${article.slug}`);
  const text = encodeURIComponent(article.title);

  return `<div class="share-buttons">
    <h4>Share this article</h4>
    <a href="https://twitter.com/intent/tweet?url=${url}&text=${text}" 
       target="_blank" rel="noopener" class="share-btn share-twitter">
      𝕏 Twitter
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" 
       target="_blank" rel="noopener" class="share-btn share-facebook">
      Facebook
    </a>
    <a href="https://wa.me/?text=${text}%20${url}" 
       target="_blank" rel="noopener" class="share-btn share-whatsapp">
      WhatsApp
    </a>
    <a href="https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${text}" 
       target="_blank" rel="noopener" class="share-btn share-linkedin">
      LinkedIn
    </a>
  </div>`;
}
