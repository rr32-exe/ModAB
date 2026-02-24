#!/bin/bash
set -e

echo "🚀 Deploying ModAB Auto-Blog Platform..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Apply local migrations (for development/testing)
echo "🗄️  Applying local D1 migrations..."
wrangler d1 migrations apply autoblog-db --local 2>/dev/null || true

# Apply remote migrations
echo "🗄️  Applying remote D1 migrations..."
wrangler d1 migrations apply autoblog-db

# Deploy to Cloudflare Workers
echo "☁️  Deploying to Cloudflare Workers..."
wrangler deploy

echo ""
echo "✅ Deployed successfully!"
echo ""
echo "👉 Visit your Worker URL and navigate to /install to configure your blog."
echo "   (Found in your Cloudflare dashboard under Workers & Pages)"
