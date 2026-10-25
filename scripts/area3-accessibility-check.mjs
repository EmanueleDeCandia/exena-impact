import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import { createSeed } from '../server/seed.js';

const seedBackup = await fs.readFile('data/area1.json', 'utf8');
await fs.writeFile('data/area1.json', `${JSON.stringify(createSeed(), null, 2)}\n`, 'utf8');
const seed = createSeed();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const base = process.env.AREA3_BASE || 'http://127.0.0.1:8787';
const results = [];

async function scan(name, target = page) {
  await target.waitForLoadState('networkidle');
  const report = await new AxeBuilder({ page: target }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  results.push({ name, report });
}
const post = async (path, body = {}) => page.request.post(`${base}/api${path}`, { data: body });

try {
  await page.goto(`${base}/app/hospitality`, { waitUntil: 'networkidle' });
  await scan('C08 desktop — ricerca e tariffe');
  await page.getByRole('button', { name: 'Continua con la richiesta' }).click();
  await scan('C08 dialog — riepilogo e consensi');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  await page.getByRole('button', { name: 'Le mie richieste' }).click();
  await scan('C08 desktop — richieste e ricevute');

  await page.goto(`${base}/app/e-learning`, { waitUntil: 'networkidle' });
  await scan('C09 desktop — assegnazione da accettare');
  await page.getByRole('button', { name: 'Nuova assegnazione' }).click();
  await scan('C09 dialog — nuova assegnazione');
  await page.getByRole('button', { name: 'Chiudi finestra' }).click();
  await page.getByTestId('accept-course').click();
  await expect(page.locator('.chapter-player')).toBeVisible();
  await scan('C09 desktop — video, trascrizione e quiz bloccato');

  const course = seed.courses[0];
  for (const chapter of course.chapters) {
    await post(`/area3/learning/enrollments/ENR-DEMO-001/chapters/${chapter.id}/progress`, { type: 'video' });
    await post(`/area3/learning/enrollments/ENR-DEMO-001/chapters/${chapter.id}/progress`, { type: 'transcript' });
    await post(`/area3/learning/enrollments/ENR-DEMO-001/chapters/${chapter.id}/quiz`, { questionId: chapter.questions[0].id, answerId: chapter.questions[0].correctOptionId });
  }
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByTestId('open-final')).toBeVisible();
  await scan('C09 desktop — capitoli completi');
  await page.getByTestId('open-final').click();
  await scan('C09 desktop — test finale');
  await post('/area3/learning/enrollments/ENR-DEMO-001/final-attempts', { answers: Object.fromEntries(course.finalQuestions.map((question) => [question.id, question.correctOptionId])) });
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.certificate-card')).toBeVisible();
  await scan('C09 desktop — attestato emesso');

  const certificateLink = await page.locator('.certificate-card a').filter({ hasText: 'Verifica pubblica' }).getAttribute('href');
  await page.goto(`${base}${certificateLink}`, { waitUntil: 'networkidle' });
  await scan('Verifica pubblica attestato desktop');

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${base}/app/hospitality`, { waitUntil: 'networkidle' });
  await scan('C08 mobile', mobile);
  await mobile.locator('.mobile-summary-launch').click();
  await scan('C08 mobile — bottom sheet', mobile);
  await mobile.getByRole('button', { name: 'Chiudi finestra' }).click();
  await mobile.goto(`${base}/app/e-learning`, { waitUntil: 'networkidle' });
  await scan('C09 mobile', mobile);
  await mobile.goto(`${base}${certificateLink}`, { waitUntil: 'networkidle' });
  await scan('Verifica pubblica attestato mobile', mobile);
  await mobile.close();

  await page.setViewportSize({ width: 757, height: 669 });
  await page.goto(`${base}/app/e-learning`, { waitUntil: 'networkidle' });
  await scan('C09 — altezza ridotta e sidebar');

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
  else console.log(`\nAREA 3 WCAG PASS — 0 violazioni su ${results.length} contesti desktop, dialoghi, pubblico, mobile e altezza ridotta.`);
} finally {
  await browser.close();
  await fs.writeFile('data/area1.json', seedBackup, 'utf8');
}
