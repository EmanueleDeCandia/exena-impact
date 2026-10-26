import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetSvg, contrastRatio, defaultSharedValueQuestions, editorialPublicPath, sanitizeSvg, slugify, validateRaster } from './area2Utils.js';

test('Area 2 slugs are stable, readable and ASCII', () => {
  assert.equal(slugify('Rendicontazione àrea Sisma — 2026'), 'rendicontazione-area-sisma-2026');
});

test('brand palettes expose measurable WCAG contrast ratios', () => {
  assert.equal(contrastRatio('#ffffff', '#000000'), 21);
  assert.ok(contrastRatio('#ffffff', '#1947e5') >= 4.5);
  assert.ok(contrastRatio('#111111', '#d7ff3f') >= 4.5);
});

test('SVG sanitizer preserves safe artwork and rejects active or external content', () => {
  const safe = sanitizeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#fff"/></svg>'));
  assert.match(safe, /rect/);
  assert.throws(() => sanitizeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>')), /rifiutato/);
  assert.throws(() => sanitizeSvg(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.com">x</a></svg>')), /rifiutato/);
});

test('raster validation checks magic bytes instead of trusting MIME', () => {
  assert.throws(() => validateRaster(Buffer.from('not a png'), 'image/png'), /non corrisponde/);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert.deepEqual(validateRaster(png, 'image/png'), png);
});

test('generated SVG escapes organization content and retains demo metadata', () => {
  const svg = buildAssetSvg({
    generation: { template: 'BADGE', palette: 'MONO', audience: 'GENERAL_CONTRACTOR' },
    asset: { dataUrl: 'data:image/png;base64,AA==' },
    textVersion: { version: '1.0', text: 'Testo approvato con dati sintetici.' },
    organizationName: 'Impresa <Demo> & Partner',
  });
  assert.match(svg, /Impresa &lt;Demo&gt; &amp; Partner/);
  assert.match(svg, /DEMO \/ DATI SINTETICI/);
  assert.doesNotMatch(svg, /Impresa <Demo>/);
});

test('Local Shared Value public path and 6 default questions are valid', () => {
  assert.equal(editorialPublicPath({ type: 'LOCAL_SHARED_VALUE', slug: 'valore-condiviso-demo' }), '/shared-value/valore-condiviso-demo');
  assert.equal(defaultSharedValueQuestions.length, 6);
  assert.ok(defaultSharedValueQuestions.every((q) => q.title && q.question && Array.isArray(q.options) && q.documentUrl));
});
