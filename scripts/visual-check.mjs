import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await fs.mkdir('qa', { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
assert.match(await page.title(), /Sibillini Impact/);
assert.equal(await page.locator('h1').count(), 1);
assert.equal(await page.locator('.service-area').count(), 5);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Desktop horizontal overflow');
await page.screenshot({ path: 'qa/desktop-hero.png' });

await page.getByRole('tab', { name: 'HR & Welfare' }).click();
assert.match(await page.locator('.role-panel h3').innerText(), /beneficio che raggiunge/i);
await page.getByRole('tab', { name: 'Procurement' }).click();

await page.locator('#servizi').scrollIntoViewIfNeeded();
await page.locator('#servizi .mode-switch button').nth(1).click();
assert.equal(await page.locator('.variant-item').count(), 13);
assert.equal(await page.locator('#area-compliance .variant-services.is-active').count(), 1);
await page.locator('#area-compliance').screenshot({ path: 'qa/desktop-service-variant.png' });
assert.equal(await page.locator('.culture-card img').count(), 2);
await page.locator('#performing-arts').scrollIntoViewIfNeeded();
await page.waitForFunction(() => [...document.querySelectorAll('.culture-card img')].every((image) => image.complete && image.naturalWidth > 0));
await page.locator('#performing-arts').screenshot({ path: 'qa/desktop-performing-arts.png' });

await page.locator('#calculator-addetti').fill('200');
await page.locator('#simulatore .mode-switch button').nth(0).click();
const standardValue = (await page.locator('.result-card--value strong').innerText()).replace(/\D/g, '');
assert.equal(standardValue, '6200');
await page.locator('#simulatore .mode-switch button').nth(1).click();
const variantValue = (await page.locator('.result-card--value strong').innerText()).replace(/\D/g, '');
assert.equal(variantValue, '10800');
assert.equal((await page.locator('.result-card--value small').innerText()).replace(/\D/g, ''), '62004600');
await page.locator('#calculator-ratio').focus();
await page.keyboard.press('End');
assert.equal(await page.locator('#calculator-ratio').inputValue(), '50');
const fund = (await page.locator('.result-card--fund strong').innerText()).replace(/\D/g, '');
assert.equal(fund, '7500');
await page.locator('#simulatore').scrollIntoViewIfNeeded();
await page.screenshot({ path: 'qa/desktop-calculator.png' });

const downloadPromise = page.waitForEvent('download');
await page.locator('.download-button').click();
const download = await downloadPromise;
assert.match(download.suggestedFilename(), /sibillini-impact-200-paia/);

await page.screenshot({ path: 'qa/desktop-full.jpg', fullPage: true, type: 'jpeg', quality: 60 });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
mobile.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
mobile.on('console', (message) => { if (message.type() === 'error') errors.push(`mobile console: ${message.text()}`); });
await mobile.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'Mobile horizontal overflow');
await mobile.screenshot({ path: 'qa/mobile-hero.png' });
await mobile.locator('.menu-toggle').click();
assert.equal(await mobile.locator('.mobile-nav.is-open').count(), 1);
await mobile.waitForTimeout(250);
await mobile.screenshot({ path: 'qa/mobile-menu.png' });
await mobile.locator('.mobile-nav a[href="#simulatore"]').click();
await mobile.waitForTimeout(400);
assert.equal(await mobile.locator('.mobile-nav.is-open').count(), 0);
await mobile.locator('#simulatore').scrollIntoViewIfNeeded();
await mobile.screenshot({ path: 'qa/mobile-calculator.png' });
await mobile.screenshot({ path: 'qa/mobile-full.jpg', fullPage: true, type: 'jpeg', quality: 55 });

assert.deepEqual(errors, [], `Browser errors: ${errors.join('\n')}`);
console.log('QA PASS — desktop/mobile, role tabs, 13 variants, performing arts images, base + increments, ratio, download, menu, no overflow, no browser errors.');
await browser.close();
