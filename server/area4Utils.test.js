import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceSeconds, briefingDurationSeconds, briefingState, directionQuotaCents, directionWindowState, joinEligibility, recordingConsentSummary } from './area4Utils.js';

const orders = [
  { id: 'O1', organizationId: 'org-gc-demo', status: 'CONFIRMED', totalCents: 1_500_000, devolutionRate: 30 },
  { id: 'O1', organizationId: 'org-gc-demo', status: 'CONFIRMED', totalCents: 1_500_000, devolutionRate: 30 },
  { id: 'O2', organizationId: 'org-other', status: 'CONFIRMED', totalCents: 900_000, devolutionRate: 30 },
  { id: 'O3', organizationId: 'org-gc-demo', status: 'CANCELLED', totalCents: 900_000, devolutionRate: 30 },
];

test('Area 4 direction quota derives from unique eligible confirmed orders and tenant', () => {
  assert.equal(directionQuotaCents({ orders }, { organizationId: 'org-gc-demo', eligibleOrderIds: ['O1', 'O2', 'O3'] }), 450_000);
  assert.equal(directionQuotaCents({ orders }, { organizationId: 'org-other', eligibleOrderIds: ['O1', 'O2'] }), 270_000);
});

test('Area 4 cutoff is strict and server-computable', () => {
  const window = { cutoffAt: '2026-12-15T16:00:00.000Z' };
  assert.equal(directionWindowState(window, new Date('2026-12-15T15:59:59.000Z')), 'OPEN');
  assert.equal(directionWindowState(window, new Date('2026-12-15T16:00:00.000Z')), 'CLOSED');
});

test('Area 4 briefing is two hours and has scheduled/live/closed states', () => {
  const session = { startAt: '2026-10-23T12:00:00.000Z', endAt: '2026-10-23T14:00:00.000Z', status: 'SCHEDULED' };
  assert.equal(briefingDurationSeconds(session), 7200);
  assert.equal(briefingState(session, new Date('2026-10-23T11:00:00.000Z')), 'SCHEDULED');
  assert.equal(briefingState(session, new Date('2026-10-23T13:00:00.000Z')), 'LIVE');
  assert.equal(briefingState(session, new Date('2026-10-23T15:00:00.000Z')), 'CLOSED');
});

test('Area 4 room joins open 15 minutes before start and never after completion', () => {
  const session = { startAt: '2026-10-23T12:00:00.000Z', endAt: '2026-10-23T14:00:00.000Z', status: 'SCHEDULED' };
  assert.equal(joinEligibility(session, new Date('2026-10-23T11:44:00.000Z')).allowed, false);
  assert.equal(joinEligibility(session, new Date('2026-10-23T11:45:00.000Z')).allowed, true);
  assert.equal(joinEligibility({ ...session, status: 'COMPLETED' }, new Date('2026-10-23T12:00:00.000Z')).allowed, false);
});

test('Area 4 attendance uses real join/leave timestamps and never goes negative', () => {
  const attendance = { joinedAt: '2026-10-23T12:00:00.000Z', leftAt: '2026-10-23T12:02:30.000Z' };
  assert.equal(attendanceSeconds(attendance), 150);
  assert.equal(attendanceSeconds({ joinedAt: '2026-10-23T12:00:00.000Z', leftAt: null }, new Date('2026-10-23T11:59:00.000Z')), 0);
});

test('Area 4 recording consent requires every invited member', () => {
  const session = { invites: [{ memberId: 'M1' }, { memberId: 'M2' }], recording: { enabled: false, consents: { M1: { consent: true }, M2: { consent: false } } } };
  assert.deepEqual(recordingConsentSummary(session), { required: 2, consented: 1, complete: false, enabled: false });
  session.recording.consents.M2.consent = true;
  assert.equal(recordingConsentSummary(session).complete, true);
  assert.equal(session.recording.enabled, false);
});
