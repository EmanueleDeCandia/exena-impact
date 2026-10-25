import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, resetDb, updateDb } from './store.js';
import { aggregateOrders, calculateFundCents, computePackCompleteness, finalizeOrderSummary, isShareActive, reconcileAttestation } from './calculations.js';
import { createDigitalDocument, createZip, formatDate, formatMoney } from './documents.js';

export const area1Router = Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();

const checklistTypeRequirements = {
  'bank-lca': 'LCA_DATASET',
  'bank-fund': 'BANK_RECEIPT',
  'bank-social': 'SOCIAL_REPORT',
  'bank-policy': 'PROCUREMENT_POLICY',
  'ass-receipt': 'BANK_RECEIPT',
  'ass-trail': 'AUDIT_TRAIL',
  'ass-factors': 'EMISSION_FACTORS',
  'ass-lca': 'LCA_DATASET',
  'ass-management': 'MANAGEMENT_REPRESENTATION',
};

const templateDefinitions = {
  AREA_SISMA: { title: 'Rendicontazione di Impatto Sociale — Area Sisma', description: 'Contributo dell’impresa alla rigenerazione dei borghi interni.', requiresSite: false, targetProfile: 'ALL' },
  CSR_BILANCIO: { title: 'Bilancio di Sostenibilità & Fornitori Sostenibili', description: 'Rendicontazione ESG aziendale integrata con ordini degli stabilimenti e fornitori di filiera.', requiresSite: true, targetProfile: 'CSR_ORIENTED' },
  CANTIERE_INTEGRATO: { title: 'Cantiere Etico Integrato — Report General Contractor', description: 'Aggregazione della commessa e dei subappaltatori sullo stesso cantiere.', requiresSite: true, targetProfile: 'CONSTRUCTION' },
  CPT: { title: 'Attestazione di Trasparenza — Enti Paritetici e Casse Edili', description: 'Relazione digitale per benessere, sicurezza e sostenibilità dei lavoratori.', requiresSite: false, targetProfile: 'CONSTRUCTION' },
  STAKEHOLDER_SUMMARY: { title: 'Sintesi Monografica d’Impatto per Stakeholder', description: 'Executive summary digitale entro due pagine.', requiresSite: false, targetProfile: 'ALL' },
};

function attestationView(db, attestation) {
  const order = db.orders.find((item) => item.id === attestation.orderId);
  const site = db.sites.find((item) => item.id === order?.siteId);
  return {
    ...attestation,
    order: order ? { id: order.id, organizationName: order.organizationName, siteId: order.siteId, pairs: order.pairs, totalCents: order.totalCents, confirmedAt: order.confirmedAt, devolutionRate: order.devolutionRate } : null,
    siteName: site?.name ?? '—',
    reconciliation: order ? reconcileAttestation(attestation, order) : { valid: false },
  };
}

function packView(db, pack) {
  const completeness = computePackCompleteness(pack, db.evidenceDocuments);
  return {
    ...pack,
    ...completeness,
    shares: db.shares.filter((share) => share.packId === pack.id),
  };
}

function reportMetrics(db, siteId, organizationId) {
  return finalizeOrderSummary(aggregateOrders(db.orders, {
    siteId: siteId || undefined,
    organizationId: organizationId || undefined,
  }));
}

function sendDownload(response, filename, contentType, content) {
  response.setHeader('Content-Type', contentType);
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('X-Demo-Data', 'true');
  response.send(content);
}

area1Router.get('/area1/bootstrap', asyncRoute(async (request, response) => {
  const db = await readDb();
  const currentOrgId = db.organization?.id;
  const orgSites = (db.sites || []).filter((s) => !s.organizationId || s.organizationId === currentOrgId);
  response.json({
    meta: db.meta,
    organizations: db.organizations || [db.organization],
    organization: db.organization,
    sites: orgSites,
    allSites: db.sites,
    counts: {
      datasets: db.scopeDatasets.length,
      verifiedAttestations: db.attestations.filter((item) => item.status === 'VERIFIED').length,
      reports: db.reports.length,
      packs: db.packs.length,
    },
  });
}));

area1Router.post('/area1/organization/switch', asyncRoute(async (request, response) => {
  const { organizationId } = request.body ?? {};
  if (!organizationId) throw httpError(400, 'organizationId obbligatorio');
  const org = await updateDb((db) => {
    const target = (db.organizations || []).find((item) => item.id === organizationId);
    if (!target) throw httpError(404, 'Organizzazione non trovata');
    db.organization = target;
    return target;
  });
  response.json({ success: true, organization: org });
}));

area1Router.post('/area1/reset', asyncRoute(async (request, response) => {
  const seed = await resetDb();
  response.json({ success: true, message: 'Dati ripristinati al seed iniziale', meta: seed.meta });
}));

area1Router.get('/area1/scope3', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({ meta: db.meta, datasets: db.scopeDatasets, downloads: db.downloadEvents ?? [] });
}));

area1Router.get('/area1/scope3/:id', asyncRoute(async (request, response) => {
  const db = await readDb();
  const dataset = db.scopeDatasets.find((item) => item.id === request.params.id);
  if (!dataset) throw httpError(404, 'Dataset non trovato');
  response.json({ meta: db.meta, dataset });
}));

area1Router.get('/area1/scope3/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const dataset = db.scopeDatasets.find((item) => item.id === request.params.id);
  if (!dataset) throw httpError(404, 'Dataset non trovato');
  const format = request.query.format ?? 'json';
  if (!['json', 'csv', 'pdf'].includes(format)) throw httpError(400, 'Formato export non supportato');
  await updateDb((current) => {
    current.downloadEvents ??= [];
    current.downloadEvents.unshift({
      id: randomUUID(),
      datasetId: dataset.id,
      datasetVersion: dataset.version,
      format,
      at: now(),
      actor: 'Utente demo — ESG Manager',
    });
  });
  const baseName = `scope-3-${dataset.id.toLowerCase()}`;
  if (format === 'json') {
    return sendDownload(response, `${baseName}.json`, 'application/json; charset=utf-8', JSON.stringify({ demo: true, dataset }, null, 2));
  }
  if (format === 'csv') {
    const rows = [
      ['campo', 'valore'],
      ['demo', 'true — dati sintetici'],
      ['modello', dataset.productModel],
      ['lotto', dataset.lot],
      ['versione', dataset.version],
      ['unita', dataset.unit],
      ['impronta_kgCO2e', dataset.carbonFootprintKg],
      ['riferimento_kgCO2e', dataset.conventionalFootprintKg],
      ['metodologia', dataset.methodology],
      ...dataset.factors.map((factor) => [`fase_${factor.stage}`, factor.kgCo2e]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
    return sendDownload(response, `${baseName}.csv`, 'text/csv; charset=utf-8', `\uFEFF${csv}`);
  }
  if (format === 'pdf') {
    const pdf = await createDigitalDocument({
      title: 'Dossier Tecnico Scope 3', reference: dataset.id, status: dataset.status,
      summary: [{ label: 'Carbon Footprint', value: `${dataset.carbonFootprintKg} kgCO2e / paio` }, { label: 'Versione dataset', value: dataset.version }],
      sections: [
        { heading: 'Identita e perimetro', rows: [['Modello', dataset.productModel], ['Lotto', dataset.lot], ['Unita funzionale', dataset.unit], ['Metodologia', dataset.methodology], ['Perimetro', dataset.boundary], ['Fonte', dataset.source]] },
        { heading: 'Fattori per fase', rows: dataset.factors.map((factor) => [factor.stage, `${factor.kgCo2e} kgCO2e`]) },
        { heading: 'Nota sul risparmio illustrativo', paragraph: `Il valore ${dataset.avoidedKg} kg per paio e un parametro dimostrativo del simulatore e non sostituisce il dataset LCA ufficiale.` },
      ],
    });
    return sendDownload(response, `${baseName}.pdf`, 'application/pdf', pdf);
  }
  throw httpError(400, 'Formato export non supportato');
}));

area1Router.get('/area1/attestations', asyncRoute(async (request, response) => {
  const db = await readDb();
  const orgId = request.query.organizationId || db.organization?.id;
  const siteIds = new Set((db.sites || []).filter((s) => s.organizationId === orgId).map((s) => s.id));

  const attestations = (db.attestations || [])
    .filter((item) => {
      if (!orgId) return true;
      const order = (db.orders || []).find((o) => o.id === item.orderId);
      if (!order) return true;
      return order.organizationId === orgId || siteIds.has(order.siteId);
    })
    .map((item) => attestationView(db, item));

  response.json({ meta: db.meta, attestations });
}));

area1Router.get('/area1/attestations/:id', asyncRoute(async (request, response) => {
  const db = await readDb();
  const attestation = db.attestations.find((item) => item.id === request.params.id);
  if (!attestation) throw httpError(404, 'Attestazione non trovata');
  response.json({ meta: db.meta, attestation: attestationView(db, attestation) });
}));

area1Router.post('/area1/attestations/:id/review', asyncRoute(async (request, response) => {
  const { outcome, note } = request.body ?? {};
  if (!['VERIFIED', 'REJECTED_WITH_REASON'].includes(outcome)) throw httpError(400, 'Esito revisione non valido');
  if (typeof note !== 'string' || note.trim().length < 3) throw httpError(400, 'Inserisci una nota di revisione');
  const attestation = await updateDb((db) => {
    const item = db.attestations.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Attestazione non trovata');
    if (item.status !== 'PENDING_REVIEW') throw httpError(409, 'L’attestazione non è in attesa di revisione');
    const order = db.orders.find((entry) => entry.id === item.orderId);
    if (!order || !reconcileAttestation(item, order).valid) throw httpError(409, 'Riconciliazione non coerente: verifica bloccata');
    item.auditTrail ??= [];
    item.auditTrail.push({ at: now(), actor: 'Startup garante — revisore demo', event: outcome === 'VERIFIED' ? `Verifica demo completata: ${note.trim()}` : `Integrazioni richieste: ${note.trim()}` });
    item.status = outcome;
    item.verifiedBy = outcome === 'VERIFIED' ? 'Startup garante — revisore demo' : null;
    item.reviewNote = note.trim();
    item.reviewedAt = now();
    return attestationView(db, item);
  });
  response.json({ attestation });
}));

area1Router.get('/area1/attestations/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const source = db.attestations.find((item) => item.id === request.params.id);
  if (!source) throw httpError(404, 'Attestazione non trovata');
  const attestation = attestationView(db, source);
  const format = request.query.format ?? 'json';
  const baseName = `attestazione-${attestation.id.toLowerCase()}`;
  if (format === 'json') return sendDownload(response, `${baseName}.json`, 'application/json; charset=utf-8', JSON.stringify({ demo: true, attestation }, null, 2));
  if (format === 'pdf') {
    const pdf = await createDigitalDocument({
      title: 'Attestazione di Devoluzione Territoriale', reference: attestation.id, status: attestation.status,
      summary: [{ label: 'Fondo riconciliato', value: formatMoney(attestation.fundCents) }, { label: 'Esito riconciliazione', value: attestation.reconciliation.valid ? 'COERENTE' : 'ERRORE' }],
      sections: [
        { heading: 'Fornitura e devoluzione', rows: [['Ordine', attestation.orderId], ['Organizzazione', attestation.order?.organizationName], ['Cantiere', attestation.siteName], ['Paia', attestation.pairs], ['Totale fornitura', formatMoney(attestation.totalCents)], ['Aliquota', `${attestation.order?.devolutionRate}%`], ['Riferimento', attestation.transferReference], ['Data versamento', formatDate(attestation.transferredAt)]] },
        { heading: 'Audit trail', bullets: attestation.auditTrail.map((event) => `${formatDate(event.at)} — ${event.actor}: ${event.event}`) },
      ],
    });
    return sendDownload(response, `${baseName}.pdf`, 'application/pdf', pdf);
  }
  throw httpError(400, 'Formato export non supportato');
}));

area1Router.get('/public/fund/:token', asyncRoute(async (request, response) => {
  const db = await readDb();
  const attestation = db.attestations.find((item) => item.publicToken === request.params.token);
  if (!attestation) throw httpError(404, 'Verifica non disponibile');
  response.json({
    demo: true,
    id: attestation.id,
    status: attestation.status,
    version: attestation.version,
    transferredAt: attestation.transferredAt,
    verifiedBy: attestation.verifiedBy,
    project: 'Fondo Ricreativita Aree Interne — dato dimostrativo',
  });
}));

area1Router.get('/area1/reports', asyncRoute(async (request, response) => {
  const db = await readDb();
  const orgId = request.query.organizationId || db.organization?.id;
  const currentOrg = (db.organizations || []).find((o) => o.id === orgId) || db.organization;
  const profileType = currentOrg?.profileType || 'CONSTRUCTION';

  const orgReports = (db.reports || []).filter((rep) => {
    if (!orgId) return true;
    if (rep.organizationId && rep.organizationId !== orgId) return false;
    if (rep.metrics?.organizationIds?.length && !rep.metrics.organizationIds.includes(orgId)) return false;
    return true;
  });

  const orgSites = (db.sites || []).filter((s) => !s.organizationId || s.organizationId === orgId);

  const scopedTemplates = Object.fromEntries(
    Object.entries(templateDefinitions).filter(([_, def]) => def.targetProfile === 'ALL' || def.targetProfile === profileType)
  );

  response.json({ meta: db.meta, reports: orgReports, templates: scopedTemplates, sites: orgSites, evidenceDocuments: db.evidenceDocuments });
}));

area1Router.post('/area1/reports', asyncRoute(async (request, response) => {
  const { template, siteId = null, period, narrative = '' } = request.body ?? {};
  const definition = templateDefinitions[template];
  if (!definition) throw httpError(400, 'Template report non valido');
  if (definition.requiresSite && !siteId) throw httpError(400, 'Seleziona una sede / cantiere per questo report');
  const maxLength = template === 'STAKEHOLDER_SUMMARY' ? 900 : 3000;
  if (typeof narrative !== 'string' || narrative.length > maxLength) throw httpError(400, `Il testo deve contenere al massimo ${maxLength} caratteri`);
  const result = await updateDb((db) => {
    const currentOrgId = db.organization?.id;
    if (siteId && !db.sites.some((site) => site.id === siteId)) throw httpError(400, 'Unità operativa / cantiere non valido');
    const metrics = reportMetrics(db, siteId, currentOrgId);
    if (!metrics.orderIds.length) throw httpError(400, 'Nessun ordine confermato nel perimetro selezionato');
    const report = {
      id: `REP-DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
      template,
      title: definition.title,
      organizationId: currentOrgId,
      siteId,
      period: { from: period?.from ?? '2026-01-01', to: period?.to ?? '2026-12-31' },
      narrative: narrative.trim(),
      status: 'DRAFT',
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      reviewNote: null,
      evidenceIds: [
        'EV-LCA-001',
        'EV-BANK-0142',
        'EV-AUDIT-0142',
        ...(template === 'CPT' ? ['EV-CPT-001'] : []),
      ].filter((id) => db.evidenceDocuments.some((evidence) => evidence.id === id && evidence.status === 'VERIFIED')),
      metrics,
    };
    db.reports.unshift(report);
    return report;
  });
  response.status(201).json({ report: result });
}));

area1Router.patch('/area1/reports/:id', asyncRoute(async (request, response) => {
  const { narrative, period } = request.body ?? {};
  const report = await updateDb((db) => {
    const item = db.reports.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Report non trovato');
    if (!['DRAFT', 'REJECTED_WITH_REASON'].includes(item.status)) throw httpError(409, 'Il report non è modificabile nello stato corrente');
    const maxLength = item.template === 'STAKEHOLDER_SUMMARY' ? 900 : 3000;
    if (narrative !== undefined && (typeof narrative !== 'string' || narrative.length > maxLength)) {
      throw httpError(400, `Il testo deve contenere al massimo ${maxLength} caratteri`);
    }
    if (period && (!/^\d{4}-\d{2}-\d{2}$/.test(period.from ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(period.to ?? '') || period.from > period.to)) {
      throw httpError(400, 'Periodo non valido');
    }
    const nextNarrative = narrative === undefined ? item.narrative : narrative.trim();
    const nextPeriod = period ?? item.period;
    if (nextNarrative === item.narrative && nextPeriod.from === item.period.from && nextPeriod.to === item.period.to) return item;
    item.previousVersions ??= [];
    item.previousVersions.push({ version: item.version, narrative: item.narrative, period: item.period, status: item.status, updatedAt: item.updatedAt });
    item.narrative = nextNarrative;
    item.period = { from: nextPeriod.from, to: nextPeriod.to };
    item.version += 1;
    item.updatedAt = now();
    return item;
  });
  response.json({ report });
}));

area1Router.post('/area1/reports/:id/review', asyncRoute(async (request, response) => {
  const { outcome, note } = request.body ?? {};
  if (!['VERIFIED', 'REJECTED_WITH_REASON'].includes(outcome)) throw httpError(400, 'Esito revisione non valido');
  if (typeof note !== 'string' || note.trim().length < 3) throw httpError(400, 'Inserisci una nota di revisione');
  const report = await updateDb((db) => {
    const item = db.reports.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Report non trovato');
    if (item.status !== 'PENDING_REVIEW') throw httpError(409, 'Il report non è in attesa di revisione');
    item.reviewEvents ??= [];
    item.reviewEvents.push({ at: now(), actor: 'Startup garante — revisore demo', from: item.status, to: outcome, note: note.trim() });
    item.status = outcome;
    item.reviewNote = note.trim();
    item.reviewedBy = 'Startup garante — revisore demo';
    item.reviewedAt = now();
    item.updatedAt = now();
    return item;
  });
  response.json({ report });
}));

area1Router.post('/area1/reports/:id/submit', asyncRoute(async (request, response) => {
  const report = await updateDb((db) => {
    const item = db.reports.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Report non trovato');
    if (!['DRAFT', 'REJECTED_WITH_REASON'].includes(item.status)) throw httpError(409, 'Il report non è modificabile nello stato corrente');
    item.reviewEvents ??= [];
    item.reviewEvents.push({ at: now(), actor: 'Utente demo — ESG Manager', from: item.status, to: 'PENDING_REVIEW', note: 'Invio alla revisione Startup' });
    item.status = 'PENDING_REVIEW';
    item.reviewNote = null;
    item.updatedAt = now();
    return item;
  });
  response.json({ report });
}));

area1Router.get('/area1/reports/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const report = db.reports.find((item) => item.id === request.params.id);
  if (!report) throw httpError(404, 'Report non trovato');
  const format = request.query.format ?? 'json';
  const baseName = `report-${report.id.toLowerCase()}`;
  if (format === 'json') return sendDownload(response, `${baseName}.json`, 'application/json; charset=utf-8', JSON.stringify({ demo: true, report }, null, 2));
  if (format === 'pdf') {
    const site = db.sites.find((item) => item.id === report.siteId);
    const pdf = await createDigitalDocument({
      title: report.title, reference: report.id, status: report.status,
      summary: [{ label: 'Paia nel perimetro', value: report.metrics.pairs }, { label: 'Fondo aggregato', value: formatMoney(report.metrics.fundCents) }],
      sections: [
        { heading: 'Perimetro', rows: [['Template', report.template], ['Cantiere', site?.name ?? 'Perimetro organizzazione'], ['Periodo', `${report.period.from} — ${report.period.to}`], ['Ordini distinti', report.metrics.orderIds.length], ['Organizzazioni', report.metrics.organizationIds.length], ['Interventi finanziabili', report.metrics.interventions]] },
        { heading: 'Sintesi narrativa', paragraph: report.narrative || 'Nessuna integrazione narrativa inserita.' },
        { heading: 'Ordini collegati e deduplicati', bullets: report.metrics.orderIds },
        { heading: 'Indice delle fonti', bullets: (report.evidenceIds ?? []).map((id) => { const evidence = db.evidenceDocuments.find((item) => item.id === id); return evidence ? `${evidence.id} — ${evidence.title} — v${evidence.version} — ${evidence.status}` : id; }) },
      ],
    });
    return sendDownload(response, `${baseName}.pdf`, 'application/pdf', pdf);
  }
  throw httpError(400, 'Formato export non supportato');
}));

area1Router.get('/area1/packs', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({
    meta: db.meta,
    packs: db.packs.map((pack) => packView(db, pack)),
    evidenceDocuments: db.evidenceDocuments,
  });
}));

area1Router.post('/area1/packs/:id/evidence', asyncRoute(async (request, response) => {
  const { itemId, evidenceId } = request.body ?? {};
  const pack = await updateDb((db) => {
    const item = db.packs.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Pacchetto non trovato');
    if (item.status === 'VERIFIED') throw httpError(409, 'Un pacchetto verificato richiede una nuova versione');
    const checklistItem = item.items.find((entry) => entry.id === itemId);
    const evidence = db.evidenceDocuments.find((entry) => entry.id === evidenceId);
    if (!checklistItem || !evidence) throw httpError(400, 'Voce o evidenza non valida');
    const expectedType = checklistTypeRequirements[checklistItem.id];
    if (expectedType && evidence.type !== expectedType) throw httpError(400, `Evidenza non coerente: è richiesto il tipo ${expectedType}`);
    checklistItem.evidenceId = evidenceId;
    checklistItem.owner = 'ESG Manager demo';
    item.activity ??= [];
    item.activity.push({ at: now(), actor: 'Utente demo — ESG Manager', event: `Evidenza ${evidence.id} collegata a “${checklistItem.label}”` });
    item.status = 'DRAFT';
    item.updatedAt = now();
    item.version += 1;
    return packView(db, item);
  });
  response.json({ pack });
}));

area1Router.post('/area1/packs/:id/submit', asyncRoute(async (request, response) => {
  const pack = await updateDb((db) => {
    const item = db.packs.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Pacchetto non trovato');
    const completeness = computePackCompleteness(item, db.evidenceDocuments);
    if (!completeness.complete) throw httpError(409, 'Completa tutte le evidenze obbligatorie prima della revisione');
    if (item.status === 'VERIFIED') throw httpError(409, 'Il pacchetto è già verificato');
    item.activity ??= [];
    item.activity.push({ at: now(), actor: 'Utente demo — ESG Manager', event: 'Pacchetto inviato alla revisione Startup' });
    item.status = 'PENDING_REVIEW';
    item.updatedAt = now();
    return packView(db, item);
  });
  response.json({ pack });
}));

area1Router.post('/area1/packs/:id/review', asyncRoute(async (request, response) => {
  const { outcome, note } = request.body ?? {};
  if (!['VERIFIED', 'REJECTED_WITH_REASON'].includes(outcome)) throw httpError(400, 'Esito revisione non valido');
  if (typeof note !== 'string' || note.trim().length < 3) throw httpError(400, 'Inserisci una nota di revisione');
  const pack = await updateDb((db) => {
    const item = db.packs.find((entry) => entry.id === request.params.id);
    if (!item) throw httpError(404, 'Pacchetto non trovato');
    if (item.status !== 'PENDING_REVIEW') throw httpError(409, 'Il pacchetto non è in attesa di revisione');
    const completeness = computePackCompleteness(item, db.evidenceDocuments);
    if (!completeness.complete) throw httpError(409, 'Il pacchetto incompleto non può essere verificato');
    item.status = outcome;
    item.reviewNote = note.trim();
    item.reviewedBy = 'Startup garante — revisore demo';
    item.reviewedAt = now();
    item.activity ??= [];
    item.activity.push({ at: now(), actor: item.reviewedBy, event: outcome === 'VERIFIED' ? `Revisione demo completata: ${note.trim()}` : `Integrazioni richieste: ${note.trim()}` });
    item.updatedAt = now();
    return packView(db, item);
  });
  response.json({ pack });
}));

area1Router.post('/area1/packs/:id/share', asyncRoute(async (request, response) => {
  const share = await updateDb((db) => {
    const pack = db.packs.find((entry) => entry.id === request.params.id);
    if (!pack) throw httpError(404, 'Pacchetto non trovato');
    if (pack.status !== 'VERIFIED') throw httpError(409, 'Solo un pacchetto verificato può essere condiviso');
    const item = {
      token: randomUUID().replaceAll('-', ''),
      packId: pack.id,
      createdAt: now(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      revokedAt: null,
      viewEvents: [],
    };
    pack.activity ??= [];
    pack.activity.push({ at: now(), actor: 'Utente demo — ESG Manager', event: 'Link read-only temporaneo creato (24 ore)' });
    db.shares.push(item);
    return item;
  });
  response.status(201).json({ share: { ...share, path: `/condivisioni/evidence/${share.token}` } });
}));

area1Router.delete('/area1/shares/:token', asyncRoute(async (request, response) => {
  await updateDb((db) => {
    const share = db.shares.find((item) => item.token === request.params.token);
    if (!share) throw httpError(404, 'Link di condivisione non trovato');
    share.revokedAt = now();
    const pack = db.packs.find((item) => item.id === share.packId);
    if (pack) {
      pack.activity ??= [];
      pack.activity.push({ at: now(), actor: 'Utente demo — ESG Manager', event: 'Link read-only revocato' });
    }
    return share;
  });
  response.status(204).end();
}));

area1Router.get('/public/packs/:token', asyncRoute(async (request, response) => {
  const db = await readDb();
  const share = db.shares.find((item) => item.token === request.params.token);
  if (!share || !isShareActive(share)) throw httpError(410, 'Link scaduto o revocato');
  const pack = db.packs.find((item) => item.id === share.packId);
  if (!pack) throw httpError(404, 'Pacchetto non disponibile');
  const completeness = computePackCompleteness(pack, db.evidenceDocuments);
  response.json({
    demo: true,
    title: pack.title,
    type: pack.type,
    status: pack.status,
    organizationName: db.organization.name,
    expiresAt: share.expiresAt,
    completeItems: completeness.completeItems,
    totalItems: completeness.totalItems,
    items: completeness.items.map((item) => ({ label: item.label, complete: item.complete })),
  });
}));

area1Router.post('/public/packs/:token/view', asyncRoute(async (request, response) => {
  await updateDb((db) => {
    const share = db.shares.find((item) => item.token === request.params.token);
    if (!share || !isShareActive(share)) throw httpError(410, 'Link scaduto o revocato');
    share.viewEvents ??= [];
    share.viewEvents.push({ at: now(), channel: 'public-read-only' });
    return share;
  });
  response.status(204).end();
}));

area1Router.get('/area1/packs/:id/export', asyncRoute(async (request, response) => {
  const db = await readDb();
  const source = db.packs.find((item) => item.id === request.params.id);
  if (!source) throw httpError(404, 'Pacchetto non trovato');
  const pack = packView(db, source);
  const baseName = `evidence-pack-${pack.id.toLowerCase()}`;
  const pdf = await createDigitalDocument({
    title: pack.title, reference: pack.id, status: pack.status,
    summary: [{ label: 'Completezza evidenze', value: `${pack.completeItems}/${pack.totalItems} (${pack.percentage}%)` }],
    sections: [
      { heading: 'Checklist', rows: pack.items.map((item) => [item.label, item.complete ? `VERIFICATA — ${item.evidence.title}` : 'MANCANTE O NON VERIFICATA']) },
      { heading: 'Nota', paragraph: pack.reviewNote ?? 'Pacchetto digitale in lavorazione. La completezza formale non garantisce esito bancario o di revisione.' },
    ],
  });
  if ((request.query.format ?? 'zip') === 'pdf') return sendDownload(response, `${baseName}.pdf`, 'application/pdf', pdf);
  if (request.query.format === 'zip') {
    const manifest = { demo: true, exportedAt: now(), pack };
    const entries = [
      { name: 'LEGGIMI.txt', content: 'Pacchetto dimostrativo con dati sintetici. Non valido per reporting o revisione.\n' },
      { name: 'manifest.json', content: JSON.stringify(manifest, null, 2) },
      { name: 'indice.pdf', content: pdf },
      ...pack.items.filter((item) => item.evidence).map((item) => ({
        name: `evidenze/${item.evidence.id}.json`,
        content: JSON.stringify({ demo: true, checklistItem: item.label, evidence: item.evidence }, null, 2),
      })),
    ];
    const zip = await createZip(entries);
    return sendDownload(response, `${baseName}.zip`, 'application/zip', zip);
  }
  throw httpError(400, 'Formato export non supportato');
}));
