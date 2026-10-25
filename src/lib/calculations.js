export const BASE_PRICE = 75;

export const clampAddetti = (value) => Math.min(5000, Math.max(1, Math.round(Number(value) || 1)));
export const clampRatio = (value) => Math.min(50, Math.max(10, Math.round(Number(value) || 10)));

export function getBaseServiceValue(addetti) {
  const n = clampAddetti(addetti);
  let value = 0;

  if (n >= 10) value += 450;
  if (n >= 25) value += 750;
  if (n >= 50) value += 1500;
  if (n >= 100) value += 2500 + Math.floor(n / 10) * 50;

  return value;
}

export function getVariantIncrement(addetti) {
  const n = clampAddetti(addetti);
  let increment = 0;

  if (n >= 10) increment += 400;
  if (n >= 25) increment += 650;
  if (n >= 50) increment += 1350;
  if (n >= 100) increment += 2200;

  return increment;
}

export function getServiceValue(addetti, mode = 'STANDARD') {
  const baseValue = getBaseServiceValue(addetti);
  const increment = mode === 'VARIANTI_ALTO_IMPATTO' ? getVariantIncrement(addetti) : 0;
  return baseValue + increment;
}

export const clampMatchingGrantPercent = (value) => Math.min(100, Math.max(0, Math.round(Number(value) || 0)));

export function calculateImpact(addetti, devolutionRatio, mode = 'STANDARD', matchingGrantMode = 'none', customMatchingPercent = 0) {
  const n = clampAddetti(addetti);
  const ratio = clampRatio(devolutionRatio);
  const orderTotal = n * BASE_PRICE;
  const exenaFund = orderTotal * (ratio / 100);

  let buyerMatchingRate = 0;
  if (matchingGrantMode === 'match') {
    buyerMatchingRate = ratio;
  } else if (matchingGrantMode === 'custom') {
    buyerMatchingRate = clampMatchingGrantPercent(customMatchingPercent);
  }
  const buyerMatchingFund = orderTotal * (buyerMatchingRate / 100);
  const fund = exenaFund + buyerMatchingFund;
  const isPromoter = (matchingGrantMode === 'match') || (matchingGrantMode === 'custom' && buyerMatchingRate > 0);

  const interventions = Math.floor(fund / 2500);
  const co2 = n * 4.25;
  const welfareTickets = (n >= 50 ? 5 : 0) + (n >= 100 ? Math.floor(n / 10) : 0);
  const baseServiceValue = getBaseServiceValue(n);
  const variantIncrement = mode === 'VARIANTI_ALTO_IMPATTO' ? getVariantIncrement(n) : 0;
  const serviceValue = baseServiceValue + variantIncrement;
  const thresholds = [
    { id: 'A', value: 10, unlocked: n >= 10 },
    { id: 'B', value: 25, unlocked: n >= 25 },
    { id: 'C', value: 50, unlocked: n >= 50 },
    { id: 'D', value: 100, unlocked: n >= 100 },
  ];

  return {
    addetti: n,
    ratio,
    orderTotal,
    exenaFund,
    buyerMatchingRate,
    buyerMatchingFund,
    fund,
    matchingGrantMode,
    isPromoter,
    partnershipRole: isPromoter ? 'Partner Promotore' : 'Impresa Aderente',
    interventions,
    co2,
    welfareTickets,
    baseServiceValue,
    variantIncrement,
    serviceValue,
    thresholds,
    unlockedCount: thresholds.filter((threshold) => threshold.unlocked).length,
  };
}

