import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const seedBackup = await fs.readFile('data/area1.json', 'utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = 'http://127.0.0.1:5173';
const results = [];

async function scan(name, target = page) {
  await target.waitForLoadState('networkidle');
  const report = await new AxeBuilder({ page: target }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  results.push({ name, report });
}

try {
  for (const [name, route] of [
    ['C01 desktop', '/app/esg/scope-3'],
    ['C02 desktop', '/app/fondo/attestazioni'],
    ['C03 desktop', '/app/report'],
    ['C04 Bank desktop', '/app/evidence-packs?type=BANK'],
    ['C04 Assurance desktop', '/app/evidence-packs?type=ASSURANCE'],
  ]) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await scan(name);
  }

  await page.goto(`${base}/app/report`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Nuovo report' }).click();
  await scan('C03 dialog — nuovo report');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();

  const seed = JSON.parse(seedBackup);
  const token = seed.attestations.find((item) => item.status === 'VERIFIED').publicToken;
  await page.goto(`${base}/verifica/fondo/${token}`, { waitUntil: 'networkidle' });
  await scan('Verifica Fondo pubblica');

  const shareResponse = await page.request.post(`${base}/api/area1/packs/PACK-ASSUR-001/share`);
  const sharePayload = await shareResponse.json();
  await page.goto(`${base}${sharePayload.share.path}`, { waitUntil: 'networkidle' });
  await scan('Evidence Pack pubblico');

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  for (const [name, route] of [
    ['C01 mobile', '/app/esg/scope-3'],
    ['C03 mobile', '/app/report'],
    ['C04 mobile', '/app/evidence-packs?type=ASSURANCE'],
  ]) {
    await mobile.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await scan(name, mobile);
  }
  await mobile.close();

  let failed = false;
  for (const { name, report } of results) {
    console.log(`\n${name}: ${report.violations.length} violation groups`);
    for (const violation of report.violations) {
      if (['critical', 'serious'].includes(violation.impact)) failed = true;
      console.log(`- [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`);
      for (const node of violation.nodes.slice(0, 20)) console.log(`  ${node.target.join(' ')} — ${node.failureSummary?.replace(/\n/g, ' ')}`);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log('\nAREA 1 WCAG PASS — nessuna violazione critical/serious sulle route e sugli stati analizzati.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
