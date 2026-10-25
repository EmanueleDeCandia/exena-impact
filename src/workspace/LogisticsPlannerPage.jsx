import { useContext, useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, Download, FileUp, MapPin, PackagePlus, Plus, Save, Send, Trash2, Truck, UserCheck } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { DemoNotice, Dialog, EmptyState, ErrorState, LoadingState, StatusBadge, dateTime, shortDate } from './ui.jsx';
import { OperationsFrame, ValidationErrors, useOperationsData, useOperationsSession } from './operations.jsx';

const roles = ['PROCUREMENT', 'SITE_MANAGER'];
const planStatus = { DRAFT: 'Bozza fabbisogno', VALIDATED: 'Validato dal cantiere', APPROVED: 'Approvato centralmente', SHIPMENT_PLANNED: 'Spedizione pianificata' };
const isoDate = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

export function LogisticsPlannerPage() {
  const { notify } = useContext(WorkspaceContext);
  const operations = useOperationsSession();
  const session = operations.session && roles.includes(operations.session?.member?.role) ? operations.session : null;
  const { data, error, loading, reload } = useOperationsData('/area5/logistics', session);
  const [planId, setPlanId] = useState('');
  const [needs, setNeeds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ sourceOrderId: '', addressId: '', deadlineAt: isoDate(14), deliveryFrom: isoDate(20), deliveryTo: isoDate(23) });
  const shipmentKey = useRef(crypto.randomUUID());
  const plan = data?.plans.find((item) => item.id === planId) || data?.plans[0];
  useEffect(() => { if (data?.plans.length && !data.plans.some((item) => item.id === planId)) setPlanId(data.plans[0].id); }, [data, planId]);
  useEffect(() => { if (plan) { setNeeds(plan.needs.map(({ productId, size, quantity }) => ({ productId, size, quantity }))); setValidationErrors([]); setActionError(null); } }, [plan?.id, plan?.version]);
  useEffect(() => {
    if (data?.availableOrders.length && !createForm.sourceOrderId) {
      const order = data.availableOrders[0];
      setCreateForm((current) => ({ ...current, sourceOrderId: order.id, addressId: data.addresses.find((address) => address.siteId === order.siteId)?.id || '' }));
    }
  }, [data, createForm.sourceOrderId]);

  const run = async (callback, message) => {
    setBusy(true); setActionError(null); setValidationErrors([]);
    try { const result = await callback(); if (message) notify('success', message); await reload(); return result; }
    catch (reason) { setActionError(reason.message); setValidationErrors(reason.details || []); return null; }
    finally { setBusy(false); }
  };
  const updateNeed = (index, field, value) => setNeeds((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: field === 'quantity' ? Number(value) : value } : item));
  const saveNeeds = () => run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/needs`, { method: 'PUT', body: JSON.stringify({ expectedVersion: plan.version, needs }) }), 'Matrice salvata con una nuova versione');
  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 100000) { setActionError('Il CSV demo non può superare 100 KB'); return; }
    const csv = await file.text();
    await run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/import`, { method: 'POST', body: JSON.stringify({ expectedVersion: plan.version, filename: file.name, csv }) }), 'CSV importato e storico aggiornato');
  };
  const createPlan = async (event) => {
    event.preventDefault();
    const result = await run(() => operations.authorized('/area5/logistics/plans', { method: 'POST', body: JSON.stringify(createForm) }), 'Piano creato in bozza');
    if (result) { setPlanId(result.plan.id); setCreateOpen(false); }
  };
  const localPairs = needs.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const dirty = plan && JSON.stringify(needs.map(({ productId, size, quantity }) => ({ productId, size: String(size), quantity: Number(quantity) }))) !== JSON.stringify(plan.needs.map(({ productId, size, quantity }) => ({ productId, size: String(size), quantity: Number(quantity) })));

  return <div className="operations-page logistics-page">
    <header className="module-heading"><div><div className="eyebrow"><span /> AREA 05 / C15 · MULTI-SITE LOGISTICS PLANNER</div><h1>Fabbisogni per cantiere.<br /><em>Quantità che coincidono.</em></h1><p>Per Procurement e capicantiere: raccogli taglie aggregate, valida il fabbisogno contro l’ordine e genera un piano di spedizione senza raccogliere nomi dei lavoratori.</p></div><div className="component-status"><span className="live-dot" />VERTICAL SLICE · C15<span className="status-tag">SPEDIZIONE ESTERNA</span></div></header>
    <DemoNotice />
    <OperationsFrame operations={operations} roles={roles} component="C15 Multi-Site Logistics Planner">
      {loading && !data && <LoadingState label="Caricamento cantieri, fabbisogni e ordini" />}
      {error && <ErrorState error={error} onRetry={() => reload().catch(() => {})} />}
      {data && <>
        <div className="logistics-toolbar"><p><ShieldCheckIcon />Quantità aggregate per modello/taglia. Nessun nominativo dipendente richiesto.</p>{session?.member?.role === 'PROCUREMENT' && <button className="button button--cobalt" type="button" disabled={!data.availableOrders.length} onClick={() => setCreateOpen(true)}><Plus size={17} />Nuovo piano da ordine</button>}</div>
        {!data.availableOrders.length && session?.member?.role === 'PROCUREMENT' && <p className="logistics-note">Tutti gli ordini confermati hanno già un piano. Puoi selezionare una destinazione esistente.</p>}
        {data.plans.length ? <div className="logistics-layout">
          <aside className="logistics-sites"><span className="micro-label">DESTINAZIONI / {data.plans.length}</span><h2>Cantieri</h2>{data.plans.map((item) => <button type="button" key={item.id} className={plan?.id === item.id ? 'is-selected' : ''} onClick={() => setPlanId(item.id)}><MapPin size={18} /><span><b>{item.site?.name}</b><small>{item.reconciliation.needsPairs} paia · V{item.version}</small><StatusBadge status={item.status} label={planStatus[item.status]} /></span><ArrowRight size={15} /></button>)}</aside>
          {plan && <main className="logistics-workspace">
            <section className="logistics-plan-header"><div><span className="micro-label">{plan.id} / {plan.sourceOrderId}</span><h2>{plan.site?.name}</h2><p>{plan.address?.label} · consegna {shortDate(plan.deliveryWindow.from)} — {shortDate(plan.deliveryWindow.to)}</p></div><StatusBadge status={plan.status} label={planStatus[plan.status]} /></section>
            <section className="needs-editor" aria-labelledby="needs-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">MATRICE TAGLIE / VERSIONE {plan.version}</span><h2 id="needs-title">Fabbisogno aggregato</h2></div>{plan.permissions.canEdit && <button className="button button--outline" type="button" onClick={() => setNeeds((current) => [...current, { productId: data.catalog[0].id, size: '42', quantity: 1 }])}><Plus size={16} />Aggiungi riga</button>}</div>
              {needs.length ? <div className="needs-grid"><div className="needs-grid__header"><span>Modello</span><span>Taglia</span><span>Quantità</span><span>Azione</span></div>{needs.map((need, index) => <div className="need-row" key={`${index}-${need.productId}-${need.size}`}><label><span className="sr-only">Modello riga {index + 1}</span><select aria-label={`Modello riga ${index + 1}`} disabled={!plan.permissions.canEdit} value={need.productId} onChange={(event) => updateNeed(index, 'productId', event.target.value)}>{data.catalog.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label><span className="sr-only">Taglia riga {index + 1}</span><select aria-label={`Taglia riga ${index + 1}`} disabled={!plan.permissions.canEdit} value={String(need.size)} onChange={(event) => updateNeed(index, 'size', event.target.value)}>{data.catalog.find((product) => product.id === need.productId)?.sizes.map((variant) => <option key={variant.size}>{variant.size}</option>)}</select></label><label><span className="sr-only">Quantità riga {index + 1}</span><input aria-label={`Quantità riga ${index + 1}`} disabled={!plan.permissions.canEdit} type="number" min="1" max="500" value={need.quantity} onChange={(event) => updateNeed(index, 'quantity', event.target.value)} /></label>{plan.permissions.canEdit ? <button className="icon-button" type="button" aria-label={`Elimina riga ${index + 1}`} onClick={() => setNeeds((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={17} /></button> : <span />}</div>)}</div> : <EmptyState icon={PackagePlus} title="Nessuna riga di fabbisogno" text="Aggiungi una riga o importa un CSV. La validazione confronterà il totale con l’ordine collegato." />}
              {plan.permissions.canEdit && <div className="needs-editor__actions"><button className="button button--dark" type="button" disabled={busy || !needs.length} onClick={saveNeeds}><Save size={16} />Salva versione</button><label className="button button--outline logistics-file-button"><FileUp size={16} />Importa CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={busy} /></label><button className="button button--outline" type="button" onClick={() => operations.download(`/area5/logistics/plans/${plan.id}/export.csv`)}><Download size={16} />Esporta CSV</button><span>Formato: productId,size,quantity</span></div>}
            </section>
            {actionError && <p className="form-error" role="alert">{actionError}</p>}<ValidationErrors errors={validationErrors} />
            <section className="logistics-audit"><div className="section-heading"><span className="micro-label">STORICO / IMPORT E MODIFICHE</span><h2>Passaggi registrati</h2></div><ol>{[...plan.events].reverse().map((event, index) => <li key={`${event.at}-${index}`}><b>{event.event}</b><small>{event.actor} · {dateTime(event.at)}</small></li>)}</ol>{plan.imports.length > 0 && <p>{plan.imports.length} import CSV conservati nello storico.</p>}</section>
          </main>}
          {plan && <aside className="logistics-summary"><span className="micro-label">CONTROLLO QUANTITÀ</span><h2>Riconciliazione</h2><dl><div><dt>Matrice locale</dt><dd>{localPairs} paia</dd></div><div><dt>Fabbisogno salvato</dt><dd>{plan.reconciliation.needsPairs}</dd></div><div><dt>Ordine confermato</dt><dd>{plan.reconciliation.orderPairs}</dd></div><div><dt>Spedizioni pianificate</dt><dd>{plan.reconciliation.shipmentPairs}</dd></div></dl><div className={`logistics-reconciliation ${plan.reconciliation.needsMatchOrder ? 'is-valid' : 'is-invalid'}`}>{plan.reconciliation.needsMatchOrder ? <CheckCircle2 size={19} /> : <ClipboardCheck size={19} />}<span><b>{plan.reconciliation.needsMatchOrder ? 'Fabbisogno = ordine' : 'Quantità da correggere'}</b><small>{plan.reconciliation.needsMatchOrder ? 'Il controllo verrà ripetuto dal server.' : `Servono ${plan.reconciliation.orderPairs} paia in totale.`}</small></span></div>
              <div className="logistics-deadline"><CalendarDays size={17} /><span><b>Scadenza {shortDate(plan.deadlineAt)}</b><small>Finestra {shortDate(plan.deliveryWindow.from)} — {shortDate(plan.deliveryWindow.to)}</small></span></div>
              {plan.permissions.canAssign && <div className="manager-assignment"><label className="field"><span>Capocantiere assegnato</span><select value={plan.managerMemberId || ''} onChange={(event) => run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/manager`, { method: 'POST', body: JSON.stringify({ expectedVersion: plan.version, memberId: event.target.value }) }), 'Capocantiere assegnato')}><option value="" disabled>Seleziona</option>{data.managers.filter((manager) => manager.assignedSiteIds.includes(plan.siteId)).map((manager) => <option key={manager.id} value={manager.id}>{manager.displayName}</option>)}</select></label></div>}
              {plan.manager && <p className="assigned-manager"><UserCheck size={16} />{plan.manager.displayName}</p>}
              {plan.status === 'DRAFT' && dirty && <p className="logistics-note">Hai modifiche locali non salvate. Salva la versione prima della validazione.</p>}
              {plan.status === 'DRAFT' && <button className="button button--cobalt button--full" type="button" disabled={busy || dirty} onClick={() => run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/validate`, { method: 'POST', body: JSON.stringify({ expectedVersion: plan.version }) }), 'Fabbisogno validato')}><ClipboardCheck size={17} />Valida fabbisogno</button>}
              {plan.status === 'VALIDATED' && session?.member?.role === 'SITE_MANAGER' && <p className="logistics-note">Fabbisogno validato. Attendi l’approvazione centrale di Procurement.</p>}
              {plan.permissions.canApprove && <button className="button button--cobalt button--full" type="button" onClick={() => setApproveOpen(true)}><CheckCircle2 size={17} />Approva piano</button>}
              {plan.permissions.canPlanShipment && <button className="button button--cobalt button--full" type="button" disabled={busy} onClick={() => run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/shipments`, { method: 'POST', body: JSON.stringify({ expectedVersion: plan.version, idempotencyKey: shipmentKey.current }) }), 'Spedizione pianificata senza duplicati')}><Truck size={17} />Genera spedizione</button>}
              {plan.shipments.map((shipment) => <div className="shipment-card" key={shipment.id}><Truck size={20} /><span className="micro-label">{shipment.id}</span><b>{shipment.pairs} paia · piano spedizione</b><StatusBadge status={shipment.status} label="Pianificata · fulfilment esterno" /><small>Tracking non disponibile: nessuna consegna simulata.</small></div>)}
            </aside>}
        </div> : <EmptyState icon={MapPin} title="Nessun cantiere nel tuo perimetro" text="Il tuo ruolo non ha cantieri assegnati oppure non esistono ordini confermati da pianificare." />}
      </>}
    </OperationsFrame>
    {approveOpen && plan && <Dialog title="Approva il piano di spedizione" eyebrow="C15 / APPROVAZIONE CENTRALE" onClose={() => !busy && setApproveOpen(false)}><div className="stack-form"><div className="binding-warning"><ClipboardCheck size={24} /><div><b>{plan.site?.name} · {plan.reconciliation.needsPairs} paia</b><p>Ordine {plan.sourceOrderId}. Il fabbisogno validato coincide con l’ordine confermato.</p></div></div><p>L’approvazione blocca la matrice. Nel passaggio successivo potrai generare una spedizione con le stesse quantità; il trasporto resta esterno.</p><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setApproveOpen(false)}>Annulla</button><button className="button button--cobalt" type="button" disabled={busy} onClick={async () => { const result = await run(() => operations.authorized(`/area5/logistics/plans/${plan.id}/approve`, { method: 'POST', body: JSON.stringify({ expectedVersion: plan.version }) }), 'Piano approvato centralmente'); if (result) setApproveOpen(false); }}>Conferma approvazione <ArrowRight size={17} /></button></div></div></Dialog>}
    {createOpen && data && <Dialog title="Nuovo piano da ordine confermato" eyebrow="C15 / PERIMETRO E FINESTRE" onClose={() => !busy && setCreateOpen(false)}><form className="stack-form" onSubmit={createPlan}><label className="field"><span>Ordine confermato *</span><select required value={createForm.sourceOrderId} onChange={(event) => { const order = data.availableOrders.find((item) => item.id === event.target.value); setCreateForm((current) => ({ ...current, sourceOrderId: event.target.value, addressId: data.addresses.find((address) => address.siteId === order?.siteId)?.id || '' })); }}>{data.availableOrders.map((order) => <option key={order.id} value={order.id}>{order.id} · {order.pairs} paia</option>)}</select></label><label className="field"><span>Indirizzo del cantiere *</span><select required value={createForm.addressId} onChange={(event) => setCreateForm((current) => ({ ...current, addressId: event.target.value }))}>{data.addresses.filter((address) => address.siteId === data.availableOrders.find((order) => order.id === createForm.sourceOrderId)?.siteId).map((address) => <option key={address.id} value={address.id}>{address.label}</option>)}</select></label><div className="form-grid form-grid--three"><label className="field"><span>Scadenza fabbisogno</span><input type="date" required value={createForm.deadlineAt} onChange={(event) => setCreateForm((current) => ({ ...current, deadlineAt: event.target.value }))} /></label><label className="field"><span>Consegna dal</span><input type="date" required value={createForm.deliveryFrom} onChange={(event) => setCreateForm((current) => ({ ...current, deliveryFrom: event.target.value }))} /></label><label className="field"><span>Consegna al</span><input type="date" required value={createForm.deliveryTo} onChange={(event) => setCreateForm((current) => ({ ...current, deliveryTo: event.target.value }))} /></label></div>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setCreateOpen(false)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy}>Crea bozza piano <ArrowRight size={17} /></button></div></form></Dialog>}
  </div>;
}

function ShieldCheckIcon() { return <CheckCircle2 size={17} aria-hidden="true" />; }
