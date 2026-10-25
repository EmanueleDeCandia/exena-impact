import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

await fs.mkdir('qa', { recursive: true });
const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const browser = await chromium.launch({ headless: true });
const base = process.env.AREA5_BASE || 'http://127.0.0.1:8787';
const runtimeErrors = [];
const track = (target, name) => {
  target.on('pageerror', (error) => runtimeErrors.push(`${name}: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) runtimeErrors.push(`${name}: ${message.text()}`); });
};
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage(); track(page, 'procurement');
const post = async (target, path, token, body = {}) => target.request.post(`${base}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, data: body });
const get = async (target, path, token) => target.request.get(`${base}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
const loginApi = async (target, memberId) => { const response = await post(target, '/area5/operations/session', null, { memberId }); assert.equal(response.status(), 201); return (await response.json()).token; };
const token = async (target) => target.evaluate(() => JSON.parse(sessionStorage.getItem('sibillini-operations-demo-session')).token);
const noOverflow = async (target, label) => { const size = await target.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth })); assert.ok(size.scroll <= size.viewport + 1, `${label}: overflow ${size.scroll} > ${size.viewport}`); };
const menuDownload = async (target, root, buttonName, format) => { await root.getByRole('button', { name: buttonName, exact: true }).click(); const waiting = target.waitForEvent('download'); await root.getByRole('menuitem').filter({ hasText: `.${format}` }).click(); return waiting; };
const newIdentityPage = async (name) => { const nextContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }); const next = await nextContext.newPage(); track(next, name); return next; };

try {
  // Every Area 5 card resolves to its actual component.
  await page.goto(base, { waitUntil: 'networkidle' });
  const standardHrefs = await page.locator('#area-piattaforma .service-item__action').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  assert.deepEqual(standardHrefs, ['/app/ordini', '/app/dashboard', '/trasparenza']);
  await page.locator('#servizi .mode-switch button').nth(1).click();
  const variantHrefs = await page.locator('#area-piattaforma .variant-item__action').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  assert.deepEqual(variantHrefs, ['/app/logistica', '/app/filiera']);

  // A stale browser token must return to role selection instead of leaving a broken identity bar.
  await page.evaluate(() => sessionStorage.setItem('sibillini-operations-demo-session', JSON.stringify({ token: 'stale-after-demo-reset', member: { id: 'OP-PROC-001', displayName: 'Procurement General Contractor Demo', role: 'PROCUREMENT', organizationName: 'General Contractor Demo S.p.A.' }, expiresAt: new Date(Date.now() + 3600000).toISOString() })));
  await page.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await expect(page.locator('.operations-access')).toBeVisible();
  await expect(page.locator('.operations-access .form-error')).toContainText('non è più valida');
  await expect(page.locator('.operations-identity')).toHaveCount(0);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('sibillini-operations-demo-session')), null);

  // C12 — server quote, two-step submission, idempotency and real receipt.
  assert.equal((await get(page, '/area5/orders')).status(), 401);
  await page.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Procurement General Contractor Demo/ }).click();
  await expect(page.locator('.bulk-catalog')).toBeVisible();
  await page.getByLabel(/Quantità Exena Eco S3S.*taglia 42/).fill('2');
  await page.getByRole('tab', { name: /Sibillini Boot S3/ }).click();
  await page.getByLabel(/Quantità Sibillini Boot S3.*taglia 42/).fill('1');
  await expect(page.locator('.bulk-quote')).toContainText('234,00');
  await expect(page.locator('.bulk-quote')).toContainText('70,20');
  await page.getByRole('button', { name: 'Rivedi ordine' }).click();
  await expect(page.getByRole('dialog')).toContainText('Non stai effettuando un pagamento');
  const orderResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/area5/orders') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Invia ordine una sola volta' }).click();
  const orderResponse = await orderResponsePromise;
  assert.equal(orderResponse.status(), 201);
  const orderPayload = orderResponse.request().postDataJSON();
  await expect(page.locator('.bulk-receipt')).toContainText('Ordine inviato · non pagato');
  await expect(page.locator('.order-history__table > article')).toHaveCount(4);
  const procurementToken = await token(page);
  const repeated = await post(page, '/area5/orders', procurementToken, orderPayload);
  assert.equal(repeated.status(), 200);
  assert.equal((await repeated.json()).idempotent, true);
  assert.equal((await (await get(page, '/area5/orders', procurementToken)).json()).orders.length, 4);
  const receiptPdf = await menuDownload(page, page.locator('.bulk-receipt'), 'Scarica ricevuta', 'PDF');
  assert.equal((await fs.readFile(await receiptPdf.path())).subarray(0, 4).toString(), '%PDF');
  const receiptJsonDownload = await menuDownload(page, page.locator('.bulk-receipt'), 'Scarica ricevuta', 'JSON');
  const receipt = JSON.parse(await fs.readFile(await receiptJsonDownload.path(), 'utf8'));
  assert.equal(receipt.totalCents, 23400);
  assert.equal(receipt.fundCents, 7020);
  assert.equal(receipt.paymentStatus, 'NOT_INTEGRATED');
  assert.equal(receipt.idempotency, undefined);
  const stockQuote = await post(page, '/area5/orders/quote', procurementToken, { items: [{ productId: 'PROD-ECO-S3S', size: '45', quantity: 1 }] });
  assert.equal((await stockQuote.json()).quote.stockWarnings[0].status, 'UNCERTAIN');

  // C13 — same ledger, activation request and physical-benefit voucher.
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await expect(page.locator('.dashboard-kpis')).toContainText('345');
  await expect(page.locator('.dashboard-kpis')).toContainText('305');
  const learningCard = page.locator('.benefit-service').filter({ hasText: 'Modulo Ergonomia e Sicurezza' });
  await learningCard.getByRole('button', { name: 'Richiedi attivazione' }).click();
  await expect(learningCard).toContainText('Richiesta registrata');
  const voucherCard = page.locator('.benefit-service').filter({ hasText: '5 VIP Pass eventi culturali' });
  const voucherPdf = await menuDownload(page, voucherCard, 'Voucher demo', 'PDF');
  assert.equal((await fs.readFile(await voucherPdf.path())).subarray(0, 4).toString(), '%PDF');

  // C14 — public aggregated register, filters, CSV and permalink.
  await page.goto(`${base}/trasparenza`, { waitUntil: 'networkidle' });
  await expect(page.locator('.workspace-sidebar')).toBeVisible();
  await expect(page.locator('.workspace-nav a[href="/trasparenza"]')).toHaveClass(/is-active/);
  await expect(page.locator('.workspace-topbar__actions')).toContainText('REGISTRO PUBBLICO · LETTURA LIBERA');
  await expect(page.getByLabel('Organizzazione corrente')).toHaveCount(0);
  await expect(page.locator('.workspace-user')).toContainText('Accesso pubblico');
  await expect(page.locator('.transparency-kpis')).toContainText('4.500,00');
  await expect(page.locator('.transparency-projects > article')).toHaveCount(2);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  const firstProjectLink = page.locator('.transparency-projects > article').first().getByRole('link');
  await firstProjectLink.click();
  await expect(page.locator('.transparency-detail')).toContainText('3.000,00');
  await expect(page.locator('.workspace-sidebar')).toBeVisible();
  await expect(page.locator('.workspace-breadcrumb')).toContainText('Area 5');
  await expect(page.locator('.workspace-breadcrumb')).toContainText('Trasparenza');
  await expect(page.locator('.transparency-rectifications li')).toHaveCount(1);
  await expect(page.locator('.transparency-source')).toHaveCount(1);
  await page.goto(`${base}/trasparenza`, { waitUntil: 'networkidle' });
  await page.getByLabel('Cerca progetto o borgo').fill('rassegna');
  await page.getByRole('button', { name: 'Applica filtri' }).click();
  await expect(page.locator('.transparency-projects > article')).toHaveCount(1);
  const csvWait = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Esporta CSV' }).click();
  const csvDownload = await csvWait;
  const csv = await fs.readFile(await csvDownload.path(), 'utf8');
  assert.match(csv, /Rassegna culturale/);
  assert.doesNotMatch(csv, /Centro aggregativo/);
  assert.doesNotMatch(csv, /ATT-DEMO|org-gc-demo|12345678903/);
  const publicPayload = await (await get(page, '/area5/transparency')).json();
  assert.equal(publicPayload.reconciliation.status, 'RECONCILED_DEMO');
  assert.equal(JSON.stringify(publicPayload).includes('organizationId'), false);

  // C14 must never become a blank page when the API or its lazy chunk is unavailable.
  await page.getByRole('button', { name: 'Azzera filtri' }).click();
  await expect(page.locator('.transparency-projects > article')).toHaveCount(2);
  await page.route('**/api/area5/transparency', (route) => route.abort('failed'));
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.transparency-public .state-card--error')).toBeVisible();
  await expect(page.locator('.transparency-public .state-card--error')).toContainText('Non riesco a caricare questa vista');
  await expect(page.locator('.workspace-sidebar')).toBeVisible();
  await page.unroute('**/api/area5/transparency');
  await page.getByRole('button', { name: 'Riprova' }).click();
  await expect(page.locator('.transparency-projects > article')).toHaveCount(2);

  const chunkContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const chunkPage = await chunkContext.newPage();
  await chunkPage.route(/TransparencyPublicPages[^/]*\.(?:js|jsx)(?:\?.*)?$/, (route) => route.abort('failed'));
  await chunkPage.goto(`${base}/trasparenza`, { waitUntil: 'networkidle' });
  await expect(chunkPage.locator('.workspace-route-error')).toBeVisible();
  await expect(chunkPage.locator('.workspace-route-error')).toContainText('La vista non è stata caricata correttamente');
  await expect(chunkPage.locator('.workspace-sidebar')).toBeVisible();
  await chunkPage.unroute(/TransparencyPublicPages[^/]*\.(?:js|jsx)(?:\?.*)?$/);
  await chunkPage.getByRole('button', { name: 'Ricarica la vista' }).click();
  await expect(chunkPage.locator('.transparency-projects > article')).toHaveCount(2);
  await chunkContext.close();

  // C15 — create, CSV, assigned Site Manager, validation, approval and concurrent shipment.
  await page.goto(`${base}/app/logistica`, { waitUntil: 'networkidle' });
  await expect(page.locator('.logistics-sites > button')).toHaveCount(2);
  await page.getByLabel('Capocantiere assegnato').selectOption('OP-SITE-001');
  await expect(page.locator('.assigned-manager')).toContainText('Capocantiere Ponte Demo');
  await page.locator('.logistics-file-button input').setInputFiles({ name: 'fabbisogni-ponte.csv', mimeType: 'text/csv', buffer: Buffer.from('productId,size,quantity\nPROD-ECO-S3S,42,120\nPROD-ECO-S3S,43,80') });
  await expect(page.getByLabel('Quantità riga 1')).toHaveValue('120');
  await expect(page.getByLabel('Quantità riga 2')).toHaveValue('80');
  await expect(page.locator('.logistics-audit')).toContainText('Import CSV');
  const needsCsvWait = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta CSV' }).click();
  const needsCsv = await needsCsvWait;
  assert.match(await fs.readFile(await needsCsv.path(), 'utf8'), /"PROD-ECO-S3S","42","120"/);
  await page.getByLabel('Quantità riga 1').fill('100');
  await page.getByLabel('Quantità riga 2').fill('100');
  await page.getByRole('button', { name: 'Salva versione' }).click();
  await expect(page.locator('.needs-editor .micro-label')).toContainText('VERSIONE 4');

  const site = await newIdentityPage('site-manager');
  await site.goto(`${base}/app/logistica`, { waitUntil: 'networkidle' });
  await site.getByRole('button', { name: /Capocantiere Ponte Demo/ }).click();
  await expect(site.locator('.logistics-sites > button')).toHaveCount(1);
  await expect(site.getByRole('button', { name: 'Approva piano' })).toHaveCount(0);
  await site.getByRole('button', { name: 'Valida fabbisogno' }).click();
  await expect(site.locator('.logistics-plan-header')).toContainText('Validato dal cantiere');
  const siteToken = await token(site);
  assert.equal((await post(site, '/area5/logistics/plans/LOG-PONTE-DEMO/approve', siteToken, { expectedVersion: 5 })).status(), 403);
  await site.context().close();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Approva piano' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Conferma approvazione' }).click();
  await expect(page.locator('.logistics-plan-header')).toContainText('Approvato centralmente');
  let logisticsData = await (await get(page, '/area5/logistics', procurementToken)).json();
  let ponte = logisticsData.plans.find((item) => item.id === 'LOG-PONTE-DEMO');
  const shipmentBody = { expectedVersion: ponte.version, idempotencyKey: 'area5-e2e-shipment-0001' };
  const [shipmentA, shipmentB] = await Promise.all([post(page, '/area5/logistics/plans/LOG-PONTE-DEMO/shipments', procurementToken, shipmentBody), post(page, '/area5/logistics/plans/LOG-PONTE-DEMO/shipments', procurementToken, shipmentBody)]);
  assert.deepEqual([shipmentA.status(), shipmentB.status()].sort((a, b) => a - b), [200, 201]);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.shipment-card')).toHaveCount(1);
  await expect(page.locator('.shipment-card')).toContainText('200 paia');
  await expect(page.locator('.shipment-card')).toContainText('Tracking non disponibile');

  await page.getByRole('button', { name: 'Nuovo piano da ordine' }).click();
  await expect(page.getByRole('dialog')).toContainText('ORD-DEMO-0118');
  await page.getByRole('dialog').getByRole('button', { name: 'Crea bozza piano' }).click();
  await expect(page.locator('.logistics-plan-header')).toContainText('ORD-DEMO-0118');
  await page.getByRole('button', { name: 'Aggiungi riga' }).click();
  await page.getByLabel('Quantità riga 1').fill('80');
  await page.getByRole('button', { name: 'Salva versione' }).click();
  await expect(page.locator('.logistics-reconciliation')).toContainText('Fabbisogno = ordine');

  // C16 — invite, acceptance, independent demo verification and controlled links.
  await page.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Invita impresa' }).click();
  await page.getByLabel('Destinatario demo *').selectOption('OP-SUB-INVITE');
  await page.getByRole('dialog').getByLabel(/Ponte Vallone/).check();
  const inviteResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/area5/network/invitations') && response.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Registra invito' }).click();
  assert.equal((await inviteResponsePromise).status(), 201);
  await expect(page.locator('.network-detail__header')).toContainText('Impresa Invito Demo');
  await expect(page.locator('.network-detail__header')).toContainText('Invitata · non attiva');

  const invited = await newIdentityPage('invited-subcontractor');
  await invited.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await invited.getByRole('button', { name: /Impresa da Invitare Demo/ }).click();
  await invited.getByLabel(/Acconsento all’attribuzione/).check();
  await invited.getByLabel(/Acconsento alla distribuzione/).check();
  await invited.getByLabel(/Confermo l’identità demo/).check();
  await invited.getByRole('button', { name: 'Accetta e invia alla verifica' }).click();
  await expect(invited.locator('.network-detail__header')).toContainText('In verifica effettiva');
  await invited.context().close();

  const reviewer = await newIdentityPage('reviewer');
  await reviewer.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await reviewer.getByRole('button', { name: /Revisore Operations Demo/ }).click();
  await reviewer.locator('.network-list > button').filter({ hasText: 'Impresa Invito Demo' }).click();
  await reviewer.getByRole('button', { name: 'Registra verifica e attiva' }).click();
  await expect(reviewer.locator('.network-detail__header')).toContainText('Attiva');
  await reviewer.context().close();

  // Existing subcontractor: individual activation, consent and revocation preserve autonomy/history.
  const sub = await newIdentityPage('subcontractor');
  await sub.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await sub.getByRole('button', { name: /Procurement Subappaltatore Demo/ }).click();
  await expect(sub.locator('.dashboard-kpis')).toContainText('40');
  await expect(sub.locator('.dashboard-view-tabs > button')).toHaveCount(1);
  const subEditorial = sub.locator('.benefit-service').filter({ hasText: 'Case History ed Executive Page' });
  await subEditorial.getByRole('button', { name: 'Attiva servizio' }).click();
  await expect(subEditorial).toContainText('Attivo');
  await sub.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await sub.getByLabel('Attribuzione volumi al General Contractor').uncheck();
  await sub.getByRole('button', { name: 'Salva consensi' }).click();
  await expect(sub.locator('.network-kpis')).toContainText('0');
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await expect(page.locator('.dashboard-kpis')).toContainText('305');
  await sub.getByLabel('Attribuzione volumi al General Contractor').check();
  await sub.getByRole('button', { name: 'Salva consensi' }).click();
  await sub.getByRole('button', { name: 'Revoca relazione' }).click();
  await sub.getByLabel('Motivo *').fill('Revoca demo con conservazione dello storico di filiera.');
  await sub.getByRole('dialog').getByRole('button', { name: 'Conferma revoca' }).click();
  await expect(sub.locator('.network-detail__header')).toContainText('Revocata · storico conservato');
  await expect(sub.locator('.network-kpis')).toContainText('40 paia storiche alla revoca');

  // Rectification updates C13 without deleting the order.
  await sub.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
  const rectifiable = sub.locator('.order-history__table > article').filter({ hasText: 'ORD-DEMO-0097' });
  await rectifiable.getByRole('button', { name: 'Rettifica' }).click();
  await sub.getByLabel('Motivo della rettifica *').fill('Annullamento demo dell’ordine non collegato ad attestazioni.');
  await sub.getByRole('dialog').getByRole('button', { name: 'Registra rettifica' }).click();
  await expect(rectifiable).toContainText('Rettificato · escluso dal ledger');
  await sub.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await expect(sub.locator('.dashboard-kpis')).toContainText('0');
  await sub.context().close();

  // Role and tenant boundaries remain server-side.
  const hrToken = await loginApi(page, 'OP-HR-001');
  assert.equal((await get(page, '/area5/orders', hrToken)).status(), 403);
  const hrDashboard = await (await get(page, '/area5/dashboard', hrToken)).json();
  assert.deepEqual(hrDashboard.views.map((view) => view.id), ['DIRECT']);
  const otherToken = await loginApi(page, 'OP-OTHER-001');
  assert.equal((await (await get(page, '/area5/orders', otherToken)).json()).orders.length, 0);
  assert.equal((await (await get(page, '/area5/logistics', otherToken)).json()).plans.length, 0);
  assert.equal((await (await get(page, '/area5/network', otherToken)).json()).links.length, 0);
  assert.equal((await post(page, '/area5/logistics/plans/LOG-PONTE-DEMO/needs', otherToken, { expectedVersion: 1, needs: [] })).status(), 404);
  assert.equal((await post(page, '/area5/orders', otherToken, { ...orderPayload, idempotencyKey: 'cross-tenant-attempt' })).status(), 400);

  // Mobile and full sixteen-component sidebar.
  await page.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel(/Quantità Exena Eco S3S.*taglia 42/).fill('1');
  await expect(page.locator('.bulk-quote')).toBeVisible();
  await page.getByRole('button', { name: 'Rivedi ordine' }).click();
  await noOverflow(page, 'C12 dialog mobile');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  for (const [path, selector] of [['/app/dashboard', '.benefit-dashboard-page'], ['/app/logistica', '.logistics-page'], ['/app/filiera', '.network-page'], ['/trasparenza', '.transparency-public']]) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    await expect(page.locator(selector)).toBeVisible();
    await noOverflow(page, `${path} mobile`);
  }
  for (const path of ['/app/ordini', '/app/dashboard', '/app/logistica', '/app/filiera']) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Cambia identità' }).click();
    await expect(page.locator('.operations-access')).toBeVisible();
    await page.getByRole('button', { name: /Procurement General Contractor Demo/ }).click();
    await expect(page.locator('.operations-identity')).toBeVisible();
  }
  for (const [width, height] of [[1280, 720], [757, 669], [390, 600]]) {
    const trial = await context.newPage(); track(trial, `sidebar-${width}`);
    await trial.setViewportSize({ width, height });
    await trial.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
    const menu = trial.getByRole('button', { name: 'Apri navigazione workspace' });
    if (await menu.isVisible()) { await menu.click(); await trial.waitForTimeout(300); }
    await trial.locator('.workspace-sidebar__areas').evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await trial.getByRole('link', { name: /C16 Subcontractor Network Console/ }).click();
    await expect(trial).toHaveURL(/\/app\/filiera$/);
    await noOverflow(trial, `Sidebar Area 5 ${width}x${height}`);
    await trial.close();
  }

  assert.deepEqual(runtimeErrors, []);
  console.log('AREA 5 E2E PASS — card C12—C16, ordine/idempotenza/export, ledger/entitlement/voucher, registro pubblico, logistica/CSV/concorrenza, filiera/consensi/revoca, ruoli/tenant/mobile/sidebar.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
