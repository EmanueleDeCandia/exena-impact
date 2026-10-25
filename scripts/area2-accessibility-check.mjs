import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';

const seedBackup = await fs.readFile('data/area1.json', 'utf8');
const seed = JSON.parse(seedBackup);
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
  await page.goto(`${base}/app/brand-kit`, { waitUntil: 'networkidle' });
  await scan('C05 desktop');
  await page.getByRole('button', { name: 'Distribuzione filiera' }).click();
  await scan('C05 dialog — distribuzione');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();

  await page.goto(`${base}/app/editoriale`, { waitUntil: 'networkidle' });
  await scan('C06 Case History pubblicata');
  await page.locator('.editorial-type-switch > button').nth(1).click();
  await page.locator('.editorial-archive__list > button').first().click();
  await scan('C06 bozza editoriale');
  await page.getByRole('button', { name: 'Nuovo contenuto' }).click();
  await scan('C06 dialog — nuovo contenuto');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();

  await page.goto(`${base}/app/registro-partner`, { waitUntil: 'networkidle' });
  await scan('C07 desktop');
  await page.getByRole('button', { name: 'Nuova organizzazione' }).click();
  await scan('C07 dialog — nuova organizzazione');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();

  const published = seed.editorialContents.find((item) => item.status === 'PUBLISHED');
  await page.goto(`${base}${published.type === 'CASE_HISTORY' ? '/case-history' : '/best-practice'}/${published.slug}`, { waitUntil: 'networkidle' });
  await scan('Editoriale pubblico');
  await page.goto(`${base}/partner`, { waitUntil: 'networkidle' });
  await scan('Directory Partner pubblica');
  const partner = seed.partnerEntries.find((item) => item.status === 'PUBLISHED');
  await page.goto(`${base}/partner/${partner.publicSlug}`, { waitUntil: 'networkidle' });
  await scan('Scheda Partner pubblica');

  const generationResponse = await page.request.post(`${base}/api/area2/brand-kit/generations`, { data: { template: 'BADGE', palette: 'COBALT', audience: 'SUBCONTRACTOR', logoAssetId: seed.brandAssets[0].id, textVersionId: seed.brandTextVersions.at(-1).id, subcontractorName: 'Partner Accessibilità Demo' } });
  const generation = await generationResponse.json();
  const inviteResponse = await page.request.post(`${base}/api/area2/brand-kit/invitations`, { data: { generationId: generation.generation.id } });
  const invite = await inviteResponse.json();
  await page.goto(`${base}${invite.invitation.path}`, { waitUntil: 'networkidle' });
  await scan('Invito filiera pubblico');

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  for (const [name, route] of [
    ['C05 mobile', '/app/brand-kit'],
    ['C06 mobile', '/app/editoriale'],
    ['C07 mobile', '/app/registro-partner'],
    ['Directory Partner mobile', '/partner'],
  ]) {
    await mobile.goto(`${base}${route}`, { waitUntil: 'networkidle' });
    await scan(name, mobile);
  }
  await mobile.close();

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
  else console.log('\nAREA 2 WCAG PASS — 0 violazioni su console, dialoghi, pagine pubbliche e mobile.');
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
