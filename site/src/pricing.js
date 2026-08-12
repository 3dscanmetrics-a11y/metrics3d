export {
  DEFAULT_PRICING,
  AREA_BUCKETS,
  formatZAR,
  formatRange,
  calculatePoint,
  calculateEstimateRange,
  calculateQuote,
} from '../../shared/pricing.js';

import { DEFAULT_PRICING } from '../../shared/pricing.js';

export async function loadPricing(db) {
  const row = await db.prepare('SELECT config_json FROM pricing_config WHERE id = 1').first();
  if (!row?.config_json) {
    return structuredClone(DEFAULT_PRICING);
  }
  try {
    return { ...DEFAULT_PRICING, ...JSON.parse(row.config_json) };
  } catch {
    return structuredClone(DEFAULT_PRICING);
  }
}
