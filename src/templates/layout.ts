// ─── Base layout template ─────────────────────────────────────────────────────
export interface LayoutOptions {
  canonical?: string;
  og_image?: string;
  og_type?: string;
  schema_json?: string;
  noindex?: boolean;
}

export function renderLayout(
  title: string,
  content: string,
  config: Record<string, string>,
  options: LayoutOptions = {}
): string {
  const siteName = config["site_name"] ?? "AutoBlog";
  const siteUrl = config["site_url"] ?? "";
  const gaId = config["ga_id"] ?? "";
  const adsenseId = config["adsense_id"] ?? "";
  const canonical = options.canonical ?? "";
  const ogImage = options.og_image ?? `${siteUrl}/og-image.png`;
  const ogType = options.og_type ?? "website";
  const schemaJson = options.schema_json ?? "";

  const gaScript = gaId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
<script>
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','${gaId}');
</script>`
    : "";

  const adsenseScript = adsenseId
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}" crossorigin="anonymous"></script>`
    : "";

  const canonicalTag = canonical
    ? `<link rel="canonical" href="${canonical}"/>`
    : "";

  const schemaTag = schemaJson
    ? `<script type="application/ld+json">${schemaJson}</script>`
    : "";

  const noindexTag = options.noindex
    ? `<meta name="robots" content="noindex,nofollow"/>`
    : "";

  return `<!DOCTYPE html>
<html lang="${config["language"] ?? "en"}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  ${noindexTag}
  ${canonicalTag}
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:type" content="${ogType}"/>
  <meta property="og:image" content="${ogImage}"/>
  <meta property="og:site_name" content="${escapeHtml(siteName)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escapeHtml(title)}"/>
  <meta name="twitter:image" content="${ogImage}"/>
  ${schemaTag}
  <link rel="stylesheet" href="/style.css"/>
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(siteName)} RSS" href="/feed.xml"/>
  ${gaScript}
  ${adsenseScript}
</head>
<body>
  <header class="site-header">
    <nav class="nav container">
      <a href="/" class="site-logo">${escapeHtml(siteName)}</a>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/search">Search</a></li>
        <li><a href="/feed.xml">RSS</a></li>
      </ul>
      <form method="get" action="/search" class="nav-search">
        <input type="search" name="q" placeholder="Search…" aria-label="Search"/>
        <button type="submit">🔍</button>
      </form>
    </nav>
  </header>

  <main class="site-main">
    ${content}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <strong>${escapeHtml(siteName)}</strong>
          <p>Your trusted source for ${escapeHtml(config["niche"] ?? "quality")} content.</p>
        </div>
        <div>
          <strong>Navigation</strong>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/search">Search</a></li>
            <li><a href="/sitemap.xml">Sitemap</a></li>
            <li><a href="/feed.xml">RSS Feed</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} ${escapeHtml(siteName)}. All rights reserved.</p>
        <p class="affiliate-disclosure">
          <small>This site may contain affiliate links. We earn a commission when you click and purchase through our links, at no extra cost to you.</small>
        </p>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

// ─── Shared utility ────────────────────────────────────────────────────────────
export function escapeHtml(str: string): string {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
