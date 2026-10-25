import { Router } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { readDb, updateDb } from './store.js';
import { calculateFundCents } from './calculations.js';
import { buildThresholdLedger, calculateBulkOrder, canActivateSubcontractorLink, entitlementState, logisticsReconciliation, ordersForLink, parseNeedsCsv, publicTransparencyDataset, validateItalianVatFormat, validateLogisticsNeeds } from './area5Utils.js';
import { createDigitalDocument, formatDate, formatMoney } from './documents.js';

export const area5Router = Router();
const asyncRoute = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
const httpError = (status, message, details) => Object.assign(new Error(message), { status, details });
const now = () => new Date().toISOString();
const accessToken = () => `${randomUUID().replaceAll('-', '')}${randomUUID().replaceAll('-', '')}`;
const cleanText = (value, max = 500) => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null;
const memberView = (member) => ({ id: member.id, organizationId: member.organizationId, organizationName: member.organizationName, displayName: member.displayName, role: member.role, assignedSiteIds: member.assignedSiteIds });
const privateDownload = (response, filename, type, content) => {
  response.setHeader('Content-Type', type);
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Demo-Data', 'true');
  response.send(content);
};
const publicCache = (response) => response.setHeader('Cache-Control', 'public, max-age=60');
const csvCell = (value) => {
  let text = String(value ?? '');
  if (/^[=+@]/.test(text) || /^-\D/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

function auth(db, request) {
  const header = String(request.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = db.operationsSessions.find((item) => item.token === token && new Date(item.expiresAt).getTime() > Date.now());
  const member = session && db.operationsMembers.find((item) => item.id === session.memberId && item.demoAccessEnabled);
  if (!session || !member) throw httpError(401, 'Sessione Operations assente o scaduta');
  return { session, member, organizationId: session.organizationId };
}
function requireRole(member, roles) {
  if (!roles.includes(member.role)) throw httpError(403, 'Il tuo ruolo demo non è autorizzato per questa componente');
}
function checkVersion(entity, expectedVersion) {
  if (!Number.isInteger(expectedVersion) || expectedVersion !== (entity.version || 1)) throw httpError(409, `Il dato è cambiato: versione corrente ${entity.version || 1}. Ricarica prima di continuare.`);
}
function findTenantOrder(db, id, organizationId) {
  const order = db.orders.find((item) => item.id === id && item.organizationId === organizationId);
  if (!order) throw httpError(404, 'Ordine non trovato nel tuo perimetro');
  return order;
}
function orderView(order) {
  const { idempotency, ...safe } = order;
  return { ...safe, version: order.version || 1, fundCents: calculateFundCents(order) };
}

/* Explicit demo identity broker, not production authentication. */
area5Router.get('/area5/operations/demo-accounts', asyncRoute(async (request, response) => {
  const db = await readDb();
  response.json({ demo: true, notice: 'Identità sintetiche per validare ruoli e tenant. Non è autenticazione di produzione.', accounts: db.operationsMembers.filter((item) => item.demoAccessEnabled).map(memberView) });
}));
area5Router.post('/area5/operations/session', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const member = db.operationsMembers.find((item) => item.id === request.body?.memberId && item.demoAccessEnabled);
    if (!member) throw httpError(403, 'Identità Operations demo non abilitata');
    const timestamp = now();
    const session = { token: accessToken(), memberId: member.id, organizationId: member.organizationId, createdAt: timestamp, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() };
    db.operationsSessions = db.operationsSessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now()).slice(-60);
    db.operationsSessions.push(session);
    return { token: session.token, member: memberView(member), expiresAt: session.expiresAt };
  });
  response.status(201).json({ ...result, demo: true });
}));
area5Router.post('/area5/operations/session/logout', asyncRoute(async (request, response) => {
  await updateDb((db) => {
    const { session } = auth(db, request);
    db.operationsSessions = db.operationsSessions.filter((item) => item.token !== session.token);
  });
  response.status(204).end();
}));

/* C12 — Bulk Order Portal */
area5Router.post('/area5/orders/quote', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
  try {
    const calculation = calculateBulkOrder(db.productCatalog, request.body?.items || []);
    response.json({ demo: true, quote: calculation, calculatedAt: now(), notice: 'Previsione server-side; il riepilogo viene ricalcolato anche alla conferma.' });
  } catch (error) { throw httpError(400, error.message, [{ cell: error.cell || 'items', message: error.message }]); }
}));
area5Router.get('/area5/orders', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
  const addresses = db.deliveryAddresses.filter((item) => item.organizationId === organizationId);
  const siteIds = new Set(addresses.map((item) => item.siteId));
  const sites = db.sites.filter((item) => siteIds.has(item.id));
  const orders = db.orders.filter((item) => item.organizationId === organizationId).sort((a, b) => new Date(b.submittedAt || b.confirmedAt) - new Date(a.submittedAt || a.confirmedAt)).map((item) => ({ ...orderView(item), canRectify: item.status === 'CONFIRMED' && !db.attestations.some((attestation) => attestation.orderId === item.id) && !db.logisticsPlans.some((plan) => plan.sourceOrderId === item.id) }));
  response.json({ demo: true, member: memberView(member), catalog: db.productCatalog, addresses, sites, orders, serverTime: now(), notice: 'Prezzi e devoluzione sono calcolati dal server. Il pagamento non è integrato: un invio non equivale a un pagamento.' });
}));
area5Router.post('/area5/orders', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
    const key = cleanText(request.body?.idempotencyKey, 90);
    if (!key || key.length < 8) throw httpError(400, 'Chiave idempotente assente o troppo corta');
    const address = db.deliveryAddresses.find((item) => item.id === request.body?.addressId && item.organizationId === organizationId);
    if (!address) throw httpError(400, 'Seleziona un indirizzo valido nel tuo perimetro');
    if (member.role === 'SUBCONTRACTOR') {
      const allowed = db.subcontractorLinks.some((link) => link.subcontractorOrganizationId === organizationId && link.status === 'ACTIVE' && link.siteRelations.some((relation) => relation.siteId === address.siteId && !relation.endAt));
      if (!allowed) throw httpError(403, 'Nessun cantiere attivo associato alla tua impresa');
    }
    let calculation;
    try { calculation = calculateBulkOrder(db.productCatalog, request.body?.items || []); }
    catch (error) { throw httpError(400, error.message, [{ cell: error.cell || 'items', message: error.message }]); }
    const normalizedItems = calculation.lines.map(({ productId, size, quantity }) => ({ productId, size, quantity })).sort((a, b) => `${a.productId}:${a.size}`.localeCompare(`${b.productId}:${b.size}`));
    const fingerprint = createHash('sha256').update(JSON.stringify({ organizationId, addressId: address.id, recurrence: request.body?.recurrence || 'ONE_OFF', items: normalizedItems })).digest('hex');
    const existing = db.orders.find((item) => item.organizationId === organizationId && item.idempotency?.key === key);
    if (existing) {
      if (existing.idempotency.fingerprint !== fingerprint) throw httpError(409, 'La chiave idempotente è già associata a un ordine diverso');
      return { order: orderView(existing), idempotent: true };
    }
    if (!['ONE_OFF', 'MONTHLY', 'QUARTERLY'].includes(request.body?.recurrence || 'ONE_OFF')) throw httpError(400, 'Ricorrenza non valida');
    const matchingGrantMode = ['match', 'custom'].includes(request.body?.matchingGrantMode) ? request.body.matchingGrantMode : 'none';
    const matchingGrantRate = matchingGrantMode === 'match' ? 30 : matchingGrantMode === 'custom' ? Math.min(100, Math.max(0, Number(request.body?.matchingGrantRate) || 0)) : 0;
    const exenaFundCents = Math.round(calculation.totalCents * 30 / 100);
    const matchingGrantCents = Math.round(calculation.totalCents * matchingGrantRate / 100);
    const timestamp = now();

    const order = {

      id: `BULK-${randomUUID()}`, organizationId, organizationName: member.organizationName, siteId: address.siteId,
      pairs: calculation.pairs, totalCents: calculation.totalCents, devolutionRate: 30, status: 'SUBMITTED', version: 1,
      submittedAt: timestamp, confirmedAt: null, source: 'BULK_PORTAL', items: calculation.lines,
      listTotalCents: calculation.listTotalCents, contractDiscountCents: calculation.contractDiscountCents,
      exenaFundCents, matchingGrantMode, matchingGrantRate, matchingGrantCents,
      paymentStatus: 'NOT_INTEGRATED', fulfilmentStatus: calculation.stockWarnings.length ? 'STOCK_REVIEW_REQUIRED' : 'SENT_TO_EXTERNAL_FULFILMENT',
      stockWarnings: calculation.stockWarnings, recurrence: request.body?.recurrence || 'ONE_OFF', addressSnapshot: { ...address },
      idempotency: { key, fingerprint }, rectifications: [],
      events: [{ at: timestamp, actor: member.displayName, event: `Ordine inviato: ${calculation.pairs} paia; matching grant: ${matchingGrantMode} (${matchingGrantRate}%); pagamento non integrato` }],
    };
    db.orders.push(order);
    return { order: orderView(order), idempotent: false };

  });
  response.status(result.idempotent ? 200 : 201).json({ ...result, notice: 'Ordine inviato, non pagato. Il ledger cambierà solo dopo una conferma esterna registrata.' });
}));
area5Router.post('/area5/orders/:id/rectify', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
    const order = findTenantOrder(db, request.params.id, organizationId);
    checkVersion(order, request.body?.expectedVersion);
    const reason = cleanText(request.body?.reason, 500);
    if (!reason || reason.length < 8) throw httpError(400, 'Motiva la rettifica con almeno 8 caratteri');
    if (order.status !== 'CONFIRMED') throw httpError(409, 'Solo un ordine confermato può ricevere questa rettifica demo');
    if (db.attestations.some((item) => item.orderId === order.id) || db.logisticsPlans.some((item) => item.sourceOrderId === order.id)) throw httpError(409, 'Ordine collegato ad attestazione o piano logistico: richiedi una revisione dedicata');
    const timestamp = now();
    order.status = 'RECTIFIED';
    order.version = (order.version || 1) + 1;
    order.rectifications ||= [];
    order.rectifications.push({ at: timestamp, actor: member.displayName, type: 'CANCELLATION', reason });
    order.events ||= [];
    order.events.push({ at: timestamp, actor: member.displayName, event: `Rettifica annullamento: ${reason}. Ledger ricalcolato senza cancellare lo storico.` });
    return { order: orderView(order) };
  });
  response.json(result);
}));
area5Router.get('/area5/orders/:id/receipt', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
  const order = findTenantOrder(db, request.params.id, organizationId);
  const view = orderView(order);
  if (request.query.format === 'json') return privateDownload(response, `${order.id}-ricevuta.json`, 'application/json', JSON.stringify(view, null, 2));
  const pdf = await createDigitalDocument({
    areaLabel: 'AREA 5 / C12', title: 'Ricevuta ordine bulk', reference: order.id, status: `${order.status} · DEMO`,
    summary: [{ label: 'Paia', value: order.pairs }, { label: 'Totale contrattuale', value: formatMoney(order.totalCents) }, { label: 'Devoluzione 30%', value: formatMoney(calculateFundCents(order)) }],
    sections: [
      { heading: 'Stato e significato', rows: [['Inviato il', formatDate(order.submittedAt || order.confirmedAt)], ['Pagamento', order.paymentStatus === 'NOT_INTEGRATED' ? 'Non integrato — non pagato' : order.paymentStatus || 'Non disponibile'], ['Fulfilment', order.fulfilmentStatus || 'Gestione esterna'], ['Ricorrenza', order.recurrence || 'ONE_OFF']] },
      { heading: 'Righe ordine', rows: (order.items || []).map((line) => [`${line.productName} / taglia ${line.size} / ${line.quantity} paia`, `${formatMoney(line.unitPriceCents)} cad. · ${formatMoney(line.totalCents)}`]) },
      { heading: 'Ambito', paragraph: 'Documento dimostrativo. L’invio non prova pagamento, disponibilità definitiva o consegna. La consegna delle calzature resta fulfilment esterno.' },
      { heading: 'Eventi', bullets: (order.events || []).map((event) => `${formatDate(event.at)} — ${event.event}`) },
    ],
  });
  privateDownload(response, `${order.id}-ricevuta.pdf`, 'application/pdf', pdf);
}));

/* C13 — Benefit & Threshold Dashboard */
function dashboardViews(db, member) {
  const organizationId = member.organizationId;
  const addresses = db.deliveryAddresses.filter((item) => item.organizationId === organizationId);
  const siteIds = new Set(addresses.map((item) => item.siteId));
  let definitions;
  if (member.role === 'SUBCONTRACTOR') definitions = [{ id: 'DIRECT', label: 'La tua impresa', siteId: null, includeNetwork: false }];
  else if (member.role === 'HR_WELFARE') definitions = [{ id: 'DIRECT', label: 'Benefit della tua organizzazione', siteId: null, includeNetwork: false }];
  else if (member.role === 'SITE_MANAGER') definitions = member.assignedSiteIds.map((siteId) => ({ id: `SITE:${siteId}`, label: db.sites.find((site) => site.id === siteId)?.name || siteId, siteId, includeNetwork: true }));
  else {
    definitions = [{ id: 'NETWORK', label: 'Rete General Contractor + filiera', siteId: null, includeNetwork: true }, { id: 'DIRECT', label: 'Solo General Contractor', siteId: null, includeNetwork: false }];
    for (const siteId of siteIds) definitions.push({ id: `SITE:${siteId}`, label: db.sites.find((site) => site.id === siteId)?.name || siteId, siteId, includeNetwork: true });
  }
  const entitlements = db.serviceEntitlements.filter((item) => item.organizationId === organizationId);
  return definitions.map((definition) => {
    const raw = buildThresholdLedger(db, { organizationId, includeNetwork: definition.includeNetwork, siteId: definition.siteId });
    const ledger = { pairs: raw.pairs, directPairs: raw.directPairs, networkAddedPairs: raw.networkAddedPairs, sites: raw.sites.map(({ siteId, pairs }) => ({ siteId, pairs })), progress: raw.progress };
    const services = entitlements.map((item) => {
      const state = entitlementState(item, raw.pairs);
      const requestPending = db.serviceActivationEvents.some((event) => event.organizationId === organizationId && event.entitlementId === item.id && event.type === 'ACTIVATION_REQUESTED');
      return { ...item, state, requestPending, missingPairs: Math.max(0, item.requiredPairs - raw.pairs) };
    });
    return { ...definition, ledger, services };
  });
}
area5Router.get('/area5/dashboard', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'HR_WELFARE', 'BOARD', 'SITE_MANAGER', 'SUBCONTRACTOR']);
  const views = dashboardViews(db, member);
  response.json({ demo: true, member: memberView(member), views, events: db.serviceActivationEvents.filter((item) => item.organizationId === member.organizationId).slice(-30).reverse(), serverTime: now(), notice: 'Ledger derivato da ordini confermati e deduplicati. Standard e incrementi Varianti restano separati.' });
}));
area5Router.post('/area5/dashboard/entitlements/:id/activate', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'HR_WELFARE', 'BOARD', 'SUBCONTRACTOR']);
    const entitlement = db.serviceEntitlements.find((item) => item.id === request.params.id && item.organizationId === organizationId);
    if (!entitlement) throw httpError(404, 'Entitlement non trovato');
    const view = dashboardViews(db, member).find((item) => item.id === request.body?.viewId);
    if (!view) throw httpError(403, 'Vista dashboard non consentita');
    const state = entitlementState(entitlement, view.ledger.pairs);
    if (state === 'ACTIVE') return { entitlement, idempotent: true };
    if (state !== 'AVAILABLE') throw httpError(409, `Attivazione non consentita nello stato ${state}`);
    entitlement.activationStatus = 'ACTIVE';
    const event = { id: `ACT-${randomUUID()}`, organizationId, entitlementId: entitlement.id, serviceId: entitlement.serviceId, type: 'ACTIVATED', at: now(), actor: member.displayName, viewId: view.id, note: `Servizio attivato con ${view.ledger.pairs} paia nel ledger ${view.label}` };
    db.serviceActivationEvents.push(event);
    return { entitlement, event, idempotent: false };
  });
  response.status(result.idempotent ? 200 : 201).json(result);
}));
area5Router.post('/area5/dashboard/entitlements/:id/activation-request', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'HR_WELFARE', 'BOARD', 'SUBCONTRACTOR']);
    const entitlement = db.serviceEntitlements.find((item) => item.id === request.params.id && item.organizationId === organizationId);
    if (!entitlement) throw httpError(404, 'Entitlement non trovato');
    if (entitlement.contractStatus === 'ACTIVE') throw httpError(409, 'Il servizio è già contrattualizzato');
    const existing = db.serviceActivationEvents.find((event) => event.organizationId === organizationId && event.entitlementId === entitlement.id && event.type === 'ACTIVATION_REQUESTED');
    if (existing) return { event: existing, idempotent: true };
    const event = { id: `REQ-${randomUUID()}`, organizationId, entitlementId: entitlement.id, serviceId: entitlement.serviceId, type: 'ACTIVATION_REQUESTED', at: now(), actor: member.displayName, note: 'Richiesta registrata; nessun contratto o entitlement attivato automaticamente' };
    db.serviceActivationEvents.push(event);
    return { event, idempotent: false };
  });
  response.status(result.idempotent ? 200 : 201).json(result);
}));
area5Router.get('/area5/dashboard/entitlements/:id/voucher', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'HR_WELFARE', 'BOARD', 'SUBCONTRACTOR']);
  const entitlement = db.serviceEntitlements.find((item) => item.id === request.params.id && item.organizationId === organizationId && item.voucher);
  if (!entitlement) throw httpError(404, 'Voucher non disponibile');
  const view = dashboardViews(db, member).find((item) => item.id === request.query.viewId);
  if (!view || entitlementState(entitlement, view.ledger.pairs) !== 'ACTIVE') throw httpError(409, 'Soglia o entitlement non attivo per questo voucher');
  const voucher = { demo: true, benefit: entitlement.title, organization: member.organizationName, thresholdPairs: entitlement.requiredPairs, ledgerPairs: view.ledger.pairs, view: view.label, generatedAt: now(), notice: 'Voucher dimostrativo di attivazione. Non è un biglietto, una prenotazione o una prova di ingresso; il benefit fisico resta fulfilment esterno.' };
  if (request.query.format === 'json') return privateDownload(response, `voucher-${entitlement.serviceId}.json`, 'application/json', JSON.stringify(voucher, null, 2));
  const pdf = await createDigitalDocument({ areaLabel: 'AREA 5 / C13', title: entitlement.title, reference: entitlement.id, status: 'BENEFIT FISICO · DEMO', summary: [{ label: 'Soglia', value: `${entitlement.requiredPairs} paia` }, { label: 'Ledger selezionato', value: `${view.ledger.pairs} paia` }], sections: [{ heading: 'Perimetro', rows: [['Organizzazione', member.organizationName], ['Vista', view.label], ['Generato il', formatDate(voucher.generatedAt)]] }, { heading: 'Ambito', paragraph: voucher.notice }] });
  privateDownload(response, `voucher-${entitlement.serviceId}.pdf`, 'application/pdf', pdf);
}));

/* C14 — Public Transparency Register, read-only and indexable. */
function transparencyResult(db, query) {
  const dataset = publicTransparencyDataset(db);
  const municipality = cleanText(query.municipality, 120);
  const status = cleanText(query.status, 50);
  const q = cleanText(query.q, 100)?.toLowerCase();
  const projects = dataset.projects.filter((project) => (!municipality || project.municipality === municipality) && (!status || project.operationalStatus === status) && (!q || `${project.title} ${project.village} ${project.description}`.toLowerCase().includes(q)));
  return { ...dataset, projects, visibleCount: projects.length, filters: { municipality: municipality || '', status: status || '', q: q || '' } };
}
area5Router.get('/area5/transparency', asyncRoute(async (request, response) => {
  const db = await readDb();
  publicCache(response).json({ demo: true, ...transparencyResult(db, request.query), notice: 'Dataset aggregato derivato da attestazioni C02 verificate e riconciliate. Non è in tempo reale: vale il timestamp aggiornato al.' });
}));
area5Router.get('/area5/transparency/export.csv', asyncRoute(async (request, response) => {
  const db = await readDb();
  const result = transparencyResult(db, request.query);
  const rows = [['progetto', 'borgo', 'comune', 'importo_pubblicabile_eur', 'stato', 'data_pubblicazione', 'aggiornato_al'], ...result.projects.map((project) => [project.title, project.village, project.municipality, (project.amountCents / 100).toFixed(2), project.operationalStatus, project.publicDate, project.updatedAt])];
  publicCache(response);
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', 'attachment; filename="registro-trasparenza-demo.csv"');
  response.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`);
}));
area5Router.get('/area5/transparency/projects/:slug', asyncRoute(async (request, response) => {
  const db = await readDb();
  const project = publicTransparencyDataset(db).projects.find((item) => item.slug === request.params.slug);
  if (!project) throw httpError(404, 'Progetto pubblico non trovato o non più riconciliato');
  publicCache(response).json({ demo: true, project });
}));

/* C15 — Multi-Site Logistics Planner */
function planForMember(db, id, member) {
  const plan = db.logisticsPlans.find((item) => item.id === id && item.organizationId === member.organizationId);
  if (!plan || (member.role === 'SITE_MANAGER' && !member.assignedSiteIds.includes(plan.siteId))) throw httpError(404, 'Piano logistico non trovato nei cantieri assegnati');
  return plan;
}
function planView(db, plan, member) {
  const reconciliation = logisticsReconciliation(plan, db.orders);
  return {
    ...plan,
    site: db.sites.find((item) => item.id === plan.siteId) || null,
    address: db.deliveryAddresses.find((item) => item.id === plan.addressId && item.organizationId === plan.organizationId) || null,
    manager: db.operationsMembers.find((item) => item.id === plan.managerMemberId) ? memberView(db.operationsMembers.find((item) => item.id === plan.managerMemberId)) : null,
    needs: plan.needs.map((need) => ({ ...need, productName: db.productCatalog.find((item) => item.id === need.productId)?.name || need.productId })),
    reconciliation,
    permissions: { canEdit: plan.status === 'DRAFT', canApprove: member.role === 'PROCUREMENT' && plan.status === 'VALIDATED', canAssign: member.role === 'PROCUREMENT' && ['DRAFT', 'VALIDATED'].includes(plan.status), canPlanShipment: member.role === 'PROCUREMENT' && plan.status === 'APPROVED' },
  };
}
area5Router.get('/area5/logistics', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SITE_MANAGER']);
  const plans = db.logisticsPlans.filter((plan) => plan.organizationId === organizationId && (member.role !== 'SITE_MANAGER' || member.assignedSiteIds.includes(plan.siteId))).map((plan) => planView(db, plan, member));
  response.json({ demo: true, member: memberView(member), plans, catalog: db.productCatalog, managers: db.operationsMembers.filter((item) => item.organizationId === organizationId && item.role === 'SITE_MANAGER').map(memberView), addresses: db.deliveryAddresses.filter((item) => item.organizationId === organizationId), availableOrders: db.orders.filter((item) => item.organizationId === organizationId && item.status === 'CONFIRMED' && !db.logisticsPlans.some((plan) => plan.sourceOrderId === item.id)).map((item) => ({ id: item.id, siteId: item.siteId, pairs: item.pairs, confirmedAt: item.confirmedAt })), notice: 'La spedizione è fulfilment esterno. Il portale pianifica quantità e destinazioni, non inventa tracking o consegne.' });
}));
area5Router.post('/area5/logistics/plans', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const order = db.orders.find((item) => item.id === request.body?.sourceOrderId && item.organizationId === organizationId && item.status === 'CONFIRMED');
    if (!order) throw httpError(400, 'Seleziona un ordine confermato nel tuo perimetro');
    if (db.logisticsPlans.some((plan) => plan.sourceOrderId === order.id)) throw httpError(409, 'Esiste già un piano per questo ordine');
    const address = db.deliveryAddresses.find((item) => item.id === request.body?.addressId && item.organizationId === organizationId && item.siteId === order.siteId);
    if (!address) throw httpError(400, 'Indirizzo non coerente con il cantiere dell’ordine');
    const deadlineDate = new Date(request.body?.deadlineAt);
    const fromDate = new Date(request.body?.deliveryFrom);
    const toDate = new Date(request.body?.deliveryTo);
    if (![deadlineDate, fromDate, toDate].every((date) => Number.isFinite(date.getTime()))) throw httpError(400, 'Date del piano non valide');
    const deadlineAt = deadlineDate.toISOString();
    const from = fromDate.toISOString();
    const to = toDate.toISOString();
    if (new Date(deadlineAt).getTime() <= Date.now() || new Date(from).getTime() <= Date.now() || new Date(to).getTime() <= new Date(from).getTime()) throw httpError(400, 'Scadenza e finestra consegna devono essere future e coerenti');
    const plan = { id: `LOG-${randomUUID()}`, organizationId, siteId: order.siteId, sourceOrderId: order.id, addressId: address.id, managerMemberId: null, status: 'DRAFT', version: 1, deadlineAt, deliveryWindow: { from, to }, needs: [], shipments: [], events: [{ at: now(), actor: member.displayName, event: `Piano creato da ${order.id}: ${order.pairs} paia da distribuire` }], imports: [] };
    db.logisticsPlans.push(plan);
    return { plan: planView(db, plan, member) };
  });
  response.status(201).json(result);
}));
area5Router.put('/area5/logistics/plans/:id/needs', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SITE_MANAGER']);
    const plan = planForMember(db, request.params.id, member);
    checkVersion(plan, request.body?.expectedVersion);
    if (plan.status !== 'DRAFT') throw httpError(409, 'Il piano non è più modificabile');
    const errors = validateLogisticsNeeds(db.productCatalog, request.body?.needs);
    if (errors.length) throw httpError(400, 'Correggi le celle indicate', errors);
    plan.needs = request.body.needs.map((item) => ({ productId: item.productId, size: String(item.size), quantity: item.quantity }));
    plan.version += 1;
    plan.events.push({ at: now(), actor: member.displayName, event: `Matrice fabbisogni aggiornata: ${plan.needs.reduce((sum, item) => sum + item.quantity, 0)} paia` });
    return { plan: planView(db, plan, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/logistics/plans/:id/import', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SITE_MANAGER']);
    const plan = planForMember(db, request.params.id, member);
    checkVersion(plan, request.body?.expectedVersion);
    if (plan.status !== 'DRAFT') throw httpError(409, 'Il piano non è più modificabile');
    const parsed = parseNeedsCsv(request.body?.csv);
    const errors = [...parsed.errors, ...validateLogisticsNeeds(db.productCatalog, parsed.needs)];
    if (errors.length) throw httpError(400, 'CSV non importato: correggi gli errori indicati', errors);
    plan.needs = parsed.needs;
    plan.version += 1;
    const filename = cleanText(request.body?.filename, 120) || 'fabbisogni.csv';
    plan.imports.unshift({ id: `IMP-${randomUUID()}`, at: now(), actor: member.displayName, filename, rows: parsed.needs.length });
    plan.events.push({ at: now(), actor: member.displayName, event: `Import CSV ${filename}: ${parsed.needs.length} righe` });
    return { plan: planView(db, plan, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/logistics/plans/:id/manager', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const plan = planForMember(db, request.params.id, member);
    checkVersion(plan, request.body?.expectedVersion);
    if (!['DRAFT', 'VALIDATED'].includes(plan.status)) throw httpError(409, 'Non puoi cambiare assegnazione in questo stato');
    const manager = db.operationsMembers.find((item) => item.id === request.body?.memberId && item.organizationId === member.organizationId && item.role === 'SITE_MANAGER' && item.assignedSiteIds.includes(plan.siteId));
    if (!manager) throw httpError(400, 'Il capocantiere non è assegnato a questo sito');
    plan.managerMemberId = manager.id;
    plan.version += 1;
    plan.events.push({ at: now(), actor: member.displayName, event: `Capocantiere assegnato: ${manager.displayName}` });
    return { plan: planView(db, plan, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/logistics/plans/:id/validate', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SITE_MANAGER']);
    const plan = planForMember(db, request.params.id, member);
    checkVersion(plan, request.body?.expectedVersion);
    if (plan.status !== 'DRAFT') throw httpError(409, 'Il piano è già stato validato');
    if (new Date(plan.deadlineAt).getTime() <= Date.now()) throw httpError(409, 'La scadenza del fabbisogno è superata');
    const errors = validateLogisticsNeeds(db.productCatalog, plan.needs);
    const reconciliation = logisticsReconciliation(plan, db.orders);
    if (!reconciliation.needsMatchOrder) errors.push({ cell: 'Riepilogo ordine', message: `Il fabbisogno è ${reconciliation.needsPairs} paia ma l’ordine collegato ne contiene ${reconciliation.orderPairs}` });
    if (errors.length) throw httpError(409, 'Validazione bloccata', errors);
    plan.status = 'VALIDATED'; plan.version += 1;
    plan.events.push({ at: now(), actor: member.displayName, event: 'Fabbisogno validato: quantità coerenti con ordine confermato' });
    return { plan: planView(db, plan, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/logistics/plans/:id/approve', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const plan = planForMember(db, request.params.id, member);
    checkVersion(plan, request.body?.expectedVersion);
    if (plan.status !== 'VALIDATED') throw httpError(409, 'Prima valida il fabbisogno');
    if (!logisticsReconciliation(plan, db.orders).valid) throw httpError(409, 'Le quantità non sono più coerenti');
    plan.status = 'APPROVED'; plan.version += 1; plan.approvedAt = now(); plan.approvedBy = member.displayName;
    plan.events.push({ at: plan.approvedAt, actor: member.displayName, event: 'Approvazione centrale registrata' });
    return { plan: planView(db, plan, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/logistics/plans/:id/shipments', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const plan = planForMember(db, request.params.id, member);
    const key = cleanText(request.body?.idempotencyKey, 90);
    if (!key || key.length < 8) throw httpError(400, 'Chiave idempotente spedizione assente');
    const existing = plan.shipments.find((item) => item.idempotencyKey === key);
    if (existing) return { plan: planView(db, plan, member), idempotent: true };
    checkVersion(plan, request.body?.expectedVersion);
    if (plan.status !== 'APPROVED' || plan.shipments.length) throw httpError(409, 'Piano non approvato o spedizione già pianificata');
    if (!logisticsReconciliation(plan, db.orders).valid) throw httpError(409, 'Quantità non coerenti: spedizione bloccata');
    const timestamp = now();
    plan.shipments.push({ id: `SHIP-${randomUUID()}`, idempotencyKey: key, status: 'PLANNED', fulfilment: 'EXTERNAL', items: structuredClone(plan.needs), pairs: plan.needs.reduce((sum, item) => sum + item.quantity, 0), createdAt: timestamp, tracking: null });
    plan.status = 'SHIPMENT_PLANNED'; plan.version += 1;
    plan.events.push({ at: timestamp, actor: member.displayName, event: 'Spedizione pianificata verso il cantiere; tracking esterno non disponibile' });
    return { plan: planView(db, plan, member), idempotent: false };
  });
  response.status(result.idempotent ? 200 : 201).json(result);
}));
area5Router.get('/area5/logistics/plans/:id/export.csv', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SITE_MANAGER']);
  const plan = planForMember(db, request.params.id, member);
  const rows = [['productId', 'size', 'quantity'], ...plan.needs.map((item) => [item.productId, item.size, item.quantity])];
  privateDownload(response, `${plan.id}-fabbisogni.csv`, 'text/csv; charset=utf-8', `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`);
}));

/* C16 — Subcontractor Network Console */
function linkForMember(db, id, member) {
  const link = db.subcontractorLinks.find((item) => item.id === id && ((['PROCUREMENT', 'STARTUP_REVIEWER'].includes(member.role) && item.gcOrganizationId === member.organizationId) || (member.role === 'SUBCONTRACTOR' && item.subcontractorOrganizationId === member.organizationId)));
  if (!link) throw httpError(404, 'Relazione di filiera non trovata nel tuo perimetro');
  return link;
}
function linkView(db, link, member) {
  const attributedOrders = ordersForLink(db, link);
  const own = buildThresholdLedger(db, { organizationId: link.subcontractorOrganizationId });
  const siteVolumes = db.sites.map((site) => ({ siteId: site.id, siteName: site.name, pairs: attributedOrders.filter((order) => order.siteId === site.id).reduce((sum, order) => sum + order.pairs, 0) })).filter((item) => item.pairs || link.siteRelations.some((relation) => relation.siteId === item.siteId) || link.proposedSiteIds.includes(item.siteId));
  return {
    ...link,
    volumes: { individualPairs: own.pairs, attributedPairs: attributedOrders.reduce((sum, order) => sum + order.pairs, 0), siteVolumes },
    permissions: {
      canAccept: member.role === 'SUBCONTRACTOR' && link.status === 'INVITED',
      canVerify: member.role === 'STARTUP_REVIEWER' && link.status === 'PENDING_VERIFICATION',
      canManageSites: member.role === 'PROCUREMENT' && link.status === 'ACTIVE',
      canEditConsents: member.role === 'SUBCONTRACTOR' && link.status === 'ACTIVE',
      canRevoke: link.status === 'ACTIVE' && ((member.role === 'PROCUREMENT' && link.gcOrganizationId === member.organizationId) || (member.role === 'SUBCONTRACTOR' && link.subcontractorOrganizationId === member.organizationId)),
    },
  };
}
area5Router.get('/area5/network', asyncRoute(async (request, response) => {
  const db = await readDb();
  const { member, organizationId } = auth(db, request);
  requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR', 'STARTUP_REVIEWER']);
  const links = db.subcontractorLinks.filter((link) => member.role === 'SUBCONTRACTOR' ? link.subcontractorOrganizationId === organizationId : link.gcOrganizationId === organizationId).map((link) => linkView(db, link, member));
  const linkedOrganizationIds = new Set(db.subcontractorLinks.filter((link) => link.gcOrganizationId === organizationId && link.status !== 'REVOKED').map((link) => link.subcontractorOrganizationId));
  const recipients = member.role === 'PROCUREMENT' ? db.operationsMembers.filter((item) => item.role === 'SUBCONTRACTOR' && item.organizationId !== organizationId && !linkedOrganizationIds.has(item.organizationId)).map(memberView) : [];
  const siteIds = new Set(db.deliveryAddresses.filter((item) => item.organizationId === organizationId).map((item) => item.siteId));
  response.json({ demo: true, member: memberView(member), links, recipients, sites: db.sites.filter((site) => siteIds.has(site.id) || links.some((link) => link.proposedSiteIds.includes(site.id))), notice: 'Controllo formale della P. IVA e verifica effettiva sono stati distinti. Un invito non attiva alcuna associazione.' });
}));
area5Router.post('/area5/network/invitations', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const recipient = db.operationsMembers.find((item) => item.id === request.body?.recipientMemberId && item.role === 'SUBCONTRACTOR' && item.organizationId !== organizationId);
    if (!recipient) throw httpError(400, 'Seleziona un destinatario demo valido');
    if (db.subcontractorLinks.some((link) => link.gcOrganizationId === organizationId && link.subcontractorOrganizationId === recipient.organizationId && link.status !== 'REVOKED')) throw httpError(409, 'Esiste già una relazione attiva o in corso con questa impresa');
    if (!validateItalianVatFormat(request.body?.vatNumber)) throw httpError(400, 'P. IVA formalmente non valida: questo controllo non verifica l’impresa');
    const allowedSites = new Set(db.deliveryAddresses.filter((item) => item.organizationId === organizationId).map((item) => item.siteId));
    const siteIds = [...new Set(request.body?.siteIds || [])];
    if (!siteIds.length || siteIds.some((id) => !allowedSites.has(id))) throw httpError(400, 'Seleziona almeno un cantiere del General Contractor');
    const timestamp = now();
    const link = {
      id: `LINK-${randomUUID()}`, gcOrganizationId: organizationId, gcOrganizationName: member.organizationName,
      subcontractorOrganizationId: recipient.organizationId, subcontractorOrganizationName: recipient.organizationName,
      vatNumber: String(request.body.vatNumber).replace(/^IT/i, ''), vatFormatValid: true, verificationStatus: 'FORMAL_CHECK_ONLY', verificationNote: null, verifiedAt: null,
      status: 'INVITED', version: 1, invitedAt: timestamp, acceptedAt: null, identityConfirmedAt: null, revokedAt: null,
      consents: { volumeAttribution: false, kitDistribution: false, registryPublication: false }, requestedConsents: { volumeAttribution: true, kitDistribution: true },
      proposedSiteIds: siteIds, siteRelations: [], attributionRule: 'ORDER_ID_UNIQUE_WITHIN_SITE_PERIOD', historicalPairsAtRevocation: null,
      events: [{ at: timestamp, actor: member.displayName, event: 'Invito registrato; nessuna email reale inviata e nessuna associazione attivata' }],
    };
    db.subcontractorLinks.push(link);
    return { link: linkView(db, link, member) };
  });
  response.status(201).json(result);
}));
area5Router.post('/area5/network/links/:id/accept', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['SUBCONTRACTOR']);
    const link = linkForMember(db, request.params.id, member);
    checkVersion(link, request.body?.expectedVersion);
    if (link.status !== 'INVITED') throw httpError(409, 'Invito già accettato o non più disponibile');
    if (request.body?.identityConfirmed !== true) throw httpError(400, 'Conferma l’identità demo dell’organizzazione');
    const consents = request.body?.consents || {};
    if (typeof consents.volumeAttribution !== 'boolean' || typeof consents.kitDistribution !== 'boolean') throw httpError(400, 'Esprimi entrambi i consensi informati');
    const timestamp = now();
    link.status = 'PENDING_VERIFICATION'; link.acceptedAt = timestamp; link.identityConfirmedAt = timestamp;
    link.consents = { volumeAttribution: consents.volumeAttribution, kitDistribution: consents.kitDistribution, registryPublication: false };
    link.version += 1;
    link.events.push({ at: timestamp, actor: member.displayName, event: 'Invito accettato; in attesa di verifica effettiva, associazione non ancora attiva' });
    return { link: linkView(db, link, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/network/links/:id/verify', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['STARTUP_REVIEWER']);
    const link = linkForMember(db, request.params.id, member);
    checkVersion(link, request.body?.expectedVersion);
    const note = cleanText(request.body?.note, 600);
    if (!note || note.length < 10) throw httpError(400, 'Inserisci una nota di verifica demo');
    if (link.status !== 'PENDING_VERIFICATION') throw httpError(409, 'La relazione non è in attesa di verifica');
    const timestamp = now();
    link.verificationStatus = 'VERIFIED_DEMO'; link.verificationNote = note; link.verifiedAt = timestamp;
    link.siteRelations = link.proposedSiteIds.map((siteId) => ({ siteId, startAt: timestamp, endAt: null }));
    if (!canActivateSubcontractorLink(link)) throw httpError(409, 'Accettazione, consensi o cantieri non sufficienti per attivare la relazione');
    link.status = 'ACTIVE'; link.version += 1;
    link.events.push({ at: timestamp, actor: member.displayName, event: `Verifica effettiva simulata: ${note}` });
    return { link: linkView(db, link, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/network/links/:id/consents', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['SUBCONTRACTOR']);
    const link = linkForMember(db, request.params.id, member);
    checkVersion(link, request.body?.expectedVersion);
    if (link.status !== 'ACTIVE') throw httpError(409, 'I consensi non sono modificabili in questo stato');
    const { volumeAttribution, kitDistribution } = request.body || {};
    if (typeof volumeAttribution !== 'boolean' || typeof kitDistribution !== 'boolean') throw httpError(400, 'Consensi non validi');
    link.consents = { ...link.consents, volumeAttribution, kitDistribution }; link.version += 1;
    link.events.push({ at: now(), actor: member.displayName, event: `Consensi aggiornati: volumi ${volumeAttribution ? 'condivisi' : 'non condivisi'}, kit ${kitDistribution ? 'abilitato' : 'disabilitato'}` });
    return { link: linkView(db, link, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/network/links/:id/sites', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member, organizationId } = auth(db, request);
    requireRole(member, ['PROCUREMENT']);
    const link = linkForMember(db, request.params.id, member);
    checkVersion(link, request.body?.expectedVersion);
    if (link.status !== 'ACTIVE') throw httpError(409, 'La relazione non è attiva');
    const allowed = new Set(db.deliveryAddresses.filter((item) => item.organizationId === organizationId).map((item) => item.siteId));
    const siteIds = [...new Set(request.body?.siteIds || [])];
    if (!siteIds.length || siteIds.some((id) => !allowed.has(id))) throw httpError(400, 'Cantieri non validi');
    const timestamp = now();
    const previousRelations = link.siteRelations;
    const nextRelations = siteIds.map((siteId) => {
      const existing = previousRelations.find((relation) => relation.siteId === siteId && !relation.endAt);
      return existing || { siteId, startAt: timestamp, endAt: null };
    });
    const closedRelations = previousRelations.filter((relation) => !relation.endAt && !siteIds.includes(relation.siteId)).map((relation) => ({ ...relation, endAt: timestamp }));
    link.siteRelations = [...previousRelations.filter((relation) => relation.endAt), ...nextRelations, ...closedRelations];
    link.version += 1;
    link.events.push({ at: timestamp, actor: member.displayName, event: `Perimetro cantieri aggiornato: ${siteIds.join(', ')}` });
    return { link: linkView(db, link, member) };
  });
  response.json(result);
}));
area5Router.post('/area5/network/links/:id/revoke', asyncRoute(async (request, response) => {
  const result = await updateDb((db) => {
    const { member } = auth(db, request);
    requireRole(member, ['PROCUREMENT', 'SUBCONTRACTOR']);
    const link = linkForMember(db, request.params.id, member);
    checkVersion(link, request.body?.expectedVersion);
    const reason = cleanText(request.body?.reason, 500);
    if (!reason || reason.length < 8) throw httpError(400, 'Motiva la revoca');
    if (link.status !== 'ACTIVE') throw httpError(409, 'La relazione non è attiva');
    const timestamp = now();
    link.historicalPairsAtRevocation = ordersForLink(db, link).reduce((sum, order) => sum + order.pairs, 0);
    link.status = 'REVOKED'; link.revokedAt = timestamp; link.version += 1;
    link.siteRelations = link.siteRelations.map((relation) => ({ ...relation, endAt: relation.endAt || timestamp }));
    link.events.push({ at: timestamp, actor: member.displayName, event: `Relazione revocata: ${reason}. Storico conservato.` });
    return { link: linkView(db, link, member) };
  });
  response.json(result);
}));
