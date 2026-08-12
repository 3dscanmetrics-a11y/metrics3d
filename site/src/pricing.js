/** @typedef {{ max_area: number | null, rate: number }} AreaTier */
/** @typedef {{
 *   area_tiers: AreaTier[],
 *   site_multipliers: Record<string, number>,
 *   processing_base: number,
 *   deliverable_multipliers: Record<string, number>,
 *   flat_fee: number,
 *   floor: number
 * }} PricingConfig */

export const DEFAULT_PRICING = {
  area_tiers: [
    { max_area: 200, rate: 18.0 },
    { max_area: 1000, rate: 14.0 },
    { max_area: 5000, rate: 9.5 },
    { max_area: 10000, rate: 6.5 },
    { max_area: null, rate: 4.5 },
  ],
  site_multipliers: {
    'Commercial/Retail/Residential': 1.0,
    'Civil Infrastructure': 1.2,
    'Industrial Facility / Plant': 1.5,
    'Mining (Surface)': 1.5,
    'Mining (Underground)': 2.0,
  },
  processing_base: 0.2,
  deliverable_multipliers: {
    raw: 0.0,
    viewer: 0.1,
    cad: 0.5,
    topo: 0.4,
    bim: 1.2,
  },
  flat_fee: 2500,
  floor: 4500,
};

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @returns {Promise<PricingConfig>}
 */
export async function loadPricing(db) {
  const row = await db
    .prepare('SELECT config_json FROM pricing_config WHERE id = 1')
    .first();

  if (!row?.config_json) {
    return structuredClone(DEFAULT_PRICING);
  }

  try {
    return { ...DEFAULT_PRICING, ...JSON.parse(row.config_json) };
  } catch {
    return structuredClone(DEFAULT_PRICING);
  }
}

/**
 * @param {PricingConfig} config
 * @param {{ area: number, complexity: string, deliverables: string[] }} input
 */
export function calculateEstimate(config, { area, complexity, deliverables }) {
  const parsedArea = Number(area) || 0;
  const tiers = Array.isArray(config.area_tiers) ? config.area_tiers : DEFAULT_PRICING.area_tiers;

  // Inclusive max_area tiers from D1 / admin (no hardcoded override)
  let baseRate = tiers[tiers.length - 1]?.rate ?? 4.5;
  for (const tier of tiers) {
    if (tier.max_area === null || tier.max_area === undefined) {
      baseRate = tier.rate;
      break;
    }
    if (parsedArea <= tier.max_area) {
      baseRate = tier.rate;
      break;
    }
  }

  const rawAreaCost = parsedArea * baseRate;
  const siteMult =
    config.site_multipliers?.[complexity] ??
    DEFAULT_PRICING.site_multipliers[complexity] ??
    1.0;
  const flatFee = Number(config.flat_fee ?? DEFAULT_PRICING.flat_fee);
  const totalFieldCost = rawAreaCost * siteMult + flatFee;

  let processingMult = Number(config.processing_base ?? DEFAULT_PRICING.processing_base);
  const delivs = Array.isArray(deliverables) ? deliverables : [];
  const delivMults = config.deliverable_multipliers || DEFAULT_PRICING.deliverable_multipliers;
  for (const id of delivs) {
    if (id === 'raw') continue;
    processingMult += Number(delivMults[id] || 0);
  }

  const totalProcessingCost = rawAreaCost * processingMult;
  let subtotal = totalFieldCost + totalProcessingCost;
  const floor = Number(config.floor ?? DEFAULT_PRICING.floor);
  if (subtotal < floor) subtotal = floor;

  const formattedTotal = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(subtotal);

  return {
    amount: subtotal,
    formatted: formattedTotal,
    breakdown: {
      area: parsedArea,
      baseRate,
      siteMult,
      flatFee,
      processingMult,
      fieldCost: totalFieldCost,
      processingCost: totalProcessingCost,
      floor,
    },
  };
}
