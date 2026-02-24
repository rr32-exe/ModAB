import type { Article } from "../types";
import { renderLayout, escapeHtml } from "./layout";

export function renderHomePage(
  articles: Article[],
  siteName: string,
  config: Record<string, string>
): string {
  const niche = config["niche"] ?? siteName;
  const featured = articles[0];
  const rest = articles.slice(1);

  const featuredHtml = featured
    ? `<section class="hero">
        <div class="container">
          <div class="hero-content">
            ${
              featured.cover_image_url
                ? `<img class="hero-image" src="${featured.cover_image_url}" alt="${escapeHtml(featured.title)}" loading="eager"/>`
                : `<div class="hero-image-placeholder"></div>`
            }
            <div class="hero-text">
              <span class="hero-tag">${escapeHtml(featured.primary_keyword)}</span>
              <h1 class="hero-title">
                <a href="/articles/${featured.slug}">${escapeHtml(featured.title)}</a>
              </h1>
              <p class="hero-excerpt">${escapeHtml(featured.excerpt)}</p>
              <div class="hero-meta">
                <span>⏱ ${featured.read_time} min read</span>
                ${featured.published_at ? `<time>${new Date(featured.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>` : ""}
              </div>
              <a href="/articles/${featured.slug}" class="btn btn-primary">Read Article →</a>
            </div>
          </div>
        </div>
      </section>`
    : `<section class="hero hero-empty">
        <div class="container">
          <h1>Welcome to ${escapeHtml(siteName)}</h1>
          <p>Your ${escapeHtml(niche)} resource. Check back soon for fresh articles.</p>
        </div>
      </section>`;

  const articleCards = rest
    .map((a) => renderArticleCard(a))
    .join("");

  const searchBar = `
    <section class="search-section">
      <div class="container">
        <form method="get" action="/search" class="search-form">
          <input type="search" name="q" placeholder="Search ${escapeHtml(niche)} articles…" 
                 class="search-input" aria-label="Search articles"/>
          <button type="submit" class="search-btn">Search</button>
        </form>
      </div>
    </section>`;

  const newsletterSection = config["resend_api_key"]
    ? `<section class="newsletter-section">
        <div class="container">
          <div class="newsletter-box">
            <h2>📬 Stay Updated</h2>
            <p>Get the latest ${escapeHtml(niche)} tips delivered to your inbox.</p>
            <form class="newsletter-form" onsubmit="subscribeNewsletter(event)">
              <input type="email" name="email" placeholder="your@email.com" required/>
              <button type="submit" class="btn">Subscribe Free</button>
            </form>
          </div>
        </div>
        <script>
          async function subscribeNewsletter(e){
            e.preventDefault();
            const email = e.target.email.value;
            const res = await fetch('/api/newsletter',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({email})
            });
            if(res.ok){
              e.target.innerHTML='<p>✅ Thanks for subscribing!</p>';
            }
          }
        </script>
      </section>`
    : "";

  const gridSection = rest.length > 0
    ? `<section class="articles-section">
        <div class="container">
          <h2 class="section-title">Latest Articles</h2>
          <div class="article-grid">
            ${articleCards}
          </div>
        </div>
      </section>`
    : "";

  const content = `
    ${featuredHtml}
    ${searchBar}
    ${gridSection}
    ${newsletterSection}
  `;

  return renderLayout(
    `${siteName} – ${niche} Tips, Guides & More`,
    content,
    config
  );
}

function renderArticleCard(article: Article): string {
  const date = article.published_at
    ? new Date(article.published_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return `<article class="card">
    ${
      article.cover_image_url
        ? `<a href="/articles/${article.slug}" class="card-image-link">
            <img class="card-image" src="${article.cover_image_url}" 
                 alt="${escapeHtml(article.title)}" loading="lazy"
                 width="400" height="225"/>
          </a>`
        : ""
    }
    <div class="card-body">
      <span class="card-tag">${escapeHtml(article.primary_keyword)}</span>
      <h3 class="card-title">
        <a href="/articles/${article.slug}">${escapeHtml(article.title)}</a>
      </h3>
      <p class="card-excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="card-meta">
        ${date ? `<time>${date}</time>` : ""}
        <span>⏱ ${article.read_time} min</span>
      </div>
    </div>
  </article>`;
}
