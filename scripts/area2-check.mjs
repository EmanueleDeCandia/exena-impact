import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await fs.mkdir('qa', { recursive: true });
const seedBackup = await fs.readFile('data/area1.json', 'utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const base = 'http://127.0.0.1:5173';
const runtimeErrors = [];
const attachErrorTracking = (target, name) => {
  target.on('pageerror', (error) => runtimeErrors.push(`${name} pageerror: ${error.message}`));
  target.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) runtimeErrors.push(`${name} console: ${message.text()}`);
  });
};
attachErrorTracking(page, 'main');
const noOverflow = async (target, label) => {
  const dimensions = await target.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(dimensions.scroll <= dimensions.viewport + 1, `${label}: horizontal overflow ${dimensions.scroll} > ${dimensions.viewport}`);
};
const dismissToasts = async () => {
  const buttons = page.locator('.toast button');
  while (await buttons.count()) await buttons.first().click();
};
const downloadButton = async (name) => {
  const promise = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  return promise;
};

try {
  // Landing cards: two Standard services and three variants all have real destinations.
  await page.goto(base, { waitUntil: 'networkidle' });
  await expect(page.locator('#area-comunicazione .service-item__action')).toHaveCount(2);
  await page.locator('#servizi .mode-switch button').nth(1).click();
  await expect(page.locator('#area-comunicazione .variant-item__action')).toHaveCount(3);
  const stakeholderHref = await page.locator('#area-comunicazione .variant-item__action').nth(2).getAttribute('href');
  assert.equal(stakeholderHref, '/app/report?template=STAKEHOLDER');

  // C05 — preview, persistence, real SVG/PNG exports and controlled filiera invitation.
  await page.goto(`${base}/app/brand-kit?audience=SUBCONTRACTOR`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'La tua identità. Il kit già sotto controllo.' })).toBeVisible();
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive');
  await expect(page.locator('.brand-preview img')).toHaveCount(0);
  await page.getByLabel('Denominazione subappaltatore *').fill('Subappaltatore QA Demo S.r.l.');
  await expect(page.locator('.brand-preview img')).toBeVisible();
  await page.getByRole('button', { name: 'Infografica verticale 1080 × 1350 px' }).click();
  await page.getByRole('button', { name: /Palette COBALT/ }).click();
  await expect(page.locator('.brand-preview img')).toBeVisible();
  await page.getByRole('button', { name: 'Genera e archivia' }).click();
  await expect(page.locator('.generation-list > button')).toHaveCount(1);
  await expect(page.locator('.archive-export > b')).toContainText('GEN-');
  const svgDownload = await downloadButton('.SVG');
  const svgText = await fs.readFile(await svgDownload.path(), 'utf8');
  assert.match(svgText, /<svg/);
  assert.match(svgText, /Subappaltatore QA Demo/);
  assert.match(svgText, /DEMO \/ DATI SINTETICI/i);
  const pngDownload = await downloadButton('.PNG');
  const pngBytes = await fs.readFile(await pngDownload.path());
  assert.equal(pngBytes.subarray(1, 4).toString(), 'PNG');

  const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#173ba0"/><text x="10" y="55">QA</text></svg>';
  await page.locator('input[type="file"]').setInputFiles({ name: 'logo-qa.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(safeSvg) });
  await expect(page.locator('.logo-options')).toContainText('logo-qa.svg');
  const malicious = await page.request.post(`${base}/api/area2/brand-kit/assets`, { headers: { 'Content-Type': 'image/svg+xml', 'X-File-Name': 'bad.svg' }, data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>') });
  assert.equal(malicious.status(), 400);

  await page.getByRole('button', { name: 'Distribuzione filiera' }).click();
  await page.getByRole('button', { name: 'Crea invito demo' }).click();
  await expect(page.locator('.share-item')).toHaveCount(1);
  const invitationUrl = await page.locator('.share-item code').innerText();
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  const invitation = await context.newPage();
  attachErrorTracking(invitation, 'invitation');
  await invitation.goto(invitationUrl, { waitUntil: 'networkidle' });
  await expect(invitation.locator('.brand-invitation-card')).toContainText('Subappaltatore QA Demo');
  assert.match(await invitation.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
  await invitation.getByRole('button', { name: 'Accetta kit demo' }).click();
  await expect(invitation.locator('.invitation-accepted')).toContainText('Accettato');
  await noOverflow(invitation, 'Invito filiera desktop');
  await invitation.screenshot({ path: 'qa/area2-invitation-desktop.png' });
  await invitation.close();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Distribuzione filiera' }).click();
  await expect(page.locator('.share-item .status-badge')).toContainText('Accettato');
  await page.getByRole('button', { name: 'Revoca', exact: true }).click();
  await page.getByRole('button', { name: 'Revoca invito' }).click();
  await expect(page.locator('.share-item .status-badge')).toContainText('Revocato');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  const revoked = await context.newPage();
  await revoked.goto(invitationUrl, { waitUntil: 'networkidle' });
  await expect(revoked.locator('.public-state-card')).toContainText('Link revocato');
  await revoked.close();
  await noOverflow(page, 'C05 desktop');
  await dismissToasts();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'qa/area2-c05-desktop.png' });

  // C06 — private creation, dual approval, public metadata, versioned correction and archive.
  await page.goto(`${base}/app/editoriale?type=CASE_HISTORY`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nuovo contenuto' }).click();
  await page.getByRole('dialog').getByLabel('Titolo iniziale *').fill('Case History QA Demo');
  await page.getByRole('button', { name: 'Crea bozza noindex' }).click();
  await expect(page.locator('.editorial-editor__header')).toContainText('Case History QA Demo');
  const draftPath = await page.locator('.editorial-editor__header code').innerText();
  const draftPublic = await page.request.get(`${base}/api/public/editorial/case-history/${draftPath.split('/').pop()}`);
  assert.equal(draftPublic.status(), 404);
  await page.locator('.editorial-type-switch > button').nth(1).click();
  const practiceDraft = page.locator('.editorial-archive__list > button').filter({ hasText: 'Bozza' }).first();
  await practiceDraft.click();
  await expect(page.locator('.editorial-editor__header')).toContainText('Dal fascicolo di consegna');
  await page.getByRole('button', { name: 'Invia verifica fatti' }).click();
  await expect(page.locator('.toast-region')).toContainText('Versione inviata alla verifica dei fatti');
  await expect(page.locator('.editorial-editor__header .status-badge')).toContainText('Verifica fattuale');
  await page.getByRole('button', { name: 'Verifica fatti demo' }).click();
  await page.getByRole('button', { name: 'Registra esito demo' }).click();
  await expect(page.locator('.editorial-editor__header .status-badge')).toContainText('Revisione editoriale');
  await page.getByRole('button', { name: 'Revisione editoriale demo' }).click();
  await page.getByRole('button', { name: 'Registra esito demo' }).click();
  await expect(page.locator('.editorial-editor__header .status-badge')).toContainText('Pubblicato');
  const publicArticleUrl = await page.getByRole('link', { name: 'Apri pubblico' }).getAttribute('href');
  const article = await context.newPage();
  attachErrorTracking(article, 'article');
  await article.goto(`${base}${publicArticleUrl}`, { waitUntil: 'networkidle' });
  await expect(article.locator('.editorial-public-article')).toBeVisible();
  assert.match(await article.locator('link[rel="canonical"]').getAttribute('href'), new RegExp(`${publicArticleUrl}$`));
  assert.equal(await article.locator('meta[name="robots"]').getAttribute('content'), 'index, follow');
  await noOverflow(article, 'Articolo pubblico desktop');
  await article.screenshot({ path: 'qa/area2-editorial-public-desktop.png' });
  const originalTitle = await article.locator('article > header h1').innerText();
  await article.close();

  await page.getByRole('button', { name: 'Nuova correzione' }).click();
  await page.getByRole('button', { name: 'Crea nuova versione' }).click();
  await expect(page.locator('.editorial-archive__version strong')).toHaveText('v2');
  const correctionTitle = `${originalTitle} — versione corretta QA`;
  await page.getByLabel('Titolo *', { exact: true }).fill(correctionTitle);
  await page.getByRole('button', { name: 'Salva versione' }).click();
  await page.getByRole('button', { name: 'Invia verifica fatti' }).click();
  await page.getByRole('button', { name: 'Verifica fatti demo' }).click();
  await page.getByRole('button', { name: 'Registra esito demo' }).click();
  await page.getByRole('button', { name: 'Revisione editoriale demo' }).click();
  await page.getByRole('button', { name: 'Registra esito demo' }).click();
  await expect(page.locator('.editorial-editor__header .status-badge')).toContainText('Pubblicato');
  const corrected = await context.newPage();
  await corrected.goto(`${base}${publicArticleUrl}`, { waitUntil: 'networkidle' });
  await expect(corrected.locator('article > header h1')).toHaveText(correctionTitle);
  await corrected.close();
  await page.getByRole('button', { name: 'Archivia', exact: true }).click();
  await page.getByRole('button', { name: 'Archivia contenuto' }).click();
  await expect(page.locator('.editorial-editor__header .status-badge')).toContainText('Archiviato');
  const archived = await page.request.get(`${base}/api/public/editorial/best-practice/${publicArticleUrl.split('/').pop()}`);
  assert.equal(archived.status(), 410);
  await noOverflow(page, 'C06 desktop');
  await dismissToasts();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'qa/area2-c06-desktop.png' });

  // C07 — private creation, approval, public directory/detail, rectification, removal and CSV.
  await page.goto(`${base}/app/registro-partner`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nuova organizzazione' }).click();
  const createDialog = page.getByRole('dialog');
  await createDialog.getByLabel('Denominazione organizzazione *').fill('Impresa QA Demo S.r.l.');
  await createDialog.getByLabel('Municipalità iniziale *').fill('Accumoli');
  await createDialog.getByLabel('Nome progetto *').fill('Progetto QA Borghi');
  await createDialog.getByLabel('Descrizione pubblica *').fill('Progetto dimostrativo per verificare il flusso pubblico del registro Partner.');
  await createDialog.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Crea bozza privata' }).click();
  await expect(page.locator('.partner-editor__header')).toContainText('Impresa QA Demo');
  await page.getByLabel('Evidenza pubblicabile *').fill('Attestazione pubblica collegata — evidenza sintetica QA');
  await page.getByRole('button', { name: 'Salva', exact: true }).click();
  await page.getByRole('button', { name: 'Invia a revisione' }).click();
  await expect(page.locator('.partner-editor__header .status-badge')).toContainText('In revisione');
  await page.getByRole('button', { name: 'Registra revisione demo' }).click();
  await page.getByRole('button', { name: 'Registra esito demo' }).click();
  await expect(page.locator('.partner-editor__header .status-badge')).toContainText('Pubblicato');
  const partnerUrl = await page.getByRole('link', { name: 'Apri scheda pubblica' }).getAttribute('href');
  const partner = await context.newPage();
  attachErrorTracking(partner, 'partner');
  await partner.goto(`${base}${partnerUrl}`, { waitUntil: 'networkidle' });
  await expect(partner.locator('.partner-public-detail')).toContainText('Impresa QA Demo');
  assert.ok(!/\b\d{11}\b/.test(await partner.locator('main').innerText()), 'La scheda pubblica non deve contenere una Partita IVA');
  await partner.goto(`${base}/partner`, { waitUntil: 'networkidle' });
  await partner.getByRole('searchbox').fill('Impresa QA Demo');
  await expect(partner.locator('.partner-directory-table tbody tr')).toHaveCount(1);
  const csvPromise = partner.waitForEvent('download');
  await partner.getByRole('button', { name: 'Export CSV' }).click();
  const csv = await csvPromise;
  const csvText = await fs.readFile(await csv.path(), 'utf8');
  assert.match(csvText, /Impresa QA Demo/);
  assert.ok(!csvText.includes('Partita IVA'));
  await noOverflow(partner, 'Directory Partner desktop');
  await partner.screenshot({ path: 'qa/area2-partner-directory-desktop.png' });
  await partner.close();

  await page.getByRole('button', { name: 'Procedura rettifica' }).click();
  await page.getByLabel('Evidenza pubblicabile *').fill('Evidenza pubblica rettificata e tracciata — QA demo');
  await page.getByRole('button', { name: 'Registra rettifica demo' }).click();
  await expect(page.locator('.partner-review-panel')).toContainText('Aggiornamento dei dati pubblici');
  const rectified = await context.newPage();
  await rectified.goto(`${base}${partnerUrl}`, { waitUntil: 'networkidle' });
  await expect(rectified.locator('.partner-public-rectifications')).toContainText('Aggiornamento dei dati pubblici');
  await rectified.close();
  await page.getByRole('button', { name: 'Rimuovi dal pubblico' }).click();
  await page.getByRole('button', { name: 'Rimuovi e registra' }).click();
  await expect(page.locator('.partner-editor__header .status-badge')).toContainText('Rimosso');
  const removed = await page.request.get(`${base}/api/public/partners/${partnerUrl.split('/').pop()}`);
  assert.equal(removed.status(), 410);
  await noOverflow(page, 'C07 desktop');
  await dismissToasts();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'qa/area2-c07-desktop.png' });

  // Mobile checks on canvas-first layout and public cards.
  const mobile = await context.newPage();
  attachErrorTracking(mobile, 'mobile');
  await mobile.setViewportSize({ width: 390, height: 844 });
  for (const [name, route, selector] of [
    ['C05 mobile', '/app/brand-kit', '.brand-canvas'],
    ['C06 mobile', '/app/editoriale', '.editorial-editor'],
    ['C07 mobile', '/app/registro-partner', '.partner-editor'],
    ['Directory mobile', '/partner', '.partner-directory-filters'],
  ]) {
    await mobile.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await expect(mobile.locator(selector).first()).toBeVisible();
    await noOverflow(mobile, name);
    if (name === 'C05 mobile') {
      const canvasBox = await mobile.locator('.brand-canvas').boundingBox();
      const controlsBox = await mobile.locator('.brand-controls').boundingBox();
      assert.ok(canvasBox.y < controlsBox.y, 'Canvas must be visually first on mobile');
      await mobile.screenshot({ path: 'qa/area2-c05-mobile.png', fullPage: true });
    }
  }
  await mobile.close();
  assert.deepEqual(runtimeErrors, [], `Runtime errors: ${runtimeErrors.join('\n')}`);
  console.log('AREA 2 E2E PASS — C05/C06/C07, inviti, doppia review, correzioni, registro, export e mobile verificati.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
