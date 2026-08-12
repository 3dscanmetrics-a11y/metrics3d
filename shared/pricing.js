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
  access_multipliers: {
    'Standard business hours only': 1.0,
    'After-hours / Weekend work required': 1.15,
    'High-security clearance / Escort required': 1.2,
    'Operational plant/mine site': 1.25,
    'Operational plant/mine site (Simultaneous ops)': 1.25,
  },
  accuracy_multipliers: {
    Standard: 1.0,
    'High Precision': 1.25,
  },
  lod_multipliers: {
    100: 0.6,
    200: 0.8,
    300: 1.0,
    400: 1.35,
  },
};

export const AREA_BUCKETS = {
  100: { min: 50, max: 150, mid: 100 },
  300: { min: 150, max: 600, mid: 300 },
  1000: { min: 600, max: 2500, mid: 1000 },
  5000: { min: 2500, max: 15000, mid: 5000 },
};

export function formatZAR(val) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(val) || 0);
}

export function formatRange(low, high) {
  return `${formatZAR(low)} – ${formatZAR(high)}`;
}

function pickAccessMult(config, access) {
  const table = { ...DEFAULT_PRICING.access_multipliers, ...(config.access_multipliers || {}) };
  if (!access) return 1;
  if (table[access] != null) return Number(table[access]);
  const key = Object.keys(table).find((k) => access.startsWith(k) || access.includes(k));
  return key ? Number(table[key]) : 1;
}

function pickAccuracyMult(config, accuracy) {
  const table = { ...DEFAULT_PRICING.accuracy_multipliers, ...(config.accuracy_multipliers || {}) };
  if (!accuracy) return 1;
  if (table[accuracy] != null) return Number(table[accuracy]);
  if (String(accuracy).includes('High')) return Number(table['High Precision'] ?? 1.25);
  return 1;
}

function pickLodMult(config, bimLevel) {
  const table = { ...DEFAULT_PRICING.lod_multipliers, ...(config.lod_multipliers || {}) };
  const lod = String(bimLevel || '300').replace(/\D/g, '').slice(0, 3) || '300';
  return Number(table[lod] ?? table[Number(lod)] ?? 1);
}

function baseRateForArea(config, area) {
  const tiers = Array.isArray(config.area_tiers) ? config.area_tiers : DEFAULT_PRICING.area_tiers;
  let baseRate = tiers[tiers.length - 1]?.rate ?? 4.5;
  for (const tier of tiers) {
    if (tier.max_area === null || tier.max_area === undefined) {
      baseRate = tier.rate;
      break;
    }
    if (area <= tier.max_area) {
      baseRate = tier.rate;
      break;
    }
  }
  return baseRate;
}

/**
 * Point estimate for a known area and questionnaire inputs.
 */
export function calculatePoint(config, input) {
  const area = Number(input.area) || 0;
  const complexity = input.complexity || 'Commercial/Retail/Residential';
  const deliverables = Array.isArray(input.deliverables) ? input.deliverables.map(String) : [];
  const access = input.access || 'Standard business hours only';
  const accuracy = input.accuracy || 'Standard';
  const bimLevel = input.bimLevel || input.lod || '300';

  const baseRate = input.baseRate != null ? Number(input.baseRate) : baseRateForArea(config, area);
  const rawAreaCost = area * baseRate;
  const siteMult =
    config.site_multipliers?.[complexity] ?? DEFAULT_PRICING.site_multipliers[complexity] ?? 1;
  const accessMult = pickAccessMult(config, access);
  const accuracyMult = pickAccuracyMult(config, accuracy);
  const lodMult = deliverables.includes('bim') ? pickLodMult(config, bimLevel) : 1;
  const flatFee = Number(config.flat_fee ?? DEFAULT_PRICING.flat_fee);

  const fieldCost = (rawAreaCost * siteMult + flatFee) * accessMult * accuracyMult;

  let processingMult = Number(config.processing_base ?? DEFAULT_PRICING.processing_base);
  const delivMults = config.deliverable_multipliers || DEFAULT_PRICING.deliverable_multipliers;
  let bimShare = 0;
  for (const id of deliverables) {
    if (id === 'raw') continue;
    const add = Number(delivMults[id] || 0);
    processingMult += add;
    if (id === 'bim') bimShare = add;
  }
  if (deliverables.includes('bim') && lodMult !== 1) {
    processingMult = processingMult - bimShare + bimShare * lodMult;
  }

  const processingCost = rawAreaCost * processingMult * accuracyMult;
  let mid = fieldCost + processingCost;
  const floor = Number(config.floor ?? DEFAULT_PRICING.floor);
  if (mid < floor) mid = floor;
  if (input.finalPrice != null && Number(input.finalPrice) > 0) mid = Number(input.finalPrice);

  const baseDays = Math.max(1, Math.ceil(area / 1500));
  const fieldDays = Math.max(1, Math.ceil(baseDays * siteMult * accessMult));
  let processRatio = 1;
  if (deliverables.includes('cad')) processRatio += 0.5;
  if (deliverables.includes('bim')) processRatio += 1.5 * lodMult;
  const processDays = Math.max(1, Math.ceil(fieldDays * processRatio));

  const lines = [
    { label: `Area ${area} sqm @ R${baseRate}/sqm`, amount: rawAreaCost },
    { label: `Site (${complexity}) ×${siteMult}`, amount: rawAreaCost * (siteMult - 1) },
    { label: `Mobilisation / flat fee`, amount: flatFee },
    { label: `Access (${access}) ×${accessMult}`, amount: (rawAreaCost * siteMult + flatFee) * (accessMult - 1) },
    { label: `Accuracy (${accuracy}) ×${accuracyMult}`, amount: 0 },
    { label: `Processing (deliv + LOD ${deliverables.includes('bim') ? bimLevel : 'n/a'})`, amount: processingCost },
  ];

  return {
    amount: mid,
    fieldCost,
    processingCost,
    baseRate,
    siteMult,
    accessMult,
    accuracyMult,
    lodMult,
    processingMult,
    flatFee,
    floor,
    fieldDays,
    processDays,
    lines,
  };
}

/**
 * Indicative range. Unknown size uses bucket min/max; known size uses ±15%.
 */
export function calculateEstimateRange(config, input) {
  const areaUnknown = Boolean(input.areaUnknown);
  const bucketKey = Number(input.areaBucket || input.area);
  const bucket = areaUnknown ? AREA_BUCKETS[bucketKey] || AREA_BUCKETS[Number(input.area)] : null;

  const midArea = bucket ? bucket.mid : Number(input.area) || 0;
  const midPoint = calculatePoint(config, { ...input, area: midArea });

  let low;
  let high;
  if (bucket) {
    low = calculatePoint(config, { ...input, area: bucket.min, finalPrice: undefined }).amount;
    high = calculatePoint(config, { ...input, area: bucket.max, finalPrice: undefined }).amount;
  } else {
    low = Math.max(midPoint.floor, midPoint.amount * 0.85);
    high = Math.max(low, midPoint.amount * 1.15);
  }
  if (low > high) {
    const tmp = low;
    low = high;
    high = tmp;
  }

  return {
    low,
    mid: midPoint.amount,
    high,
    formatted: formatRange(low, high),
    formattedMid: formatZAR(midPoint.amount),
    area: midArea,
    fieldDays: midPoint.fieldDays,
    processDays: midPoint.processDays,
    breakdown: {
      ...midPoint,
      low,
      high,
      areaUnknown,
      bucket: bucket || null,
    },
    totalPrice: midPoint.amount,
  };
}

/** CRM / legacy wrapper */
export function calculateQuote(area, complexity, deliverables, overrides, extras) {
  const config = DEFAULT_PRICING;
  const input = {
    area,
    complexity,
    deliverables,
    access: extras?.access,
    accuracy: extras?.accuracy,
    bimLevel: extras?.bimLevel,
    areaUnknown: extras?.areaUnknown,
    areaBucket: extras?.areaBucket,
    baseRate: overrides?.baseRate,
    finalPrice: overrides?.finalPrice,
  };
  const range = calculateEstimateRange(config, input);
  return {
    totalPrice: overrides?.finalPrice || range.mid,
    fieldDays: range.fieldDays,
    processDays: range.processDays,
    low: range.low,
    mid: range.mid,
    high: range.high,
    formatted: range.formatted,
    breakdown: range.breakdown,
  };
}
