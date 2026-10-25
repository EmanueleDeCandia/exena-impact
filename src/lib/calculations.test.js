import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateImpact, getBaseServiceValue, getServiceValue, getVariantIncrement } from './calculations.js';

test('default configuration: 100 addetti, 30%, standard', () => {
  const result = calculateImpact(100, 30, 'STANDARD');
  assert.equal(result.orderTotal, 7500);
  assert.equal(result.fund, 2250);
  assert.equal(result.interventions, 0);
  assert.equal(result.co2, 425);
  assert.equal(result.welfareTickets, 15);
  assert.equal(result.baseServiceValue, 5700);
  assert.equal(result.variantIncrement, 0);
  assert.equal(result.serviceValue, 5700);
  assert.equal(result.unlockedCount, 4);
});

test('variants add their increments to the base value', () => {
  const result = calculateImpact(100, 30, 'VARIANTI_ALTO_IMPATTO');
  assert.equal(result.baseServiceValue, 5700);
  assert.equal(result.variantIncrement, 4600);
  assert.equal(result.serviceValue, 10300);
  assert.equal(result.welfareTickets, 15);
});

test('threshold boundaries, cumulative value and proportional welfare', () => {
  const volumes = [9, 10, 24, 25, 49, 50, 99, 100, 200];
  assert.deepEqual(
    volumes.map((n) => calculateImpact(n, 30).welfareTickets),
    [0, 0, 0, 0, 0, 5, 5, 15, 25],
  );
  assert.deepEqual(
    volumes.map((n) => getServiceValue(n, 'STANDARD')),
    [0, 450, 450, 1200, 1200, 2700, 2700, 5700, 6200],
  );
  assert.deepEqual(
    volumes.map((n) => getServiceValue(n, 'VARIANTI_ALTO_IMPATTO')),
    [0, 850, 850, 2250, 2250, 5100, 5100, 10300, 10800],
  );
});

test('variant increments stop at 2200 while the base retains its proportional component', () => {
  assert.equal(getVariantIncrement(10), 400);
  assert.equal(getVariantIncrement(25), 1050);
  assert.equal(getVariantIncrement(50), 2400);
  assert.equal(getVariantIncrement(100), 4600);
  assert.equal(getVariantIncrement(5000), 4600);
  assert.equal(getBaseServiceValue(200), 6200);
  assert.equal(getServiceValue(200, 'VARIANTI_ALTO_IMPATTO'), 10800);
});

test('inputs are constrained and fund uses selectable ratio', () => {
  const low = calculateImpact(-5, 2);
  const high = calculateImpact(6000, 90);
  assert.equal(low.addetti, 1);
  assert.equal(low.ratio, 10);
  assert.equal(high.addetti, 5000);
  assert.equal(high.ratio, 50);
  assert.equal(calculateImpact(1000, 50).fund, 37500);
  assert.equal(calculateImpact(1000, 50).interventions, 15);
});
