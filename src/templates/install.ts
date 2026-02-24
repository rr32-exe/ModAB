const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export function renderInstallPage(error?: string): string {
  const webhookSecret = crypto.randomUUID();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Install ModAB Auto-Blog Platform</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --primary:#4f46e5;
      --primary-dark:#3730a3;
      --text:#111827;
      --muted:#6b7280;
      --border:#e5e7eb;
      --bg:#f9fafb;
      --white:#ffffff;
      --success:#10b981;
      --danger:#ef4444;
    }
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
    .install-wrapper{max-width:780px;margin:2rem auto;padding:0 1rem 4rem}
    .install-header{text-align:center;padding:2rem 0}
    .install-header h1{font-size:2rem;font-weight:800;color:var(--text)}
    .install-header p{color:var(--muted);margin-top:.5rem}
    .badge{display:inline-block;background:var(--primary);color:#fff;padding:.25rem .75rem;border-radius:999px;font-size:.75rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:1rem}
    .card{background:var(--white);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .card h2{font-size:1.1rem;font-weight:700;color:var(--text);margin-bottom:1rem;padding-bottom:.5rem;border-bottom:2px solid var(--primary)}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
    @media(max-width:600px){.form-row{grid-template-columns:1fr}}
    .form-group{margin-bottom:1rem}
    label{display:block;font-size:.875rem;font-weight:600;color:var(--text);margin-bottom:.3rem}
    label .required{color:var(--danger);margin-left:2px}
    label small{font-weight:400;color:var(--muted);font-size:.8rem}
    input[type="text"],input[type="email"],input[type="password"],input[type="url"],input[type="number"],select,textarea{
      width:100%;padding:.6rem .85rem;border:1px solid var(--border);border-radius:8px;font-size:.95rem;color:var(--text);background:var(--white);transition:border-color .2s
    }
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px rgba(79,70,229,.12)}
    input[type="range"]{width:100%;accent-color:var(--primary)}
    .range-value{display:inline-block;background:var(--primary);color:#fff;padding:.1rem .5rem;border-radius:6px;font-size:.85rem;margin-left:.5rem}
    .checkbox-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.5rem}
    .checkbox-item{display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;border:1px solid var(--border);border-radius:8px;cursor:pointer}
    .checkbox-item input{width:auto}
    .toggle-group{display:flex;align-items:center;gap:.75rem}
    .toggle{position:relative;display:inline-block;width:48px;height:26px}
    .toggle input{opacity:0;width:0;height:0}
    .toggle-slider{position:absolute;inset:0;background:#d1d5db;border-radius:999px;cursor:pointer;transition:.3s}
    .toggle-slider:before{content:"";position:absolute;height:20px;width:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.3s}
    .toggle input:checked+.toggle-slider{background:var(--primary)}
    .toggle input:checked+.toggle-slider:before{transform:translateX(22px)}
    .secret-box{display:flex;gap:.5rem;align-items:stretch}
    .secret-box input{flex:1;font-family:monospace;font-size:.82rem}
    .secret-box button{padding:.6rem 1rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:.85rem;white-space:nowrap}
    .btn-submit{width:100%;padding:.875rem;background:var(--primary);color:#fff;border:none;border-radius:10px;font-size:1.1rem;font-weight:700;cursor:pointer;transition:background .2s;margin-top:.5rem}
    .btn-submit:hover{background:var(--primary-dark)}
    .btn-submit:disabled{background:#9ca3af;cursor:not-allowed}
    .error-box{background:#fee2e2;border:1px solid #fca5a5;color:var(--danger);padding:1rem;border-radius:8px;margin-bottom:1.5rem;font-weight:500}
    .info-box{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:.75rem 1rem;border-radius:8px;margin-top:.5rem;font-size:.85rem}
    .step-indicator{display:flex;justify-content:center;gap:.5rem;margin-bottom:2rem}
    .step{width:32px;height:32px;border-radius:50%;background:var(--border);color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700}
    .step.done{background:var(--success);color:#fff}
    .step.active{background:var(--primary);color:#fff}
    #loading-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;align-items:center;justify-content:center;flex-direction:column;color:#fff;gap:1rem}
    #loading-overlay.show{display:flex}
    .spinner{width:48px;height:48px;border:5px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading-text{font-size:1.1rem;font-weight:600}
  </style>
</head>
<body>

<div id="loading-overlay">
  <div class="spinner"></div>
  <div class="loading-text">Installing & generating content calendar…</div>
  <div style="font-size:.9rem;opacity:.8">This may take 30–60 seconds.</div>
</div>

<div class="install-wrapper">
  <div class="install-header">
    <div class="badge">Setup Wizard</div>
    <h1>⚡ ModAB Auto-Blog Platform</h1>
    <p>Fill in the details below to launch your AI-powered blog in minutes.</p>
  </div>

  ${error ? `<div class="error-box">⚠️ ${error}</div>` : ""}

  <form method="post" action="/install" onsubmit="showLoading()">

    <!-- SITE DETAILS -->
    <div class="card">
      <h2>🌐 Site Details</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="site_name">Site Name <span class="required">*</span></label>
          <input type="text" id="site_name" name="site_name" required placeholder="My Travel Blog" maxlength="80"/>
        </div>
        <div class="form-group">
          <label for="niche">Niche / Topic <span class="required">*</span> <small>(e.g. travel, fitness, food)</small></label>
          <input type="text" id="niche" name="niche" required placeholder="budget travel" maxlength="60"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="site_url">Site URL <small>(include https://)</small></label>
          <input type="url" id="site_url" name="site_url" placeholder="https://myblog.com"/>
        </div>
        <div class="form-group">
          <label for="language">Language</label>
          <select id="language" name="language">
            <option value="en" selected>English</option>
            <option value="af">Afrikaans</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
            <option value="zu">Zulu</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="target_audience">Target Audience <small>(describe your ideal reader)</small></label>
        <input type="text" id="target_audience" name="target_audience" placeholder="budget-conscious backpackers aged 20-35" maxlength="120"/>
      </div>
    </div>

    <!-- CONTENT SCHEDULE -->
    <div class="card">
      <h2>📅 Content Schedule</h2>
      <div class="form-group">
        <label for="articles_per_week">Articles per week: <span class="range-value" id="apw-value">2</span></label>
        <input type="range" id="articles_per_week" name="articles_per_week" min="1" max="7" value="2"
               oninput="document.getElementById('apw-value').textContent=this.value"/>
      </div>
      <div class="form-group">
        <label>Preferred Publish Days</label>
        <div class="checkbox-grid">
          ${DAYS_OF_WEEK.map(day => `
          <label class="checkbox-item">
            <input type="checkbox" name="publish_days" value="${day.toLowerCase()}" ${day==="Monday"||day==="Thursday"?"checked":""}/>
            ${day}
          </label>`).join("")}
        </div>
      </div>
    </div>

    <!-- AFFILIATES -->
    <div class="card">
      <h2>💰 Affiliate Networks <small style="font-weight:400;color:#6b7280">(optional – leave blank if unused)</small></h2>
      <div class="form-row">
        <div class="form-group">
          <label for="booking_affiliate_id">Booking.com Affiliate ID</label>
          <input type="text" id="booking_affiliate_id" name="booking_affiliate_id" placeholder="1234567"/>
        </div>
        <div class="form-group">
          <label for="getyourguide_affiliate_id">GetYourGuide Partner ID</label>
          <input type="text" id="getyourguide_affiliate_id" name="getyourguide_affiliate_id" placeholder="P12345"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="viator_affiliate_id">Viator Partner ID</label>
          <input type="text" id="viator_affiliate_id" name="viator_affiliate_id" placeholder="EXA12345"/>
        </div>
        <div class="form-group">
          <label for="amazon_associate_id">Amazon Associate Tag</label>
          <input type="text" id="amazon_associate_id" name="amazon_associate_id" placeholder="myblog-20"/>
        </div>
      </div>
    </div>

    <!-- PAYMENT (YOCO) -->
    <div class="card">
      <h2>🛒 Payment – Yoco <small style="font-weight:400;color:#6b7280">(for premium content & tip jar)</small></h2>
      <div class="info-box">
        💡 <a href="https://www.yoco.com/za/" target="_blank" rel="noopener">Sign up at yoco.com/za</a> – free to create an account. 
        Get your API keys from <strong>Settings → Developers</strong>.
      </div>
      <div class="form-row" style="margin-top:1rem">
        <div class="form-group">
          <label for="yoco_public_key">Yoco Public Key</label>
          <input type="text" id="yoco_public_key" name="yoco_public_key" placeholder="pk_live_..."/>
        </div>
        <div class="form-group">
          <label for="yoco_secret_key">Yoco Secret Key</label>
          <input type="password" id="yoco_secret_key" name="yoco_secret_key" placeholder="sk_live_..."/>
        </div>
      </div>
      <div class="form-group">
        <label for="yoco_webhook_secret">Webhook Secret <small>(set this same value in your Yoco webhook settings)</small></label>
        <div class="secret-box">
          <input type="text" id="yoco_webhook_secret" name="yoco_webhook_secret" 
                 value="${webhookSecret}" readonly/>
          <button type="button" onclick="copySecret()">📋 Copy</button>
        </div>
        <div class="info-box">
          Add this as your webhook URL in Yoco: <code id="webhook-url">[your-site]/webhooks/yoco</code>
        </div>
      </div>
    </div>

    <!-- ANALYTICS & ADS -->
    <div class="card">
      <h2>📊 Analytics & Advertising</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="ga_id">Google Analytics 4 ID <small>(optional)</small></label>
          <input type="text" id="ga_id" name="ga_id" placeholder="G-XXXXXXXXXX"/>
        </div>
        <div class="form-group">
          <label for="adsense_id">AdSense Client ID <small>(optional, adds ad slots)</small></label>
          <input type="text" id="adsense_id" name="adsense_id" placeholder="ca-pub-XXXXXXXXXXXXXXXX"/>
        </div>
      </div>
      <div class="form-group">
        <label for="resend_api_key">Resend.com API Key <small>(for newsletter, optional)</small></label>
        <input type="text" id="resend_api_key" name="resend_api_key" placeholder="re_..."/>
      </div>
    </div>

    <!-- ADMIN ACCOUNT -->
    <div class="card">
      <h2>🔐 Admin Account</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="admin_email">Admin Email <span class="required">*</span></label>
          <input type="email" id="admin_email" name="admin_email" required placeholder="you@example.com"/>
        </div>
        <div class="form-group">
          <label for="admin_password">Admin Password <span class="required">*</span> <small>(min 8 chars)</small></label>
          <input type="password" id="admin_password" name="admin_password" required minlength="8" placeholder="Choose a strong password"/>
        </div>
      </div>
    </div>

    <!-- INITIAL ARTICLES -->
    <div class="card">
      <h2>🚀 Kick-Start Content</h2>
      <div class="toggle-group">
        <label class="toggle">
          <input type="checkbox" name="generate_initial_articles" value="on" id="gen-toggle" checked/>
          <span class="toggle-slider"></span>
        </label>
        <div>
          <strong>Queue 10 articles for immediate generation</strong>
          <div style="font-size:.875rem;color:var(--muted)">
            After install, the cron job will automatically generate 10 articles from your calendar. 
            Articles appear as cron runs (every 2 minutes while enabled).
          </div>
        </div>
      </div>
    </div>

    <button type="submit" class="btn-submit">🚀 Install & Launch Platform</button>
  </form>
</div>

<script>
  function showLoading(){
    document.getElementById('loading-overlay').classList.add('show');
  }
  function copySecret(){
    const val = document.getElementById('yoco_webhook_secret').value;
    navigator.clipboard.writeText(val).then(()=>{
      const btn = document.querySelector('.secret-box button');
      btn.textContent = '✅ Copied!';
      setTimeout(()=>btn.textContent='📋 Copy', 2000);
    });
  }
  // Show webhook URL
  const urlEl = document.getElementById('webhook-url');
  if(urlEl && window.location.origin !== 'null'){
    urlEl.textContent = window.location.origin + '/webhooks/yoco';
  }
</script>
</body>
</html>`;
}
