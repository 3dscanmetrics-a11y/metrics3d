export const DEFAULT_PRICING: {
  area_tiers: Array<{ max_area: number | null; rate: number }>;
  site_multipliers: Record<string, number>;
  processing_base: number;
  deliverable_multipliers: Record<string, number>;
  flat_fee: number;
  floor: number;
  access_multipliers: Record<string, number>;
  accuracy_multipliers: Record<string, number>;
  lod_multipliers: Record<string, number>;
};

export const AREA_BUCKETS: Record<number, { min: number; max: number; mid: number }>;

export function formatZAR(val: number): string;
export function formatRange(low: number, high: number): string;

export type QuoteInput = {
  area?: number;
  complexity?: string;
  deliverables?: string[];
  access?: string;
  accuracy?: string;
  bimLevel?: string;
  lod?: string;
  areaUnknown?: boolean;
  areaBucket?: number;
  baseRate?: number;
  finalPrice?: number;
};

export type PointResult = {
  amount: number;
  fieldCost: number;
  processingCost: number;
  baseRate: number;
  siteMult: number;
  accessMult: number;
  accuracyMult: number;
  lodMult: number;
  processingMult: number;
  flatFee: number;
  floor: number;
  fieldDays: number;
  processDays: number;
  lines: Array<{ label: string; amount: number }>;
};

export type RangeResult = {
  low: number;
  mid: number;
  high: number;
  formatted: string;
  formattedMid: string;
  area: number;
  fieldDays: number;
  processDays: number;
  breakdown: PointResult & {
    low: number;
    high: number;
    areaUnknown: boolean;
    bucket: { min: number; max: number; mid: number } | null;
  };
  totalPrice: number;
};

export function calculatePoint(config: typeof DEFAULT_PRICING | Record<string, unknown>, input: QuoteInput): PointResult;
export function calculateEstimateRange(
  config: typeof DEFAULT_PRICING | Record<string, unknown>,
  input: QuoteInput
): RangeResult;
export function calculateQuote(
  area: number,
  complexity: string,
  deliverables: string[],
  overrides?: { baseRate?: number; finalPrice?: number },
  extras?: QuoteInput
): {
  totalPrice: number;
  fieldDays: number;
  processDays: number;
  low: number;
  mid: number;
  high: number;
  formatted: string;
  breakdown: RangeResult['breakdown'];
};
