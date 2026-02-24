# 💸 Free Credits Guide – ModAB Auto-Blog Platform

All services below have **free tiers** or **free credits** that are more than enough to run a production auto-blog at zero cost.

---

## ☁️ Cloudflare Workers (FREE)

**What you get free:**
- 100,000 requests/day
- 10ms CPU time per request (up to 30s with Unbound billing)
- D1 database: 5 GB storage, 5M reads/day, 100K writes/day
- KV: 100K reads/day, 1K writes/day, 1 GB storage
- Workers AI: 10,000 Neurons/day (enough for ~50 articles/day)

**How to claim:**
1. Go to [cloudflare.com](https://cloudflare.com) → Sign up (free)
2. Go to **Workers & Pages** → Create Worker
3. Go to **D1** → Create Database → Copy the ID into `wrangler.toml`
4. Go to **KV** → Create Namespace → Copy the ID into `wrangler.toml`
5. Workers AI is enabled automatically – no setup needed

---

## 🛒 Yoco Payments (FREE to set up)

**What you get:**
- No monthly fees
- Transaction fee: ~2.95% per payment (ZAR)
- Free developer/sandbox account for testing

**How to claim:**
1. Go to [yoco.com/za](https://www.yoco.com/za/) → Sign Up
2. Complete business verification (free)
3. Settings → Developers → Copy Public & Secret keys
4. Set up webhook: paste your `/webhooks/yoco` URL, copy the secret

---

## 📊 Google Analytics 4 (FREE)

**What you get:**
- Unlimited free forever
- Up to 10M events/month

**How to claim:**
1. Go to [analytics.google.com](https://analytics.google.com) → Create account
2. Create Property → Get your `G-XXXXXXXXXX` Measurement ID
3. Paste into Install Wizard → GA ID field

---

## 💰 Google AdSense (FREE, revenue-share)

**What you get:**
- Free to join (approval required)
- Revenue from ads shown on your site

**How to claim:**
1. Go to [adsense.google.com](https://adsense.google.com) → Apply
2. Once approved, go to **Sites** → Get your `ca-pub-XXXXXXXXXX` client ID
3. Paste into Install Wizard → AdSense Client ID field
4. AdSense ads are hidden until you add the ID – no accidental policy violations

**Tip:** Apply only after you have at least 10 published articles.

---

## 📧 Resend.com Email (FREE)

**What you get:**
- 3,000 emails/month free forever
- 100 emails/day on free plan

**How to claim:**
1. Go to [resend.com](https://resend.com) → Sign Up (GitHub login works)
2. API Keys → Create API Key → Copy it
3. Paste into Install Wizard → Resend API Key field

---

## 🎬 Luma Dream Machine Video (FREE TRIAL)

**What you get:**
- Free credits on sign-up (varies)
- Used for AI video generation in articles

**How to claim:**
1. Go to [lumalabs.ai](https://lumalabs.ai) → Sign Up
2. Get your API key from the developer settings
3. Add to `.dev.vars` or Cloudflare Worker environment variables as `LUMA_API_KEY`

---

## 🎥 YouTube Data API (FREE)

**What you get:**
- 10,000 units/day free (enough for ~100 video searches/day)
- Used as video fallback when Luma is not configured

**How to claim:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable "YouTube Data API v3"
3. Credentials → Create API Key → Copy it
4. Add as `YOUTUBE_API_KEY` in your Worker environment

---

## 🔗 Affiliate Networks (FREE to join, earn commission)

| Network | Commission | Sign-up |
|---------|-----------|---------|
| **Booking.com** | 25-40% of their commission (~4% of booking value) | [partners.booking.com](https://partners.booking.com) |
| **GetYourGuide** | 8% per booking | [partner.getyourguide.com](https://partner.getyourguide.com) |
| **Viator** | 8% per booking | [viatorforpartners.com](https://www.viatorforpartners.com) |
| **Amazon Associates** | 1-10% depending on category | [affiliate-program.amazon.com](https://affiliate-program.amazon.com) |

All free to join. Simply apply, get your affiliate ID, and paste into the Install Wizard.

---

## 💡 Monthly Cost Breakdown

| Service | Monthly Cost |
|---------|-------------|
| Cloudflare Workers | **$0** |
| Cloudflare D1 | **$0** |
| Cloudflare KV | **$0** |
| Cloudflare Workers AI | **$0** |
| Google Analytics | **$0** |
| Resend (3K emails) | **$0** |
| Yoco (no sales) | **$0** |
| **Total** | **$0/month** |

You only pay transaction fees when you make sales (Yoco ~2.95%) and if you exceed free limits.
