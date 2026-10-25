import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.AREA5_BASE || 'http://127.0.0.1:8787';
const results = [];
async function scan(name) {
  await page.waitForLoadState('networkidle');
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  results.push({ name, report });
}

try {
  await page.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
  await scan('C12 desktop — selezione identità');
  await page.getByRole('button', { name: /Procurement General Contractor Demo/ }).click();
  await expect(page.locator('.bulk-catalog')).toBeVisible();
  await page.getByLabel(/Quantità Exena Eco S3S.*taglia 42/).fill('2');
  await expect(page.locator('.bulk-quote')).toContainText('150,00');
  await scan('C12 desktop — catalogo, matrice e quote');
  await page.getByRole('button', { name: 'Rivedi ordine' }).click();
  await scan('C12 dialog — revisione e conferma');
  await page.getByRole('button', { name: 'Invia ordine una sola volta' }).click();
  await expect(page.locator('.bulk-receipt')).toBeVisible();
  await scan('C12 desktop — ricevuta non pagata');

  await page.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await expect(page.locator('.dashboard-kpis')).toContainText('345');
  await scan('C13 desktop — ledger e benefit');
  await page.getByRole('button', { name: 'Varianti', exact: true }).click();
  await scan('C13 desktop — filtro Varianti');

  await page.goto(`${base}/trasparenza`, { waitUntil: 'networkidle' });
  await scan('C14 desktop — registro pubblico');
  await page.locator('.transparency-projects > article').first().getByRole('link').click();
  await expect(page.locator('.transparency-detail')).toBeVisible();
  await scan('C14 desktop — permalink, fonti e rettifiche');

  await page.goto(`${base}/app/logistica`, { waitUntil: 'networkidle' });
  await expect(page.locator('.needs-editor')).toBeVisible();
  await scan('C15 desktop — matrice e riconciliazione');
  await page.getByRole('button', { name: 'Nuovo piano da ordine' }).click();
  await scan('C15 dialog — nuovo piano da ordine');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();

  await page.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await expect(page.locator('.network-detail')).toBeVisible();
  await scan('C16 desktop — relazioni e consensi');
  await page.getByRole('button', { name: 'Invita impresa' }).click();
  await scan('C16 dialog — invito impresa');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  await page.getByRole('button', { name: 'Cambia identità' }).click();
  await page.getByRole('button', { name: /Nuova Impresa Subappaltatrice Demo/ }).click();
  await expect(page.locator('.network-action-panel')).toBeVisible();
  await page.getByLabel(/Acconsento all’attribuzione/).check();
  await page.getByLabel(/Acconsento alla distribuzione/).check();
  await page.getByLabel(/Confermo l’identità demo/).check();
  await scan('C16 desktop — accettazione e consensi separati');
  await page.getByRole('button', { name: 'Accetta e invia alla verifica' }).click();
  await expect(page.locator('.network-detail__header')).toContainText('In verifica effettiva');
  await scan('C16 desktop — attesa verifica effettiva');
  await page.getByRole('button', { name: 'Cambia identità' }).click();
  await page.getByRole('button', { name: /Revisore Operations Demo/ }).click();
  await page.locator('.network-list > button').filter({ hasText: 'Nuova Impresa Filiera Demo' }).click();
  await expect(page.getByRole('button', { name: 'Registra verifica e attiva' })).toBeVisible();
  await scan('C16 desktop — verifica revisore');

  await page.getByRole('button', { name: 'Cambia identità' }).click();
  await expect(page.locator('.operations-access')).toBeVisible();
  await page.goto(`${base}/app/ordini`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Procurement General Contractor Demo/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.bulk-catalog')).toBeVisible();
  await scan('C12 mobile — catalogo e ordini');
  await page.goto(`${base}/app/dashboard`, { waitUntil: 'networkidle' });
  await scan('C13 mobile — dashboard');
  await page.goto(`${base}/app/logistica`, { waitUntil: 'networkidle' });
  await scan('C15 mobile — planner');
  await page.goto(`${base}/app/filiera`, { waitUntil: 'networkidle' });
  await scan('C16 mobile — filiera');
  await page.goto(`${base}/trasparenza`, { waitUntil: 'networkidle' });
  await scan('C14 mobile — registro pubblico');
  await page.setViewportSize({ width: 757, height: 669 });
  await page.goto(`${base}/app/logistica`, { waitUntil: 'networkidle' });
  await scan('C15 — altezza ridotta e sidebar');

  let failed = false;
  for (const { name, report } of results) {
    console.log(`\n${name}: ${report.violations.length} violation groups`);
    for (const violation of report.violations) {
      failed = true;
      console.log(`- [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`);
      for (const node of violation.nodes.slice(0, 20)) console.log(`  ${node.target.join(' ')} — ${node.failureSummary?.replace(/\n/g, ' ')}`);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log(`\nAREA 5 WCAG PASS — 0 violazioni su ${results.length} contesti desktop, dialoghi, stati operativi, mobile e altezza ridotta.`);
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
