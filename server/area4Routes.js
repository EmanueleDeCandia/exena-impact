import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, updateDb } from './store.js';
import { attendanceSeconds, briefingDurationSeconds, briefingState, directionQuotaCents, directionWindowState, joinEligibility, preferenceView, recordingConsentSummary } from './area4Utils.js';
import { createDigitalDocument, formatDate, formatMoney } from './documents.js';

export const area4Router = Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();
const token = () => `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
const cleanText = (value, max = 1000) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
const memberView = (member) => ({ id: member.id, organizationId: member.organizationId, displayName: member.displayName, role: member.role, boardAuthorized: member.boardAuthorized, briefingSpeaker: member.briefingSpeaker });

function auth(db, request) {
  const value = String(request.headers.authorization || '');
  const accessToken = value.startsWith('Bearer ') ? value.slice(7) : null;
  const session = db.governanceSessions.find((item) => item.token === accessToken && new Date(item.expiresAt).getTime() > Date.now());
  const member = session && db.governanceMembers.find((item) => item.id === session.memberId && item.demoAccessEnabled);
  if (!session || !member) throw httpError(401, 'Sessione Governance assente o scaduta');
  return { session, member, organizationId: session.organizationId };
}
function requireRole(member, roles) {
  if (!roles.includes(member.role)) throw httpError(403, 'Il tuo ruolo demo non è autorizzato per questa area Board');
}
function requireBoard(member) {
  requireRole(member, ['BOARD']);
  if (!member.boardAuthorized) throw httpError(403, 'Membro Board non autorizzato alla preferenza vincolante');
}
function sendDownload(response, filename, contentType, content) {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('X-Demo-Data', 'true');
  response.setHeader('Cache-Control', 'private, no-store');
  response.send(content);
}

/* Demo identity broker: explicitly not production authentication. */
area4Router.get('/area4/governance/demo-accounts', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({ demo: true, notice: 'Accesso con identità sintetiche. Non è autenticazione di produzione.', accounts: db.governanceMembers.filter((item) => item.demoAccessEnabled).map(memberView) });
}));
area4Router.post('/area4/governance/session', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const member = db.governanceMembers.find((item) => item.id === request.body?.memberId && item.demoAccessEnabled);
    if (!member) throw httpError(403, 'Identità demo non abilitata');
    const timestamp = now();
    const session = { token: token(), memberId: member.id, organizationId: member.organizationId, createdAt: timestamp, expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() };
    db.governanceSessions = db.governanceSessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).slice(-40);
    db.governanceSessions.push(session);
    return { token: session.token, member: memberView(member), expiresAt: session.expiresAt };
  });
  response.status(201).json({ ...result, demo: true });
}));
area4Router.post('/area4/governance/session/logout', asyncRoute(async (request, response) => {
  await updateDb((db) => {
    const { session } = auth(db, request);
    db.governanceSessions = db.governanceSessions.filter((item) => item.token !== session.token);
  });
  response.status(204).end();
}));
area4Router.post('/area4/governance/mfa-challenges', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireBoard(member);
    const challenge = { id: `MFA-${randomUUID()}`, memberId: member.id, organizationId, purpose: 'FUND_DIRECTION', createdAt: now(), expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), usedAt: null };
    db.mfaChallenges.push(challenge);
    return { id: challenge.id, expiresAt: challenge.expiresAt, demoCode: db.meta.demo ? member.mfaDemoCode : null };
  });
  response.status(201).json({ challenge: result, notice: 'Codice MFA dimostrativo; nessun SMS o authenticator reale inviato.' });
}));

/* C10 — Fund Direction Console */
function directionWindowView(db, window, member) {
  const preference = db.governancePreferences.find((item) => item.windowId === window.id && item.organizationId === window.organizationId) || null;
  const state = directionWindowState(window);
  return {
    ...window, state, quotaCents: directionQuotaCents(db, window),
    preference: preferenceView(preference),
    permissions: { canConfirm: member.role === 'BOARD' && member.boardAuthorized && state === 'OPEN', canUpdateImplementation: member.role === 'STARTUP_REVIEWER' },
  };
}
area4Router.get('/area4/fund-direction', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['BOARD', 'STARTUP_REVIEWER']);
  const windows = db.fundDirectionWindows.filter((item) => item.organizationId === organizationId).map((item) => directionWindowView(db, item, member));
  response.json({ demo: true, member: memberView(member), options: db.fundDirectionOptions, windows, notice: 'Preferenza vincolante demo. Non attesta versamenti o progetti già attuati.' });
}));

function validateMfa(db, member, challengeId, otp) {
  const challenge = db.mfaChallenges.find((item) => item.id === challengeId && item.memberId === member.id && item.purpose === 'FUND_DIRECTION');
  if (!challenge || challenge.usedAt || new Date(challenge.expiresAt).getTime() <= Date.now()) throw httpError(400, 'Challenge MFA scaduta o già utilizzata');
  if (String(otp || '') !== member.mfaDemoCode) throw httpError(400, 'Codice MFA demo non corretto');
  return challenge;
}
area4Router.post('/area4/fund-direction/windows/:id/preferences', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireBoard(member);
    const window = db.fundDirectionWindows.find((item) => item.id === request.params.id && item.organizationId === organizationId);
    if (!window) throw httpError(404, 'Finestra decisionale non trovata');
    const timestamp = now();
    if (directionWindowState(window, timestamp) !== 'OPEN' || new Date(window.opensAt).getTime() > Date.now()) throw httpError(409, 'La finestra decisionale è chiusa: nessuna modifica è consentita');
    const option = db.fundDirectionOptions.find((item) => item.id === request.body?.optionId);
    if (!option) throw httpError(400, 'Opzione territoriale non valida');
    if (request.body?.noConflictAccepted !== true) throw httpError(400, 'La dichiarazione sul conflitto di interessi è obbligatoria');
    if (request.body?.confirmationPhrase !== 'CONFERMO') throw httpError(400, 'Digita CONFERMO per la conferma forte');
    let preference = db.governancePreferences.find((item) => item.windowId === window.id && item.organizationId === organizationId);
    const currentVersion = preference?.currentVersion || 0;
    if (!Number.isInteger(request.body?.expectedVersion) || request.body.expectedVersion !== currentVersion) throw httpError(409, `La preferenza è cambiata: versione corrente ${currentVersion}. Rileggi prima di confermare.`);
    const challenge = validateMfa(db, member, request.body?.challengeId, request.body?.otp);
    const quotaCents = directionQuotaCents(db, window);
    if (quotaCents <= 0) throw httpError(409, 'Nessuna quota indirizzabile da ordini confermati');
    if (!preference) {
      preference = { id: `PREF-${window.id}`, windowId: window.id, organizationId, currentVersion: 0, status: 'ACTIVE', implementationStatus: 'NOT_STARTED', implementationNote: '', versions: [], events: [] };
      db.governancePreferences.push(preference);
    }
    const version = {
      version: currentVersion + 1, optionId: option.id, quotaCents, ruleVersion: window.ruleVersion,
      confirmedBy: member.id, confirmedByName: member.displayName, confirmedAt: timestamp,
      receiptId: `RIC-GOV-${window.id}-V${currentVersion + 1}`, conflictDeclaration: 'NONE', mfaChallengeId: challenge.id,
    };
    challenge.usedAt = timestamp;
    preference.versions.push(version);
    preference.currentVersion = version.version;
    preference.status = 'ACTIVE';
    preference.implementationStatus = 'NOT_STARTED';
    preference.implementationNote = '';
    preference.events.push({ at: timestamp, actor: member.displayName, event: `Preferenza v${version.version} confermata: ${option.title}; quota ${formatMoney(quotaCents)}; regole ${window.ruleVersion}` });
    return { preference: preferenceView(preference), version: { ...version, mfaChallengeId: undefined } };
  });
  response.status(201).json({ ...result, notice: 'Preferenza registrata con MFA demo e storico completo.' });
}));
area4Router.post('/area4/fund-direction/preferences/:id/implementation', asyncRoute(async (request, response) => {
  const preference = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['STARTUP_REVIEWER']);
    const item = db.governancePreferences.find((candidate) => candidate.id === request.params.id && candidate.organizationId === organizationId);
    if (!item) throw httpError(404, 'Preferenza non trovata');
    const status = request.body?.status;
    const note = cleanText(request.body?.note, 800);
    if (!['NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED'].includes(status)) throw httpError(400, 'Stato di attuazione non valido');
    if (!note || note.length < 3) throw httpError(400, 'Nota di attuazione obbligatoria');
    item.implementationStatus = status;
    item.implementationNote = note;
    item.events.push({ at: now(), actor: member.displayName, event: `Stato attuazione ${status}: ${note}` });
    return preferenceView(item);
  });
  response.json({ preference });
}));
area4Router.get('/area4/fund-direction/preferences/:id/versions/:version/receipt', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['BOARD', 'STARTUP_REVIEWER']);
  const preference = db.governancePreferences.find((item) => item.id === request.params.id && item.organizationId === organizationId);
  const version = preference?.versions.find((item) => item.version === Number(request.params.version));
  if (!preference || !version) throw httpError(404, 'Ricevuta non trovata');
  const window = db.fundDirectionWindows.find((item) => item.id === preference.windowId);
  const option = db.fundDirectionOptions.find((item) => item.id === version.optionId);
  const receipt = { preferenceId: preference.id, windowTitle: window.title, cutoffAt: window.cutoffAt, ...version, mfaChallengeId: undefined, option, implementationStatus: preference.implementationStatus, demo: true };
  if (request.query.format === 'json') return sendDownload(response, `${version.receiptId}.json`, 'application/json', JSON.stringify(receipt, null, 2));
  const pdf = await createDigitalDocument({
    areaLabel: 'AREA 4 / C10', title: 'Ricevuta preferenza territoriale', reference: version.receiptId, status: `V${version.version} · DEMO`,
    summary: [{ label: 'Scelta registrata', value: option.title }, { label: 'Quota indirizzata', value: formatMoney(version.quotaCents) }],
    sections: [
      { heading: 'Regole e conseguenze', rows: [['Versione preferenza', version.version], ['Versione regole', version.ruleVersion], ['Tipo opzione', option.type], ['Cutoff', formatDate(window.cutoffAt)], ['Confermata da', version.confirmedByName], ['Confermata il', formatDate(version.confirmedAt)], ['Conflitto interessi', 'Assenza dichiarata'], ['MFA', 'Challenge demo verificata e consumata']] },
      { heading: 'Formulazione esatta dell’opzione', paragraph: `${option.description}\n\n${option.consequences}` },
      { heading: 'Ambito', paragraph: 'Ricevuta di governance dimostrativa. Non prova un versamento, un progetto finanziato o un’attuazione già completata.' },
      { heading: 'Audit trail', bullets: preference.events.map((event) => `${formatDate(event.at)} — ${event.actor}: ${event.event}`) },
    ],
  });
  sendDownload(response, `${version.receiptId}.pdf`, 'application/pdf', pdf);
}));

/* C11 — Board Briefing Room */
function inviteFor(session, member) {
  return session.invites.find((invite) => invite.memberId === member.id);
}
function findBriefing(db, id, member, organizationId) {
  const session = db.briefingSessions.find((item) => item.id === id && item.organizationId === organizationId);
  const invite = session && inviteFor(session, member);
  if (!session || !invite) throw httpError(404, 'Briefing non trovato o invito non disponibile');
  return { session, invite };
}
function briefingSummary(db, session, member) {
  const invite = inviteFor(session, member);
  const accepted = invite.status === 'ACCEPTED';
  return {
    id: session.id, title: session.title, startAt: session.startAt, endAt: session.endAt, timeZone: session.timeZone, durationMinutes: session.durationMinutes,
    state: briefingState(session), actualDurationSeconds: briefingDurationSeconds(session), agenda: session.agenda,
    invite: { role: invite.role, status: invite.status, acceptedAt: invite.acceptedAt, identityVerifiedAt: invite.identityVerifiedAt },
    preReads: session.preReads.map((preRead) => accepted ? preRead : { id: preRead.id, title: preRead.title, version: preRead.version, reviewStatus: preRead.reviewStatus }),
    roomUrl: accepted && invite.roomToken ? `/app/governance/briefing?join=${invite.roomToken}` : null,
    recording: recordingConsentSummary(session), attendanceCount: session.attendance.length,
    hasFollowUp: Boolean(session.followUp), followUp: session.followUp,
  };
}
function briefingDetail(db, session, member) {
  return {
    ...briefingSummary(db, session, member),
    questions: session.questions,
    attendance: session.attendance.map((attendance) => ({ ...attendance, durationSeconds: attendanceSeconds(attendance) })),
    recordingConsents: session.recording.consents,
    events: session.events,
  };
}
function requireAccepted(invite) {
  if (invite.status !== 'ACCEPTED' || !invite.identityVerifiedAt) throw httpError(409, 'Accetta l’invito e conferma l’identità prima di continuare');
}
function activeAttendance(session, member) {
  return session.attendance.find((item) => item.memberId === member.id && !item.leftAt);
}
area4Router.get('/area4/briefings', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  const sessions = db.briefingSessions.filter((session) => session.organizationId === organizationId && inviteFor(session, member)).map((session) => briefingSummary(db, session, member));
  response.json({ demo: true, member: memberView(member), sessions, notice: 'Inviti nominativi. Provider video esterno non collegato; nessuna presenza o registrazione simulata.' });
}));
area4Router.post('/area4/briefings/:id/accept', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    if (request.body?.identityConfirmed !== true) throw httpError(400, 'Conferma la tua identità demo per accettare l’invito');
    if (invite.status !== 'ACCEPTED') {
      invite.status = 'ACCEPTED'; invite.acceptedAt = now(); invite.identityVerifiedAt = now();
      session.events.push({ at: now(), actor: member.displayName, event: 'Invito accettato e identità demo confermata' });
    }
    invite.roomToken ??= token();
    invite.roomTokenGeneratedAt ??= now();
    return { session: briefingSummary(db, session, member), roomUrl: `/app/governance/briefing?join=${invite.roomToken}` };
  });
  response.json(result);
}));
area4Router.post('/area4/briefings/join', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    let match;
    for (const session of db.briefingSessions.filter((item) => item.organizationId === organizationId)) {
      const invite = session.invites.find((item) => item.memberId === member.id && item.roomToken && item.roomToken === request.body?.token);
      if (invite) { match = { session, invite }; break; }
    }
    if (!match) throw httpError(403, 'Link sala non valido per questa identità o invito');
    const { session, invite } = match;
    requireAccepted(invite);
    if (request.body?.deviceCheckConfirmed !== true) throw httpError(400, 'Completa il controllo browser prima dell’ingresso');
    const eligibility = joinEligibility(session);
    if (!eligibility.allowed) throw httpError(409, eligibility.reason);
    let attendance = activeAttendance(session, member);
    if (!attendance) {
      attendance = { id: `ATT-${randomUUID()}`, memberId: member.id, memberName: member.displayName, role: invite.role, joinedAt: now(), lastSeenAt: now(), leftAt: null, durationSeconds: 0, deviceCheck: 'BROWSER_SELF_CHECK_DEMO' };
      session.attendance.push(attendance);
      session.events.push({ at: now(), actor: member.displayName, event: 'Ingresso effettivo nella sala del portale; non è una rilevazione del provider video' });
    }
    return { sessionId: session.id, detail: briefingDetail(db, session, member), attendance, idempotent: session.attendance.filter((item) => item.memberId === member.id && !item.leftAt).length > 1 };
  });
  response.json(result);
}));
area4Router.get('/area4/briefings/:id', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
  requireAccepted(invite);
  response.json({ detail: briefingDetail(db, session, member) });
}));
area4Router.post('/area4/briefings/:id/presence', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    const attendance = activeAttendance(session, member);
    if (!attendance) throw httpError(409, 'Nessuna presenza attiva nella sala');
    attendance.lastSeenAt = now(); attendance.durationSeconds = attendanceSeconds(attendance);
    return { attendance };
  });
  response.json(result);
}));
area4Router.post('/area4/briefings/:id/leave', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    const attendance = activeAttendance(session, member);
    if (attendance) {
      attendance.leftAt = now(); attendance.lastSeenAt = now(); attendance.durationSeconds = attendanceSeconds(attendance);
      session.events.push({ at: now(), actor: member.displayName, event: `Uscita dalla sala; presenza effettiva ${attendance.durationSeconds} secondi` });
    }
    return { detail: briefingDetail(db, session, member), left: Boolean(attendance) };
  });
  response.json(result);
}));
area4Router.post('/area4/briefings/:id/questions', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    if (!activeAttendance(session, member)) throw httpError(409, 'Entra nella sala prima di inviare una domanda');
    const text = cleanText(request.body?.text, 500);
    if (!text || text.length < 3) throw httpError(400, 'Scrivi una domanda di almeno 3 caratteri');
    session.questions.push({ id: `Q-${randomUUID().slice(0, 8)}`, memberId: member.id, authorName: member.displayName, text, at: now(), answer: null, answeredAt: null, answeredBy: null });
    return { detail: briefingDetail(db, session, member) };
  });
  response.status(201).json(result);
}));
area4Router.post('/area4/briefings/:id/questions/:questionId/answer', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    if (invite.role !== 'SPEAKER' || !member.briefingSpeaker) throw httpError(403, 'Solo il relatore invitato può rispondere');
    if (!activeAttendance(session, member)) throw httpError(409, 'Il relatore deve essere presente nella sala');
    const question = session.questions.find((item) => item.id === request.params.questionId);
    const answer = cleanText(request.body?.answer, 1200);
    if (!question || !answer || answer.length < 3) throw httpError(400, 'Domanda o risposta non valida');
    question.answer = answer; question.answeredAt = now(); question.answeredBy = member.displayName;
    return { detail: briefingDetail(db, session, member) };
  });
  response.json(result);
}));
area4Router.post('/area4/briefings/:id/recording/consent', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    if (typeof request.body?.consent !== 'boolean') throw httpError(400, 'Consenso non valido');
    session.recording.consents[member.id] = { consent: request.body.consent, at: now() };
    session.events.push({ at: now(), actor: member.displayName, event: `Consenso registrazione ${request.body.consent ? 'espresso' : 'negato'}; registrazione ancora disattivata` });
    return { recording: recordingConsentSummary(session) };
  });
  response.json(result);
}));
area4Router.post('/area4/briefings/:id/recording/enable', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    if (invite.role !== 'SPEAKER' || !member.briefingSpeaker) throw httpError(403, 'Solo il relatore può richiedere la registrazione');
  if (!recordingConsentSummary(session).complete) throw httpError(409, 'Consenso informato mancante: registrazione non avviata');
  throw httpError(409, 'Provider video non collegato: nessuna registrazione avviata nemmeno con i consensi');
}));
area4Router.post('/area4/briefings/:id/complete', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
    requireAccepted(invite);
    if (invite.role !== 'SPEAKER' || !member.briefingSpeaker) throw httpError(403, 'Solo il relatore invitato può chiudere la sessione');
    if (session.status === 'COMPLETED') return { detail: briefingDetail(db, session, member), idempotent: true };
    const summary = cleanText(request.body?.summary, 4000);
    if (!summary || summary.length < 20) throw httpError(400, 'Sintesi post-sessione di almeno 20 caratteri obbligatoria');
    if (!session.attendance.length) throw httpError(409, 'Non puoi creare un follow-up senza alcuna presenza effettiva nella sala');
    const timestamp = now();
    for (const attendance of session.attendance.filter((item) => !item.leftAt)) {
      attendance.leftAt = timestamp; attendance.lastSeenAt = timestamp; attendance.durationSeconds = attendanceSeconds(attendance);
    }
    const decisionPoints = String(request.body?.decisionPoints || '').split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 12);
    const references = String(request.body?.references || '').split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 12);
    session.status = 'COMPLETED'; session.actualEndedAt = timestamp;
    session.followUp = { version: 1, publishedAt: timestamp, publishedBy: member.displayName, summary, decisionPoints, references, reviewStatus: 'FOLLOWUP_DEMO', recordingEnabled: false };
    session.events.push({ at: timestamp, actor: member.displayName, event: 'Sessione chiusa e follow-up pubblicato sulle presenze effettivamente registrate' });
    return { detail: briefingDetail(db, session, member), idempotent: false };
  });
  response.json(result);
}));

area4Router.get('/area4/briefings/:id/pre-reads/:preReadId/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
  requireAccepted(invite);
  const preRead = session.preReads.find((item) => item.id === request.params.preReadId);
  if (!preRead) throw httpError(404, 'Pre-read non trovato');
  if (request.query.format === 'json') return sendDownload(response, `${preRead.id}.json`, 'application/json', JSON.stringify({ ...preRead, sessionTitle: session.title, demo: true }, null, 2));
  const pdf = await createDigitalDocument({ areaLabel: 'AREA 4 / C11', title: preRead.title, reference: preRead.id, status: preRead.reviewStatus, summary: [{ label: 'Versione', value: preRead.version }, { label: 'Sessione', value: session.title }], sections: [{ heading: 'Contenuto di preparazione', paragraph: preRead.content }, { heading: 'Fonte e revisione', rows: [['Fonte', preRead.source], ['Aggiornato', formatDate(preRead.updatedAt)], ['Stato revisione', preRead.reviewStatus], ['Registrazione', 'Disattivata']] }] });
  sendDownload(response, `${preRead.id}-v${preRead.version}.pdf`, 'application/pdf', pdf);
}));
area4Router.get('/area4/briefings/:id/follow-up/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  const { session, invite } = findBriefing(db, request.params.id, member, organizationId);
  requireAccepted(invite);
  if (!session.followUp) throw httpError(404, 'Follow-up non ancora pubblicato');
  const data = { sessionId: session.id, title: session.title, startAt: session.startAt, scheduledEndAt: session.endAt, actualEndedAt: session.actualEndedAt, followUp: session.followUp, attendance: session.attendance.map((item) => ({ ...item, durationSeconds: attendanceSeconds(item) })), questions: session.questions, demo: true };
  if (request.query.format === 'json') return sendDownload(response, `${session.id}-follow-up.json`, 'application/json', JSON.stringify(data, null, 2));
  const pdf = await createDigitalDocument({
    areaLabel: 'AREA 4 / C11', title: 'Sintesi post-sessione Board', reference: `${session.id}-FOLLOWUP-V1`, status: session.followUp.reviewStatus,
    summary: [{ label: 'Sessione', value: session.title }, { label: 'Presenze effettive nella sala', value: `${session.attendance.length} ingressi` }],
    sections: [
      { heading: 'Sintesi', paragraph: session.followUp.summary },
      { heading: 'Punti decisionali', bullets: session.followUp.decisionPoints.length ? session.followUp.decisionPoints : ['Nessun punto decisionale registrato'] },
      { heading: 'Domande e risposte', bullets: session.questions.length ? session.questions.map((question) => `${question.authorName}: ${question.text}${question.answer ? ` — Risposta: ${question.answer}` : ' — Senza risposta'}`) : ['Nessuna domanda inserita'] },
      { heading: 'Presenze misurate dal portale', rows: session.attendance.map((item) => [item.memberName, `${formatDate(item.joinedAt)} → ${item.leftAt ? formatDate(item.leftAt) : 'attivo'} · ${attendanceSeconds(item)} sec`]) },
      { heading: 'Versione e limiti', rows: [['Versione follow-up', session.followUp.version], ['Pubblicato', formatDate(session.followUp.publishedAt)], ['Pubblicato da', session.followUp.publishedBy], ['Registrazione', 'Mai attivata'], ['Fonte', 'Eventi di ingresso/uscita del portale demo']] },
    ],
  });
  sendDownload(response, `${session.id}-follow-up-v1.pdf`, 'application/pdf', pdf);
}));
