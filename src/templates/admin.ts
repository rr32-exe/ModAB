import type { Article, Affiliate, CalendarEntry } from "../types";
import { escapeHtml } from "./layout";

interface DashboardData {
  config: Record<string, string>;
  stats?: {
    total_articles: number;
    total_views: number;
    total_affiliate_clicks: number;
    total_revenue_cents: number;
    articles_today: number;
  };
  revenue?: {
    total_revenue_cents: number;
    revenue_this_month: number;
    transactions: number;
  };
  topArticles?: Array<{ id: number; title: string; slug: string; view_count: number }>;
  articles?: Article[];
  affiliates?: Affiliate[];
  calendar?: CalendarEntry[];
}

export function renderAdminDashboard(
  section: string,
  data: DashboardData
): string {
  const siteName = data.config["site_name"] ?? "AutoBlog";

  const nav = `
<nav class="admin-nav">
  <div class="admin-logo">
    <a href="/admin">⚡ ${escapeHtml(siteName)}</a>
  </div>
  <ul class="admin-nav-links">
    <li class="${section === "dashboard" ? "active" : ""}"><a href="/admin">📊 Dashboard</a></li>
    <li class="${section === "articles" ? "active" : ""}"><a href="/admin/articles">📝 Articles</a></li>
    <li class="${section === "calendar" ? "active" : ""}"><a href="/admin/calendar">📅 Calendar</a></li>
    <li class="${section === "affiliates" ? "active" : ""}"><a href="/admin/affiliates">💰 Affiliates</a></li>
    <li class="${section === "analytics" ? "active" : ""}"><a href="/admin/analytics">📈 Analytics</a></li>
    <li class="${section === "settings" ? "active" : ""}"><a href="/admin/settings">⚙️ Settings</a></li>
  </ul>
  <form method="post" action="/admin/logout" class="logout-form">
    <button type="submit" class="btn-logout">Logout</button>
  </form>
</nav>`;

  let mainContent = "";

  switch (section) {
    case "dashboard":
      mainContent = renderDashboardSection(data);
      break;
    case "articles":
      mainContent = renderArticlesSection(data.articles ?? []);
      break;
    case "calendar":
      mainContent = renderCalendarSection(data.calendar ?? []);
      break;
    case "affiliates":
      mainContent = renderAffiliatesSection(data.affiliates ?? []);
      break;
    case "analytics":
      mainContent = renderAnalyticsSection(data);
      break;
    case "settings":
      mainContent = renderSettingsSection(data.config);
      break;
    default:
      mainContent = "<p>Section not found.</p>";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Admin – ${escapeHtml(siteName)}</title>
  <link rel="stylesheet" href="/admin.css"/>
  <meta name="robots" content="noindex,nofollow"/>
</head>
<body class="admin-layout">
  ${nav}
  <div class="admin-main">
    <div class="admin-content">
      ${mainContent}
    </div>
  </div>
</body>
</html>`;
}

// ─── Dashboard section ────────────────────────────────────────────────────────
function renderDashboardSection(data: DashboardData): string {
  const s = data.stats;
  const r = data.revenue;

  const statCards = [
    { label: "Published Articles", value: s?.total_articles ?? 0, icon: "📝" },
    { label: "Total Views", value: s?.total_views ?? 0, icon: "👁️" },
    { label: "Affiliate Clicks", value: s?.total_affiliate_clicks ?? 0, icon: "🔗" },
    {
      label: "Revenue",
      value: `R${((r?.total_revenue_cents ?? 0) / 100).toFixed(2)}`,
      icon: "💰",
    },
    { label: "Articles Today", value: s?.articles_today ?? 0, icon: "✍️" },
    { label: "This Month", value: `R${((r?.revenue_this_month ?? 0) / 100).toFixed(2)}`, icon: "📅" },
  ]
    .map(
      (card) =>
        `<div class="stat-card">
      <span class="stat-icon">${card.icon}</span>
      <div class="stat-body">
        <div class="stat-value">${card.value}</div>
        <div class="stat-label">${card.label}</div>
      </div>
    </div>`
    )
    .join("");

  const topTable = (data.topArticles ?? [])
    .map(
      (a) =>
        `<tr>
      <td><a href="/articles/${a.slug}" target="_blank">${escapeHtml(a.title)}</a></td>
      <td>${a.view_count.toLocaleString()}</td>
    </tr>`
    )
    .join("");

  return `<h1>Dashboard</h1>
  <div class="stat-grid">${statCards}</div>

  <div class="dashboard-panels">
    <div class="panel">
      <h2>Top Articles</h2>
      <table>
        <thead><tr><th>Title</th><th>Views</th></tr></thead>
        <tbody>${topTable || "<tr><td colspan='2'>No articles yet</td></tr>"}</tbody>
      </table>
    </div>
    <div class="panel">
      <h2>Quick Actions</h2>
      <div class="quick-actions">
        <a href="/admin/calendar" class="btn">📅 View Calendar</a>
        <a href="/admin/articles" class="btn">📝 Manage Articles</a>
        <a href="/admin/settings" class="btn">⚙️ Settings</a>
      </div>
    </div>
  </div>`;
}

// ─── Articles section ─────────────────────────────────────────────────────────
function renderArticlesSection(articles: Article[]): string {
  const rows = articles
    .map(
      (a) =>
        `<tr>
      <td>${a.id}</td>
      <td><a href="/articles/${a.slug}" target="_blank">${escapeHtml(a.title)}</a></td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td>${a.word_count.toLocaleString()}</td>
      <td>${a.view_count.toLocaleString()}</td>
      <td>${a.published_at ? new Date(a.published_at).toLocaleDateString() : "–"}</td>
      <td>
        <a href="/admin/articles/edit/${a.id}" class="btn btn-sm">Edit</a>
        <button onclick="deleteArticle(${a.id})" class="btn btn-sm btn-danger">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  return `<h1>Articles</h1>
  <table class="data-table">
    <thead>
      <tr>
        <th>ID</th><th>Title</th><th>Status</th><th>Words</th><th>Views</th><th>Published</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>${rows || "<tr><td colspan='7' style='text-align:center'>No articles yet</td></tr>"}</tbody>
  </table>
  <script>
    async function deleteArticle(id){
      if(!confirm('Delete this article?')) return;
      await fetch('/admin/articles/'+id,{method:'DELETE'});
      location.reload();
    }
  </script>`;
}

// ─── Calendar section ─────────────────────────────────────────────────────────
function renderCalendarSection(calendar: CalendarEntry[]): string {
  const rows = calendar
    .map(
      (item) =>
        `<tr>
      <td>${item.scheduled_date}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.primary_keyword)}</td>
      <td>${escapeHtml(item.content_angle)}</td>
      <td><span class="badge badge-${item.status}">${item.status}</span></td>
      <td>
        ${
          item.status === "planned"
            ? `<form method="post" action="/admin/generate" style="display:inline">
              <input type="hidden" name="calendar_id" value="${item.id}"/>
              <button type="submit" class="btn btn-sm">Queue</button>
            </form>`
            : item.article_id
            ? `<a href="/articles/${item.article_id}" class="btn btn-sm" target="_blank">View</a>`
            : "–"
        }
      </td>
    </tr>`
    )
    .join("");

  return `<h1>Content Calendar</h1>
  <table class="data-table">
    <thead>
      <tr><th>Date</th><th>Title</th><th>Keyword</th><th>Angle</th><th>Status</th><th>Action</th></tr>
    </thead>
    <tbody>${rows || "<tr><td colspan='6' style='text-align:center'>Calendar is empty. Complete installation first.</td></tr>"}</tbody>
  </table>`;
}

// ─── Affiliates section ───────────────────────────────────────────────────────
function renderAffiliatesSection(affiliates: Affiliate[]): string {
  const rows = affiliates
    .map(
      (a) =>
        `<tr>
      <td>${a.id}</td>
      <td>${escapeHtml(a.name)}</td>
      <td>${a.network}</td>
      <td>${escapeHtml(a.base_url)}</td>
      <td>${a.click_count}</td>
      <td><span class="badge ${a.active ? "badge-published" : "badge-draft"}">${a.active ? "Active" : "Inactive"}</span></td>
      <td>
        <form method="post" action="/admin/affiliates/${a.id}/delete" style="display:inline">
          <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('Delete?')">Delete</button>
        </form>
      </td>
    </tr>`
    )
    .join("");

  return `<h1>Affiliates</h1>
  <div class="panel">
    <h2>Add Affiliate</h2>
    <form method="post" action="/admin/affiliates" class="settings-form">
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" required placeholder="Booking.com"/>
        </div>
        <div class="form-group">
          <label>Network</label>
          <select name="network">
            <option value="booking">Booking.com</option>
            <option value="getyourguide">GetYourGuide</option>
            <option value="viator">Viator</option>
            <option value="amazon">Amazon</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Affiliate ID</label>
          <input type="text" name="affiliate_id" placeholder="Your affiliate ID"/>
        </div>
        <div class="form-group">
          <label>Base URL</label>
          <input type="url" name="base_url" required placeholder="https://..."/>
        </div>
      </div>
      <div class="form-group">
        <label>Niche Keywords (comma-separated)</label>
        <input type="text" name="niche_keywords" placeholder="travel, hotels, accommodation"/>
      </div>
      <button type="submit" class="btn">Add Affiliate</button>
    </form>
  </div>

  <table class="data-table">
    <thead>
      <tr><th>ID</th><th>Name</th><th>Network</th><th>URL</th><th>Clicks</th><th>Status</th><th>Action</th></tr>
    </thead>
    <tbody>${rows || "<tr><td colspan='7' style='text-align:center'>No affiliates added yet</td></tr>"}</tbody>
  </table>`;
}

// ─── Analytics section ────────────────────────────────────────────────────────
function renderAnalyticsSection(data: DashboardData): string {
  const s = data.stats;
  const r = data.revenue;

  return `<h1>Analytics</h1>
  <div class="stat-grid">
    <div class="stat-card"><span class="stat-icon">👁️</span><div class="stat-body"><div class="stat-value">${s?.total_views ?? 0}</div><div class="stat-label">Total Page Views</div></div></div>
    <div class="stat-card"><span class="stat-icon">🔗</span><div class="stat-body"><div class="stat-value">${s?.total_affiliate_clicks ?? 0}</div><div class="stat-label">Affiliate Clicks</div></div></div>
    <div class="stat-card"><span class="stat-icon">💰</span><div class="stat-body"><div class="stat-value">R${((r?.total_revenue_cents ?? 0) / 100).toFixed(2)}</div><div class="stat-label">Total Revenue</div></div></div>
    <div class="stat-card"><span class="stat-icon">📈</span><div class="stat-body"><div class="stat-value">R${((r?.revenue_this_month ?? 0) / 100).toFixed(2)}</div><div class="stat-label">This Month</div></div></div>
    <div class="stat-card"><span class="stat-icon">🛒</span><div class="stat-body"><div class="stat-value">${r?.transactions ?? 0}</div><div class="stat-label">Transactions</div></div></div>
    <div class="stat-card"><span class="stat-icon">📝</span><div class="stat-body"><div class="stat-value">${s?.total_articles ?? 0}</div><div class="stat-label">Published Articles</div></div></div>
  </div>

  <div class="panel">
    <h2>Top Articles by Views</h2>
    <table class="data-table">
      <thead><tr><th>Title</th><th>Views</th></tr></thead>
      <tbody>
        ${(data.topArticles ?? []).map((a) => `<tr><td><a href="/articles/${a.slug}" target="_blank">${escapeHtml(a.title)}</a></td><td>${a.view_count}</td></tr>`).join("") || "<tr><td colspan='2'>No data yet</td></tr>"}
      </tbody>
    </table>
  </div>`;
}

// ─── Settings section ─────────────────────────────────────────────────────────
function renderSettingsSection(config: Record<string, string>): string {
  const field = (
    name: string,
    label: string,
    type = "text",
    placeholder = ""
  ) => `<div class="form-group">
    <label for="${name}">${label}</label>
    <input type="${type}" id="${name}" name="${name}" 
           value="${escapeHtml(config[name] ?? "")}"
           placeholder="${escapeHtml(placeholder)}"/>
  </div>`;

  return `<h1>Settings</h1>
  <form method="post" action="/admin/settings" class="settings-form">
    <div class="panel">
      <h2>Site</h2>
      ${field("site_name", "Site Name", "text", "My Travel Blog")}
      ${field("site_url", "Site URL", "url", "https://myblog.com")}
      ${field("niche", "Niche", "text", "travel")}
      ${field("language", "Language", "text", "en")}
      ${field("articles_per_week", "Articles Per Week", "number")}
      ${field("target_audience", "Target Audience", "text", "budget travelers")}
    </div>
    <div class="panel">
      <h2>Analytics & Ads</h2>
      ${field("ga_id", "Google Analytics 4 ID", "text", "G-XXXXXXXXXX")}
      ${field("adsense_id", "AdSense Client ID", "text", "ca-pub-XXXXXXXXXXXXXXXX")}
    </div>
    <div class="panel">
      <h2>Email</h2>
      ${field("resend_api_key", "Resend API Key", "text", "re_...")}
    </div>
    <div class="panel">
      <h2>Payment (Yoco)</h2>
      ${field("yoco_public_key", "Yoco Public Key", "text", "pk_test_...")}
      ${field("yoco_secret_key", "Yoco Secret Key", "password")}
      ${field("yoco_webhook_secret", "Webhook Secret", "text")}
    </div>
    <div class="panel">
      <h2>Affiliate IDs</h2>
      ${field("booking_affiliate_id", "Booking.com Affiliate ID")}
      ${field("getyourguide_affiliate_id", "GetYourGuide Partner ID")}
      ${field("viator_affiliate_id", "Viator Partner ID")}
      ${field("amazon_associate_id", "Amazon Associate ID")}
    </div>
    <button type="submit" class="btn">Save Settings</button>
  </form>`;
}
