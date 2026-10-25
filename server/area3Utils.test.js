import test from 'node:test';
import assert from 'node:assert/strict';
import { availabilityView, calculateStayQuote, chapterIsComplete, courseView, enrollmentView, nightsBetween, publicCertificateView, scoreAnswers } from './area3Utils.js';

const room = { capacity: 4, baseOccupancy: 2, ratePerNightCents: 9000, extraGuestPerNightCents: 2000, taxPerPersonNightCents: 150, availabilityUpdatedAt: '2026-10-23T08:00:00.000Z' };

test('Area 3 stay quotes use integer cents and separate room, supplement and taxes', () => {
  const quote = calculateStayQuote({ room, checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 3, today: new Date('2026-10-23T12:00:00Z') });
  assert.deepEqual({ nights: quote.nights, room: quote.roomSubtotalCents, extra: quote.extraGuestCents, taxes: quote.taxesCents, total: quote.totalCents }, { nights: 2, room: 18000, extra: 4000, taxes: 900, total: 22900 });
});

test('Area 3 rejects past dates, inverted ranges and excess guests', () => {
  assert.throws(() => calculateStayQuote({ room, checkIn: '2026-10-01', checkOut: '2026-10-03', guests: 2, today: new Date('2026-10-23') }), /passato/);
  assert.throws(() => nightsBetween('2026-11-12', '2026-11-12'), /1–30 notti/);
  assert.throws(() => calculateStayQuote({ room, checkIn: '2026-11-10', checkOut: '2026-11-12', guests: 5, today: new Date('2026-10-23') }), /1–4/);
});

test('Area 3 availability is always request-only and stale after 72 hours', () => {
  assert.equal(availabilityView(room, new Date('2026-10-23T12:00:00Z')).code, 'REQUEST_ONLY');
  const stale = availabilityView(room, new Date('2026-10-27T12:00:00Z'));
  assert.equal(stale.code, 'STALE');
  assert.equal(stale.requestOnly, true);
  assert.equal(stale.inventoryLive, false);
});

test('Area 3 quiz scoring is deterministic and does not round up a failure', () => {
  const questions = [{ id: 'Q1', correctOptionId: 'A' }, { id: 'Q2', correctOptionId: 'B' }, { id: 'Q3', correctOptionId: 'C' }];
  assert.deepEqual(scoreAnswers(questions, { Q1: 'A', Q2: 'B' }), { correct: 2, total: 3, percent: 66.67 });
});

test('Area 3 chapter completion requires video, transcript and passed quiz', () => {
  assert.equal(chapterIsComplete({ videoCompleted: true, transcriptRead: true, quizPassed: true }), true);
  assert.equal(chapterIsComplete({ videoCompleted: true, transcriptRead: true, quizPassed: false }), false);
});

test('Area 3 expired enrollment never changes a completed enrollment', () => {
  assert.equal(enrollmentView({ status: 'IN_PROGRESS', deadlineAt: '2026-01-01' }, new Date('2026-10-23')).status, 'EXPIRED');
  assert.equal(enrollmentView({ status: 'COMPLETED', deadlineAt: '2026-01-01' }, new Date('2026-10-23')).status, 'COMPLETED');
});

test('Area 3 public certificate view omits learner identity and score', () => {
  const view = publicCertificateView({ code: 'CERT-DEMO', status: 'ACTIVE_DEMO', issuedAt: '2026-10-23', learnerName: 'Nome Riservato', scorePercent: 100 }, { title: 'Corso demo', provider: 'Ente demo', verificationCriteria: 'Criteri demo' });
  assert.equal(JSON.stringify(view).includes('Nome Riservato'), false);
  assert.equal(JSON.stringify(view).includes('scorePercent'), false);
  assert.equal(view.demo, true);
});

test('Area 3 course client view never exposes correct answers', () => {
  const view = courseView({ title: 'Demo', chapters: [{ questions: [{ id: 'Q1', correctOptionId: 'A', options: [] }] }], finalQuestions: [{ id: 'Q2', correctOptionId: 'B', options: [] }] });
  assert.equal(JSON.stringify(view).includes('correctOptionId'), false);
});
