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
    id: 'lsv-1',
    category: 'Business Model & Impatto Comunitario',
    title: '1. Modello di business orientato all’impatto sulla comunità',
    description: 'Valuta se il core business dell’azienda genera un beneficio strutturale e mirato per stakeholder vulnerabili, fornitori in difficoltà o comunità territoriali marginali, superando la logica della compensazione o della donazione caritativa. L’obiettivo è la creazione di relazioni di fornitura che rafforzano cluster locali e la condivisione del valore creato (Shared Value).',
    question: 'Il modello di business dell’azienda crea un beneficio specifico per stakeholder quali organizzazioni di beneficenza, venditori o fornitori in difficoltà o comunità locale?',
    options: [
      'Sì — Il core business genera beneficio strutturale per stakeholder vulnerabili, fornitori in difficoltà o comunità locale attraverso relazioni di fornitura e cluster territoriali.',
      'No — L’azienda opera su modelli convenzionali senza un perimetro mirato di impatto comunitario.'
    ],
    selectedOptions: [
      'Sì — Il core business genera beneficio strutturale per stakeholder vulnerabili, fornitori in difficoltà o comunità locale attraverso relazioni di fornitura e cluster territoriali.'
    ],
    answer: 'Sì. Il modello di business dell’azienda supera la logica della pura compensazione caritativa e genera un beneficio strutturale per la comunità locale e la filiera territoriale. Attraverso relazioni di fornitura qualificate e il rafforzamento dei cluster locali, l’attività operativa realizza una concreta condivisione del valore (Shared Value) a favore di stakeholder, venditori e fornitori dei comuni montani e dell’area sisma.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/modello-impatto-comunita-statuto.pdf',
    verified: true,
  },
  {
    id: 'lsv-2',
    category: 'Sostegno Locale & Pratiche Civiche',
    title: '2. Sostegno Locale — Pratiche di partecipazione civica',
    description: 'Raccoglie le pratiche di partecipazione attiva e di co-sviluppo civico messe in campo dall’azienda per stimolare il tessuto socio-economico locale e sostenere località marginali attraverso vantaggi competitivi e valore condiviso.',
    question: 'Quali delle seguenti pratiche di partecipazione civica implementa l’azienda?',
    options: [
      'Donazioni di denaro o in natura (beni materiali o servizi donati al posto di denaro) – escluse cause politiche.',
      'Investimenti per la comunità.',
      'Servizi alla comunità o pro-bono.',
      'Sostegno per adottare politiche o pratiche che promuovano una migliore performance sociale o ambientale.',
      'Sconti su prodotti o servizi per gruppi specifici in condizioni svantaggiate.',
      'Uso gratuito delle strutture aziendali per ospitare eventi della comunità.'
    ],
    selectedOptions: [
      'Donazioni di denaro o in natura (beni materiali o servizi donati al posto di denaro) – escluse cause politiche.',
      'Investimenti per la comunità.',
      'Servizi alla comunità o pro-bono.',
      'Sostegno per adottare politiche o pratiche che promuovano una migliore performance sociale o ambientale.',
      'Sconti su prodotti o servizi per gruppi specifici in condizioni svantaggiate.',
      'Uso gratuito delle strutture aziendali per ospitare eventi della comunità.'
    ],
    answer: 'L’azienda implementa le seguenti pratiche di partecipazione civica: (1) Investimenti per la comunità a supporto delle aree interne; (2) Donazioni di beni materiali e servizi ad alto valore d’uso a favore di enti civici e sociali (escluse cause politiche); (3) Servizi alla comunità e attività pro-bono di rigenerazione territoriale; (4) Sostegno per adottare politiche che promuovano una migliore performance sociale e ambientale nella filiera; (5) Sconti e condizioni agevolate su prodotti/servizi per gruppi in condizioni svantaggiate; (6) Concessione gratuita delle strutture aziendali per ospitare eventi, laboratori e incontri della comunità locale.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/registro-pratiche-sostegno-civico.pdf',
    verified: true,
  },
  {
    id: 'lsv-3',
    category: 'Partnership & Alleanze Comunitarie',
    title: '3. Sostegno Locale — Partnership con il Terzo Settore',
    description: 'Verifica la partecipazione dell’azienda in organizzazioni comunitarie locali e partnership strategiche con organizzazioni senza fini di lucro per il rafforzamento socio-economico del territorio.',
    question: 'Quali forme di partnership, partecipazione o apporto di capitale a organizzazioni senza fini di lucro sono attive?',
    options: [
      'Partnership con organizzazioni benefiche o partecipazione in organizzazioni comunitarie.',
      'L’azienda offre partecipazione societaria o capitale a un’organizzazione senza fini di lucro.',
      'Accordi di co-sviluppo civico per sostenere località marginali attraverso vantaggi competitivi e valore condiviso.'
    ],
    selectedOptions: [
      'Partnership con organizzazioni benefiche o partecipazione in organizzazioni comunitarie.',
      'L’azienda offre partecipazione societaria o capitale a un’organizzazione senza fini di lucro.',
      'Accordi di co-sviluppo civico per sostenere località marginali attraverso vantaggi competitivi e valore condiviso.'
    ],
    answer: 'L’azienda presidia il sostegno locale attraverso: (1) Partnership formali con organizzazioni benefiche ed enti del Terzo Settore radicati nella comunità dei monti Sibillini; (2) Apporto di risorse e partecipazione a sostegno di organizzazioni no-profit territoriali; (3) Accordi pluriennali di co-sviluppo civico per rafforzare la resilienza e i servizi essenziali delle località marginali dell’area sisma.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/convenzioni-partnership-terzo-settore.pdf',
    verified: true,
  },
  {
    id: 'lsv-4',
    category: 'Politiche di Investimento & Matching Grant',
    title: '4. Procedure e politiche per investimenti — Impegni formali e Matching Grant',
    description: 'Verifica l’esistenza di standard formali, impegni di lungo periodo e metodologie orientate a misurare l’efficacia degli investimenti territoriali e della condivisione del valore.',
    question: 'Quali delle seguenti procedure riguardanti le donazioni e gli investimenti orientati alla comunità vengono implementate dall’azienda?',
    options: [
      'L’azienda ha una dichiarazione formale riguardante l’impatto sociale o ambientale che spera di generare attraverso le sue attività filantropiche.',
      'L’azienda ha un impegno formale riguardante le donazioni benefiche (per esempio ha un accordo pluriennale con una organizzazione non profit).',
      'L’azienda fa donazioni benefiche per lo stesso valore di quelle che vengono fatte dai singoli lavoratori (Matching Grant).'
    ],
    selectedOptions: [
      'L’azienda ha una dichiarazione formale riguardante l’impatto sociale o ambientale che spera di generare attraverso le sue attività filantropiche.',
      'L’azienda ha un impegno formale riguardante le donazioni benefiche (per esempio ha un accordo pluriennale con una organizzazione non profit).',
      'L’azienda fa donazioni benefiche per lo stesso valore di quelle che vengono fatte dai singoli lavoratori (Matching Grant).'
    ],
    answer: 'L’azienda ha adottato procedure formalizzate per gli investimenti nella comunità: (1) Ha una dichiarazione formale approvata dall’organo amministrativo sull’impatto sociale e ambientale atteso dalle proprie attività filantropiche; (2) Ha sottoscritto un impegno formale pluriennale con il Fondo Ricreatività; (3) Ha attivato il programma di Matching Grant aziendale che pareggia e raddoppia le donazioni e le devoluzioni effettuate dai lavoratori verso le iniziative comunitarie.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/policy-investimenti-matching-grant.pdf',
    verified: true,
  },
  {
    id: 'lsv-5',
    category: 'Coinvolgimento Filiera & Misurazione Impatto',
    title: '5. Coinvolgimento di persone, fornitori e misurazione d’impatto',
    description: 'Valuta il coinvolgimento attivo dei lavoratori dell’impresa, la mobilitazione della supply chain locale e l’adozione di metodologie formali di misurazione dell’impatto generato nella comunità.',
    question: 'In che modo l’azienda coinvolge lavoratori e filiera e misura l’impatto dei suoi investimenti nella comunità?',
    options: [
      'L’azienda rende partecipi i propri lavoratori in iniziative di sviluppo locale.',
      'L’azienda coinvolge i propri fornitori o partner per aumentare l’impatto di iniziative di sviluppo locale.',
      'L’azienda ha procedure o meccanismi per misurare l’impatto dei suoi investimenti nella comunità.'
    ],
    selectedOptions: [
      'L’azienda rende partecipi i propri lavoratori in iniziative di sviluppo locale.',
      'L’azienda coinvolge i propri fornitori o partner per aumentare l’impatto di iniziative di sviluppo locale.',
      'L’azienda ha procedure o meccanismi per misurare l’impatto dei suoi investimenti nella comunità.'
    ],
    answer: 'L’azienda attua una governance inclusiva dell’impatto territoriale: (1) Rende partecipi i propri lavoratori attraverso ore dedicate e consultazioni su progetti di sviluppo locale; (2) Coinvolge contrattualmente i fornitori e subappaltatori della filiera per elevare l’impatto congiunto sul territorio; (3) Applica procedure e indicatori strutturati per misurare e monitorare periodicamente l’efficacia reale degli investimenti comunitari erogati.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/disciplinare-coinvolgimento-filiera-metriche.pdf',
    verified: true,
  },
  {
    id: 'lsv-6',
    category: 'Promozione di Sistema & Public Policy',
    title: '6. Promuovere la creazione del Local Shared Value',
    description: 'Esamina la capacità dell’impresa di fare rete con gli attori del settore e gli stakeholder per elevare gli standard di impatto e generazione di valore nelle comunità locali.',
    question: 'Tra le seguenti azioni, quali sono state implementate dall’azienda insieme agli stakeholder (inclusa la concorrenza) per migliorare le pratiche e gli impatti generati nella Comunità Locale?',
    options: [
      'L’azienda lavora insieme ad altri attori del settore per promuovere interventi che migliorano gli standard sulla generazione del valore nelle Comunità locali.',
      'L’azienda ha fornito dati o ha contribuito alla conduzione di indagini accademiche su questioni inerenti la misurazione dell’impatto economico e sociale delle Comunità Locali.',
      'L’azienda partecipa in tavoli di discussione e altri dialoghi pubblici sulle public policy riguardanti le questioni della Comunità Locale.',
      'L’azienda offre pubblicamente risorse utili per aiutare le altre compagnie o stakeholder a migliorare il proprio sviluppo sociale o ambientale.'
    ],
    selectedOptions: [
      'L’azienda lavora insieme ad altri attori del settore per promuovere interventi che migliorano gli standard sulla generazione del valore nelle Comunità locali.',
      'L’azienda ha fornito dati o ha contribuito alla conduzione di indagini accademiche su questioni inerenti la misurazione dell’impatto economico e sociale delle Comunità Locali.',
      'L’azienda partecipa in tavoli di discussione e altri dialoghi pubblici sulle public policy riguardanti le questioni della Comunità Locale.',
      'L’azienda offre pubblicamente risorse utili per aiutare le altre compagnie o stakeholder a migliorare il proprio sviluppo sociale o ambientale.'
    ],
    answer: 'Sul piano della promozione di sistema, l’azienda: (1) Collabora attivamente con altri operatori e concorrenti di settore per promuovere standard elevati di valore condiviso nelle Comunità locali; (2) Fornisce dati certificati e contribuisce a indagini e studi accademici sulla misurazione dell’impatto socio-economico territoriale; (3) Partecipa a tavoli di confronto istituzionale sulle public policy per la rigenerazione delle aree interne e cratere sisma; (4) Condivide pubblicamente modelli operativi, strumenti e risorse per supportare le altre imprese e la filiera nell’avanzamento sociale e ambientale.',
    documentUrl: 'https://docs.sibillini-impact.org/evidenze/ponte-vallone/protocollo-diffusione-public-policy.pdf',
    verified: true,
  },
];

export function editorialPublicPath(content) {
  if (content.type === 'LOCAL_SHARED_VALUE') {
    return `/shared-value/${content.slug}`;
  }
  return `/${content.type === 'CASE_HISTORY' ? 'case-history' : 'best-practice'}/${content.slug}`;
}

