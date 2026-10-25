import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from './seed.js';
import { buildThresholdLedger, calculateBulkOrder, canActivateSubcontractorLink, entitlementState, logisticsReconciliation, parseNeedsCsv, publicTransparencyDataset, thresholdProgress, validateItalianVatFormat, validateLogisticsNeeds } from './area5Utils.js';

test('Area 5 bulk totals use contractual server prices, deduplicate lines and calculate 30%', () => {
  const db = createSeed();
  const result = calculateBulkOrder(db.productCatalog, [
    { productId: 'PROD-ECO-S3S', size: '42', quantity: 1 },
    { productId: 'PROD-ECO-S3S', size: '42', quantity: 1 },
    { productId: 'PROD-BOOT-S3', size: '42', quantity: 1 },
  ]);
  assert.equal(result.lines.length, 2);
  assert.equal(result.pairs, 3);
  assert.equal(result.totalCents, 23400);
  assert.equal(result.listTotalCents, 24700);
  assert.equal(result.contractDiscountCents, 1300);
  assert.equal(result.fundCents, 7020);
});

test('Area 5 threshold boundaries are deterministic and expose the next gap', () => {
  assert.equal(thresholdProgress(9).unlockedCount, 0);
  assert.equal(thresholdProgress(10).unlockedCount, 1);
  assert.equal(thresholdProgress(25).unlockedCount, 2);
  assert.equal(thresholdProgress(50).unlockedCount, 3);
  assert.equal(thresholdProgress(100).unlockedCount, 4);
  assert.deepEqual(thresholdProgress(40).nextThreshold, { id: 'C', value: 50, unlocked: false, missingPairs: 10 });
  assert.equal(thresholdProgress(120).nextThreshold, null);
});

test('Area 5 network ledger deduplicates orders and preserves individual subcontractor volume', () => {
  const db = createSeed();
  db.orders.push({ ...db.orders[0] });
  const network = buildThresholdLedger(db, { organizationId: 'org-gc-demo', includeNetwork: true });
  assert.equal(network.pairs, 345);
  assert.equal(network.directPairs, 305);
  assert.equal(network.networkAddedPairs, 40);
  assert.equal(new Set(network.orderIds).size, network.orderIds.length);
  assert.equal(buildThresholdLedger(db, { organizationId: 'org-sub-demo', includeNetwork: true }).pairs, 40);
  assert.equal(buildThresholdLedger(db, { organizationId: 'org-gc-demo', includeNetwork: true, siteId: 'site-ponte-demo' }).pairs, 320);
});

test('Area 5 consent revocation changes network aggregate without taking away individual volume', () => {
  const db = createSeed();
  db.subcontractorLinks[0].consents.volumeAttribution = false;
  assert.equal(buildThresholdLedger(db, { organizationId: 'org-gc-demo', includeNetwork: true }).pairs, 305);
  assert.equal(buildThresholdLedger(db, { organizationId: 'org-sub-demo' }).pairs, 40);
});

test('Area 5 entitlement keeps contract, threshold and activation states distinct', () => {
  const base = { contractStatus: 'ACTIVE', activationStatus: 'READY', requiredPairs: 50, expiresAt: null };
  assert.equal(entitlementState(base, 40), 'LOCKED_THRESHOLD');
  assert.equal(entitlementState(base, 50), 'AVAILABLE');
  assert.equal(entitlementState({ ...base, activationStatus: 'ACTIVE' }, 50), 'ACTIVE');
  assert.equal(entitlementState({ ...base, contractStatus: 'ACTIVATION_REQUIRED' }, 100), 'ACTIVATION_REQUIRED');
  assert.equal(entitlementState({ ...base, expiresAt: '2026-01-01' }, 100, new Date('2026-10-23')), 'EXPIRED');
});

test('Area 5 public register reconciles allocations and exposes only public project fields', () => {
  const result = publicTransparencyDataset(createSeed());
  assert.equal(result.totalCents, 450000);
  assert.equal(result.projectCount, 2);
  assert.equal(result.reconciliation.status, 'RECONCILED_DEMO');
  assert.equal(result.projects[0].organizationId, undefined);
  assert.equal(result.projects[0].allocations, undefined);
  assert.equal(result.projects[0].sourceAttestationIds, undefined);
  assert.equal(result.projects[0].rectifications.length, 1);
});

test('Area 5 public register removes unreconciled sources instead of publishing stale amounts', () => {
  const db = createSeed();
  db.attestations.find((item) => item.id === 'ATT-DEMO-0142').status = 'PENDING_REVIEW';
  const result = publicTransparencyDataset(db);
  assert.equal(result.projectCount, 0);
  assert.equal(result.totalCents, 0);
  assert.equal(result.reconciliation.status, 'REVIEW_REQUIRED');
});

test('Area 5 logistics reconciles needs, source order and shipment quantities', () => {
  const db = createSeed();
  const plan = structuredClone(db.logisticsPlans[0]);
  assert.equal(logisticsReconciliation(plan, db.orders).valid, true);
  plan.needs[0].quantity = 90;
  assert.equal(logisticsReconciliation(plan, db.orders).needsMatchOrder, false);
  plan.needs[0].quantity = 100;
  plan.shipments.push({ items: structuredClone(plan.needs) });
  assert.equal(logisticsReconciliation(plan, db.orders).shipmentPairs, 200);
  assert.equal(logisticsReconciliation(plan, db.orders).valid, true);
  plan.shipments.push({ items: structuredClone(plan.needs) });
  assert.equal(logisticsReconciliation(plan, db.orders).valid, false);
});

test('Area 5 logistics validation identifies the exact row and correction', () => {
  const db = createSeed();
  const errors = validateLogisticsNeeds(db.productCatalog, [{ productId: 'PROD-ECO-S3S', size: '99', quantity: 0 }]);
  assert.equal(errors.length, 2);
  assert.match(errors[0].cell, /Riga 1/);
  assert.match(errors[1].message, /intero tra 1 e 500/);
});

test('Area 5 CSV import is strict, standard and limited', () => {
  const valid = parseNeedsCsv('\uFEFFproductId,size,quantity\nPROD-ECO-S3S,42,100\nPROD-ECO-S3S,43,100');
  assert.deepEqual(valid.errors, []);
  assert.equal(valid.needs.reduce((sum, item) => sum + item.quantity, 0), 200);
  assert.match(parseNeedsCsv('modello,taglia,quantita\nA,42,2').errors[0].message, /productId,size,quantity/);
  assert.match(parseNeedsCsv('productId,size,quantity\nPROD-ECO-S3S,42,2.5').errors[0].message, /intero/);
});

test('Area 5 VAT checksum is only a formal validation', () => {
  assert.equal(validateItalianVatFormat('IT12345678903'), true);
  assert.equal(validateItalianVatFormat('12345678903'), true);
  assert.equal(validateItalianVatFormat('12345678901'), false);
  assert.equal(validateItalianVatFormat('non-verificabile'), false);
});

test('Area 5 invitation cannot become active before acceptance and effective verification', () => {
  const link = structuredClone(createSeed().subcontractorLinks[1]);
  assert.equal(canActivateSubcontractorLink(link), false);
  link.status = 'PENDING_VERIFICATION';
  link.acceptedAt = '2026-10-23T10:00:00.000Z';
  link.identityConfirmedAt = link.acceptedAt;
  link.consents.volumeAttribution = true;
  link.siteRelations = [{ siteId: 'site-ponte-demo', startAt: link.acceptedAt, endAt: null }];
  assert.equal(canActivateSubcontractorLink(link), false);
  link.verificationStatus = 'VERIFIED_DEMO';
  assert.equal(canActivateSubcontractorLink(link), true);
});
