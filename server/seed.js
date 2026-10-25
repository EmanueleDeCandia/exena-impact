import { createArea3Seed } from './area3Seed.js';
import { createArea4Seed } from './area4Seed.js';
import { createArea5Seed } from './area5Seed.js';

export function createSeed() {
  const demoLogoSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><rect width="160" height="90" fill="#ffffff"/><path d="M18 65 42 20l24 45H18Zm42 0 24-45 24 45H60Z" fill="#1947e5"/><text x="96" y="69" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#111111">GC</text></svg>';
  const demoLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(demoLogoSvg).toString('base64')}`;
  return {
    meta: {
      schemaVersion: 5,
      demo: true,
      notice: 'Dati sintetici per validazione funzionale. Non utilizzare per reporting, revisione o finalità legali.',
      updatedAt: '2026-10-23T09:00:00.000Z',
    },
    organization: {
      id: 'org-gc-demo',
      name: 'General Contractor Demo S.p.A.',
      role: 'ORG_ADMIN',
      siteIds: ['site-ponte-demo', 'site-borgo-demo'],
    },
    sites: [
      { id: 'site-ponte-demo', name: 'Ponte Vallone', code: 'CANT-DEMO-01', municipality: 'Comune Demo — Area Sisma' },
      { id: 'site-borgo-demo', name: 'Rigenerazione Borgo Alto', code: 'CANT-DEMO-02', municipality: 'Borgo Demo — Sibillini' },
    ],
    scopeDatasets: [
      {
        id: 'DS-ECO-2026-21',
        productModel: 'Exena Eco S3S — modello demo',
        lot: 'LOT-DEMO-A',
        version: '2.1',
        status: 'VERIFIED',
        unit: '1 paio di calzature',
        carbonFootprintKg: 18.6,
        conventionalFootprintKg: 22.85,
        avoidedKg: 4.25,
        referenceYear: 2026,
        methodology: 'ISO 14040/14044 — dataset dimostrativo',
        boundary: 'Cradle-to-grave — perimetro dimostrativo',
        source: 'LCA-DEMO-2026-V2.1',
        reviewedBy: 'Startup garante — revisore demo',
        updatedAt: '2026-10-18T10:30:00.000Z',
        contentHash: 'demo-hash-21-7ab9f2',
        factors: [
          { stage: 'Materiali', kgCo2e: 9.4 },
          { stage: 'Produzione', kgCo2e: 5.1 },
          { stage: 'Logistica', kgCo2e: 1.7 },
          { stage: 'Packaging', kgCo2e: 0.8 },
          { stage: 'Fine vita', kgCo2e: 1.6 },
        ],
      },
      {
        id: 'DS-ECO-2026-20',
        productModel: 'Exena Eco S3S — modello demo',
        lot: 'LOT-DEMO-A',
        version: '2.0',
        status: 'SUPERSEDED',
        unit: '1 paio di calzature',
        carbonFootprintKg: 18.95,
        conventionalFootprintKg: 23.2,
        avoidedKg: 4.25,
        referenceYear: 2026,
        methodology: 'ISO 14040/14044 — dataset dimostrativo',
        boundary: 'Cradle-to-grave — perimetro dimostrativo',
        source: 'LCA-DEMO-2026-V2.0',
        reviewedBy: 'Startup garante — revisore demo',
        updatedAt: '2026-09-28T14:00:00.000Z',
        contentHash: 'demo-hash-20-19c4a1',
        factors: [
          { stage: 'Materiali', kgCo2e: 9.65 },
          { stage: 'Produzione', kgCo2e: 5.1 },
          { stage: 'Logistica', kgCo2e: 1.75 },
          { stage: 'Packaging', kgCo2e: 0.8 },
          { stage: 'Fine vita', kgCo2e: 1.65 },
        ],
      },
    ],
    orders: [
      { id: 'ORD-DEMO-0142', organizationId: 'org-gc-demo', organizationName: 'General Contractor Demo S.p.A.', siteId: 'site-ponte-demo', pairs: 200, totalCents: 1500000, devolutionRate: 30, status: 'CONFIRMED', confirmedAt: '2026-10-12T09:00:00.000Z' },
      { id: 'ORD-DEMO-0118', organizationId: 'org-gc-demo', organizationName: 'General Contractor Demo S.p.A.', siteId: 'site-ponte-demo', pairs: 80, totalCents: 600000, devolutionRate: 30, status: 'CONFIRMED', confirmedAt: '2026-09-21T11:00:00.000Z' },
      { id: 'ORD-DEMO-0097', organizationId: 'org-sub-demo', organizationName: 'Subappaltatore Alpi Demo S.r.l.', siteId: 'site-ponte-demo', pairs: 40, totalCents: 300000, devolutionRate: 30, status: 'CONFIRMED', confirmedAt: '2026-09-18T15:30:00.000Z' },
      { id: 'ORD-DEMO-0088', organizationId: 'org-gc-demo', organizationName: 'General Contractor Demo S.p.A.', siteId: 'site-borgo-demo', pairs: 25, totalCents: 187500, devolutionRate: 30, status: 'CONFIRMED', confirmedAt: '2026-08-30T08:45:00.000Z' },
    ],
    attestations: [
      {
        id: 'ATT-DEMO-0142', orderId: 'ORD-DEMO-0142', pairs: 200, totalCents: 1500000, fundCents: 450000,
        status: 'VERIFIED', publicToken: 'demo_fund_7f9ab42c81e64d3aa10f76c24e98bd01', transferReference: 'Bonifico •••• 4521', transferredAt: '2026-10-14T10:00:00.000Z',
        verifiedBy: 'Startup garante — revisore demo', version: 1,
        auditTrail: [
          { at: '2026-10-12T09:00:00.000Z', actor: 'Sistema ordini', event: 'Ordine confermato e quota calcolata' },
          { at: '2026-10-14T10:00:00.000Z', actor: 'Tesoreria demo', event: 'Versamento registrato con riferimento mascherato' },
          { at: '2026-10-15T12:00:00.000Z', actor: 'Startup garante — revisore demo', event: 'Riconciliazione e verifica completate' },
        ],
      },
      {
        id: 'ATT-DEMO-0118', orderId: 'ORD-DEMO-0118', pairs: 80, totalCents: 600000, fundCents: 180000,
        status: 'PENDING_REVIEW', publicToken: 'demo_fund_2c68f14a9de74271b83f506ad9c37e55', transferReference: 'Bonifico •••• 4470', transferredAt: '2026-09-24T10:00:00.000Z',
        verifiedBy: null, version: 1,
        auditTrail: [
          { at: '2026-09-21T11:00:00.000Z', actor: 'Sistema ordini', event: 'Ordine confermato e quota calcolata' },
          { at: '2026-09-24T10:00:00.000Z', actor: 'Tesoreria demo', event: 'Versamento registrato; verifica in attesa' },
        ],
      },
    ],
    evidenceDocuments: [
      { id: 'EV-LCA-001', type: 'LCA_DATASET', title: 'Dataset LCA modello demo v2.1', status: 'VERIFIED', version: '2.1', updatedAt: '2026-10-18T10:30:00.000Z', sourceId: 'DS-ECO-2026-21' },
      { id: 'EV-BANK-0142', type: 'BANK_RECEIPT', title: 'Giustificativo versamento ORD-DEMO-0142', status: 'VERIFIED', version: '1.0', updatedAt: '2026-10-14T10:00:00.000Z', sourceId: 'ATT-DEMO-0142' },
      { id: 'EV-AUDIT-0142', type: 'AUDIT_TRAIL', title: 'Audit trail devoluzione ORD-DEMO-0142', status: 'VERIFIED', version: '1.0', updatedAt: '2026-10-15T12:00:00.000Z', sourceId: 'ATT-DEMO-0142' },
      { id: 'EV-EF-001', type: 'EMISSION_FACTORS', title: 'Fattori di emissione modello demo', status: 'VERIFIED', version: '2.1', updatedAt: '2026-10-18T10:30:00.000Z', sourceId: 'DS-ECO-2026-21' },
      { id: 'EV-SOCIAL-001', type: 'SOCIAL_REPORT', title: 'Sintesi impatto sociale Area Sisma — demo', status: 'VERIFIED', version: '1.0', updatedAt: '2026-10-16T09:00:00.000Z', sourceId: 'REP-DEMO-001' },
      { id: 'EV-PROC-001', type: 'PROCUREMENT_POLICY', title: 'Protocollo acquisti sostenibili — demo', status: 'VERIFIED', version: '1.2', updatedAt: '2026-10-01T09:00:00.000Z', sourceId: null },
      { id: 'EV-CPT-001', type: 'CPT_STATEMENT', title: 'Relazione benessere e sicurezza lavoratori — demo', status: 'VERIFIED', version: '1.0', updatedAt: '2026-10-10T09:00:00.000Z', sourceId: null },
      { id: 'EV-MGMT-001', type: 'MANAGEMENT_REPRESENTATION', title: 'Dichiarazione del management — demo', status: 'VERIFIED', version: '1.0', updatedAt: '2026-10-17T09:00:00.000Z', sourceId: null },
    ],
    reports: [
      {
        id: 'REP-DEMO-001', template: 'AREA_SISMA', title: 'Rendicontazione di Impatto Sociale — Area Sisma',
        siteId: null, period: { from: '2026-08-01', to: '2026-10-23' }, narrative: 'Sintesi dimostrativa del contributo della fornitura alla rigenerazione delle comunità interne.',
        status: 'VERIFIED', version: 1, createdAt: '2026-10-16T09:00:00.000Z', updatedAt: '2026-10-16T09:00:00.000Z', reviewNote: 'Bozza verificata in ambiente demo.',
        evidenceIds: ['EV-LCA-001', 'EV-BANK-0142', 'EV-AUDIT-0142'],
        metrics: { pairs: 345, totalCents: 2587500, fundCents: 776250, interventions: 3, orderIds: ['ORD-DEMO-0142', 'ORD-DEMO-0118', 'ORD-DEMO-0097', 'ORD-DEMO-0088'], organizationIds: ['org-gc-demo', 'org-sub-demo'] },
      },
    ],
    packs: [
      {
        id: 'PACK-BANK-001', type: 'BANK', title: 'Pacchetto Rating ESG Bancario — demo', status: 'DRAFT', version: 1,
        createdAt: '2026-10-19T09:00:00.000Z', updatedAt: '2026-10-19T09:00:00.000Z', reviewNote: null,
        items: [
          { id: 'bank-lca', label: 'Sintesi LCA e Carbon Footprint', evidenceId: 'EV-LCA-001', required: true },
          { id: 'bank-fund', label: 'Attestazione e giustificativo del Fondo', evidenceId: 'EV-BANK-0142', required: true },
          { id: 'bank-social', label: 'Sintesi impatto sociale', evidenceId: 'EV-SOCIAL-001', required: true },
          { id: 'bank-policy', label: 'Protocollo di approvvigionamento sostenibile', evidenceId: null, required: true },
        ],
      },
      {
        id: 'PACK-ASSUR-001', type: 'ASSURANCE', title: 'Fascicolo Ready for Assurance — demo', status: 'VERIFIED', version: 2,
        createdAt: '2026-10-17T09:00:00.000Z', updatedAt: '2026-10-20T09:00:00.000Z', reviewNote: 'Completezza formale verificata in ambiente demo; non costituisce attestazione CSRD.',
        items: [
          { id: 'ass-receipt', label: 'Pezze giustificative bancarie', evidenceId: 'EV-BANK-0142', required: true },
          { id: 'ass-trail', label: 'Audit trail delle devoluzioni', evidenceId: 'EV-AUDIT-0142', required: true },
          { id: 'ass-factors', label: 'Fattori di emissione della calzatura', evidenceId: 'EV-EF-001', required: true },
          { id: 'ass-lca', label: 'Dataset LCA versionato', evidenceId: 'EV-LCA-001', required: true },
          { id: 'ass-management', label: 'Dichiarazione del management', evidenceId: 'EV-MGMT-001', required: true },
        ],
      },
    ],
    brandAssets: [
      { id: 'LOGO-GC-DEMO', organizationId: 'org-gc-demo', originalName: 'logo-general-contractor-demo.svg', mime: 'image/svg+xml', dataUrl: demoLogoDataUrl, createdAt: '2026-10-20T09:00:00.000Z', status: 'APPROVED_DEMO' },
    ],
    brandTextVersions: [
      { id: 'TXT-DEMO-10', version: '1.0', status: 'APPROVED_DEMO', text: 'Una fornitura DPI collegata a dati ESG, rendicontazione di filiera e rigenerazione delle aree interne. Contenuto e dati dimostrativi.', approvedBy: 'Redazione Startup — demo', approvedAt: '2026-10-20T09:00:00.000Z' },
      { id: 'TXT-DEMO-11', version: '1.1', status: 'APPROVED_DEMO', text: 'Dalla calzatura tecnica a un percorso documentale condiviso con imprese, cantieri e comunità. Asset generato in ambiente demo.', approvedBy: 'Redazione Startup — demo', approvedAt: '2026-10-21T09:00:00.000Z' },
    ],
    brandGenerations: [],
    brandInvitations: [],
    editorialContents: [
      {
        id: 'EDI-DEMO-CASE-01', type: 'CASE_HISTORY', title: 'Quando la fornitura DPI diventa un’infrastruttura di dati per il cantiere',
        slug: 'fornitura-dpi-infrastruttura-dati-cantiere-demo', excerpt: 'Una case history interamente dimostrativa sul collegamento tra fabbisogno tecnico, dati di filiera e rendicontazione territoriale.',
        metaDescription: 'Case history demo: fornitura DPI, dati ESG e rendicontazione di cantiere in un percorso tracciato dalla Startup garante.',
        image: '/images/hero-worker.jpg', imageAlt: 'Responsabile della sicurezza in un cantiere infrastrutturale tra i monti Sibillini',
        sections: [
          { heading: 'Il punto di partenza', text: 'Nel progetto dimostrativo di Ponte Vallone, il General Contractor parte da un fabbisogno concreto: 200 paia di calzature e la necessità di tenere insieme consegna, dati ambientali e documentazione della commessa.' },
          { heading: 'Dal dato alla relazione di filiera', text: 'Il dataset LCA v2.1 e l’attestazione della devoluzione del 30% sono collegati alla stessa fornitura. Ogni valore numerico di questa pagina deriva dai dati sintetici associati in calce e non descrive una commessa reale.' },
          { heading: 'Un risultato da verificare, non da celebrare', text: 'Il valore editoriale sta nel percorso di controllo: versioni, fonti e revisioni rendono il racconto verificabile. La redazione della Startup conserva il proprio giudizio indipendente; l’impresa verifica i fatti che la riguardano.' },
        ],
        linkedData: { siteId: 'site-ponte-demo', datasetId: 'DS-ECO-2026-21', attestationId: 'ATT-DEMO-0142', reportId: 'REP-DEMO-001' },
        status: 'PUBLISHED', version: 2, author: 'Redazione Startup — demo', factualApprovedVersion: 2,
        createdAt: '2026-10-18T09:00:00.000Z', updatedAt: '2026-10-21T09:00:00.000Z', publishedAt: '2026-10-21T09:00:00.000Z', archivedAt: null,
        previousVersions: [{ version: 1, title: 'La fornitura DPI come infrastruttura di dati', updatedAt: '2026-10-18T09:00:00.000Z' }],
        reviewEvents: [
          { at: '2026-10-20T09:00:00.000Z', actor: 'Impresa — verifica fatti demo', event: 'Fatti e riferimenti numerici approvati in ambiente demo' },
          { at: '2026-10-21T09:00:00.000Z', actor: 'Redazione Startup — demo', event: 'Revisione editoriale finale e pubblicazione demo' },
        ],
        corrections: [],
      },
      {
        id: 'EDI-DEMO-BEST-01', type: 'BEST_PRACTICE', title: 'Dal fascicolo di consegna alla rendicontazione continua',
        slug: 'dal-fascicolo-consegna-rendicontazione-continua-demo', excerpt: 'Bozza demo di una Executive Page sul passaggio da documenti isolati a un percorso di evidenze condivise.',
        metaDescription: 'Bozza dimostrativa sulle buone pratiche di rendicontazione nella filiera DPI.',
        image: '/images/sibillini-territory.jpg', imageAlt: 'Volontari al lavoro su un sentiero vicino a un borgo montano',
        sections: [{ heading: 'La buona pratica', text: 'Bozza di analisi editoriale da completare con fonti approvate e verifica indipendente.' }],
        linkedData: { siteId: null, datasetId: 'DS-ECO-2026-21', attestationId: null, reportId: null },
        status: 'DRAFT', version: 1, author: 'Redazione Startup — demo', factualApprovedVersion: null,
        createdAt: '2026-10-22T09:00:00.000Z', updatedAt: '2026-10-22T09:00:00.000Z', publishedAt: null, archivedAt: null,
        previousVersions: [], reviewEvents: [], corrections: [],
      },
    ],
    partnerEntries: [
      {
        id: 'PAR-DEMO-001', publicSlug: 'general-contractor-demo', organizationName: 'General Contractor Demo S.p.A.', consentToPublish: true,
        municipalities: ['Comune Demo — Area Sisma'], joinedAt: '2026-10-15T09:00:00.000Z', status: 'PUBLISHED', version: 1,
        projects: [{ name: 'Ponte Vallone — progetto demo', municipality: 'Comune Demo — Area Sisma', description: 'Adozione dimostrativa di un percorso DPI collegato a dati ESG e rendicontazione di filiera.', publicEvidence: 'Attestazione Fondo verificata in ambiente demo' }],
        sourceAttestationId: 'ATT-DEMO-0142', publishedAt: '2026-10-16T09:00:00.000Z', updatedAt: '2026-10-16T09:00:00.000Z', removedAt: null,
        reviewEvents: [{ at: '2026-10-16T09:00:00.000Z', actor: 'Startup garante — revisore demo', event: 'Consenso e progetto pubblico verificati in ambiente demo' }], rectifications: [],
      },
      {
        id: 'PAR-DEMO-002', publicSlug: 'subappaltatore-alpi-demo', organizationName: 'Subappaltatore Alpi Demo S.r.l.', consentToPublish: true,
        municipalities: ['Comune Demo — Area Sisma', 'Borgo Demo — Sibillini'], joinedAt: '2026-10-18T09:00:00.000Z', status: 'PUBLISHED', version: 1,
        projects: [{ name: 'Filiera Ponte Vallone — progetto demo', municipality: 'Comune Demo — Area Sisma', description: 'Partecipazione dimostrativa alla rendicontazione unitaria del cantiere come impresa subappaltatrice.', publicEvidence: 'Relazione pubblica di filiera — demo v1.0' }],
        sourceAttestationId: null, publishedAt: '2026-10-19T09:00:00.000Z', updatedAt: '2026-10-19T09:00:00.000Z', removedAt: null,
        reviewEvents: [{ at: '2026-10-19T09:00:00.000Z', actor: 'Startup garante — revisore demo', event: 'Consenso e perimetro pubblicabile verificati in ambiente demo' }], rectifications: [],
      },
      {
        id: 'PAR-DEMO-003', publicSlug: 'impresa-bozza-demo', organizationName: 'Impresa Bozza Demo S.r.l.', consentToPublish: false,
        municipalities: ['Borgo Demo — Sibillini'], joinedAt: '2026-10-23T09:00:00.000Z', status: 'DRAFT', version: 1,
        projects: [{ name: 'Progetto da definire', municipality: 'Borgo Demo — Sibillini', description: 'Bozza non pubblica.', publicEvidence: '' }],
        sourceAttestationId: null, publishedAt: null, updatedAt: '2026-10-23T09:00:00.000Z', removedAt: null, reviewEvents: [], rectifications: [],
      },
    ],
    ...createArea3Seed(),
    ...createArea4Seed(),
    ...createArea5Seed(),
    shares: [],
    downloadEvents: [],
  };
}
