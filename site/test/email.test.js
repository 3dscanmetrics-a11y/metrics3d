import test from 'node:test';
import assert from 'node:assert/strict';

import { clientEstimateHtml, leadNotifyHtml } from '../src/email.js';

test('customer estimate uses the current brand and email-safe structure', () => {
  const html = clientEstimateHtml({
    project: 'Warehouse survey',
    area: 1250,
    complexity: 'Industrial',
    estimate: 'R 45 000 – R 52 000',
  });

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /role="presentation"/);
  assert.match(html, /https:\/\/www\.3dscanmetrics\.co\.za\/logo\.png/);
  assert.match(html, /#ff3b30/i);
  assert.match(html, /#f97316/i);
  assert.match(html, /Warehouse survey/);
  assert.match(html, /R 45 000 – R 52 000/);
  assert.doesNotMatch(html, /#00e5ff|#10b981/i);
});

test('customer estimate escapes all supplied fields', () => {
  const html = clientEstimateHtml({
    project: '<img src=x onerror=alert(1)>',
    area: '<script>1</script>',
    complexity: 'A & B',
    estimate: '"quoted"',
  });

  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&lt;script&gt;1&lt;\/script&gt;/);
  assert.match(html, /A &amp; B/);
  assert.match(html, /&quot;quoted&quot;/);
});

test('internal notification handles missing fields and escapes payload data', () => {
  const html = leadNotifyHtml({
    leadId: 'lead-123',
    email: 'lead@example.com',
    project: 'Plant & Office',
    estimate: 'R 10 000',
    payload: { notes: '<script>alert("x")</script>' },
  });

  assert.match(html, /New Instant Estimate Lead/);
  assert.match(html, /lead-123/);
  assert.match(html, /Plant &amp; Office/);
  assert.match(html, /Submitted questionnaire/);
  assert.match(html, /&lt;script&gt;alert\(\\&quot;x\\&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, />undefined</);
  assert.match(html, /crm-admin/);
});
