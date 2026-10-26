import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const purifyWindow = new JSDOM('').window;
const purify = createDOMPurify(purifyWindow);

export const brandTemplates = {
  BADGE: { label: 'Badge Partner', width: 1200, height: 630 },
  INFOGRAPHIC: { label: 'Infografica verticale', width: 1080, height: 1350 },
  EXECUTIVE: { label: 'Capitale relazionale', width: 1200, height: 628 },
};

export const brandPalettes = {
  COBALT: { background: '#1947e5', foreground: '#ffffff', accent: '#d7ff3f' },
  MONO: { background: '#111111', foreground: '#ffffff', accent: '#d7ff3f' },
  VOLT: { background: '#d7ff3f', foreground: '#111111', accent: '#1947e5' },
};

export function slugify(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function escapeXml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

function luminance(hex) {
  const channels = hex.replace('#', '').match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  return Math.round(((Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)) * 100) / 100;
}

export function sanitizeSvg(buffer) {
  const source = Buffer.from(buffer).toString('utf8');
  if (!source.trim() || source.length > 1_500_000) throw Object.assign(new Error('SVG vuoto o superiore a 1,5 MB'), { status: 400 });
  if (/<!DOCTYPE|<!ENTITY|<\?|<script|on[a-z]+\s*=|javascript:|<foreignObject|<iframe|<object|<embed|(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/|data:text)/i.test(source)) {
    throw Object.assign(new Error('SVG rifiutato: contiene script, entità, eventi o riferimenti esterni'), { status: 400 });
  }
  const clean = purify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'style'],
    FORBID_ATTR: ['style'],
  });
  const document = new JSDOM(clean, { contentType: 'image/svg+xml' }).window.document;
  if (document.querySelector('parsererror') || document.documentElement.nodeName.toLowerCase() !== 'svg') {
    throw Object.assign(new Error('Il file non contiene un SVG valido'), { status: 400 });
  }
  for (const element of document.querySelectorAll('*')) {
    for (const attribute of element.attributes) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (/^on/.test(name) || /javascript:/i.test(value) || (/href$/.test(name) && value && !value.startsWith('#')) || (/url\(/i.test(value) && !/url\(\s*["']?#/i.test(value))) {
        throw Object.assign(new Error('SVG rifiutato: riferimento esterno o attributo non sicuro'), { status: 400 });
      }
    }
  }
  document.documentElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return document.documentElement.outerHTML;
}

export function validateRaster(buffer, mime) {
  const data = Buffer.from(buffer);
  if (!data.length || data.length > 2_000_000) throw Object.assign(new Error('Immagine vuota o superiore a 2 MB'), { status: 400 });
  const png = data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if ((mime === 'image/png' && !png) || (mime === 'image/jpeg' && !jpeg)) {
    throw Object.assign(new Error('Il contenuto del file non corrisponde al formato dichiarato'), { status: 400 });
  }
  return data;
}

function wrapText(value, maxCharacters = 42, maxLines = 4) {
  const words = String(value).trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxCharacters && current) {
      lines.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  return lines.slice(0, maxLines);
}

function textLines(lines, x, y, { size = 32, lineHeight = 1.2, weight = 500, fill, family = 'Arial, sans-serif', letterSpacing = 0 } = {}) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}

export function buildAssetSvg({ generation, asset, textVersion, organizationName }) {
  const template = brandTemplates[generation.template] || brandTemplates.BADGE;
  const palette = brandPalettes[generation.palette] || brandPalettes.MONO;
  const { width, height } = template;
  const ratio = contrastRatio(palette.foreground, palette.background);
  if (ratio < 4.5) throw Object.assign(new Error('Contrasto insufficiente per il testo principale'), { status: 400 });
  const margin = 56;
  const titleSize = generation.template === 'INFOGRAPHIC' ? 65 : 60;
  const organizationLines = wrapText(organizationName, generation.template === 'INFOGRAPHIC' ? 23 : 35, 2);
  const approvedLines = wrapText(textVersion.text, generation.template === 'INFOGRAPHIC' ? 35 : 64, 4);
  const audience = generation.audience === 'SUBCONTRACTOR' ? 'KIT FILIERA / SUBAPPALTATORE' : 'PARTNER SIBILLINI IMPACT';
  const safeTitle = escapeXml(`${audience} — ${organizationName}`);
  const logo = asset?.dataUrl ? `<image href="${asset.dataUrl}" x="${width - 216}" y="48" width="160" height="90" preserveAspectRatio="xMidYMid meet"/>` : '';
  const approvedY = generation.template === 'INFOGRAPHIC' ? 520 : 365;
  const audienceBlock = generation.audience === 'SUBCONTRACTOR'
    ? `<rect x="${margin}" y="${height - 240}" width="${width - margin * 2}" height="150" fill="none" stroke="${palette.foreground}" stroke-opacity="0.45"/>
       ${textLines(['GENERAL CONTRACTOR'], margin + 24, height - 202, { size: 17, weight: 700, fill: palette.accent, letterSpacing: 2 })}
       ${textLines(wrapText(organizationName, 62, 1), margin + 24, height - 165, { size: 24, weight: 600, fill: palette.foreground })}
       ${textLines(['SUBAPPALTATORE'], margin + 24, height - 125, { size: 17, weight: 700, fill: palette.accent, letterSpacing: 2 })}
       ${textLines(wrapText(generation.subcontractorName || 'Da assegnare', 62, 1), margin + 24, height - 88, { size: 24, weight: 600, fill: palette.foreground })}`
    : `${textLines(['GENERAL CONTRACTOR / ORGANIZZAZIONE'], margin, height - 126, { size: 17, weight: 700, fill: palette.accent, letterSpacing: 2 })}
       ${textLines(wrapText(organizationName, 65, 1), margin, height - 84, { size: 27, weight: 600, fill: palette.foreground })}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${safeTitle}</title><desc id="desc">Asset dimostrativo con testo approvato, contrasto ${ratio}:1 e area di sicurezza ${margin}px.</desc>
  <rect width="${width}" height="${height}" fill="${palette.background}"/><rect width="18" height="${height}" fill="${palette.accent}"/>
  ${textLines(['SIBILLINI', 'IMPACT'], margin, 86, { size: 30, lineHeight: .9, weight: 800, fill: palette.foreground })}${logo}
  ${textLines([audience], margin, 190, { size: 18, weight: 700, fill: palette.accent, letterSpacing: 2 })}
  ${textLines(organizationLines, margin, 275, { size: titleSize, lineHeight: 1.02, weight: 800, fill: palette.foreground })}
  ${textLines(approvedLines, margin, approvedY, { size: generation.template === 'INFOGRAPHIC' ? 31 : 25, lineHeight: 1.35, weight: 400, fill: palette.foreground })}
  ${audienceBlock}
  ${textLines([`TESTO v${textVersion.version} · CONTRASTO ${ratio}:1 · AREA SICUREZZA ${margin}px`], margin, height - 35, { size: 13, weight: 600, fill: palette.foreground })}
  ${textLines(['DEMO / DATI SINTETICI'], width - 250, 46, { size: 13, weight: 700, fill: palette.accent })}
</svg>`;
}

export const defaultSharedValueQuestions = [
  {
    id: 'lsv-q1',
    category: 'Occupazione Locale',
    question: 'Quota di manodopera locale e inserimento di residenti nell’area territoriale',
    answer: 'Il 68% dei lavoratori impiegati nell’unità operativa risiede nei comuni del comprensorio cratere sisma.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/libro-unico-presenze-q3-2026.pdf',
    verified: true,
  },
  {
    id: 'lsv-q2',
    category: 'Filiera & Fornitori Territoriali',
    question: 'Accordi con fornitori e subappaltatori con sede nei territori montani e interni',
    answer: 'Attivati contratti con 12 fornitori locali per materiali, manutenzioni e servizi logistici a km zero.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/registro-contratti-filiera-locale.pdf',
    verified: true,
  },
  {
    id: 'lsv-q3',
    category: 'Matching Grant & Comunità',
    question: 'Destinazione della devoluzione e del Matching Grant a progetti sociali e culturali della comunità',
    answer: 'Devoluzione confermata al Fondo Ricreatività con Matching Grant paritario del 30% per il centro giovani locale.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/attestazione-fondo-matching-grant.pdf',
    verified: true,
  },
  {
    id: 'lsv-q4',
    category: 'Sicurezza & Formazione Tecnica',
    question: 'Ore di formazione erogate su salute, sicurezza e prevenzione rischi nei cantieri e stabilimenti',
    answer: 'Erogate 140 ore di formazione certificata su DPI di III categoria e prevenzione infortuni a tutti i lavoratori.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/verbali-formazione-sicurezza-2026.pdf',
    verified: true,
  },
  {
    id: 'lsv-q5',
    category: 'Sostenibilità Ambientale & Circolarità',
    question: 'Recupero sfridi, gestione differenziata dei rifiuti e riduzione emissioni nella logistica',
    answer: 'Raggiunto il 94% di riciclo imballaggi e introdotto il riutilizzo pallet a circuito chiuso con la filiera.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/relazione-gestione-rifiuti-circolari.pdf',
    verified: true,
  },
];

export function editorialPublicPath(content) {
  if (content.type === 'LOCAL_SHARED_VALUE') {
    return `/shared-value/${content.slug}`;
  }
  return `/${content.type === 'CASE_HISTORY' ? 'case-history' : 'best-practice'}/${content.slug}`;
}

