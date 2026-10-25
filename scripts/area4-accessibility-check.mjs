import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.AREA4_BASE || 'http://127.0.0.1:8787';
const results = [];
async function scan(name, target = page) {
  await target.waitForLoadState('networkidle');
  const report = await new AxeBuilder({ page: target }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  results.push({ name, report });
}
const post = async (path, token, body = {}) => page.request.post(`${base}/api${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, data: body });

try {
  await page.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
  await scan('C10 desktop — selezione identità');
  await page.getByRole('button', { name: /Consigliere Board Demo/ }).click();
  await expect(page.locator('.direction-quota')).toBeVisible();
  await scan('C10 desktop — quota e opzioni');
  await page.locator('.fund-option').first().click();
  await page.getByRole('button', { name: 'Rivedi e conferma' }).click();
  await scan('C10 dialog — conseguenze e conferma forte');
  await page.getByRole('button', { name: 'Genera challenge MFA demo' }).click();
  await scan('C10 dialog — challenge MFA demo');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  await page.getByRole('tab', { name: /Archivio indirizzo Fondo 2025/ }).click();
  await scan('C10 desktop — cutoff chiuso e ricevuta storica');

  await page.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await scan('C11 desktop — invito e agenda');
  await page.getByRole('button', { name: 'Accetta invito e conferma identità' }).click();
  await expect(page.locator('.preread-grid article').first()).toContainText('Questo pre-read dimostrativo');
  await scan('C11 desktop — pre-read riservati');
  await page.getByRole('button', { name: 'Esegui controllo browser' }).click();
  await scan('C11 desktop — controllo browser completato');
  await page.getByTestId('join-briefing').click();
  await expect(page.locator('.briefing-room')).toBeVisible();
  await scan('C11 desktop — sala, domande e consensi');
  await page.getByRole('button', { name: 'Esci e registra presenza' }).click();

  // Complete through the other named identity; only actual portal attendance is exported.
  const login = await post('/area4/governance/session', null, { memberId: 'MEM-SPEAKER-001' });
  const speakerToken = (await login.json()).token;
  const accepted = await post('/area4/briefings/BRF-LIVE-DEMO/accept', speakerToken, { identityConfirmed: true });
  const roomUrl = (await accepted.json()).roomUrl;
  const roomToken = new URL(roomUrl, base).searchParams.get('join');
  assert.equal((await post('/area4/briefings/join', speakerToken, { token: roomToken, deviceCheckConfirmed: true })).status(), 200);
  const completed = await post('/area4/briefings/BRF-LIVE-DEMO/complete', speakerToken, {
    summary: 'Follow-up demo basato sugli ingressi e sulle uscite effettivamente registrati nella sala del portale.',
    decisionPoints: ['Verificare le evidenze prima della decisione'],
    references: ['Pre-read demo v1.0'],
  });
  assert.equal(completed.status(), 200);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.follow-up')).toBeVisible();
  await scan('C11 desktop — follow-up e presenze effettive');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/app/governance/indirizzo-fondo`, { waitUntil: 'networkidle' });
  await scan('C10 mobile — console');
  await page.locator('.fund-option').first().click();
  await page.getByRole('button', { name: 'Rivedi e conferma' }).click();
  await scan('C10 mobile — dialogo di conferma');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  await page.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await scan('C11 mobile — follow-up');
  await page.setViewportSize({ width: 757, height: 669 });
  await page.goto(`${base}/app/governance/briefing`, { waitUntil: 'networkidle' });
  await scan('C11 — altezza ridotta e sidebar');

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
  else console.log(`\nAREA 4 WCAG PASS — 0 violazioni su ${results.length} contesti desktop, dialoghi, sala, follow-up, mobile e altezza ridotta.`);
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
