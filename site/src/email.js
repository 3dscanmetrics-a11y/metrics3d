const BRAND = {
  red: '#ff3b30',
  orange: '#f97316',
  navy: '#0f172a',
  muted: '#475569',
  background: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
};

const LOGO_URL = 'https://www.3dscanmetrics.co.za/logo.png';
const WEBSITE_URL = 'https://www.3dscanmetrics.co.za';
const FONT_STACK = "'Outfit', Arial, sans-serif";

export async function sendResendEmail({ apiKey, from, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }

  return res.json();
}

export function clientEstimateHtml({ project, area, complexity, estimate }) {
  const safeProject = escapeHtml(project);
  const safeArea = escapeHtml(area);
  const safeComplexity = escapeHtml(complexity);
  const safeEstimate = escapeHtml(estimate);

  return emailDocument({
    preheader: `Your preliminary scoping estimate for ${safeProject}`,
    title: 'Your Indicative Scoping Estimate',
    eyebrow: 'Instant Pricing Engine',
    content: `
      <p style="margin:0 0 24px;color:${BRAND.muted};font-family:${FONT_STACK};font-size:16px;line-height:1.65;">
        Thank you for using our Instant Pricing Engine. Based on the specifications provided, here is a
        <strong style="color:${BRAND.navy};">preliminary range</strong> for
        <strong style="color:${BRAND.navy};">${safeProject}</strong>:
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;background:${BRAND.background};border:1px solid ${BRAND.border};border-left:5px solid ${BRAND.red};border-radius:10px;">
        <tr>
          <td style="padding:24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="padding:0 0 12px;color:${BRAND.muted};font-family:${FONT_STACK};font-size:15px;line-height:1.5;"><strong style="color:${BRAND.navy};">Area:</strong> ${safeArea} sqm</td>
              </tr>
              <tr>
                <td style="padding:0 0 22px;color:${BRAND.muted};font-family:${FONT_STACK};font-size:15px;line-height:1.5;"><strong style="color:${BRAND.navy};">Complexity:</strong> ${safeComplexity}</td>
              </tr>
              <tr>
                <td style="padding:20px 0 0;border-top:1px solid ${BRAND.border};">
                  <p style="margin:0 0 6px;color:${BRAND.orange};font-family:${FONT_STACK};font-size:12px;font-weight:700;letter-spacing:1.1px;line-height:1.4;text-transform:uppercase;">Indicative range</p>
                  <p style="margin:0;color:${BRAND.red};font-family:${FONT_STACK};font-size:27px;font-weight:700;line-height:1.25;">${safeEstimate}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;color:${BRAND.muted};font-family:${FONT_STACK};font-size:13px;line-height:1.65;">This is an automated rough estimate, not a formal quotation. A lead engineer will review your parameters and follow up with a binding quote, availability, and next steps.</p>
    `,
  });
}

export function leadNotifyHtml({ leadId, email, phone, project, company, estimate, payload }) {
  const detailRows = [
    ['Lead ID', leadId],
    ['Project', project],
    ['Company', company],
    ['Email', email],
    ['Phone', phone],
  ]
    .map(([label, value]) => detailRow(label, value))
    .join('');

  return emailDocument({
    preheader: `New instant estimate lead: ${escapeHtml(project)}`,
    title: 'New Instant Estimate Lead',
    eyebrow: 'MetricsCRM notification',
    content: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;background:${BRAND.background};border:1px solid ${BRAND.border};border-left:5px solid ${BRAND.red};border-radius:10px;">
        <tr>
          <td style="padding:22px 24px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              ${detailRows}
              <tr>
                <td colspan="2" style="padding:18px 0 0;border-top:1px solid ${BRAND.border};">
                  <p style="margin:0 0 5px;color:${BRAND.orange};font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:1px;line-height:1.4;text-transform:uppercase;">Indicative range</p>
                  <p style="margin:0;color:${BRAND.red};font-family:${FONT_STACK};font-size:24px;font-weight:700;line-height:1.3;">${escapeHtml(estimate)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 10px;color:${BRAND.navy};font-family:${FONT_STACK};font-size:14px;font-weight:700;line-height:1.5;">Submitted questionnaire</p>
      <pre style="box-sizing:border-box;margin:0;max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-word;background:${BRAND.navy};border-radius:8px;color:${BRAND.white};font-family:Consolas, Monaco, monospace;font-size:12px;line-height:1.55;padding:18px;">${escapeHtml(JSON.stringify(payload ?? {}, null, 2))}</pre>
      <p style="margin:24px 0 0;color:${BRAND.muted};font-family:${FONT_STACK};font-size:14px;line-height:1.6;">Open MetricsCRM (Worker <strong style="color:${BRAND.navy};">crm-admin</strong>) to edit the questionnaire and issue a formal quote.</p>
    `,
  });
}

function emailDocument({ preheader, title, eyebrow, content }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};color:${BRAND.navy};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;mso-hide:all;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:${BRAND.background};">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:12px;">
            <tr>
              <td style="padding:22px 28px;border-bottom:4px solid ${BRAND.red};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td width="54" valign="middle" style="width:54px;padding:0 14px 0 0;">
                      <img src="${LOGO_URL}" width="52" height="52" alt="3D Scan Metrics" style="display:block;width:52px;height:52px;border:0;border-radius:50%;object-fit:contain;">
                    </td>
                    <td valign="middle" style="padding:0;">
                      <p style="margin:0;color:${BRAND.navy};font-family:${FONT_STACK};font-size:20px;font-weight:700;line-height:1.2;">3D Scan Metrics</p>
                      <p style="margin:5px 0 0;color:${BRAND.muted};font-family:${FONT_STACK};font-size:12px;line-height:1.4;">Precision reality capture &amp; digital delivery</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 28px 36px;">
                <p style="margin:0 0 8px;color:${BRAND.orange};font-family:${FONT_STACK};font-size:12px;font-weight:700;letter-spacing:1.2px;line-height:1.4;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 22px;color:${BRAND.navy};font-family:${FONT_STACK};font-size:30px;font-weight:700;letter-spacing:-0.4px;line-height:1.2;">${escapeHtml(title)}</h1>
                ${content}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 28px;background:${BRAND.background};border-top:1px solid ${BRAND.border};border-radius:0 0 12px 12px;">
                <p style="margin:0 0 5px;color:${BRAND.muted};font-family:${FONT_STACK};font-size:12px;line-height:1.5;">3D Scan Metrics · South Africa</p>
                <a href="${WEBSITE_URL}" style="color:${BRAND.red};font-family:${FONT_STACK};font-size:12px;font-weight:700;text-decoration:none;">www.3dscanmetrics.co.za</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function detailRow(label, value) {
  return `
    <tr>
      <td valign="top" style="width:110px;padding:0 12px 12px 0;color:${BRAND.muted};font-family:${FONT_STACK};font-size:13px;font-weight:600;line-height:1.5;">${escapeHtml(label)}</td>
      <td valign="top" style="padding:0 0 12px;color:${BRAND.navy};font-family:${FONT_STACK};font-size:14px;line-height:1.5;word-break:break-word;">${escapeHtml(value) || '—'}</td>
    </tr>`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
