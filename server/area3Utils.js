const DAY_MS = 86_400_000;

export function parseDateInput(value, label = 'Data') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw Object.assign(new Error(`${label} non valida`), { status: 400 });
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) throw Object.assign(new Error(`${label} non valida`), { status: 400 });
  return timestamp;
}

export function nightsBetween(checkIn, checkOut) {
  const start = parseDateInput(checkIn, 'Data di arrivo');
  const end = parseDateInput(checkOut, 'Data di partenza');
  const nights = Math.round((end - start) / DAY_MS);
  if (nights < 1 || nights > 30) throw Object.assign(new Error('Il soggiorno deve essere di 1–30 notti'), { status: 400 });
  return nights;
}

export function calculateStayQuote({ room, checkIn, checkOut, guests, today = new Date() }) {
  if (!room) throw Object.assign(new Error('Camera non disponibile'), { status: 404 });
  const nights = nightsBetween(checkIn, checkOut);
  const start = parseDateInput(checkIn, 'Data di arrivo');
  const todayStart = Date.parse(new Date(today).toISOString().slice(0, 10));
  if (start < todayStart) throw Object.assign(new Error('La data di arrivo non può essere nel passato'), { status: 400 });
  if (!Number.isInteger(guests) || guests < 1 || guests > room.capacity) throw Object.assign(new Error(`Ospiti ammessi per questa camera: 1–${room.capacity}`), { status: 400 });
  const extraGuests = Math.max(0, guests - room.baseOccupancy);
  const roomSubtotalCents = room.ratePerNightCents * nights;
  const extraGuestCents = extraGuests * room.extraGuestPerNightCents * nights;
  const taxesCents = room.taxPerPersonNightCents * guests * nights;
  return {
    currency: 'EUR', nights, guests, extraGuests, roomSubtotalCents, extraGuestCents, taxesCents,
    totalCents: roomSubtotalCents + extraGuestCents + taxesCents,
    ratePerNightCents: room.ratePerNightCents,
    taxPerPersonNightCents: room.taxPerPersonNightCents,
    calculatedAt: new Date().toISOString(),
  };
}

export function availabilityView(room, now = new Date()) {
  const updatedAt = room.availabilityUpdatedAt;
  const ageHours = Math.max(0, (new Date(now).getTime() - new Date(updatedAt).getTime()) / 3_600_000);
  const stale = !updatedAt || !Number.isFinite(ageHours) || ageHours > 72;
  return {
    code: stale ? 'STALE' : 'REQUEST_ONLY',
    label: stale ? 'Disponibilità non aggiornata' : 'Solo richiesta di disponibilità',
    requestOnly: true,
    inventoryLive: false,
    updatedAt,
    stale,
  };
}

export function scoreAnswers(questions, answers = {}) {
  const total = questions.length;
  const correct = questions.filter((question) => answers[question.id] === question.correctOptionId).length;
  const percent = total ? Math.round((correct / total) * 10_000) / 100 : 0;
  return { correct, total, percent };
}

export function chapterIsComplete(progress = {}) {
  return Boolean(progress.videoCompleted && progress.transcriptRead && progress.quizPassed);
}

export function enrollmentView(enrollment, now = new Date()) {
  const expired = enrollment.status !== 'COMPLETED' && enrollment.deadlineAt && new Date(enrollment.deadlineAt).getTime() < new Date(now).getTime();
  return { ...enrollment, status: expired ? 'EXPIRED' : enrollment.status };
}

export function publicCertificateView(certificate, course) {
  return {
    code: certificate.code,
    courseTitle: course.title,
    provider: course.provider,
    verificationCriteria: course.verificationCriteria,
    status: certificate.status,
    issuedAt: certificate.issuedAt,
    revokedAt: certificate.revokedAt || null,
    demo: true,
    identityNotice: 'Per minimizzazione, la verifica pubblica non espone nome, ruolo, email, punteggio o altri dati del discente.',
  };
}

export function courseView(course) {
  return {
    ...course,
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      questions: chapter.questions.map(({ correctOptionId, ...question }) => question),
    })),
    finalQuestions: course.finalQuestions.map(({ correctOptionId, ...question }) => question),
  };
}
