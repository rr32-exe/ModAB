# 🚀 ModAB Auto-Blog Platform – Deployment Guide

> **Beginner-friendly, step-by-step.** No prior Cloudflare experience needed.

---

## What You'll Need

- A computer with [Node.js 18+](https://nodejs.org) installed
- A free [Cloudflare account](https://cloudflare.com)
- 20–30 minutes

---

## Step 1 – Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org) (choose the LTS version).

Verify it works:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x or higher
```

---

## Step 2 – Clone / Download the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

Or download as a ZIP and extract it.

---

## Step 3 – Create a Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com) → **Sign Up** (free)
2. Verify your email address

---

## Step 4 – Create a D1 Database

1. Log into [dash.cloudflare.com](https://dash.cloudflare.com)
2. Left sidebar → **Workers & Pages** → **D1**
3. Click **Create database**
4. Name: `autoblog-db`
5. Click **Create**
6. **Copy the Database ID** (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

Open `wrangler.toml` and replace `PLACEHOLDER_DB_ID` with your Database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "autoblog-db"
database_id = "YOUR_ACTUAL_DATABASE_ID_HERE"
```

---

## Step 5 – Create a KV Namespace

1. Left sidebar → **Workers & Pages** → **KV**
2. Click **Create namespace**
3. Name: `autoblog-cache`
4. Click **Add**
5. **Copy the Namespace ID**

Open `wrangler.toml` and replace `PLACEHOLDER_KV_ID`:
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_ACTUAL_KV_ID_HERE"
```

---

## Step 6 – Install Dependencies

```bash
npm install
```

---

## Step 7 – Login to Cloudflare via Wrangler

```bash
npx wrangler login
```

This opens a browser window. Log in with your Cloudflare account.

---

## Step 8 – Run Database Migrations

Apply the schema to your remote D1 database:
```bash
npm run db:migrate
```

You should see: `✅ Applied migration 0001_initial.sql`

---

## Step 9 – Deploy to Cloudflare Workers

```bash
npm run deploy
```

Or use the convenience script:
```bash
bash scripts/deploy.sh
```

You'll see output like:
```
✅ Deployed! Your worker URL: https://autoblog.YOUR_SUBDOMAIN.workers.dev
```

---

## Step 10 – Run the Install Wizard

1. Open your Worker URL in a browser (e.g. `https://autoblog.xyz.workers.dev`)
2. You'll be redirected to `/install`
3. Fill in all the fields:
   - **Site Name** – your blog's name
   - **Niche** – e.g. `budget travel`, `fitness`, `food`
   - **Site URL** – your Worker URL (or custom domain)
   - **Articles per week** – use the slider (recommended: 2–3)
   - **Affiliate IDs** – paste your affiliate IDs (see `scripts/free-credits.md`)
   - **Yoco keys** – for premium content & tip jar
   - **Admin email & password** – your login credentials
4. Toggle **"Queue 10 articles"** ON to auto-generate your first 10 articles
5. Click **Install & Launch Platform**

---

## Step 11 – Wait for Articles to Generate

The platform uses a **cron job** that runs every 2 minutes to generate articles.

- Check progress at `/admin` → **Calendar** tab
- Articles move from `queued` → `generating` → `done`
- Once done, they appear at `/admin` → **Articles**
- Published articles are live at `/articles/your-article-slug`

**First 10 articles typically generate within 10–20 minutes.**

> **Note:** The `*/2 * * * *` cron runs every 2 minutes to quickly process your initial batch of queued articles. Once your initial content is generated, open `wrangler.toml`, remove `"*/2 * * * *"` from the `crons` array, and re-deploy (`npm run deploy`) to conserve your Workers AI quota. The weekly `0 9 * * MON` cron will continue automatic publishing.

---

## Step 12 – Add a Custom Domain (Optional)

1. Cloudflare Dashboard → **Workers & Pages** → your Worker
2. **Settings** → **Domains & Routes**
3. **Add Custom Domain** → enter your domain
4. Follow DNS instructions (if your domain is on Cloudflare, it's automatic)

---

## Local Development

To run locally for testing:

```bash
npm run dev
```

This starts a local server at `http://localhost:8787`.

Apply migrations locally first:
```bash
npm run db:migrate:local
```

---

## Environment Variables (Secrets)

Never commit secrets to Git. Use Cloudflare's secret management:

```bash
# Set a secret (won't appear in wrangler.toml)
npx wrangler secret put YOCO_SECRET_KEY
```

Or add to `.dev.vars` for local development (this file is git-ignored):
```env
YOCO_SECRET_KEY=sk_live_xxxxx
RESEND_API_KEY=re_xxxxx
LUMA_API_KEY=xxxxx
```

---

## Project Structure

```
├── src/
│   ├── worker.ts          # Main entry point + cron handler
│   ├── types.ts           # TypeScript interfaces
│   ├── ai/                # AI generation modules
│   │   ├── content.ts     # Article generation (Llama 3.1)
│   │   ├── images.ts      # Image generation (Stable Diffusion XL)
│   │   ├── video.ts       # Video (Luma/YouTube)
│   │   ├── seo.ts         # SEO metadata generation
│   │   └── calendar.ts    # Content calendar generation
│   ├── db/                # Database modules
│   │   ├── schema.ts      # Schema helpers
│   │   ├── articles.ts    # Article CRUD
│   │   ├── affiliates.ts  # Affiliate management
│   │   └── analytics.ts   # Analytics tracking
│   ├── routes/            # HTTP route handlers
│   │   ├── public.ts      # Blog frontend
│   │   ├── admin.ts       # Admin panel
│   │   ├── install.ts     # Setup wizard
│   │   └── webhooks.ts    # Yoco payment webhooks
│   └── templates/         # HTML templates
│       ├── layout.ts      # Base layout
│       ├── article.ts     # Article page
│       ├── home.ts        # Homepage
│       ├── admin.ts       # Admin dashboard
│       └── install.ts     # Install wizard
├── migrations/
│   └── 0001_initial.sql   # D1 schema
├── public/
│   ├── style.css          # Blog styles
│   └── admin.css          # Admin styles
└── scripts/
    ├── deploy.sh          # One-command deploy
    └── free-credits.md    # Free tier guide
```

---

## Troubleshooting

### "Database not found" error
Make sure you ran `npm run db:migrate` and the database ID in `wrangler.toml` is correct.

### Articles not generating
- Check that the cron is enabled in `wrangler.toml` (it is by default)
- Go to `/admin/calendar` and verify items have `queued` status
- Manually trigger via `/admin` → **Calendar** → **Queue** button

### Install page shows even after completing setup
Clear your browser cookies or check the D1 database has the `config` table with an `installed_at` row.

### Images are slow to load
Image generation via Stable Diffusion takes 5–15 seconds per image. Articles are cached in KV after first load.

---

## Free Tier Limits

See `scripts/free-credits.md` for a complete breakdown of free tier limits for all services.

**Summary: You can run this platform entirely for free** within Cloudflare's generous free tiers.

---

## Support

- Issues: Open a GitHub issue in this repository
- Cloudflare Docs: [developers.cloudflare.com](https://developers.cloudflare.com)
- Hono Docs: [hono.dev](https://hono.dev)
