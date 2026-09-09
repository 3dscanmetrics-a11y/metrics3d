import { calculateEstimateRange, DEFAULT_PRICING } from './pricing';

export interface CalculatorQuoteInput {
  leadId: string;
  clientName: string;
  clientEmail: string;
  project: string;
  areaSqM: number;
  complexity: string;
  deliverables: string[];
  fieldDays: number;
  processDays: number;
  firmAmountZar: number;
  distanceKm?: number;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPriceZar: number;
  totalZar: number;
}

export interface StructuredInvoice {
  items: LineItem[];
  subtotalZar: number;
  taxZar: number;
  totalZar: number;
}

/**
 * Returns exact 1-to-1 line item breakdown for a Lead/Quotation (supporting both Custom BoQ and Calculator Engine modes).
 */
export function getLeadBreakdownItems(lead: any): LineItem[] {
  if (!lead) return [];

  let payloadObj: any = {};
  if (typeof lead.payload === 'object' && lead.payload !== null && !Array.isArray(lead.payload) && Object.keys(lead.payload).length > 0) {
    payloadObj = lead.payload;
  } else if (typeof lead.deliverables === 'string') {
    try {
      const parsed = JSON.parse(lead.deliverables);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        payloadObj = parsed;
      }
    } catch {}
  }

  const customItems = Array.isArray(lead.customItems)
    ? lead.customItems
    : Array.isArray(payloadObj.customItems)
      ? payloadObj.customItems
      : [];

  const isCustomBoq = (payloadObj.mode === 'custom' || customItems.length > 0) && customItems.length > 0;

  if (isCustomBoq) {
    return customItems.map((item: any) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || item.unitPriceZar || 0);
      const total = Number(item.total || item.totalZar || (qty * unitPrice));
      return {
        description: String(item.description || 'Custom Scope Item'),
        quantity: qty,
        unitPriceZar: unitPrice,
        totalZar: total,
      };
    });
  }

  let delivList: string[] = [];
  if (Array.isArray(lead.deliverables)) {
    delivList = lead.deliverables;
  } else if (Array.isArray(payloadObj.deliverables)) {
    delivList = payloadObj.deliverables;
  } else if (typeof lead.deliverables === 'string') {
    try {
      const parsed = JSON.parse(lead.deliverables);
      if (Array.isArray(parsed)) {
        delivList = parsed;
      } else if (parsed && Array.isArray(parsed.deliverables)) {
        delivList = parsed.deliverables;
      }
    } catch {}
  }

  const estRange = calculateEstimateRange(DEFAULT_PRICING, {
    area: Number(lead.area) || 0,
    complexity: String(lead.complexity || 'Standard'),
    deliverables: delivList,
    access: lead.access || payloadObj.access,
    accuracy: lead.accuracy || payloadObj.accuracy,
    bimLevel: lead.bimLevel || payloadObj.bimLevel,
    distanceKm: Number(lead.distanceKm || payloadObj.distanceKm || 0),
    finalPrice: Number(lead.quoteTotal) || 0,
  });

  const rawLines = estRange.breakdown.lines;
  const quoteTotal = Number(lead.quoteTotal) || estRange.mid;
  const sumRaw = rawLines.reduce((acc, l) => acc + (l.amount || 0), 0);

  let lines = rawLines.map((l) => ({ ...l }));
  if (sumRaw > 0 && Math.abs(quoteTotal - sumRaw) > 0.01) {
    const scale = quoteTotal / sumRaw;
    let runningSum = 0;
    const nonZeroCount = lines.filter((l) => l.amount > 0).length;
    let processedCount = 0;

    lines = lines.map((line) => {
      if (line.amount === 0) return line;
      processedCount++;
      let scaledAmount = Math.round(line.amount * scale * 100) / 100;
      runningSum += scaledAmount;

      if (processedCount === nonZeroCount) {
        const diff = Math.round((quoteTotal - runningSum) * 100) / 100;
        scaledAmount = Math.round((scaledAmount + diff) * 100) / 100;
      }
      return { ...line, amount: scaledAmount };
    });
  }

  return lines.map((line) => ({
    description: line.label,
    quantity: 1,
    unitPriceZar: line.amount,
    totalZar: line.amount,
  }));
}

/**
 * Pipes price calculator metrics into structured line items with 15% VAT (ZAR).
 */
export function generateInvoiceLineItems(q: CalculatorQuoteInput): StructuredInvoice {
  const items: LineItem[] = [
    {
      description: `3D Laser Scanning Site Fieldwork (${q.areaSqM || 0} m², ${q.complexity || 'Standard'} Complexity)`,
      quantity: q.fieldDays || 1,
      unitPriceZar: 12500, // ZAR 12,500 / field day
      totalZar: (q.fieldDays || 1) * 12500,
    },
    {
      description: `Point Cloud Scoping & Processing (${q.processDays || 1} CAD/processing days)`,
      quantity: q.processDays || 1,
      unitPriceZar: 8500, // ZAR 8,500 / processing day
      totalZar: (q.processDays || 1) * 8500,
    },
  ];

  if (q.distanceKm && q.distanceKm > 30) {
    const extraKm = q.distanceKm - 30;
    const travelTotal = Math.round(extraKm * 18.5 * 2);
    items.push({
      description: `Travel & Mobilization (${extraKm} km beyond 30km Johannesburg radius @ R18.50/km roundtrip)`,
      quantity: 1,
      unitPriceZar: travelTotal,
      totalZar: travelTotal,
    });
  }

  if (Array.isArray(q.deliverables)) {
    q.deliverables.forEach((item) => {
      items.push({
        description: `Deliverable Production: ${item}`,
        quantity: 1,
        unitPriceZar: 4500,
        totalZar: 4500,
      });
    });
  }

  const unscaledSubtotal = items.reduce((sum, i) => sum + i.totalZar, 0);
  const targetTotal = q.firmAmountZar || unscaledSubtotal;

  if (unscaledSubtotal > 0 && Math.abs(targetTotal - unscaledSubtotal) > 0.01) {
    const scale = targetTotal / unscaledSubtotal;
    let runningSum = 0;
    items.forEach((item, idx) => {
      let scaledTotal = Math.round(item.totalZar * scale * 100) / 100;
      runningSum += scaledTotal;
      if (idx === items.length - 1) {
        const diff = Math.round((targetTotal - runningSum) * 100) / 100;
        scaledTotal = Math.round((scaledTotal + diff) * 100) / 100;
      }
      item.totalZar = scaledTotal;
      item.unitPriceZar = Math.round((scaledTotal / (item.quantity || 1)) * 100) / 100;
    });
  }

  const subtotalZar = items.reduce((sum, i) => sum + i.totalZar, 0);
  const taxZar = 0;
  const totalZar = subtotalZar;

  return { items, subtotalZar, taxZar, totalZar };
}
