import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({ headless: true });
const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktopContext.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
const desktop = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
await page.locator('#calculator-addetti').fill('9');
await page.locator('#simulatore .mode-switch button').nth(1).click();
const alternative = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mobile = await mobileContext.newPage();
await mobile.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
const mobileResults = await new AxeBuilder({ page: mobile }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();

let failed = false;
for (const [name, results] of [['desktop', desktop], ['desktop — varianti e soglie bloccate', alternative], ['mobile', mobileResults]]) {
  console.log(`\n${name}: ${results.violations.length} violation groups`);
  for (const violation of results.violations) {
    if (['critical', 'serious'].includes(violation.impact)) failed = true;
    console.log(`- [${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`);
    for (const node of violation.nodes.slice(0, 40)) console.log(`  ${node.target.join(' ')} — ${node.failureSummary?.replace(/\n/g, ' ')}`);
  }
}
await browser.close();
if (failed) process.exitCode = 1;
