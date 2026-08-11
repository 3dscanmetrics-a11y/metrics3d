export function calculateQuote(
  area: number, 
  complexity: string, 
  deliverables: string[],
  overrides?: { baseRate?: number; processingMult?: number; finalPrice?: number }
) {
  // 1. Base Rate Tier
  let baseRate = 18.0;
  if (area > 10000) baseRate = 4.5;
  else if (area > 5000) baseRate = 6.5;
  else if (area > 1000) baseRate = 9.5;
  else if (area > 200) baseRate = 14.0;
  
  if (overrides?.baseRate) baseRate = overrides.baseRate;

  const rawAreaCost = area * baseRate;

  // 2. Field Cost Calculation
  let siteMult = 1.0;
  if (complexity.includes('Civil')) siteMult = 1.2;
  else if (complexity.includes('Industrial') || complexity.includes('Plant')) siteMult = 1.5;
  else if (complexity.includes('Mining')) siteMult = 1.5;
  else if (complexity.includes('Underground')) siteMult = 2.0;

  const flatAdditions = 2500; 
  const totalFieldCost = (rawAreaCost * siteMult) + flatAdditions;

  // 3. Processing Cost Calculation
  let processingMult = 0.2; // Base processing
  const delivs = deliverables || [];
  if (delivs.includes('viewer')) processingMult += 0.1;
  if (delivs.includes('cad')) processingMult += 0.5;
  if (delivs.includes('topo')) processingMult += 0.4;
  if (delivs.includes('bim')) processingMult += 1.2; 
  
  if (overrides?.processingMult !== undefined) processingMult = overrides.processingMult;

  const totalProcessingCost = (rawAreaCost * processingMult);

  // 4. Final Calculation
  let subtotal = totalFieldCost + totalProcessingCost;
  if (subtotal < 4500) subtotal = 4500;

  if (overrides?.finalPrice) subtotal = overrides.finalPrice;

  // 5. Time Estimation
  const baseDays = Math.ceil(area / 1500);
  const fieldDays = Math.max(1, Math.ceil(baseDays * siteMult)); 
  let processRatio = 1.0;
  if (delivs.includes('cad')) processRatio += 0.5;
  if (delivs.includes('bim')) processRatio += 1.5;
  const processDays = Math.max(1, Math.ceil(fieldDays * processRatio));

  return {
    totalPrice: subtotal,
    fieldDays,
    processDays
  };
}
