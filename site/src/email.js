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
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <h2 style="color: #00e5ff;">3D Scan Metrics</h2>
      <h1>Your Indicative Scoping Estimate</h1>
      <p>Thank you for using our Instant Pricing Engine. Based on the specifications provided, here is a <strong>preliminary range</strong> for <strong>${escapeHtml(project)}</strong>:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Area:</strong> ${escapeHtml(String(area))} sqm</p>
        <p><strong>Complexity:</strong> ${escapeHtml(complexity || '')}</p>
        <h2 style="font-size: 24px; color: #10b981; margin-top: 20px;">Indicative range: ${escapeHtml(estimate)}</h2>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This is an automated rough estimate, not a formal quotation. A lead engineer will review your parameters and follow up with a binding quote, availability, and next steps.</p>
    </div>
  `;
}

export function leadNotifyHtml({ leadId, email, phone, project, company, estimate, payload }) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111827;">
      <h2>New Instant Estimate Lead</h2>
      <p><strong>Lead ID:</strong> ${escapeHtml(leadId)}</p>
      <p><strong>Project:</strong> ${escapeHtml(project || '')}</p>
      <p><strong>Company:</strong> ${escapeHtml(company || '')}</p>
      <p><strong>Email:</strong> ${escapeHtml(email || '')}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone || '')}</p>
      <p><strong>Indicative range:</strong> ${escapeHtml(estimate)}</p>
      <pre style="background:#f3f4f6;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
      <p>Open MetricsCRM (Worker <strong>crm-admin</strong>) to edit the questionnaire and issue a formal quote.</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
