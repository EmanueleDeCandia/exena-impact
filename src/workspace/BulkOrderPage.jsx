import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, FileBox, PackageCheck, RefreshCw, ShoppingCart, Truck } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { DemoNotice, Dialog, EmptyState, ErrorState, ExportMenu, LoadingState, StatusBadge, dateTime } from './ui.jsx';
import { OperationsFrame, ValidationErrors, operationsMoney, useOperationsData, useOperationsSession } from './operations.jsx';

const roles = ['PROCUREMENT', 'SUBCONTRACTOR'];
const recurrenceLabel = { ONE_OFF: 'Ordine singolo', MONTHLY: 'Ricorrenza mensile', QUARTERLY: 'Ricorrenza trimestrale' };

export function BulkOrderPage() {
  const { notify } = useContext(WorkspaceContext);
  const operations = useOperationsSession();
  const session = operations.session && roles.includes(operations.session.member.role) ? operations.session : null;
  const { data, error, loading, reload } = useOperationsData('/area5/orders', session);
  const [productId, setProductId] = useState('');
  const [quantities, setQuantities] = useState({});
  const [addressId, setAddressId] = useState('');
  const [recurrence, setRecurrence] = useState('ONE_OFF');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [rectifyOrder, setRectifyOrder] = useState(null);
  const [reason, setReason] = useState('');
  const idempotencyKey = useRef(crypto.randomUUID());
  const product = data?.catalog.find((item) => item.id === productId) || data?.catalog[0];
  const items = useMemo(() => Object.entries(quantities).filter(([, quantity]) => quantity > 0).map(([key, quantity]) => { const [itemProductId, size] = key.split(':'); return { productId: itemProductId, size, quantity }; }), [quantities]);

  useEffect(() => { if (data && !addressId && data.addresses.length) setAddressId(data.addresses[0].id); }, [data, addressId]);
  useEffect(() => {
    if (!session || !items.length) { setQuote(null); setQuoteError(null); setQuoteLoading(false); return undefined; }
    let active = true;
    const timer = window.setTimeout(async () => {
      setQuoteLoading(true); setQuoteError(null);
      try { const result = await operations.authorized('/area5/orders/quote', { method: 'POST', body: JSON.stringify({ items }) }); if (active) setQuote(result.quote); }
      catch (reason) { if (active) { setQuote(null); setQuoteError(reason.message); } }
      finally { if (active) setQuoteLoading(false); }
    }, 280);
    return () => { active = false; window.clearTimeout(timer); };
  }, [items, session, operations.authorized]);

  const submitOrder = async () => {
    setBusy(true); setActionError(null);
    try {
      const result = await operations.authorized('/area5/orders', { method: 'POST', body: JSON.stringify({ items, addressId, recurrence, idempotencyKey: idempotencyKey.current }) });
      setReceipt(result.order); setQuantities({}); setQuote(null); setReviewOpen(false); idempotencyKey.current = crypto.randomUUID();
      notify('success', result.idempotent ? 'Ordine già registrato: nessun duplicato creato' : 'Ordine inviato senza duplicati');
      await reload();
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const exportReceipt = async (order, format) => operations.download(`/area5/orders/${order.id}/receipt?format=${format}`);
  const submitRectification = async (event) => {
    event.preventDefault(); setBusy(true); setActionError(null);
    try {
      await operations.authorized(`/area5/orders/${rectifyOrder.id}/rectify`, { method: 'POST', body: JSON.stringify({ expectedVersion: rectifyOrder.version, reason }) });
      notify('success', 'Rettifica registrata e ledger ricalcolato'); setRectifyOrder(null); setReason(''); await reload();
    } catch (reasonValue) { setActionError(reasonValue.message); }
    finally { setBusy(false); }
  };

  return <div className="operations-page bulk-order-page">
    <header className="module-heading"><div><div className="eyebrow"><span /> AREA 05 / C12 · BULK ORDER PORTAL</div><h1>Ordini massivi.<br /><em>Nessun passaggio ambiguo.</em></h1><p>Per Procurement e imprese di filiera: componi il fabbisogno per taglia, verifica prezzi contrattuali e devoluzione, invia una sola volta e conserva la ricevuta.</p></div><div className="component-status"><span className="live-dot" />VERTICAL SLICE · C12<span className="status-tag">FULFILMENT ESTERNO</span></div></header>
    <DemoNotice />
    <OperationsFrame operations={operations} roles={roles} component="C12 Bulk Order Portal">
      {loading && !data && <LoadingState label="Caricamento catalogo e listino contrattuale" />}
      {error && <ErrorState error={error} onRetry={() => reload().catch(() => {})} />}
      {data && <>
        <div className="bulk-layout">
          <section className="bulk-catalog" aria-labelledby="bulk-catalog-title">
            <div className="section-heading section-heading--inline"><div><span className="micro-label">CATALOGO CONTRATTUALE / PREZZO PER PAIO</span><h2 id="bulk-catalog-title">Matrice modello e taglie</h2></div><PackageCheck size={24} /></div>
            <div className="bulk-product-tabs" role="tablist" aria-label="Modello di calzatura">{data.catalog.map((item) => <button key={item.id} type="button" role="tab" aria-selected={product?.id === item.id} className={product?.id === item.id ? 'is-selected' : ''} onClick={() => setProductId(item.id)}><span>{item.sku}</span><b>{item.name}</b><small><s>{operationsMoney(item.listUnitPriceCents)}</s> → <strong>{operationsMoney(item.contractUnitPriceCents)}</strong></small></button>)}</div>
            {product && <div className="size-matrix"><div className="size-matrix__header"><span>Taglia</span><span>Disponibilità aggiornata</span><span>Quantità</span></div>{product.sizes.map((variant) => {
              const key = `${product.id}:${variant.size}`;
              return <label className="size-row" key={variant.size}><span className="size-row__size">{variant.size}</span><span className={`stock-state stock-state--${variant.stockStatus.toLowerCase()}`}><b>{variant.stockStatus === 'AVAILABLE' ? 'Disponibile' : variant.stockStatus === 'LOW' ? `Scorte basse · ${variant.availableQuantity}` : 'Disponibilità incerta'}</b><small>{variant.stockStatus === 'UNCERTAIN' ? 'Richiede verifica esterna' : `Aggiornato ${dateTime(variant.updatedAt)}`}</small></span><span className="size-row__input"><span className="sr-only">Quantità {product.name} taglia {variant.size}</span><input aria-label={`Quantità ${product.name} taglia ${variant.size}`} type="number" min="0" max="500" step="1" inputMode="numeric" value={quantities[key] || ''} placeholder="0" onChange={(event) => { const value = event.target.value === '' ? 0 : Math.max(0, Math.min(500, Number(event.target.value))); setQuantities((current) => ({ ...current, [key]: value })); }} /></span></label>;
            })}</div>}
          </section>
          <aside className="bulk-summary" aria-labelledby="bulk-summary-title">
            <span className="micro-label">RIEPILOGO SERVER-SIDE</span><h2 id="bulk-summary-title">Il tuo ordine</h2>
            <label className="field"><span>Indirizzo di consegna *</span><select value={addressId} onChange={(event) => setAddressId(event.target.value)} required>{data.addresses.map((address) => <option key={address.id} value={address.id}>{address.label}</option>)}</select></label>
            <label className="field"><span>Ricorrenza</span><select value={recurrence} onChange={(event) => setRecurrence(event.target.value)}><option value="ONE_OFF">Ordine singolo</option><option value="MONTHLY">Ricorrenza mensile</option><option value="QUARTERLY">Ricorrenza trimestrale</option></select></label>
            {quoteLoading && <p className="bulk-quote-loading" role="status"><RefreshCw className="spin" size={16} />Ricalcolo prezzi sul server…</p>}
            {quoteError && <p className="form-error" role="alert">{quoteError}</p>}
            {!items.length && <EmptyState icon={ShoppingCart} title="Matrice vuota" text="Inserisci almeno una quantità. Il carrello non modifica volumi o Fondo." />}
            {quote && <div className="bulk-quote"><dl><div><dt>Paia</dt><dd>{quote.pairs}</dd></div><div><dt>Listino base</dt><dd>{operationsMoney(quote.listTotalCents)}</dd></div><div><dt>Condizione contrattuale</dt><dd>−{operationsMoney(quote.contractDiscountCents)}</dd></div><div><dt>Totale</dt><dd>{operationsMoney(quote.totalCents)}</dd></div><div className="bulk-quote__fund"><dt>Devoluzione 30%</dt><dd>{operationsMoney(quote.fundCents)}</dd></div></dl>{quote.stockWarnings.length > 0 && <p className="stock-warning"><AlertTriangle size={16} />{quote.stockWarnings.length} riga/righe richiedono verifica stock esterna.</p>}<small>Riepilogo calcolato dal server; verrà verificato nuovamente alla conferma.</small></div>}
            <button className="button button--cobalt button--full" type="button" disabled={!quote || quoteLoading || !addressId} onClick={() => { setActionError(null); setReviewOpen(true); }}>Rivedi ordine <ArrowRight size={17} /></button>
            <p className="bulk-summary__note"><Truck size={15} />Consegna esterna. Pagamento non integrato: l’esito sarà “ordine inviato”, mai “pagato”.</p>
          </aside>
        </div>
        {receipt && <section className="bulk-receipt" aria-labelledby="receipt-title"><CheckCircle2 size={28} /><div><span className="micro-label">ORDINE REGISTRATO / IDEMPOTENZA VERIFICATA</span><h2 id="receipt-title">{receipt.id}</h2><p>{receipt.pairs} paia · {operationsMoney(receipt.totalCents)} · Fondo calcolato {operationsMoney(receipt.fundCents)}</p><StatusBadge status={receipt.status} label="Ordine inviato · non pagato" /></div><ExportMenu label="Scarica ricevuta" formats={['pdf', 'json']} onExport={(format) => exportReceipt(receipt, format)} notify={notify} /></section>}
        <section className="order-history" aria-labelledby="orders-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">CRONOLOGIA / STATO COERENTE CON C13</span><h2 id="orders-title">Ordini e rettifiche</h2></div><FileBox size={23} /></div>
          <div className="order-history__table"><div className="order-history__header"><span>Ordine</span><span>Paia / importo</span><span>Stato</span><span>Azioni</span></div>{data.orders.map((order) => <article key={order.id}><div><b>{order.id}</b><small>{dateTime(order.submittedAt || order.confirmedAt)} · {recurrenceLabel[order.recurrence] || 'Fornitura'}</small></div><div><b>{order.pairs} paia</b><small>{operationsMoney(order.totalCents)} · Fondo {operationsMoney(order.fundCents)}</small></div><StatusBadge status={order.status} label={order.status === 'SUBMITTED' ? 'Inviato · non pagato' : order.status === 'RECTIFIED' ? 'Rettificato · escluso dal ledger' : undefined} /><div className="order-history__actions"><ExportMenu label="Ricevuta" formats={['pdf', 'json']} onExport={(format) => exportReceipt(order, format)} notify={notify} />{order.canRectify && <button className="button button--outline" type="button" onClick={() => { setRectifyOrder(order); setActionError(null); }}>Rettifica</button>}</div></article>)}</div>
        </section>
      </>}
    </OperationsFrame>
    {reviewOpen && quote && <Dialog title="Conferma l’invio dell’ordine" eyebrow="C12 / SECONDO PASSAGGIO" onClose={() => !busy && setReviewOpen(false)} className="dialog--operations"><div className="stack-form"><div className="binding-warning"><ShoppingCart size={24} /><div><b>{quote.pairs} paia · {operationsMoney(quote.totalCents)}</b><p>Devoluzione calcolata: {operationsMoney(quote.fundCents)}. {recurrenceLabel[recurrence]}.</p></div></div><div className="binding-consequences"><b>Destinazione</b><p>{data.addresses.find((address) => address.id === addressId)?.label}<br />{data.addresses.find((address) => address.id === addressId)?.street}, {data.addresses.find((address) => address.id === addressId)?.city}</p></div>{quote.stockWarnings.length > 0 && <div className="stock-warning"><AlertTriangle size={18} /><span>La disponibilità incerta resta segnalata nella ricevuta e richiede verifica esterna.</span></div>}<DemoNotice compact /><p>Confermi l’invio al fulfilment esterno. Non stai effettuando un pagamento e il carrello non ha ancora modificato il ledger.</p>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setReviewOpen(false)}>Torna alla matrice</button><button className="button button--cobalt" type="button" disabled={busy} onClick={submitOrder}>{busy ? 'Invio in corso…' : 'Invia ordine una sola volta'}<ArrowRight size={17} /></button></div></div></Dialog>}
    {rectifyOrder && <Dialog title={`Retifica ${rectifyOrder.id}`} eyebrow="C12 / MOVIMENTO CONTABILE, NON CANCELLAZIONE" onClose={() => !busy && setRectifyOrder(null)}><form className="stack-form" onSubmit={submitRectification}><p>L’ordine confermato passerà a <strong>RETTIFICATO</strong> e sarà escluso dal ledger. Eventi e importi storici resteranno conservati.</p><label className="field"><span>Motivo della rettifica *</span><textarea rows="4" required minLength="8" value={reason} onChange={(event) => setReason(event.target.value)} /></label><ValidationErrors errors={actionError ? [{ cell: 'Server', message: actionError }] : []} /><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setRectifyOrder(null)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy}>Registra rettifica</button></div></form></Dialog>}
  </div>;
}
