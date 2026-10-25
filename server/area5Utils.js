import { calculateFundCents, reconcileAttestation } from './calculations.js';

export const THRESHOLD_VALUES = [10, 25, 50, 100];
const confirmed = (order) => order.status === 'CONFIRMED';
const uniqueById = (orders) => [...new Map(orders.map((order) => [order.id, order])).values()];
const sumOrders = (orders) => uniqueById(orders).reduce((result, order) => {
  result.pairs += order.pairs;
  result.totalCents += order.totalCents;
  result.fundCents += calculateFundCents(order);
  result.orderIds.push(order.id);
  result.organizationIds.add(order.organizationId);
  return result;
}, { pairs: 0, totalCents: 0, fundCents: 0, orderIds: [], organizationIds: new Set() });

export function calculateBulkOrder(catalog, items) {
  const merged = new Map();
  items.forEach((item, index) => {
    const product = catalog.find((candidate) => candidate.id === item.productId);
    const variant = product?.sizes.find((candidate) => candidate.size === String(item.size));
    if (!product || !variant) throw Object.assign(new Error('Modello o taglia non validi'), { code: 'INVALID_ITEM', cell: `items.${index}` });
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 500) throw Object.assign(new Error('Quantità non valida: inserisci un intero tra 1 e 500'), { code: 'INVALID_QUANTITY', cell: `items.${index}.quantity` });
    const key = `${product.id}:${variant.size}`;
    const previous = merged.get(key);
    if (previous) previous.quantity += item.quantity;
    else merged.set(key, { productId: product.id, productName: product.name, sku: product.sku, size: variant.size, quantity: item.quantity, listUnitPriceCents: product.listUnitPriceCents, unitPriceCents: product.contractUnitPriceCents, stockStatus: variant.stockStatus, stockUpdatedAt: variant.updatedAt });
  });
  const lines = [...merged.values()].map((line) => {
    if (line.quantity > 500) throw Object.assign(new Error('La quantità aggregata per modello e taglia non può superare 500'), { code: 'INVALID_QUANTITY' });
    return { ...line, listTotalCents: line.listUnitPriceCents * line.quantity, totalCents: line.unitPriceCents * line.quantity };
  });
  const pairs = lines.reduce((sum, line) => sum + line.quantity, 0);
  const listTotalCents = lines.reduce((sum, line) => sum + line.listTotalCents, 0);
  const totalCents = lines.reduce((sum, line) => sum + line.totalCents, 0);
  if (!lines.length || pairs > 2000) throw Object.assign(new Error('Il carrello deve contenere da 1 a 2.000 paia'), { code: 'INVALID_CART' });
  return {
    lines, pairs, listTotalCents, totalCents,
    contractDiscountCents: listTotalCents - totalCents,
    devolutionRate: 30,
    fundCents: calculateFundCents({ totalCents, devolutionRate: 30 }),
    stockWarnings: lines.filter((line) => line.stockStatus !== 'AVAILABLE').map((line) => ({ productId: line.productId, size: line.size, status: line.stockStatus, updatedAt: line.stockUpdatedAt })),
  };
}

export function thresholdProgress(pairs) {
  const thresholds = THRESHOLD_VALUES.map((value, index) => ({
    id: ['A', 'B', 'C', 'D'][index], value,
    unlocked: pairs >= value,
    missingPairs: Math.max(0, value - pairs),
  }));
  return { pairs, thresholds, unlockedCount: thresholds.filter((item) => item.unlocked).length, nextThreshold: thresholds.find((item) => !item.unlocked) || null };
}

function relationIncludesOrder(relation, order) {
  if (relation.siteId !== order.siteId) return false;
  const timestamp = new Date(order.confirmedAt || 0).getTime();
  const starts = new Date(relation.startAt || 0).getTime();
  const ends = relation.endAt ? new Date(relation.endAt).getTime() : Number.POSITIVE_INFINITY;
  return timestamp >= starts && timestamp <= ends;
}

export function ordersForLink(db, link, { includeRevokedHistory = false } = {}) {
  const active = link.status === 'ACTIVE' && link.consents?.volumeAttribution === true;
  if (!active && !includeRevokedHistory) return [];
  if (!link.consents?.volumeAttribution) return [];
  return uniqueById(db.orders.filter((order) => confirmed(order) && order.organizationId === link.subcontractorOrganizationId && link.siteRelations.some((relation) => relationIncludesOrder(relation, order))));
}

export function buildThresholdLedger(db, { organizationId, includeNetwork = false, siteId = null }) {
  const siteMatch = (order) => !siteId || order.siteId === siteId;
  const directOrders = uniqueById(db.orders.filter((order) => confirmed(order) && order.organizationId === organizationId && siteMatch(order)));
  const links = includeNetwork ? db.subcontractorLinks.filter((link) => link.gcOrganizationId === organizationId && link.status === 'ACTIVE') : [];
  const subcontractorOrders = links.flatMap((link) => ordersForLink(db, link)).filter(siteMatch);
  const direct = sumOrders(directOrders);
  const combined = sumOrders([...directOrders, ...subcontractorOrders]);
  const bySite = new Map();
  for (const order of uniqueById([...directOrders, ...subcontractorOrders])) {
    const current = bySite.get(order.siteId) || { siteId: order.siteId, pairs: 0, orderIds: [] };
    current.pairs += order.pairs;
    current.orderIds.push(order.id);
    bySite.set(order.siteId, current);
  }
  return {
    pairs: combined.pairs,
    totalCents: combined.totalCents,
    fundCents: combined.fundCents,
    orderIds: combined.orderIds.sort(),
    organizationIds: [...combined.organizationIds].sort(),
    directPairs: direct.pairs,
    networkAddedPairs: combined.pairs - direct.pairs,
    sites: [...bySite.values()].sort((a, b) => a.siteId.localeCompare(b.siteId)),
    progress: thresholdProgress(combined.pairs),
  };
}

export function entitlementState(entitlement, pairs, now = new Date()) {
  if (entitlement.contractStatus !== 'ACTIVE') return 'ACTIVATION_REQUIRED';
  if (entitlement.expiresAt && new Date(entitlement.expiresAt).getTime() <= new Date(now).getTime()) return 'EXPIRED';
  if (pairs < entitlement.requiredPairs) return 'LOCKED_THRESHOLD';
  return entitlement.activationStatus === 'ACTIVE' ? 'ACTIVE' : 'AVAILABLE';
}

export function publicTransparencyDataset(db) {
  const published = db.transparencyProjects.filter((project) => project.publicationStatus === 'PUBLISHED');
  const sourceIds = [...new Set(published.flatMap((project) => project.sourceAttestationIds))];
  const validSourceIds = sourceIds.filter((sourceId) => {
    const attestation = db.attestations.find((item) => item.id === sourceId && item.status === 'VERIFIED');
    const order = attestation && db.orders.find((item) => item.id === attestation.orderId);
    if (!attestation || !order || !reconcileAttestation(attestation, order).valid) return false;
    const allocated = published.reduce((sum, project) => sum + project.allocations.filter((allocation) => allocation.attestationId === sourceId).reduce((inner, allocation) => inner + allocation.amountCents, 0), 0);
    return allocated === attestation.fundCents;
  });
  const projects = published.filter((project) => project.sourceAttestationIds.every((id) => validSourceIds.includes(id))).map((project) => ({
    publicId: project.publicId,
    slug: project.slug,
    title: project.title,
    municipality: project.municipality,
    village: project.village,
    amountCents: project.amountCents,
    operationalStatus: project.operationalStatus,
    publicDate: project.publicDate,
    updatedAt: project.updatedAt,
    description: project.description,
    sources: project.sourceAttestationIds.map((id) => {
      const attestation = db.attestations.find((item) => item.id === id);
      return { label: `Attestazione Fondo verificata · demo ${attestation.version}`, verifiedAt: attestation.auditTrail.at(-1)?.at || null, publicPath: `/verifica/fondo/${attestation.publicToken}` };
    }),
    rectifications: project.rectifications.map((item) => ({ at: item.at, reason: item.reason, previousAmountCents: item.previousAmountCents, newAmountCents: item.newAmountCents })),
  }));
  const totalCents = projects.reduce((sum, project) => sum + project.amountCents, 0);
  return {
    projects, totalCents, projectCount: projects.length,
    municipalities: [...new Set(projects.map((project) => project.municipality))].sort(),
    updatedAt: projects.length ? projects.map((project) => project.updatedAt).sort().at(-1) : null,
    reconciliation: { status: validSourceIds.length === sourceIds.length ? 'RECONCILED_DEMO' : 'REVIEW_REQUIRED', validSources: validSourceIds.length, expectedSources: sourceIds.length },
  };
}

export function validateLogisticsNeeds(catalog, needs) {
  const errors = [];
  if (!Array.isArray(needs) || !needs.length || needs.length > 200) return [{ cell: 'needs', message: 'Inserisci da 1 a 200 righe di fabbisogno' }];
  const seen = new Set();
  needs.forEach((need, index) => {
    const product = catalog.find((item) => item.id === need.productId);
    const variant = product?.sizes.find((item) => item.size === String(need.size));
    const cell = `Riga ${index + 1}`;
    if (!product || !variant) errors.push({ cell, message: 'Seleziona un modello e una taglia presenti nel catalogo' });
    if (!Number.isInteger(need.quantity) || need.quantity < 1 || need.quantity > 500) errors.push({ cell: `${cell} / quantità`, message: 'Inserisci un intero tra 1 e 500' });
    const key = `${need.productId}:${need.size}`;
    if (seen.has(key)) errors.push({ cell, message: 'Modello e taglia sono duplicati: unisci le quantità in una sola riga' });
    seen.add(key);
  });
  return errors;
}

export function logisticsReconciliation(plan, orders) {
  const needsPairs = plan.needs.reduce((sum, item) => sum + item.quantity, 0);
  const order = orders.find((item) => item.id === plan.sourceOrderId && item.organizationId === plan.organizationId && item.siteId === plan.siteId && confirmed(item));
  const orderPairs = order?.pairs || 0;
  const shipmentPairs = plan.shipments.reduce((sum, shipment) => sum + shipment.items.reduce((inner, item) => inner + item.quantity, 0), 0);
  const needsMatchOrder = Boolean(order) && needsPairs === orderPairs;
  const shipmentsMatchNeeds = plan.shipments.every((shipment) => {
    const expected = new Map(plan.needs.map((item) => [`${item.productId}:${item.size}`, item.quantity]));
    const actual = new Map(shipment.items.map((item) => [`${item.productId}:${item.size}`, item.quantity]));
    return expected.size === actual.size && [...expected].every(([key, quantity]) => actual.get(key) === quantity);
  });
  return { needsPairs, orderPairs, shipmentPairs, needsMatchOrder, shipmentsMatchNeeds, valid: needsPairs > 0 && needsMatchOrder && shipmentsMatchNeeds && (!plan.shipments.length || shipmentPairs === needsPairs) };
}

export function parseNeedsCsv(source) {
  const lines = String(source || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length || lines[0].trim().toLowerCase() !== 'productid,size,quantity') return { needs: [], errors: [{ cell: 'Intestazione', message: 'Usa esattamente productId,size,quantity' }] };
  const needs = [];
  const errors = [];
  lines.slice(1, 201).forEach((line, index) => {
    const cells = line.split(',').map((cell) => cell.trim());
    if (cells.length !== 3) { errors.push({ cell: `Riga CSV ${index + 2}`, message: 'Servono tre colonne: modello, taglia e quantità' }); return; }
    const quantity = Number(cells[2]);
    if (!/^\d+$/.test(cells[2]) || !Number.isInteger(quantity)) errors.push({ cell: `Riga CSV ${index + 2} / quantità`, message: 'La quantità deve essere un numero intero' });
    needs.push({ productId: cells[0], size: cells[1], quantity });
  });
  if (lines.length > 201) errors.push({ cell: 'CSV', message: 'Il file supera 200 righe' });
  return { needs, errors };
}

export function validateItalianVatFormat(value) {
  const digits = String(value || '').replace(/^IT/i, '').trim();
  if (!/^\d{11}$/.test(digits)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const digit = Number(digits[index]);
    if (index % 2 === 0) sum += digit;
    else { const doubled = digit * 2; sum += doubled > 9 ? doubled - 9 : doubled; }
  }
  return (10 - (sum % 10)) % 10 === Number(digits[10]);
}

export function canActivateSubcontractorLink(link) {
  return link.status === 'PENDING_VERIFICATION' && Boolean(link.acceptedAt && link.identityConfirmedAt && link.verificationStatus === 'VERIFIED_DEMO' && link.siteRelations.length && Object.values(link.consents || {}).some(Boolean));
}
