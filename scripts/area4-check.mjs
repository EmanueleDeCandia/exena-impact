import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

await fs.mkdir('qa', { recursive: true });
const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const base = process.env.AREA4_BASE || 'http://127.0.0.1:8787';
const runtimeErrors = [];
const track = (target, name) => {
  target.on('pageerror', (error) => runtimeErrors.push(`${name}: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) runtimeErrors.push(`${name}: ${message.text()}`); });
};
track(page, 'board');
const post = async (target, path, token, body = {}) => target.request.post(`${base}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, data: body });
const login = async (target, memberId) => {
  const response = await post(target, '/area4/governance/session', null, { memberId });
  assert.equal(response.status(), 201); return (await response.json()).token;
};
const challenge = async (target, token) => (await (await post(target, '/area4/governance/mfa-challenges', token)).json()).challenge;
const noOverflow = async (target, label) => {
  const size = await target.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(size.scroll <= size.viewport + 1, `${label}: overflow ${size.scroll} > ${size.viewport}`);
};
const menuDownload = async (target, root, buttonName, format) => {
  await root.getByRole('button', { name: buttonName, exact: true }).click();
  const waiting = target.waitForEvent('download');
  await root.getByRole('menuitem').filter({ hasText: `.${format}` }).click();
  return waiting;
};
const selectOption = async (title) => page.locator('.fund-option').filter({ hasText: title }).click();
const confirmUi = async (otp = '246810') => {
  await page.getByRole('button', { name: 'Genera challenge MFA demo' }).click();
  await expect(page.locator('.mfa-challenge__code')).toContainText('246810');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox').check();
  await dialog.getByLabel('Digita CONFERMO *').fill('CONFERMO');
  await dialog.getByLabel('Codice MFA a 6 cifre *').fill(otp);
  await dialog.getByRole('button', { name: /^Conferma/ }).click();
};

try {
  // Landing Area 4: Executive C06, C10 and C11 are real destinations.
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('#area-governance .service-item__action')).toHaveCount(1);
  assert.equal(await page.locator('#area-governance .service-item__action').getAttribute('href'), '/app/editoriale?type=BEST_PRACTICE');
  await page.locator('#servizi .mode-switch button').nth(1).click();
  await expect(page.locator('#area-governance .variant-item__action')).toHaveCount(2);
  assert.equal(await page.locator('#area-governance .variant-item__action').nth(0).getAttribute('href'), '/app/governance/indirizzo-fondo');
  assert.equal(await page.locator('#area-governance .variant-item__action').nth(1).getAttribute('href'), '/app/governance/briefing');

  // C10 — Board-only access, strong MFA, receipt and versioned modification.
  assert.equal((await page.request.get(`${base}/api/area4/fund-direction`)).status(), 401);
  await page.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
  await expect(page.locator('.governance-access')).toBeVisible();
  await page.getByRole('button', { name: /Consigliere Board Demo/ }).click();
  await expect(page.locator('.direction-quota')).toContainText('4.500,00');
  await page.screenshot({ path: 'qa/area4-c10-desktop.png', fullPage: true });
  await selectOption('Comune di Accumoli');
  await page.getByRole('button', { name: 'Rivedi e conferma' }).click();
  await confirmUi('000000');
  await expect(page.locator('.dialog .form-error')).toContainText('Codice MFA demo non corretto');
  await page.getByRole('dialog').getByLabel('Codice MFA a 6 cifre *').fill('246810');
  await page.getByRole('dialog').getByRole('button', { name: /^Conferma/ }).click();
  await expect(page.locator('.current-preference')).toContainText('Comune di Accumoli');
  await expect(page.locator('.preference-history > article')).toHaveCount(1);
  const receiptRoot = page.locator('.preference-history > article').first();
  const receiptPdf = await menuDownload(page, receiptRoot, 'Ricevuta', 'PDF');
  assert.equal((await fs.readFile(await receiptPdf.path())).subarray(0, 4).toString(), '%PDF');
  const receiptJsonDownload = await menuDownload(page, receiptRoot, 'Ricevuta', 'JSON');
  const receipt = JSON.parse(await fs.readFile(await receiptJsonDownload.path(), 'utf8'));
  assert.equal(receipt.optionId, 'OPT-COMUNE-ACCUMOLI');
  assert.equal(receipt.ruleVersion, 'REG-FONDO-2026.1');
  assert.equal(receipt.quotaCents, 450000);
  assert.equal(receipt.mfaChallengeId, undefined);

  await selectOption('Comune di Amatrice');
  await page.getByRole('button', { name: 'Rivedi nuova versione' }).click();
  await confirmUi();
  await expect(page.locator('.current-preference')).toContainText('Comune di Amatrice');
  await expect(page.locator('.preference-history > article')).toHaveCount(2);
  const boardToken = await page.evaluate(() => JSON.parse(sessionStorage.getItem('sibillini-governance-demo-session')).token);

  // Optimistic concurrency: one v3 succeeds, the other stale writer is rejected.
  const [challengeA, challengeB] = await Promise.all([challenge(page, boardToken), challenge(page, boardToken)]);
  const concurrentBase = { expectedVersion: 2, noConflictAccepted: true, confirmationPhrase: 'CONFERMO' };
  const [resultA, resultB] = await Promise.all([
    post(page, '/area4/fund-direction/windows/GOV-WIN-2026/preferences', boardToken, { ...concurrentBase, optionId: 'OPT-OPERA-CENTRO', challengeId: challengeA.id, otp: '246810' }),
    post(page, '/area4/fund-direction/windows/GOV-WIN-2026/preferences', boardToken, { ...concurrentBase, optionId: 'OPT-OPERA-RASSEGNA', challengeId: challengeB.id, otp: '246810' }),
  ]);
  assert.deepEqual([resultA.status(), resultB.status()].sort((a, b) => a - b), [201, 409]);
  const usedChallenge = resultA.status() === 201 ? challengeA : challengeB;
  const reused = await post(page, '/area4/fund-direction/windows/GOV-WIN-2026/preferences', boardToken, { ...concurrentBase, expectedVersion: 3, optionId: 'OPT-OPERA-CENTRO', challengeId: usedChallenge.id, otp: '246810' });
  assert.equal(reused.status(), 400);
  const afterConcurrency = await (await page.request.get(`${base}/api/area4/fund-direction`, { headers: { Authorization: `Bearer ${boardToken}` } })).json();
  const activePreference = afterConcurrency.windows.find((item) => item.id === 'GOV-WIN-2026').preference;
  assert.equal(activePreference.currentVersion, 3);
  assert.equal(activePreference.versions.length, 3);

  // Closed cutoff cannot be bypassed; ESG and another tenant are rejected server-side.
  const expiredChallenge = await challenge(page, boardToken);
  const expired = await post(page, '/area4/fund-direction/windows/GOV-WIN-2025/preferences', boardToken, { ...concurrentBase, expectedVersion: 1, optionId: 'OPT-OPERA-CENTRO', challengeId: expiredChallenge.id, otp: '246810' });
  assert.equal(expired.status(), 409);
  const esgToken = await login(page, 'MEM-ESG-001');
  assert.equal((await page.request.get(`${base}/api/area4/fund-direction`, { headers: { Authorization: `Bearer ${esgToken}` } })).status(), 403);
  assert.equal((await post(page, '/area4/governance/mfa-challenges', esgToken)).status(), 403);
  const otherToken = await login(page, 'MEM-BOARD-OTHER');
  const otherView = await (await page.request.get(`${base}/api/area4/fund-direction`, { headers: { Authorization: `Bearer ${otherToken}` } })).json();
  assert.equal(otherView.windows.length, 0);
  const otherBriefings = await (await page.request.get(`${base}/api/area4/briefings`, { headers: { Authorization: `Bearer ${otherToken}` } })).json();
  assert.equal(otherBriefings.sessions.length, 0);
  assert.equal((await page.request.get(`${base}/api/area4/briefings/BRF-LIVE-DEMO`, { headers: { Authorization: `Bearer ${otherToken}` } })).status(), 404);
  assert.equal((await post(page, '/area4/fund-direction/windows/GOV-WIN-2026/preferences', otherToken, { ...concurrentBase, expectedVersion: 3, optionId: 'OPT-OPERA-CENTRO', challengeId: 'invalid', otp: '246810' })).status(), 404);
  assert.equal((await post(page, `/area4/fund-direction/preferences/${activePreference.id}/implementation`, boardToken, { status: 'IN_PROGRESS', note: 'Tentativo Board non autorizzato' })).status(), 403);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: /Archivio indirizzo Fondo 2025/ }).click();
  await expect(page.locator('.fund-options')).toContainText('Cutoff superato');
  await expect(page.getByRole('button', { name: 'Rivedi nuova versione' })).toHaveCount(0);

  // C11 Board — invite, protected pre-read, join, question, consent and actual leave.
  await page.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await expect(page.locator('.briefing-sessions > button')).toHaveCount(2);
  await page.screenshot({ path: 'qa/area4-c11-lobby-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Accetta invito e conferma identità' }).click();
  await expect(page.locator('.preread-grid article').first()).toContainText('Questo pre-read dimostrativo');
  const preReadRoot = page.locator('.preread-grid article').first();
  const preReadPdf = await menuDownload(page, preReadRoot, 'Scarica pre-read', 'PDF');
  assert.equal((await fs.readFile(await preReadPdf.path())).subarray(0, 4).toString(), '%PDF');
  const preReadJsonDownload = await menuDownload(page, preReadRoot, 'Scarica pre-read', 'JSON');
  const preRead = JSON.parse(await fs.readFile(await preReadJsonDownload.path(), 'utf8'));
  assert.equal(preRead.version, '1.0');
  assert.match(preRead.source, /demo/i);
  const boardRoomToken = new URL(page.url()).searchParams.get('join');
  assert.ok(boardRoomToken);
  const anonymous = await browser.newPage(); track(anonymous, 'anonymous');
  await anonymous.goto(`${base}/app/governance/briefing?join=${boardRoomToken}`, { waitUntil: 'networkidle' });
  await expect(anonymous.locator('.governance-access')).toBeVisible();
  await expect(anonymous.locator('.briefing-layout')).toHaveCount(0);
  await expect(anonymous.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow, noarchive');
  await anonymous.close();
  const earlyQuestion = await post(page, '/area4/briefings/BRF-LIVE-DEMO/questions', boardToken, { text: 'Domanda prima della sala' });
  assert.equal(earlyQuestion.status(), 409);
  await page.getByRole('button', { name: 'Esegui controllo browser' }).click();
  await expect(page.locator('.device-check')).toContainText('Nessun permesso webcam o microfono richiesto');
  await page.getByTestId('join-briefing').click();
  await expect(page.locator('.briefing-room')).toBeVisible();
  await expect(page.locator('.video-provider-placeholder')).toContainText('CANALE VIDEO ESTERNO NON COLLEGATO');
  const repeatedJoin = await post(page, '/area4/briefings/join', boardToken, { token: boardRoomToken, deviceCheckConfirmed: true });
  assert.equal(repeatedJoin.status(), 200);
  assert.equal((await repeatedJoin.json()).detail.attendance.length, 1);
  await page.getByLabel('La tua domanda al relatore *').fill('Quale evidenza demo deve verificare il Board?');
  await page.getByRole('button', { name: 'Invia domanda' }).click();
  await expect(page.locator('.question-list')).toContainText('Quale evidenza demo deve verificare il Board?');
  assert.equal((await post(page, '/area4/briefings/BRF-LIVE-DEMO/recording/enable', boardToken)).status(), 403);
  await page.getByRole('button', { name: 'Acconsento', exact: true }).click();
  await expect(page.locator('.recording-consent')).toContainText('1/2 consensi');
  await page.getByRole('button', { name: 'Esci e registra presenza' }).click();
  await expect(page.locator('.briefing-room')).toHaveCount(0);
  const afterLeave = await post(page, '/area4/briefings/BRF-LIVE-DEMO/questions', boardToken, { text: 'Domanda dopo uscita' });
  assert.equal(afterLeave.status(), 409);
  assert.equal((await post(page, '/area4/briefings/join', null, { token: boardRoomToken, deviceCheckConfirmed: true })).status(), 401);

  // C11 speaker — own invite only, answer, consent policy and real follow-up.
  const speakerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const speaker = await speakerContext.newPage(); track(speaker, 'speaker');
  await speaker.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await speaker.getByRole('button', { name: /Relatrice Startup Demo/ }).click();
  await expect(speaker.locator('.briefing-sessions > button')).toHaveCount(2);
  await speaker.getByRole('button', { name: 'Accetta invito e conferma identità' }).click();
  const speakerToken = await speaker.evaluate(() => JSON.parse(sessionStorage.getItem('sibillini-governance-demo-session')).token);
  assert.equal((await post(speaker, '/area4/briefings/join', speakerToken, { token: boardRoomToken, deviceCheckConfirmed: true })).status(), 403);
  assert.equal((await post(speaker, '/area4/briefings/BRF-LIVE-DEMO/recording/enable', speakerToken)).status(), 409);
  await speaker.getByRole('button', { name: 'Esegui controllo browser' }).click();
  await speaker.getByTestId('join-briefing').click();
  await expect(speaker.locator('.video-provider-placeholder')).toContainText('Presente dalle');
  await expect(speaker.locator('.question-list')).toContainText('Quale evidenza demo deve verificare il Board?');
  await speaker.locator('.answer-form textarea').fill('Il Board deve verificare fonte, versione e criterio demo prima della decisione.');
  await speaker.getByRole('button', { name: 'Pubblica risposta' }).click();
  await expect(speaker.locator('.question-list blockquote')).toContainText('Il Board deve verificare fonte');
  await speaker.getByRole('button', { name: 'Acconsento', exact: true }).click();
  await expect(speaker.locator('.recording-consent')).toContainText('2/2 consensi');
  assert.equal((await post(speaker, '/area4/briefings/BRF-LIVE-DEMO/recording/enable', speakerToken)).status(), 409);
  const recordingView = await (await speaker.request.get(`${base}/api/area4/briefings/BRF-LIVE-DEMO`, { headers: { Authorization: `Bearer ${speakerToken}` } })).json();
  assert.equal(recordingView.detail.recording.enabled, false);
  await speaker.getByRole('button', { name: 'Chiudi e pubblica sintesi' }).click();
  await speaker.getByLabel('Sintesi post-sessione *').fill('Sessione demo effettivamente svolta nella sala del portale, con domanda del Board e risposta della relatrice.');
  await speaker.getByLabel('Punti decisionali').fill('Verificare fonte e versione prima della decisione\nConservare il follow-up nel fascicolo Board');
  await speaker.getByLabel('Riferimenti finali').fill('Pre-read normativo demo v1.0');
  await speaker.getByRole('button', { name: 'Pubblica follow-up', exact: true }).click();
  await expect(speaker.locator('.follow-up')).toBeVisible();
  await expect(speaker.locator('.follow-up-attendance > div')).toHaveCount(2);
  await expect(speaker.locator('.follow-up')).toContainText(/registrazione mai attivata/i);
  const followUpJsonDownload = await menuDownload(speaker, speaker.locator('.follow-up'), 'Scarica follow-up', 'JSON');
  const followUp = JSON.parse(await fs.readFile(await followUpJsonDownload.path(), 'utf8'));
  assert.equal(followUp.attendance.length, 2);
  assert.equal(followUp.questions[0].answer.includes('fonte, versione'), true);
  assert.equal(followUp.followUp.recordingEnabled, false);
  assert.ok(followUp.attendance.every((item) => item.leftAt));
  const followUpPdf = await menuDownload(speaker, speaker.locator('.follow-up'), 'Scarica follow-up', 'PDF');
  assert.equal((await fs.readFile(await followUpPdf.path())).subarray(0, 4).toString(), '%PDF');
  const repeatedComplete = await post(speaker, '/area4/briefings/BRF-LIVE-DEMO/complete', speakerToken, { summary: 'Tentativo duplicato di chiusura sessione demo' });
  assert.equal((await repeatedComplete.json()).idempotent, true);

  // Startup reviewer updates implementation, not the binding choice.
  await speaker.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
  await expect(speaker.locator('.current-preference')).toBeVisible();
  await speaker.getByRole('button', { name: 'Aggiorna attuazione' }).click();
  await speaker.getByLabel('Stato *').selectOption('IN_PROGRESS');
  await speaker.getByLabel('Nota di attuazione *').fill('Verifica operativa registrata dalla relatrice in ambiente demo.');
  await speaker.getByRole('button', { name: 'Registra attuazione' }).click();
  await expect(speaker.locator('.current-preference')).toContainText('In attuazione');
  await expect(speaker.locator('.governance-audit')).toContainText('Verifica operativa registrata');
  await speakerContext.close();

  // Mobile and sidebar regression with eleven components.
  const mobile = await context.newPage(); track(mobile, 'mobile');
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
  await mobile.getByRole('button', { name: /Consigliere Board Demo/ }).click();
  await expect(mobile.locator('.direction-quota')).toBeVisible();
  await noOverflow(mobile, 'C10 mobile');
  await mobile.locator('.fund-option').first().click();
  await mobile.getByRole('button', { name: 'Rivedi nuova versione' }).click();
  await expect(mobile.getByRole('dialog')).toBeVisible();
  await noOverflow(mobile, 'C10 dialog mobile');
  await mobile.getByRole('button', { name: 'Chiudi finestra' }).click();
  await mobile.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await noOverflow(mobile, 'C11 mobile');
  await mobile.close();

  for (const [width, height] of [[1280, 720], [757, 669], [390, 600]]) {
    const trial = await context.newPage();
    await trial.setViewportSize({ width, height });
    await trial.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
    const menu = trial.getByRole('button', { name: 'Apri navigazione workspace' });
    if (await menu.isVisible()) { await menu.click(); await trial.waitForTimeout(300); }
    const userBox = await trial.locator('.workspace-user').boundingBox();
    assert.ok(userBox.y + userBox.height <= height + 1, `${width}x${height}: blocco utente oltre viewport`);
    await trial.locator('.workspace-sidebar__areas').evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await trial.getByRole('link', { name: /C11 Board Briefing Room/ }).click();
    await expect(trial).toHaveURL(/\/app\/governance\/briefing$/);
    await noOverflow(trial, `Sidebar Area 4 ${width}x${height}`);
    await trial.close();
  }

  assert.deepEqual(runtimeErrors, []);
  console.log('AREA 4 E2E PASS — card C06/C10/C11, Board/MFA/versioni/concorrenza/cutoff/tenant, inviti, sala, presenze, Q&A, consensi, follow-up, export e mobile.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
