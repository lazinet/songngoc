/**
 * Cloudflare Worker — Song Ngọc Form Handler
 * Deploy: wrangler deploy
 *
 * Routes:
 *   POST /            → form submission (contact, apply)
 *   GET  /health      → health check
 *
 * Env vars (set in Cloudflare Dashboard or wrangler.toml secrets):
 *   TURNSTILE_SECRET  — Cloudflare Turnstile secret key
 *   GAS_URL           — Google Apps Script web app URL
 *   ALLOWED_ORIGIN    — https://songngoc.com.vn
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    /* CORS preflight */
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    /* Health check */
    if (url.pathname === '/health') {
      return json({ status: 'ok', ts: new Date().toISOString() });
    }

    /* Only POST to root */
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    /* ── 1. Verify Turnstile ── */
    if (env.TURNSTILE_SECRET && body.token) {
      const valid = await verifyTurnstile(body.token, env.TURNSTILE_SECRET, request);
      if (!valid) return json({ error: 'Captcha verification failed' }, 403);
    }

    /* ── 2. Basic validation ── */
    const { type = 'contact', name, phone, email } = body;
    if (!name || !phone || !email) {
      return json({ error: 'Missing required fields: name, phone, email' }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400);
    }
    /* Phone: VN format */
    if (!/^0[0-9]{8,9}$/.test(phone.replace(/\s/g, ''))) {
      return json({ error: 'Invalid phone number' }, 400);
    }

    /* ── 3. Rate limit (simple IP-based via KV, optional) ── */
    // If you add KV binding named RATE_LIMIT, uncomment:
    // const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    // const key = `rl:${ip}:${type}`;
    // const count = parseInt(await env.RATE_LIMIT?.get(key) || '0', 10);
    // if (count >= 5) return json({ error: 'Too many requests' }, 429);
    // await env.RATE_LIMIT?.put(key, String(count + 1), { expirationTtl: 3600 });

    /* ── 4. Forward to Google Apps Script ── */
    if (env.GAS_URL) {
      try {
        await fetch(env.GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            name,
            phone: phone.replace(/\s/g, ''),
            email,
            company:   body.company   || '',
            service:   body.service   || '',
            message:   body.message   || '',
            position:  body.position  || '',  // for job applications
            timestamp: new Date().toISOString(),
            source:    body.source    || '',
            ip:        request.headers.get('CF-Connecting-IP') || '',
            country:   request.headers.get('CF-IPCountry')     || '',
          })
        });
      } catch (err) {
        console.error('GAS forward failed:', err.message);
        /* Non-fatal — we still return success to user */
      }
    }

    /* ── 5. Success ── */
    return json({ success: true, message: 'Yêu cầu đã được ghi nhận.' });
  }
};

/* ── Helpers ── */

async function verifyTurnstile(token, secret, request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: form
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}
