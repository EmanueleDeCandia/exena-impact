import { calculateFundCents } from './calculations.js';

export function directionQuotaCents(db, window) {
  const eligible = new Set(window.eligibleOrderIds || []);
  const seen = new Set();
  return db.orders.reduce((total, order) => {
    if (!eligible.has(order.id) || seen.has(order.id) || order.organizationId !== window.organizationId || order.status !== 'CONFIRMED') return total;
    seen.add(order.id);
    return total + calculateFundCents(order);
  }, 0);
}

export function directionWindowState(window, now = new Date()) {
  return new Date(now).getTime() < new Date(window.cutoffAt).getTime() ? 'OPEN' : 'CLOSED';
}

export function briefingState(session, now = new Date()) {
  if (session.status === 'COMPLETED') return 'COMPLETED';
  const time = new Date(now).getTime();
  if (time < new Date(session.startAt).getTime()) return 'SCHEDULED';
  if (time > new Date(session.endAt).getTime()) return 'CLOSED';
  return 'LIVE';
}

export function briefingDurationSeconds(session) {
  return Math.round((new Date(session.endAt).getTime() - new Date(session.startAt).getTime()) / 1000);
}

export function joinEligibility(session, now = new Date()) {
  if (session.status === 'COMPLETED') return { allowed: false, reason: 'La sessione è già stata chiusa' };
  const time = new Date(now).getTime();
  const opensAt = new Date(session.startAt).getTime() - 15 * 60 * 1000;
  if (time < opensAt) return { allowed: false, reason: 'La sala apre 15 minuti prima dell’inizio' };
  if (time > new Date(session.endAt).getTime()) return { allowed: false, reason: 'La finestra della sessione è terminata' };
  return { allowed: true, reason: null };
}

export function attendanceSeconds(attendance, at = new Date()) {
  const start = new Date(attendance.joinedAt).getTime();
  const end = new Date(attendance.leftAt || at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function recordingConsentSummary(session) {
  const required = session.invites.map((invite) => invite.memberId);
  const consented = required.filter((memberId) => session.recording.consents[memberId]?.consent === true);
  return { required: required.length, consented: consented.length, complete: required.length > 0 && consented.length === required.length, enabled: session.recording.enabled === true };
}

export function preferenceView(preference) {
  if (!preference) return null;
  return { ...preference, versions: preference.versions.map((version) => ({ ...version, mfaChallengeId: undefined })) };
}
