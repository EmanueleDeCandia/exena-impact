import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, updateDb } from './store.js';
import { availabilityView, calculateStayQuote, chapterIsComplete, courseView, enrollmentView, publicCertificateView, scoreAnswers } from './area3Utils.js';
import { createDigitalDocument, formatDate, formatMoney } from './documents.js';

export const area3Router = Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();
const cleanText = (value, max = 500) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
const id = (prefix) => `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`;

function sendDownload(response, filename, contentType, content) {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('X-Demo-Data', 'true');
  response.send(content);
}

/* C08 — Hospitality Booking Hub */
function findRoom(db, propertyId, roomId) {
  const property = db.hospitalityProperties.find((item) => item.id === propertyId);
  const room = property?.rooms.find((item) => item.id === roomId);
  if (!property || !room) throw httpError(404, 'Struttura o camera non trovata');
  return { property, room };
}

function hospitalityView(db) {
  return {
    meta: db.meta,
    properties: db.hospitalityProperties.map((property) => ({
      ...property,
      rooms: property.rooms.map((room) => ({ ...room, availability: availabilityView(room) })),
    })),
    requests: db.hospitalityRequests.map((item) => {
      const { property, room } = findRoom(db, item.propertyId, item.roomId);
      return { ...item, propertyName: property.name, roomName: room.name, cancellationPolicy: property.cancellationPolicy };
    }),
  };
}

area3Router.get('/area3/hospitality', asyncRoute(async (request, response) => {
  response.json(hospitalityView(await readDb()));
}));

area3Router.post('/area3/hospitality/quote', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { property, room } = findRoom(db, request.body?.propertyId, request.body?.roomId);
  const quote = calculateStayQuote({ room, checkIn: request.body?.checkIn, checkOut: request.body?.checkOut, guests: Number(request.body?.guests) });
  response.json({ quote, property: { id: property.id, name: property.name, cancellationPolicy: property.cancellationPolicy }, room: { id: room.id, name: room.name, capacity: room.capacity }, availability: availabilityView(room) });
}));

area3Router.post('/area3/hospitality/requests', asyncRoute(async (request, response) => {
  let created = false;
  const item = await updateDb((db) => {
    const body = request.body ?? {};
    const requestKey = cleanText(body.requestKey, 100) || randomUUID();
    const duplicate = db.hospitalityRequests.find((candidate) => candidate.requestKey === requestKey);
    if (duplicate) return duplicate;
    const { property, room } = findRoom(db, body.propertyId, body.roomId);
    const guestName = cleanText(body.guestName, 90);
    if (!guestName || guestName.length < 2) throw httpError(400, 'Inserisci il nome del referente della richiesta');
    if (body.consents?.termsAccepted !== true || body.consents?.privacyAccepted !== true) throw httpError(400, 'Accetta condizioni e informativa per inviare la richiesta');
    if (body.note && !cleanText(body.note, 500)) throw httpError(400, 'Nota troppo lunga');
    const quote = calculateStayQuote({ room, checkIn: body.checkIn, checkOut: body.checkOut, guests: Number(body.guests) });
    const timestamp = now();
    const requestItem = {
      id: id('OSP-DEMO'), requestKey, propertyId: property.id, roomId: room.id,
      checkIn: body.checkIn, checkOut: body.checkOut, guests: Number(body.guests), guestName, note: body.note?.trim() || '',
      status: 'REQUESTED', ...quote,
      availabilitySnapshot: availabilityView(room), cancellationPolicy: property.cancellationPolicy,
      consents: { termsAccepted: true, privacyAccepted: true }, receiptId: id('RIC-OSP-DEMO'),
      createdAt: timestamp, updatedAt: timestamp, cancelledAt: null,
      events: [{ at: timestamp, actor: 'Portale hospitality demo', event: 'Richiesta registrata; nessuna conferma di prenotazione' }],
    };
    db.hospitalityRequests.unshift(requestItem);
    created = true;
    return requestItem;
  });
  response.status(created ? 201 : 200).json({ request: item, idempotent: !created, notice: 'Richiesta di disponibilità registrata. Non è una prenotazione confermata.' });
}));

area3Router.post('/area3/hospitality/requests/:id/cancel', asyncRoute(async (request, response) => {
  const item = await updateDb((db) => {
    const requestItem = db.hospitalityRequests.find((candidate) => candidate.id === request.params.id);
    if (!requestItem) throw httpError(404, 'Richiesta non trovata');
    if (requestItem.status === 'CANCELLED') return requestItem;
    if (requestItem.status !== 'REQUESTED') throw httpError(409, 'Questa richiesta non è annullabile dal portale');
    const timestamp = now();
    requestItem.status = 'CANCELLED';
    requestItem.cancelledAt = timestamp;
    requestItem.updatedAt = timestamp;
    requestItem.events.push({ at: timestamp, actor: 'Utente demo', event: 'Richiesta di disponibilità annullata; ricevuta aggiornata' });
    return requestItem;
  });
  response.json({ request: item, notice: 'Richiesta annullata. La ricevuta digitale è stata aggiornata.' });
}));

area3Router.get('/area3/hospitality/requests/:id/receipt', asyncRoute(async (request, response) => {
  const db = await readDb();
  const item = db.hospitalityRequests.find((candidate) => candidate.id === request.params.id);
  if (!item) throw httpError(404, 'Richiesta non trovata');
  const { property, room } = findRoom(db, item.propertyId, item.roomId);
  const receipt = { ...item, propertyName: property.name, roomName: room.name, demo: true, legalNotice: 'Ricevuta di una richiesta di disponibilità, non conferma di prenotazione né titolo fiscale.' };
  if (request.query.format === 'json') return sendDownload(response, `${item.receiptId}.json`, 'application/json', JSON.stringify(receipt, null, 2));
  if (request.query.format === 'ics') {
    const date = (value) => value.replaceAll('-', '');
    const escape = (value) => String(value).replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sibillini Impact//Hospitality Demo//IT', 'BEGIN:VEVENT', `UID:${item.id}@demo.sibillini`, `DTSTAMP:${item.updatedAt.replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${date(item.checkIn)}`, `DTEND;VALUE=DATE:${date(item.checkOut)}`, `SUMMARY:${escape(`Richiesta soggiorno — ${property.name}`)}`, `STATUS:${item.status === 'CANCELLED' ? 'CANCELLED' : 'TENTATIVE'}`, `DESCRIPTION:${escape('Richiesta di disponibilità demo. Nessuna prenotazione confermata.')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return sendDownload(response, `${item.receiptId}.ics`, 'text/calendar; charset=utf-8', ics);
  }
  const pdf = await createDigitalDocument({
    areaLabel: 'AREA 3 / C08', title: 'Ricevuta richiesta di disponibilità', reference: item.receiptId, status: item.status,
    summary: [{ label: 'Struttura partner demo', value: property.name }, { label: 'Totale indicativo', value: formatMoney(item.totalCents) }],
    sections: [
      { heading: 'Dettaglio richiesta', rows: [['Camera', room.name], ['Date', `${item.checkIn} → ${item.checkOut} (${item.nights} notti)`], ['Ospiti', item.guests], ['Referente', item.guestName], ['Aggiornata', formatDate(item.updatedAt)]] },
      { heading: 'Tariffa e tasse', rows: [['Pernottamento', formatMoney(item.roomSubtotalCents)], ['Supplementi ospiti', formatMoney(item.extraGuestCents)], ['Tasse di soggiorno', formatMoney(item.taxesCents)], ['Valuta', item.currency]] },
      { heading: 'Condizioni', paragraph: `${item.cancellationPolicy}\n\nQuesta ricevuta documenta operazioni sul portale demo. Non conferma disponibilità o prenotazione e non sostituisce documenti fiscali della struttura.` },
      { heading: 'Operazioni registrate', bullets: item.events.map((event) => `${formatDate(event.at)} — ${event.event}`) },
    ],
  });
  sendDownload(response, `${item.receiptId}.pdf`, 'application/pdf', pdf);
}));

/* C09 — E-Learning & Digital Certificates */
function getCourse(db, courseId = 'COURSE-ERG-DEMO') {
  const course = db.courses.find((item) => item.id === courseId);
  if (!course) throw httpError(404, 'Corso non trovato');
  return course;
}
function getEnrollment(db, enrollmentId) {
  const enrollment = db.courseEnrollments.find((item) => item.id === enrollmentId);
  if (!enrollment) throw httpError(404, 'Assegnazione non trovata');
  return enrollment;
}
function requireActive(enrollment) {
  if (enrollmentView(enrollment).status === 'EXPIRED') throw httpError(409, 'Assegnazione scaduta: crea una nuova assegnazione');
  if (enrollment.status === 'NOT_STARTED') throw httpError(409, 'Accetta l’assegnazione prima di iniziare');
}
function learningView(db) {
  return {
    meta: db.meta,
    course: courseView(getCourse(db)),
    enrollments: db.courseEnrollments.map((enrollment) => ({
      ...enrollmentView(enrollment),
      certificate: enrollment.certificateId ? db.certificates.find((item) => item.id === enrollment.certificateId) || null : null,
    })),
  };
}

area3Router.get('/area3/learning', asyncRoute(async (request, response) => {
  response.json(learningView(await readDb()));
}));

area3Router.post('/area3/learning/enrollments', asyncRoute(async (request, response) => {
  const enrollment = await updateDb((db) => {
    if (db.courseEnrollments.length >= 30) throw httpError(409, 'Archivio assegnazioni demo pieno');
    const displayName = cleanText(request.body?.displayName, 90);
    const role = cleanText(request.body?.role, 40);
    if (!displayName || displayName.length < 2) throw httpError(400, 'Inserisci il nome dimostrativo del discente');
    if (!['Preposto', 'Capocantiere'].includes(role)) throw httpError(400, 'Seleziona Preposto o Capocantiere');
    const deadline = new Date(request.body?.deadlineAt);
    if (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now()) throw httpError(400, 'La scadenza deve essere futura');
    const timestamp = now();
    const item = { id: id('ENR-DEMO'), courseId: 'COURSE-ERG-DEMO', organizationId: db.organization.id, learner: { displayName, role }, status: 'NOT_STARTED', acceptedAt: null, deadlineAt: deadline.toISOString(), progress: { chapters: {} }, attempts: [], finalResult: null, certificateId: null, createdAt: timestamp, updatedAt: timestamp, events: [{ at: timestamp, actor: 'HR/RSPP demo', event: 'Assegnazione creata' }] };
    db.courseEnrollments.unshift(item);
    return item;
  });
  response.status(201).json({ enrollment });
}));

area3Router.post('/area3/learning/enrollments/:id/accept', asyncRoute(async (request, response) => {
  const enrollment = await updateDb((db) => {
    const item = getEnrollment(db, request.params.id);
    if (enrollmentView(item).status === 'EXPIRED') throw httpError(409, 'Assegnazione scaduta');
    if (item.status === 'NOT_STARTED') {
      item.status = 'IN_PROGRESS';
      item.acceptedAt = now();
      item.updatedAt = now();
      item.events.push({ at: now(), actor: item.learner.displayName, event: 'Assegnazione accettata e corso avviato' });
    }
    return item;
  });
  response.json({ enrollment });
}));

area3Router.post('/area3/learning/enrollments/:id/chapters/:chapterId/progress', asyncRoute(async (request, response) => {
  const enrollment = await updateDb((db) => {
    const item = getEnrollment(db, request.params.id);
    requireActive(item);
    if (item.status === 'COMPLETED') return item;
    const course = getCourse(db, item.courseId);
    if (!course.chapters.some((chapter) => chapter.id === request.params.chapterId)) throw httpError(404, 'Capitolo non trovato');
    const type = request.body?.type;
    if (!['video', 'transcript'].includes(type)) throw httpError(400, 'Tipo di progresso non valido');
    const progress = item.progress.chapters[request.params.chapterId] ??= { videoCompleted: false, transcriptRead: false, quizPassed: false, quizAttempts: 0 };
    if (type === 'video') { progress.videoCompleted = true; progress.videoCompletedAt = now(); }
    else { progress.transcriptRead = true; progress.transcriptReadAt = now(); }
    if (chapterIsComplete(progress)) progress.completedAt ??= now();
    item.updatedAt = now();
    return item;
  });
  response.json({ enrollment });
}));

area3Router.post('/area3/learning/enrollments/:id/chapters/:chapterId/quiz', asyncRoute(async (request, response) => {
  let outcome;
  const enrollment = await updateDb((db) => {
    const item = getEnrollment(db, request.params.id);
    requireActive(item);
    const course = getCourse(db, item.courseId);
    const chapter = course.chapters.find((candidate) => candidate.id === request.params.chapterId);
    if (!chapter) throw httpError(404, 'Capitolo non trovato');
    const progress = item.progress.chapters[chapter.id] ??= { videoCompleted: false, transcriptRead: false, quizPassed: false, quizAttempts: 0 };
    if (!progress.videoCompleted || !progress.transcriptRead) throw httpError(409, 'Completa video e trascrizione prima del quiz');
    const question = chapter.questions.find((candidate) => candidate.id === request.body?.questionId);
    if (!question || !question.options.some((option) => option.id === request.body?.answerId)) throw httpError(400, 'Risposta non valida');
    const correct = request.body.answerId === question.correctOptionId;
    progress.quizAttempts = (progress.quizAttempts || 0) + 1;
    progress.quizPassed ||= correct;
    progress.lastQuizAt = now();
    if (chapterIsComplete(progress)) progress.completedAt ??= now();
    item.attempts.push({ id: id('TRY-DEMO'), type: 'CHAPTER', chapterId: chapter.id, questionId: question.id, at: now(), correct });
    item.updatedAt = now();
    outcome = { correct, explanation: question.explanation, quizPassed: progress.quizPassed };
    return item;
  });
  response.json({ ...outcome, enrollment });
}));

area3Router.post('/area3/learning/enrollments/:id/final-attempts', asyncRoute(async (request, response) => {
  let result;
  const enrollment = await updateDb((db) => {
    const item = getEnrollment(db, request.params.id);
    requireActive(item);
    const course = getCourse(db, item.courseId);
    if (!course.chapters.every((chapter) => chapterIsComplete(item.progress.chapters[chapter.id]))) throw httpError(409, 'Completa tutti i capitoli e i quiz prima del test finale');
    if (item.certificateId) {
      result = { alreadyIssued: true, passed: true, certificate: db.certificates.find((certificate) => certificate.id === item.certificateId) };
      return item;
    }
    const score = scoreAnswers(course.finalQuestions, request.body?.answers);
    const passed = score.percent >= course.passScorePercent;
    const timestamp = now();
    const attempt = { id: id('FIN-DEMO'), type: 'FINAL', at: timestamp, ...score, passed };
    item.attempts.push(attempt);
    item.finalResult = attempt;
    item.updatedAt = timestamp;
    let certificate = null;
    if (passed) {
      item.status = 'COMPLETED';
      certificate = {
        id: id('CERT-DEMO'), code: `SI-ERGO-DEMO-${String(db.certificates.length + 1).padStart(4, '0')}`,
        enrollmentId: item.id, courseId: course.id, learnerName: item.learner.displayName, learnerRole: item.learner.role, organizationId: item.organizationId,
        publicToken: `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '').slice(0, 16)}`, status: 'ACTIVE_DEMO', scorePercent: score.percent,
        issuedAt: timestamp, revokedAt: null, events: [{ at: timestamp, actor: 'Piattaforma formativa demo', event: 'Attestato demo emesso dopo completamento e test' }],
      };
      db.certificates.push(certificate);
      item.certificateId = certificate.id;
      item.events.push({ at: timestamp, actor: 'Piattaforma formativa demo', event: 'Test finale superato e attestato demo emesso' });
    }
    result = { attempt, passed, certificate, alreadyIssued: false };
    return item;
  });
  response.json({ ...result, enrollment });
}));

area3Router.post('/area3/learning/certificates/:id/revoke', asyncRoute(async (request, response) => {
  const certificate = await updateDb((db) => {
    const item = db.certificates.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Attestato non trovato');
    if (item.status !== 'REVOKED') {
      item.status = 'REVOKED';
      item.revokedAt = now();
      item.events.push({ at: now(), actor: 'HR/RSPP demo', event: 'Attestato demo revocato' });
      const enrollment = getEnrollment(db, item.enrollmentId);
      enrollment.updatedAt = now();
      enrollment.events.push({ at: now(), actor: 'HR/RSPP demo', event: 'Attestato revocato; completamento conservato' });
    }
    return item;
  });
  response.json({ certificate });
}));

area3Router.get('/area3/learning/certificates/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const certificate = db.certificates.find((item) => item.id === request.params.id);
  if (!certificate) throw httpError(404, 'Attestato non trovato');
  const course = getCourse(db, certificate.courseId);
  const exportData = { ...certificate, courseTitle: course.title, provider: course.provider, verificationCriteria: course.verificationCriteria, accreditationNotice: course.accreditationNotice, verificationPath: `/verifica/attestato/${certificate.publicToken}`, demo: true };
  if (request.query.format === 'json') return sendDownload(response, `${certificate.code}.json`, 'application/json', JSON.stringify(exportData, null, 2));
  const pdf = await createDigitalDocument({
    areaLabel: 'AREA 3 / C09', title: 'Attestato formativo digitale — demo', reference: certificate.code, status: certificate.status,
    summary: [{ label: 'Discente', value: certificate.learnerName }, { label: 'Percorso', value: course.title }],
    sections: [
      { heading: 'Esito e verifica', rows: [['Ente', course.provider], ['Durata didattica prevista', `${course.durationMinutes} minuti`], ['Punteggio test finale', `${certificate.scorePercent}%`], ['Emesso', formatDate(certificate.issuedAt)], ['Revocato', certificate.revokedAt ? formatDate(certificate.revokedAt) : 'No'], ['Percorso di verifica', exportData.verificationPath]] },
      { heading: 'Criterio effettivo', paragraph: course.verificationCriteria },
      { heading: 'Ambito e limiti', paragraph: course.accreditationNotice },
      { heading: 'Eventi', bullets: certificate.events.map((event) => `${formatDate(event.at)} — ${event.event}`) },
    ],
  });
  sendDownload(response, `${certificate.code}.pdf`, 'application/pdf', pdf);
}));

area3Router.get('/public/certificates/:token', asyncRoute(async (request, response) => {
  const db = await readDb();
  const certificate = db.certificates.find((item) => item.publicToken === request.params.token);
  if (!certificate) throw httpError(404, 'Attestato non trovato');
  const course = getCourse(db, certificate.courseId);
  response.json(publicCertificateView(certificate, course));
}));
