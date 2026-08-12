import { loadPricing, calculateEstimate } from './pricing.js';
import { sendResendEmail, clientEstimateHtml, leadNotifyHtml } from './email.js';

/** Simple per-isolate rate limit: 8 quote posts / IP / 10 minutes */
const quoteHits = new Map();

/**
 * @param {Request} request
 * @param {Env} env
 * @param {ExecutionContext} ctx
 */
export async function handleQuote(request, env, ctx) {
  if (request.method === 'OPTIONS') {
    return cors(new Response(null, { status: 204 }));
  }

  if (request.method !== 'POST') {
    return cors(json({ success: false, error: 'Method not allowed' }, 405));
  }

  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  if (!allowQuote(ip)) {
    return cors(json({ success: false, error: 'Too many requests. Please try again later.' }, 429));
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return cors(json({ success: false, error: 'Invalid JSON body' }, 400));
  }

  const email = String(body.email || '').trim();
  const project = String(body.project || '').trim();
  if (!email || !project) {
    return cors(json({ success: false, error: 'email and project are required' }, 400));
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return cors(json({ success: false, error: 'Valid email is required' }, 400));
  }

  const phone = String(body.phone || '').trim();
  const area = parseFloat(body.area) || 0;
  const complexity = String(body.complexity || 'Commercial/Retail/Residential');
  const deliverables = Array.isArray(body.deliverables) ? body.deliverables.map(String) : [];

  try {
    const pricing = await loadPricing(env.DB);
    const estimate = calculateEstimate(pricing, { area, complexity, deliverables });
    const leadId = crypto.randomUUID();
    const payload = body;

    await env.DB.prepare(
      `INSERT INTO leads (
        id, email, phone, project, company, contact_name, site_location,
        area, complexity, deliverables_json, payload_json,
        estimate_zar, estimate_formatted, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`
    )
      .bind(
        leadId,
        email,
        phone || null,
        project,
        body.company ? String(body.company) : null,
        body.contact_name || body.contact ? String(body.contact_name || body.contact) : null,
        body.location || body.site_location ? String(body.location || body.site_location) : null,
        area,
        complexity,
        JSON.stringify(deliverables),
        JSON.stringify(payload),
        estimate.amount,
        estimate.formatted
      )
      .run();

    const apiKey = env.RESEND_API_KEY;
    if (apiKey) {
      const from = env.FROM_EMAIL || '3D Scan Metrics <estimates@3dscanmetrics.co.za>';
      ctx.waitUntil(
        (async () => {
          await sendResendEmail({
            apiKey,
            from,
            to: email,
            subject: `Scoping Estimate Ready - ${project}`,
            html: clientEstimateHtml({
              project,
              area,
              complexity,
              estimate: estimate.formatted,
            }),
          });

          if (env.LEAD_NOTIFY_EMAIL) {
            await sendResendEmail({
              apiKey,
              from,
              to: env.LEAD_NOTIFY_EMAIL,
              subject: `New lead: ${project} (${estimate.formatted})`,
              html: leadNotifyHtml({
                leadId,
                email,
                phone,
                project,
                company: body.company,
                estimate: estimate.formatted,
                payload,
              }),
            });
          }
        })().catch((err) => console.error('[quote] email failed', err))
      );
    } else {
      console.log('[quote] Skipping email (no RESEND_API_KEY)');
    }

    return cors(
      json({
        success: true,
        estimate: estimate.formatted,
        leadId,
      })
    );
  } catch (error) {
    console.error('[quote] error', error);
    return cors(json({ success: false, error: 'Internal Server Error' }, 500));
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, { status: response.status, headers });
}

function allowQuote(ip) {
  const windowMs = 10 * 60 * 1000;
  const max = 8;
  const now = Date.now();
  const entry = quoteHits.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    quoteHits.set(ip, { count: 1, start: now });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  quoteHits.set(ip, entry);
  return true;
}
