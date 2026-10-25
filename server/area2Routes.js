import express, { Router } from 'express';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { readDb, updateDb } from './store.js';
import { brandPalettes, brandTemplates, buildAssetSvg, contrastRatio, editorialPublicPath, sanitizeSvg, slugify, validateRaster } from './area2Utils.js';

export const area2Router = Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();
const cleanText = (value, max = 5000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : null;

function sendDownload(response, filename, contentType, content, attachment = true) {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `${attachment ? 'attachment' : 'inline'}; filename="${filename}"`);
  response.setHeader('X-Demo-Data', 'true');
  response.send(content);
}

/* C05 — Co-Brand Asset Studio */
function brandKitView(db) {
  return {
    meta: db.meta,
    organization: { id: db.organization.id, approvedName: db.organization.name },
    assets: db.brandAssets.filter((asset) => asset.organizationId === db.organization.id),
    textVersions: db.brandTextVersions.filter((text) => text.status === 'APPROVED_DEMO'),
    generations: db.brandGenerations.filter((generation) => generation.organizationId === db.organization.id),
    invitations: db.brandInvitations,
    templates: brandTemplates,
    palettes: Object.fromEntries(Object.entries(brandPalettes).map(([id, palette]) => [id, { ...palette, contrastRatio: contrastRatio(palette.foreground, palette.background) }])),
  };
}

function generationInput(db, body, existing = {}) {
  const template = brandTemplates[body.template] ? body.template : 'BADGE';
  const palette = brandPalettes[body.palette] ? body.palette : 'MONO';
  const audience = ['GENERAL_CONTRACTOR', 'SUBCONTRACTOR'].includes(body.audience) ? body.audience : 'GENERAL_CONTRACTOR';
  const asset = db.brandAssets.find((item) => item.id === body.logoAssetId && item.organizationId === db.organization.id);
  const textVersion = db.brandTextVersions.find((item) => item.id === body.textVersionId && item.status === 'APPROVED_DEMO');
  if (!asset) throw httpError(400, 'Seleziona un logo approvato');
  if (!textVersion) throw httpError(400, 'Seleziona una versione di testo approvata');
  const subcontractorName = audience === 'SUBCONTRACTOR' ? cleanText(body.subcontractorName, 90) : null;
  if (audience === 'SUBCONTRACTOR' && (!subcontractorName || subcontractorName.length < 2)) throw httpError(400, 'Inserisci la denominazione del subappaltatore');
  const generation = {
    ...existing,
    organizationId: db.organization.id,
    template,
    palette,
    audience,
    logoAssetId: asset.id,
    textVersionId: textVersion.id,
    subcontractorName,
  };
  return { generation, asset, textVersion };
}

function renderGeneration(db, generation) {
  const asset = db.brandAssets.find((item) => item.id === generation.logoAssetId);
  const textVersion = db.brandTextVersions.find((item) => item.id === generation.textVersionId);
  if (!asset || !textVersion) throw httpError(410, 'Logo o testo collegato non più disponibile');
  return buildAssetSvg({ generation, asset, textVersion, organizationName: db.organization.name });
}

area2Router.get('/area2/brand-kit', asyncRoute(async (request, response) => {
  response.json(brandKitView(await readDb()));
}));

area2Router.post('/area2/brand-kit/preview', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { generation } = generationInput(db, request.body ?? {});
  response.json({ svg: renderGeneration(db, generation), safeAreaPx: 56, contrastRatio: brandKitView(db).palettes[generation.palette].contrastRatio });
}));

area2Router.post('/area2/brand-kit/generations', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    if (db.brandGenerations.length >= 100) throw httpError(409, 'Archivio demo pieno: esporta e rimuovi le generazioni obsolete');
    const { generation } = generationInput(db, request.body ?? {});
    Object.assign(generation, {
      id: `GEN-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: 'GENERATED_DEMO',
      createdAt: now(),
      safeAreaPx: 56,
      contrastRatio: brandKitView(db).palettes[generation.palette].contrastRatio,
    });
    db.brandGenerations.unshift(generation);
    return generation;
  });
  response.status(201).json({ generation: result });
}));

area2Router.post('/area2/brand-kit/assets', express.raw({ type: ['image/svg+xml', 'image/png', 'image/jpeg'], limit: '2mb' }), asyncRoute(async (request, response) => {
  if (!Buffer.isBuffer(request.body) || !request.body.length) throw httpError(400, 'Carica un file SVG, PNG o JPEG non vuoto');
  const mime = String(request.headers['content-type'] || '').split(';')[0];
  let dataUrl;
  if (mime === 'image/svg+xml') {
    const clean = sanitizeSvg(request.body);
    dataUrl = `data:image/svg+xml;base64,${Buffer.from(clean).toString('base64')}`;
  } else if (['image/png', 'image/jpeg'].includes(mime)) {
    const raster = validateRaster(request.body, mime);
    dataUrl = `data:${mime};base64,${raster.toString('base64')}`;
  } else throw httpError(415, 'Formato non supportato: usa SVG, PNG o JPEG');
  const asset = await updateDb((db) => {
    if (db.brandAssets.length >= 20) throw httpError(409, 'Archivio loghi demo pieno');
    let originalName = 'logo';
    try { originalName = decodeURIComponent(String(request.headers['x-file-name'] || 'logo')).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120); } catch { /* fallback sicuro */ }
    const item = {
      id: `LOGO-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      organizationId: db.organization.id,
      originalName,
      mime,
      dataUrl,
      createdAt: now(),
      status: 'APPROVED_DEMO',
    };
    db.brandAssets.push(item);
    return item;
  });
  response.status(201).json({ asset });
}));

area2Router.get('/area2/brand-kit/generations/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const generation = db.brandGenerations.find((item) => item.id === request.params.id && item.organizationId === db.organization.id);
  if (!generation) throw httpError(404, 'Generazione non trovata');
  const svg = renderGeneration(db, generation);
  const baseName = `sibillini-impact-${generation.id.toLowerCase()}`;
  if (request.query.format === 'svg') return sendDownload(response, `${baseName}.svg`, 'image/svg+xml; charset=utf-8', svg);
  if (request.query.format === 'png') {
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    return sendDownload(response, `${baseName}.png`, 'image/png', png);
  }
  throw httpError(400, 'Formato export non supportato: usa SVG o PNG');
}));

area2Router.post('/area2/brand-kit/invitations', asyncRoute(async (request, response) => {
  const invitation = await updateDb((db) => {
    const generation = db.brandGenerations.find((item) => item.id === request.body?.generationId && item.organizationId === db.organization.id);
    if (!generation) throw httpError(404, 'Generazione non trovata');
    if (generation.audience !== 'SUBCONTRACTOR') throw httpError(409, 'Crea prima un asset nella configurazione Subappaltatore');
    const token = randomUUID().replaceAll('-', '');
    const item = {
      token,
      generationId: generation.id,
      organizationId: db.organization.id,
      subcontractorName: generation.subcontractorName,
      status: 'SENT_DEMO',
      createdAt: now(),
      acceptedAt: null,
      revokedAt: null,
    };
    db.brandInvitations.push(item);
    return item;
  });
  response.status(201).json({ invitation: { ...invitation, path: `/inviti/kit/${invitation.token}` }, notice: 'Invito demo creato; nessuna email è stata inviata.' });
}));

area2Router.delete('/area2/brand-invitations/:token', asyncRoute(async (request, response) => {
  await updateDb((db) => {
    const invitation = db.brandInvitations.find((item) => item.token === request.params.token);
    if (!invitation) throw httpError(404, 'Invito non trovato');
    invitation.status = 'REVOKED';
    invitation.revokedAt = now();
    return invitation;
  });
  response.status(204).end();
}));

function activeBrandInvitation(db, token) {
  const invitation = db.brandInvitations.find((item) => item.token === token);
  if (!invitation || invitation.revokedAt) throw httpError(410, 'Invito revocato o non disponibile');
  const generation = db.brandGenerations.find((item) => item.id === invitation.generationId);
  if (!generation) throw httpError(410, 'Asset collegato non più disponibile');
  return { invitation, generation };
}

area2Router.get('/public/brand-invitations/:token', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { invitation, generation } = activeBrandInvitation(db, request.params.token);
  response.json({
    demo: true,
    status: invitation.status,
    subcontractorName: invitation.subcontractorName,
    generalContractorName: db.organization.name,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
    assetPath: `/api/public/brand-invitations/${invitation.token}/asset.svg`,
    template: generation.template,
  });
}));

area2Router.get('/public/brand-invitations/:token/asset.svg', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { generation } = activeBrandInvitation(db, request.params.token);
  response.setHeader('Cache-Control', 'no-store');
  return sendDownload(response, 'kit-filiera-demo.svg', 'image/svg+xml; charset=utf-8', renderGeneration(db, generation), false);
}));

area2Router.post('/public/brand-invitations/:token/accept', asyncRoute(async (request, response) => {
  const invitation = await updateDb((db) => {
    const { invitation } = activeBrandInvitation(db, request.params.token);
    if (invitation.status !== 'ACCEPTED_DEMO') {
      invitation.status = 'ACCEPTED_DEMO';
      invitation.acceptedAt = now();
    }
    return invitation;
  });
  response.json({ status: invitation.status, acceptedAt: invitation.acceptedAt, demo: true });
}));

/* C06 — Editorial & Executive CMS */
const editorialImages = [
  { path: '/images/hero-worker.jpg', label: 'Cantiere infrastrutturale' },
  { path: '/images/sibillini-territory.jpg', label: 'Territorio e comunità' },
  { path: '/images/performing-art-hotel.jpg', label: 'Performing Arts in hotel' },
  { path: '/images/performing-art-outdoor.jpg', label: 'Performing Arts outdoor' },
];

function editorialView(content) {
  return { ...content, publicPath: editorialPublicPath(content) };
}

function validateEditorialContent(body) {
  const title = cleanText(body.title, 180);
  const excerpt = cleanText(body.excerpt, 400);
  const metaDescription = cleanText(body.metaDescription, 180);
  const imageAlt = cleanText(body.imageAlt, 220);
  if (!title || title.length < 5) throw httpError(400, 'Titolo obbligatorio (5—180 caratteri)');
  if (!excerpt || excerpt.length < 20) throw httpError(400, 'Excerpt obbligatorio (almeno 20 caratteri)');
  if (!metaDescription || metaDescription.length < 40) throw httpError(400, 'Meta description obbligatoria (40—180 caratteri)');
  if (!editorialImages.some((image) => image.path === body.image)) throw httpError(400, 'Seleziona una delle immagini locali disponibili');
  if (!imageAlt || imageAlt.length < 10) throw httpError(400, 'Testo alternativo immagine obbligatorio');
  if (!Array.isArray(body.sections) || body.sections.length < 1 || body.sections.length > 6) throw httpError(400, 'Inserisci da 1 a 6 sezioni narrative');
  const sections = body.sections.map((section) => ({ heading: cleanText(section.heading, 120), text: cleanText(section.text, 5000) }));
  if (sections.some((section) => !section.heading || !section.text || section.text.length < 20)) throw httpError(400, 'Ogni sezione richiede titolo e testo di almeno 20 caratteri');
  const linkedData = {
    siteId: body.linkedData?.siteId || null,
    datasetId: body.linkedData?.datasetId || null,
    attestationId: body.linkedData?.attestationId || null,
    reportId: body.linkedData?.reportId || null,
  };
  return { title, excerpt, metaDescription, image: body.image, imageAlt, sections, linkedData };
}

area2Router.get('/area2/editorial', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({
    meta: db.meta,
    contents: db.editorialContents.map(editorialView),
    images: editorialImages,
    sources: {
      sites: db.sites,
      datasets: db.scopeDatasets.map((item) => ({ id: item.id, version: item.version, status: item.status, title: item.productModel })),
      attestations: db.attestations.map((item) => ({ id: item.id, status: item.status, orderId: item.orderId })),
      reports: db.reports.map((item) => ({ id: item.id, status: item.status, title: item.title })),
    },
  });
}));

area2Router.post('/area2/editorial', asyncRoute(async (request, response) => {
  const { type, title } = request.body ?? {};
  if (!['CASE_HISTORY', 'BEST_PRACTICE'].includes(type)) throw httpError(400, 'Tipologia editoriale non valida');
  if (!cleanText(title, 180) || title.trim().length < 5) throw httpError(400, 'Inserisci un titolo di almeno 5 caratteri');
  const content = await updateDb((db) => {
    const baseSlug = slugify(request.body.slug || title);
    if (!baseSlug) throw httpError(400, 'Slug non valido');
    if (db.editorialContents.some((item) => item.slug === baseSlug && item.status !== 'ARCHIVED')) throw httpError(409, 'Esiste già un contenuto attivo con questo slug');
    const item = {
      id: `EDI-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      type,
      title: title.trim(),
      slug: baseSlug,
      excerpt: 'Bozza editoriale dimostrativa da completare prima della revisione.',
      metaDescription: 'Bozza editoriale dimostrativa con metadati da completare prima della pubblicazione.',
      image: '/images/hero-worker.jpg',
      imageAlt: 'Immagine editoriale dimostrativa da descrivere in modo specifico',
      sections: [{ heading: 'Sezione da completare', text: 'Inserisci qui la narrazione editoriale e collega le fonti prima della revisione.' }],
      linkedData: { siteId: null, datasetId: null, attestationId: null, reportId: null },
      status: 'DRAFT',
      version: 1,
      author: 'Redazione Startup — demo',
      factualApprovedVersion: null,
      createdAt: now(),
      updatedAt: now(),
      publishedAt: null,
      archivedAt: null,
      previousVersions: [],
      reviewEvents: [],
      corrections: [],
    };
    db.editorialContents.unshift(item);
    return editorialView(item);
  });
  response.status(201).json({ content });
}));

area2Router.patch('/area2/editorial/:id', asyncRoute(async (request, response) => {
  const content = await updateDb((db) => {
    const item = db.editorialContents.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Contenuto non trovato');
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(item.status)) throw httpError(409, 'Il contenuto non è modificabile nello stato corrente');
    const validated = validateEditorialContent(request.body ?? {});
    if (validated.linkedData.siteId && !db.sites.some((source) => source.id === validated.linkedData.siteId)) throw httpError(400, 'Cantiere collegato non valido');
    if (validated.linkedData.datasetId && !db.scopeDatasets.some((source) => source.id === validated.linkedData.datasetId)) throw httpError(400, 'Dataset collegato non valido');
    if (validated.linkedData.attestationId && !db.attestations.some((source) => source.id === validated.linkedData.attestationId)) throw httpError(400, 'Attestazione collegata non valida');
    if (validated.linkedData.reportId && !db.reports.some((source) => source.id === validated.linkedData.reportId)) throw httpError(400, 'Report collegato non valido');
    item.previousVersions.push({ version: item.version, title: item.title, excerpt: item.excerpt, sections: structuredClone(item.sections), updatedAt: item.updatedAt });
    Object.assign(item, validated, { version: item.version + 1, updatedAt: now(), factualApprovedVersion: null });
    return editorialView(item);
  });
  response.json({ content });
}));

area2Router.post('/area2/editorial/:id/submit-factual', asyncRoute(async (request, response) => {
  const content = await updateDb((db) => {
    const item = db.editorialContents.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Contenuto non trovato');
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(item.status)) throw httpError(409, 'Il contenuto non è inviabile nello stato corrente');
    if (!Object.values(item.linkedData).some(Boolean)) throw httpError(409, 'Collega almeno una fonte prima della verifica fattuale');
    item.status = 'FACTUAL_REVIEW';
    item.reviewEvents.push({ at: now(), actor: item.author, event: 'Bozza inviata alla verifica dei fatti da parte dell’impresa' });
    item.updatedAt = now();
    return editorialView(item);
  });
  response.json({ content });
}));

function editorialReviewHandler(kind) {
  return asyncRoute(async (request, response) => {
    const { outcome, note } = request.body ?? {};
    if (!['APPROVE', 'REJECT'].includes(outcome)) throw httpError(400, 'Esito revisione non valido');
    if (!cleanText(note, 1000) || note.trim().length < 3) throw httpError(400, 'Inserisci una nota di revisione');
    const content = await updateDb((db) => {
      const item = db.editorialContents.find((entry) => entry.id === request.params.id);
      if (!item) throw httpError(404, 'Contenuto non trovato');
      const factual = kind === 'factual';
      const expected = factual ? 'FACTUAL_REVIEW' : 'EDITORIAL_REVIEW';
      if (item.status !== expected) throw httpError(409, `Il contenuto non è nella fase ${expected}`);
      if (!factual && item.factualApprovedVersion !== item.version) throw httpError(409, 'La versione corrente non ha una verifica fattuale valida');
      const actor = factual ? 'Impresa — verifica fatti demo' : 'Redazione Startup — revisione editoriale demo';
      if (outcome === 'REJECT') {
        item.status = 'CHANGES_REQUESTED';
        if (factual) item.factualApprovedVersion = null;
        item.reviewEvents.push({ at: now(), actor, event: `Integrazioni richieste: ${note.trim()}` });
      } else if (factual) {
        item.status = 'EDITORIAL_REVIEW';
        item.factualApprovedVersion = item.version;
        item.reviewEvents.push({ at: now(), actor, event: `Fatti verificati in ambiente demo: ${note.trim()}` });
      } else {
        item.status = 'PUBLISHED';
        item.publishedAt = now();
        item.reviewEvents.push({ at: now(), actor, event: `Approvazione editoriale e pubblicazione demo: ${note.trim()}` });
        if (item.correctionOf) {
          const parent = db.editorialContents.find((entry) => entry.id === item.correctionOf);
          if (parent) {
            parent.status = 'ARCHIVED';
            parent.archivedAt = now();
            parent.supersededBy = item.id;
            parent.reviewEvents.push({ at: now(), actor, event: `Archiviato e sostituito da ${item.id}` });
          }
        }
      }
      item.updatedAt = now();
      return editorialView(item);
    });
    response.json({ content });
  });
}

area2Router.post('/area2/editorial/:id/review-factual', editorialReviewHandler('factual'));
area2Router.post('/area2/editorial/:id/review-editorial', editorialReviewHandler('editorial'));

area2Router.post('/area2/editorial/:id/corrections', asyncRoute(async (request, response) => {
  if (!cleanText(request.body?.note, 1000) || request.body.note.trim().length < 3) throw httpError(400, 'Descrivi la correzione richiesta');
  const content = await updateDb((db) => {
    const parent = db.editorialContents.find((entry) => entry.id === request.params.id);
    if (!parent) throw httpError(404, 'Contenuto non trovato');
    if (parent.status !== 'PUBLISHED') throw httpError(409, 'Le correzioni versionate partono da un contenuto pubblicato');
    const clone = structuredClone(parent);
    clone.id = `EDI-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    clone.status = 'DRAFT';
    clone.version = parent.version + 1;
    clone.createdAt = now();
    clone.updatedAt = now();
    clone.publishedAt = null;
    clone.archivedAt = null;
    clone.factualApprovedVersion = null;
    clone.correctionOf = parent.id;
    clone.correctionNote = request.body.note.trim();
    clone.previousVersions = [...parent.previousVersions, { version: parent.version, title: parent.title, excerpt: parent.excerpt, sections: structuredClone(parent.sections), updatedAt: parent.updatedAt }];
    clone.reviewEvents = [{ at: now(), actor: 'Redazione Startup — demo', event: `Nuova versione per correzione: ${request.body.note.trim()}` }];
    clone.corrections = [...parent.corrections, { at: now(), note: request.body.note.trim(), status: 'IN_REVIEW_DEMO' }];
    db.editorialContents.unshift(clone);
    return editorialView(clone);
  });
  response.status(201).json({ content });
}));

area2Router.post('/area2/editorial/:id/archive', asyncRoute(async (request, response) => {
  if (!cleanText(request.body?.note, 1000)) throw httpError(400, 'Inserisci il motivo dell’archiviazione');
  const content = await updateDb((db) => {
    const item = db.editorialContents.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Contenuto non trovato');
    if (item.status === 'ARCHIVED') throw httpError(409, 'Contenuto già archiviato');
    item.status = 'ARCHIVED';
    item.archivedAt = now();
    item.updatedAt = now();
    item.reviewEvents.push({ at: now(), actor: 'Redazione Startup — demo', event: `Archiviazione: ${request.body.note.trim()}` });
    return editorialView(item);
  });
  response.json({ content });
}));

function publicEditorialView(db, item) {
  const site = db.sites.find((source) => source.id === item.linkedData.siteId);
  const dataset = db.scopeDatasets.find((source) => source.id === item.linkedData.datasetId);
  const attestation = db.attestations.find((source) => source.id === item.linkedData.attestationId);
  const report = db.reports.find((source) => source.id === item.linkedData.reportId);
  return {
    demo: true,
    type: item.type,
    title: item.title,
    slug: item.slug,
    excerpt: item.excerpt,
    metaDescription: item.metaDescription,
    image: item.image,
    imageAlt: item.imageAlt,
    sections: item.sections,
    version: item.version,
    author: item.author,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    canonicalPath: editorialPublicPath(item),
    corrections: item.corrections.map((correction) => ({ at: correction.at, note: correction.note })),
    sources: [
      site ? { type: 'Cantiere', label: `${site.name} · ${site.code}`, status: 'PERIMETRO COLLEGATO' } : null,
      dataset ? { type: 'Dataset', label: `${dataset.id} · versione ${dataset.version}`, status: dataset.status } : null,
      attestation ? { type: 'Attestazione', label: attestation.id, status: attestation.status, verificationPath: `/verifica/fondo/${attestation.publicToken}` } : null,
      report ? { type: 'Report', label: `${report.id} · ${report.title}`, status: report.status } : null,
    ].filter(Boolean),
  };
}

area2Router.get('/public/editorial/:type/:slug', asyncRoute(async (request, response) => {
  const type = request.params.type === 'case-history' ? 'CASE_HISTORY' : request.params.type === 'best-practice' ? 'BEST_PRACTICE' : null;
  if (!type) throw httpError(404, 'Sezione editoriale non trovata');
  const db = await readDb();
  const item = db.editorialContents.find((entry) => entry.type === type && entry.slug === request.params.slug && entry.status === 'PUBLISHED');
  if (!item) {
    const archived = db.editorialContents.some((entry) => entry.type === type && entry.slug === request.params.slug && entry.status === 'ARCHIVED');
    throw httpError(archived ? 410 : 404, archived ? 'Contenuto archiviato o sostituito da una nuova versione' : 'Contenuto non trovato o non pubblicato');
  }
  response.json(publicEditorialView(db, item));
}));

/* C07 — Public Partner Registry */
function publicPartnerView(item) {
  return {
    demo: true,
    slug: item.publicSlug,
    organizationName: item.organizationName,
    municipalities: item.municipalities,
    joinedAt: item.joinedAt,
    status: 'VERIFIED_DEMO',
    projects: item.projects,
    updatedAt: item.updatedAt,
    rectifications: item.rectifications.map((rectification) => ({ at: rectification.at, note: rectification.note })),
    publicPath: `/partner/${item.publicSlug}`,
  };
}

function validatePartner(body) {
  const organizationName = cleanText(body.organizationName, 140);
  if (!organizationName || organizationName.length < 3) throw httpError(400, 'Denominazione organizzazione obbligatoria');
  if (!Array.isArray(body.municipalities) || body.municipalities.length < 1 || body.municipalities.length > 8) throw httpError(400, 'Inserisci da 1 a 8 municipalità');
  const municipalities = body.municipalities.map((item) => cleanText(item, 140));
  if (municipalities.some((item) => !item)) throw httpError(400, 'Municipalità non valida');
  if (!Array.isArray(body.projects) || body.projects.length < 1 || body.projects.length > 5) throw httpError(400, 'Inserisci da 1 a 5 progetti pubblici');
  const projects = body.projects.map((project) => ({
    name: cleanText(project.name, 160),
    municipality: cleanText(project.municipality, 140),
    description: cleanText(project.description, 1000),
    publicEvidence: cleanText(project.publicEvidence, 240) || '',
  }));
  if (projects.some((project) => !project.name || !project.municipality || !project.description || project.description.length < 20)) throw httpError(400, 'Ogni progetto richiede nome, municipalità e descrizione pubblica');
  return { organizationName, municipalities, projects, consentToPublish: body.consentToPublish === true };
}

area2Router.get('/area2/partners', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({ meta: db.meta, entries: db.partnerEntries, attestations: db.attestations.map((item) => ({ id: item.id, status: item.status, orderId: item.orderId })) });
}));

area2Router.post('/area2/partners', asyncRoute(async (request, response) => {
  const entry = await updateDb((db) => {
    const validated = validatePartner(request.body ?? {});
    const publicSlug = slugify(validated.organizationName);
    if (db.partnerEntries.some((item) => item.publicSlug === publicSlug && item.status !== 'REMOVED')) throw httpError(409, 'Organizzazione già presente nel registro');
    const item = {
      id: `PAR-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      publicSlug,
      ...validated,
      joinedAt: now(),
      status: 'DRAFT',
      version: 1,
      sourceAttestationId: request.body.sourceAttestationId || null,
      publishedAt: null,
      updatedAt: now(),
      removedAt: null,
      reviewEvents: [],
      rectifications: [],
      previousVersions: [],
    };
    db.partnerEntries.unshift(item);
    return item;
  });
  response.status(201).json({ entry });
}));

area2Router.patch('/area2/partners/:id', asyncRoute(async (request, response) => {
  const entry = await updateDb((db) => {
    const item = db.partnerEntries.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Organizzazione non trovata');
    if (!['DRAFT', 'REJECTED_WITH_REASON'].includes(item.status)) throw httpError(409, 'La scheda non è modificabile nello stato corrente');
    const validated = validatePartner(request.body ?? {});
    item.previousVersions ??= [];
    item.previousVersions.push({ version: item.version, organizationName: item.organizationName, municipalities: item.municipalities, projects: structuredClone(item.projects), updatedAt: item.updatedAt });
    Object.assign(item, validated, { version: item.version + 1, updatedAt: now() });
    return item;
  });
  response.json({ entry });
}));

area2Router.post('/area2/partners/:id/submit', asyncRoute(async (request, response) => {
  const entry = await updateDb((db) => {
    const item = db.partnerEntries.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Organizzazione non trovata');
    if (!['DRAFT', 'REJECTED_WITH_REASON'].includes(item.status)) throw httpError(409, 'Scheda non inviabile nello stato corrente');
    if (!item.consentToPublish) throw httpError(409, 'Il consenso alla pubblicazione è obbligatorio');
    if (item.projects.some((project) => !project.publicEvidence)) throw httpError(409, 'Ogni progetto richiede un riferimento a evidenze pubblicabili');
    item.status = 'PENDING_REVIEW';
    item.reviewEvents.push({ at: now(), actor: 'Utente demo — Marketing / ESG', event: 'Scheda inviata alla verifica della Startup' });
    item.updatedAt = now();
    return item;
  });
  response.json({ entry });
}));

area2Router.post('/area2/partners/:id/review', asyncRoute(async (request, response) => {
  const { outcome, note } = request.body ?? {};
  if (!['PUBLISHED', 'REJECTED_WITH_REASON'].includes(outcome)) throw httpError(400, 'Esito revisione non valido');
  if (!cleanText(note, 1000)) throw httpError(400, 'Nota di revisione obbligatoria');
  const entry = await updateDb((db) => {
    const item = db.partnerEntries.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Organizzazione non trovata');
    if (item.status !== 'PENDING_REVIEW') throw httpError(409, 'Scheda non in revisione');
    if (outcome === 'PUBLISHED' && (!item.consentToPublish || item.projects.some((project) => !project.publicEvidence))) throw httpError(409, 'Consenso o evidenze pubblicabili mancanti');
    item.status = outcome;
    item.publishedAt = outcome === 'PUBLISHED' ? now() : null;
    item.updatedAt = now();
    item.reviewEvents.push({ at: now(), actor: 'Startup garante — revisore demo', event: outcome === 'PUBLISHED' ? `Pubblicazione demo: ${note.trim()}` : `Integrazioni richieste: ${note.trim()}` });
    return item;
  });
  response.json({ entry });
}));

area2Router.post('/area2/partners/:id/rectifications', asyncRoute(async (request, response) => {
  if (!cleanText(request.body?.note, 1000)) throw httpError(400, 'Descrizione della rettifica obbligatoria');
  const entry = await updateDb((db) => {
    const item = db.partnerEntries.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Organizzazione non trovata');
    if (item.status !== 'PUBLISHED') throw httpError(409, 'La scheda non è pubblicata');
    const validated = validatePartner(request.body ?? {});
    if (!validated.consentToPublish) throw httpError(409, 'Non puoi rimuovere il consenso con una rettifica: usa la procedura di rimozione');
    item.previousVersions ??= [];
    item.previousVersions.push({ version: item.version, organizationName: item.organizationName, municipalities: item.municipalities, projects: structuredClone(item.projects), updatedAt: item.updatedAt });
    Object.assign(item, validated);
    item.rectifications.push({ id: randomUUID(), at: now(), note: request.body.note.trim(), actor: 'Startup garante — rettifica demo' });
    item.reviewEvents.push({ at: now(), actor: 'Startup garante — rettifica demo', event: `Rettifica pubblica registrata: ${request.body.note.trim()}` });
    item.version += 1;
    item.updatedAt = now();
    return item;
  });
  response.json({ entry });
}));

area2Router.post('/area2/partners/:id/remove', asyncRoute(async (request, response) => {
  if (!cleanText(request.body?.note, 1000)) throw httpError(400, 'Motivo della rimozione obbligatorio');
  const entry = await updateDb((db) => {
    const item = db.partnerEntries.find((candidate) => candidate.id === request.params.id);
    if (!item) throw httpError(404, 'Organizzazione non trovata');
    if (item.status !== 'PUBLISHED') throw httpError(409, 'Solo una scheda pubblicata può essere rimossa dal registro pubblico');
    item.status = 'REMOVED';
    item.consentToPublish = false;
    item.removedAt = now();
    item.updatedAt = now();
    item.reviewEvents.push({ at: now(), actor: 'Startup garante — demo', event: `Rimozione dal registro pubblico: ${request.body.note.trim()}` });
    return item;
  });
  response.json({ entry });
}));

area2Router.get('/public/partners/export.csv', asyncRoute(async (request, response) => {
  const db = await readDb();
  const published = db.partnerEntries.filter((item) => item.status === 'PUBLISHED' && item.consentToPublish && !item.removedAt);
  const rows = [['ambiente', 'organizzazione', 'municipalita', 'progetti', 'data_iscrizione', 'stato', 'ultimo_aggiornamento']];
  for (const entry of published) rows.push(['demo — dati sintetici', entry.organizationName, entry.municipalities.join(' | '), entry.projects.map((project) => project.name).join(' | '), entry.joinedAt, 'VERIFIED_DEMO', entry.updatedAt]);
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
  return sendDownload(response, 'registro-partner-demo.csv', 'text/csv; charset=utf-8', `\uFEFF${csv}`);
}));

area2Router.get('/public/partners', asyncRoute(async (request, response) => {
  const db = await readDb();
  const entries = db.partnerEntries.filter((item) => item.status === 'PUBLISHED' && item.consentToPublish && !item.removedAt).map(publicPartnerView);
  response.json({ demo: true, notice: db.meta.notice, entries, updatedAt: db.meta.updatedAt });
}));

area2Router.get('/public/partners/:slug', asyncRoute(async (request, response) => {
  const db = await readDb();
  const item = db.partnerEntries.find((entry) => entry.publicSlug === request.params.slug && entry.status === 'PUBLISHED' && entry.consentToPublish && !entry.removedAt);
  if (!item) {
    const removed = db.partnerEntries.some((entry) => entry.publicSlug === request.params.slug && entry.status === 'REMOVED');
    throw httpError(removed ? 410 : 404, removed ? 'Scheda rimossa dal registro pubblico' : 'Organizzazione non trovata o non pubblicata');
  }
  response.json(publicPartnerView(item));
}));
