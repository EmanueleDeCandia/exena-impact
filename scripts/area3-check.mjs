import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

await fs.mkdir('qa', { recursive: true });
const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const seed = createSeed();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const base = process.env.AREA3_BASE || 'http://127.0.0.1:8787';
const runtimeErrors = [];
const track = (target, name) => {
  target.on('pageerror', (error) => runtimeErrors.push(`${name} pageerror: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) runtimeErrors.push(`${name} console: ${message.text()}`); });
};
track(page, 'main');
const noOverflow = async (target, label) => {
  const size = await target.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(size.scroll <= size.viewport + 1, `${label}: overflow ${size.scroll} > ${size.viewport}`);
};
const dismissToasts = async () => {
  const buttons = page.locator('.toast-region .toast button');
  while (await buttons.count()) await buttons.first().click();
};
const menuDownload = async (root, buttonName, format) => {
  await root.getByRole('button', { name: buttonName, exact: true }).click();
  const waiting = page.waitForEvent('download');
  await root.getByRole('menuitem').filter({ hasText: `.${format}` }).click();
  return waiting;
};

try {
  // Landing Area 3: Standard C08 and selectable Variant 3.C C09.
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('#area-welfare .service-item__action')).toHaveCount(1);
  assert.equal(await page.locator('#area-welfare .service-item__action').getAttribute('href'), '/app/hospitality');
  await page.locator('#servizi .mode-switch button').nth(1).click();
  await expect(page.locator('#area-welfare .variant-item__action')).toHaveCount(1);
  assert.equal(await page.locator('#area-welfare .variant-item__action').getAttribute('href'), '/app/e-learning');

  // C08 — search, final quote, stale availability and request submission.
  await page.goto(`${base}/app/hospitality`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Dormire nel borgo, senza false conferme.' })).toBeVisible();
  await expect(page.locator('.booking-summary')).toContainText('162,00');
  await page.screenshot({ path: 'qa/area3-c08-desktop.png', fullPage: true });
  await page.getByLabel('Ospiti', { exact: true }).selectOption('3');
  await expect(page.locator('.booking-summary')).toContainText('Agriturismo Valle Demo');
  await expect(page.locator('.booking-summary')).toContainText('239,00');
  await expect(page.locator('.booking-conditions')).toContainText('Disponibilità non aggiornata');
  const quoteLines = await page.locator('.booking-summary .quote-lines').innerText();
  assert.match(quoteLines, /190,00/);
  assert.match(quoteLines, /40,00/);
  assert.match(quoteLines, /9,00/);
  assert.match(quoteLines, /239,00/);
  await page.getByRole('button', { name: 'Continua con la richiesta' }).click();
  const requestDialog = page.getByRole('dialog');
  await expect(requestDialog).toContainText('239,00');
  await expect(requestDialog).toContainText('Annullamento della richiesta');
  await requestDialog.getByRole('checkbox').nth(0).check();
  await requestDialog.getByRole('checkbox').nth(1).check();
  await requestDialog.getByLabel('Nome del referente *').fill('Referente UI QA Demo');
  await requestDialog.getByRole('button', { name: /Invia richiesta/ }).click();
  await expect(page.locator('.requests-section')).toBeVisible();
  await expect(page.locator('.request-success')).toContainText('nessuna prenotazione è stata confermata');
  await expect(page.locator('.request-card').filter({ hasText: 'Referente UI QA Demo' })).toContainText('Richiesta inviata');

  // Idempotency: two identical operations create one request and zero confirmations.
  const requestBody = {
    requestKey: 'qa-area3-idempotent-request', propertyId: 'HOTEL-DEMO-01', roomId: 'ROOM-BORGO-02',
    checkIn: '2027-04-10', checkOut: '2027-04-12', guests: 2, guestName: 'Referente API QA Demo', note: '',
    consents: { termsAccepted: true, privacyAccepted: true },
  };
  const first = await page.request.post(`${base}/api/area3/hospitality/requests`, { data: requestBody });
  const second = await page.request.post(`${base}/api/area3/hospitality/requests`, { data: requestBody });
  assert.equal(first.status(), 201);
  assert.equal(second.status(), 200);
  const firstPayload = await first.json();
  const secondPayload = await second.json();
  assert.equal(firstPayload.request.id, secondPayload.request.id);
  assert.equal(secondPayload.idempotent, true);
  assert.equal(firstPayload.request.status, 'REQUESTED');
  assert.equal('confirmedAt' in firstPayload.request, false);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Le mie richieste' }).click();
  const apiCards = page.locator('.request-card').filter({ hasText: 'Referente API QA Demo' });
  await expect(apiCards).toHaveCount(1);
  const apiCard = apiCards.first();

  const pdf = await menuDownload(apiCard, 'Ricevuta', 'PDF');
  assert.equal((await fs.readFile(await pdf.path())).subarray(0, 4).toString(), '%PDF');
  const jsonDownload = await menuDownload(apiCard, 'Ricevuta', 'JSON');
  const jsonReceipt = JSON.parse(await fs.readFile(await jsonDownload.path(), 'utf8'));
  assert.equal(jsonReceipt.status, 'REQUESTED');
  assert.match(jsonReceipt.legalNotice, /non conferma/i);
  const ics = await menuDownload(apiCard, 'Ricevuta', 'ICS');
  const icsText = await fs.readFile(await ics.path(), 'utf8');
  assert.match(icsText, /STATUS:TENTATIVE/);
  assert.doesNotMatch(icsText, /STATUS:CONFIRMED/);

  await apiCard.getByRole('button', { name: 'Annulla richiesta' }).click();
  await page.getByRole('button', { name: 'Sì, annulla richiesta' }).click();
  await expect(apiCard).toContainText('Annullata');
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Le mie richieste' }).click();
  await expect(page.locator('.request-card').filter({ hasText: 'Referente API QA Demo' })).toContainText('Annullata');
  await noOverflow(page, 'C08 richieste desktop');

  // C08 mobile and accessible bottom-sheet summary.
  const mobile = await context.newPage();
  track(mobile, 'mobile');
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${base}/app/hospitality`, { waitUntil: 'networkidle' });
  await noOverflow(mobile, 'C08 mobile');
  await mobile.locator('.mobile-summary-launch').click();
  await expect(mobile.getByRole('dialog')).toBeVisible();
  const sheet = await mobile.getByRole('dialog').boundingBox();
  assert.ok(sheet.y > 30 && Math.abs(sheet.width - 390) <= 1, 'Il riepilogo mobile deve essere un bottom sheet a tutta larghezza');
  await mobile.screenshot({ path: 'qa/area3-c08-mobile-sheet.png' });
  await mobile.getByRole('button', { name: 'Chiudi finestra' }).click();
  await mobile.close();

  // C09 — accept, protected final test, real local media and chapter resume.
  await page.goto(`${base}/app/e-learning`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'qa/area3-c09-start-desktop.png', fullPage: true });
  const earlyFinal = await page.request.post(`${base}/api/area3/learning/enrollments/ENR-DEMO-001/final-attempts`, { data: { answers: {} } });
  assert.equal(earlyFinal.status(), 409);
  await page.getByTestId('accept-course').click();
  await expect(page.locator('.chapter-player')).toBeVisible();
  const video = page.getByTestId('chapter-video');
  await expect.poll(() => video.evaluate((element) => element.duration)).toBe(8);
  assert.equal(await video.locator('track[kind="captions"]').count(), 1);
  await video.evaluate((element) => element.dispatchEvent(new Event('ended')));
  await expect(page.locator('.chapter-progress-actions')).toContainText('Video completato');
  await page.getByTestId('read-transcript').click();
  await expect(page.locator('.transcript-card__footer')).toContainText('Trascrizione registrata');

  const completeQuiz = async (correctIndex, wrongFirst = false) => {
    const options = page.locator('.chapter-quiz .quiz-options label');
    if (wrongFirst) {
      await options.nth(correctIndex === 0 ? 1 : 0).click();
      await page.getByRole('button', { name: 'Verifica risposta' }).click();
      await expect(page.locator('.quiz-feedback.is-wrong')).toContainText('Risposta non corretta');
    }
    await options.nth(correctIndex).click();
    await page.getByRole('button', { name: 'Verifica risposta' }).click();
    await expect(page.locator('.quiz-feedback.is-correct')).toContainText('Risposta corretta');
  };
  await completeQuiz(1, true);
  await expect(page.locator('.chapter-player__heading')).toContainText('Capitolo completato');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.chapter-player__heading')).toContainText('Uso corretto e controllo del DPI');
  await expect(page.locator('.chapter-tabs button').nth(0)).toContainText('Postura, appoggio e prevenzione');
  await expect(page.locator('.course-progress')).toContainText('1/3');

  const completeRemainingChapter = async (index, correctIndex) => {
    await page.locator('.chapter-tabs button').nth(index).click();
    await page.getByRole('button', { name: 'Ho completato il video' }).click();
    await expect(page.locator('.chapter-progress-actions')).toContainText('Video completato');
    await page.getByTestId('read-transcript').click();
    await expect(page.locator('.transcript-card__footer')).toContainText('Trascrizione registrata');
    await completeQuiz(correctIndex);
    await expect(page.locator('.chapter-player__heading')).toContainText('Capitolo completato');
  };
  await completeRemainingChapter(1, 2);
  await completeRemainingChapter(2, 0);
  await expect(page.getByTestId('open-final')).toBeVisible();
  await page.getByTestId('open-final').click();

  const answerFinal = async (indexes) => {
    for (let index = 0; index < indexes.length; index += 1) {
      await expect(page.locator('.quiz-step')).toHaveText(`${index + 1} / 3`);
      await page.locator('.final-test .quiz-options label').nth(indexes[index]).click();
      if (index < indexes.length - 1) await page.getByRole('button', { name: 'Domanda successiva' }).click();
    }
    await page.getByTestId('submit-final').click();
  };
  await answerFinal([0, 0, 0]);
  await expect(page.locator('.quiz-feedback.is-wrong')).toContainText('Test non superato: 33,33%');
  await expect(page.locator('.certificate-card')).toHaveCount(0);
  await answerFinal([1, 0, 2]);
  await expect(page.locator('.certificate-card')).toBeVisible();
  await expect(page.locator('.certificate-card')).toContainText('SI-ERGO-DEMO-0002');
  await expect(page.locator('.certificate-card')).toContainText('Percorso completato e verificato');
  await page.screenshot({ path: 'qa/area3-c09-certificate-desktop.png', fullPage: true });

  const learningResponse = await page.request.get(`${base}/api/area3/learning`);
  const learningPayload = await learningResponse.json();
  assert.equal(JSON.stringify(learningPayload.course).includes('correctOptionId'), false);
  const completed = learningPayload.enrollments.find((item) => item.id === 'ENR-DEMO-001');
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.attempts.filter((item) => item.type === 'FINAL').length, 2);

  const certificateLink = await page.locator('.certificate-card a').filter({ hasText: 'Verifica pubblica' }).getAttribute('href');
  const publicPage = await context.newPage();
  track(publicPage, 'certificate');
  await publicPage.goto(`${base}${certificateLink}`, { waitUntil: 'networkidle' });
  await expect(publicPage.getByRole('heading', { name: 'Attestato attivo.' })).toBeVisible();
  const publicText = await publicPage.locator('body').innerText();
  assert.doesNotMatch(publicText, /Preposto Demo/);
  assert.doesNotMatch(publicText, /100%/);
  const publicPayload = await (await publicPage.request.get(`${base}/api${certificateLink.replace('/verifica/attestato/', '/public/certificates/')}`)).json();
  assert.equal('learnerName' in publicPayload, false);
  assert.equal('scorePercent' in publicPayload, false);
  assert.match(await publicPage.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await noOverflow(publicPage, 'Verifica attestato pubblica');
  await publicPage.screenshot({ path: 'qa/area3-certificate-public.png', fullPage: true });

  const certificateCard = page.locator('.certificate-card');
  const certificatePdf = await menuDownload(certificateCard, 'Scarica attestato', 'PDF');
  assert.equal((await fs.readFile(await certificatePdf.path())).subarray(0, 4).toString(), '%PDF');
  const certificateJsonDownload = await menuDownload(certificateCard, 'Scarica attestato', 'JSON');
  const certificateJson = JSON.parse(await fs.readFile(await certificateJsonDownload.path(), 'utf8'));
  assert.equal(certificateJson.demo, true);
  assert.match(certificateJson.accreditationNotice, /nessun accreditamento legale/i);

  await certificateCard.getByRole('button', { name: 'Revoca', exact: true }).click();
  await page.getByRole('button', { name: 'Revoca attestato' }).click();
  await expect(page.locator('.certificate-card')).toContainText('Attestato revocato');
  await publicPage.reload({ waitUntil: 'networkidle' });
  await expect(publicPage.getByRole('heading', { name: 'Attestato revocato.' })).toBeVisible();
  await publicPage.close();

  const beforeIdempotent = await (await page.request.get(`${base}/api/area3/learning`)).json();
  const repeatedFinal = await page.request.post(`${base}/api/area3/learning/enrollments/ENR-DEMO-001/final-attempts`, { data: { answers: {} } });
  const repeatedPayload = await repeatedFinal.json();
  assert.equal(repeatedPayload.alreadyIssued, true);
  const afterIdempotent = await (await page.request.get(`${base}/api/area3/learning`)).json();
  assert.equal(afterIdempotent.enrollments.find((item) => item.id === 'ENR-DEMO-001').certificateId, beforeIdempotent.enrollments.find((item) => item.id === 'ENR-DEMO-001').certificateId);

  await page.getByRole('button', { name: 'Nuova assegnazione' }).click();
  await page.getByRole('dialog').getByLabel('Nome dimostrativo del discente *').fill('Preposto QA Demo 2');
  await page.getByRole('dialog').getByRole('button', { name: 'Crea assegnazione' }).click();
  await expect(page.locator('.assignment-list > button')).toHaveCount(3);
  await expect(page.locator('.learner-header')).toContainText('Preposto QA Demo 2');
  await noOverflow(page, 'C09 desktop');

  // Sidebar regression on short desktop and mobile viewports.
  for (const [width, height] of [[1280, 720], [757, 669], [390, 600]]) {
    const trial = await context.newPage();
    await trial.setViewportSize({ width, height });
    await trial.goto(`${base}/app/hospitality`, { waitUntil: 'networkidle' });
    const menu = trial.getByRole('button', { name: 'Apri navigazione workspace' });
    if (await menu.isVisible()) { await menu.click(); await trial.waitForTimeout(300); }
    const userBox = await trial.locator('.workspace-user').boundingBox();
    assert.ok(userBox.y + userBox.height <= height + 1, `${width}x${height}: blocco utente oltre viewport`);
    const areas = trial.locator('.workspace-sidebar__areas');
    await areas.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await trial.getByRole('link', { name: /C09 E-Learning & Certificates/ }).click();
    await expect(trial).toHaveURL(/\/app\/e-learning$/);
    await noOverflow(trial, `Sidebar ${width}x${height}`);
    await trial.close();
  }

  await dismissToasts();
  assert.deepEqual(runtimeErrors, []);
  console.log('AREA 3 E2E PASS — card, C08 quote/request/idempotenza/export/cancel, C09 progressi/quiz/finali/attestato/revoca, pubblico, mobile e sidebar.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
