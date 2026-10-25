import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateOrders, calculateFundCents, computePackCompleteness, finalizeOrderSummary, isShareActive, reconcileAttestation } from './calculations.js';

const order = { id: 'O1', organizationId: 'ORG', siteId: 'S1', pairs: 200, totalCents: 1500000, devolutionRate: 30, status: 'CONFIRMED' };

test('fund calculation and attestation reconciliation use integer cents', () => {
  assert.equal(calculateFundCents(order), 450000);
  assert.equal(reconcileAttestation({ orderId: 'O1', pairs: 200, totalCents: 1500000, fundCents: 450000 }, order).valid, true);
  assert.equal(reconcileAttestation({ orderId: 'O1', pairs: 200, totalCents: 1500000, fundCents: 450001 }, order).valid, false);
});

test('report aggregation deduplicates orders and excludes drafts', () => {
  const sub = { ...order, id: 'O2', organizationId: 'SUB', pairs: 40, totalCents: 300000 };
  const summary = finalizeOrderSummary(aggregateOrders([order, order, sub, { ...order, id: 'DRAFT', status: 'DRAFT' }], { siteId: 'S1' }));
  assert.equal(summary.orderIds.length, 2);
  assert.equal(summary.pairs, 240);
  assert.equal(summary.fundCents, 540000);
  assert.equal(summary.interventions, 2);
  assert.deepEqual(summary.organizationIds.sort(), ['ORG', 'SUB']);
});

test('pack completeness requires linked verified evidence', () => {
  const pack = { items: [{ id: 'A', evidenceId: 'E1' }, { id: 'B', evidenceId: 'E2' }, { id: 'C', evidenceId: null }] };
  const evidence = [{ id: 'E1', status: 'VERIFIED' }, { id: 'E2', status: 'PENDING_REVIEW' }];
  const result = computePackCompleteness(pack, evidence);
  assert.equal(result.completeItems, 1);
  assert.equal(result.percentage, 33);
  assert.equal(result.complete, false);
});

test('share links expire and can be revoked', () => {
  const now = new Date('2026-10-23T10:00:00Z');
  assert.equal(isShareActive({ expiresAt: '2026-10-24T10:00:00Z', revokedAt: null }, now), true);
  assert.equal(isShareActive({ expiresAt: '2026-10-22T10:00:00Z', revokedAt: null }, now), false);
  assert.equal(isShareActive({ expiresAt: '2026-10-24T10:00:00Z', revokedAt: '2026-10-23T09:00:00Z' }, now), false);
});
