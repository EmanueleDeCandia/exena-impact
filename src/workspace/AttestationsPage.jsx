import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Calculator,
  Check,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileKey2,
  Landmark,
  Link2,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import {
  BlockedState,
  CopyButton,
  EmptyState,
  ErrorState,
  ExportMenu,
  LoadingState,
  ReviewDialog,
  ReviewTimeline,
  StatusBadge,
  useApiData,
  dateTime,
  integer,
  money,
  shortDate,
} from './ui.jsx';

export function AttestationsPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area1/attestations');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => { document.title = 'Fondo & Audit Trail — Sibillini Impact'; }, []);
  useEffect(() => {
    if (!data?.attestations.length) return;
    if (!data.attestations.some((item) => item.id === selectedId)) setSelectedId(data.attestations[0].id);
  }, [data, selectedId]);

  const attestations = data?.attestations || [];
  const filtered = useMemo(() => attestations.filter((item) => `${item.id} ${item.orderId} ${item.order?.organizationName}`.toLowerCase().includes(query.toLowerCase()) && (status === 'ALL' || item.status === status)), [attestations, query, status]);
  const attestation = attestations.find((item) => item.id === selectedId) || filtered[0];
  const verifiedFund = attestations.filter((item) => item.status === 'VERIFIED').reduce((sum, item) => sum + item.fundCents, 0);
  const publicUrl = attestation ? `${window.location.origin}/verifica/fondo/${attestation.publicToken}` : '';

  const review = async ({ outcome, note }) => {
    await api(`/area1/attestations/${attestation.id}/review`, { method: 'POST', body: JSON.stringify({ outcome, note }) });
    await reload();
    setReviewOpen(false);
    notify('success', outcome === 'VERIFIED' ? 'Verifica demo registrata e audit trail aggiornato' : 'Richiesta di integrazione registrata');
  };

  if (loading && !data) return <LoadingState label="Caricamento attestazioni e audit trail" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;
  if (!attestations.length) return <EmptyState title="Nessuna attestazione" text="Le attestazioni nascono dagli ordini confermati e dalla registrazione del versamento." />;

  return (
    <div className="module-page attestations-page">
      <header className="module-heading">
        <div><div className="eyebrow"><span /> C02 / FUND ATTESTATION & AUDIT TRAIL</div><h1>Dalla fornitura al Fondo.<br /><em>Ogni passaggio riconciliato.</em></h1><p>Per la tua impresa, l’ordine, la quota del 30% e il versamento restano collegati. La verifica pubblica conferma solo lo stato del documento, senza esporre importi o dati commerciali.</p></div>
        {attestation && <ExportMenu formats={['pdf', 'json']} onExport={(format) => downloadFile(`/area1/attestations/${attestation.id}/export?format=${format}`)} notify={notify} />}
      </header>

      <div className="summary-strip">
        <div><span>ATTESTAZIONI NEL TENANT DEMO</span><strong>{attestations.length}</strong><small>collegate a ordini distinti</small></div>
        <div><span>FONDO IN ATTESTAZIONI VERIFICATE</span><strong>{money(verifiedFund)}</strong><small>solo dati sintetici demo</small></div>
        <div><span>REGOLA DI DEVOLUZIONE</span><strong>30%</strong><small>22,50 € per paio a 75,00 €</small></div>
        <div><span>VERIFICA PUBBLICA</span><strong>MINIMA</strong><small>nessun importo condiviso</small></div>
      </div>

      <div className="attestation-browser">
        <aside className="attestation-list-panel" aria-label="Attestazioni disponibili">
          <div className="panel-heading"><div><span className="micro-label">DOCUMENTI / {attestations.length}</span><h2>Attestazioni</h2></div><WalletCards size={20} /></div>
          <label className="search-field"><Search size={17} /><span className="sr-only">Cerca attestazione o ordine</span><input type="search" placeholder="Attestazione o ordine…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="compact-field"><span>Filtra per stato</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Tutti gli stati</option><option value="VERIFIED">Verificati demo</option><option value="PENDING_REVIEW">In revisione</option><option value="REJECTED_WITH_REASON">Integrazioni richieste</option></select></label>
          <div className="attestation-list">
            {filtered.map((item) => <button type="button" key={item.id} className={attestation?.id === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)} aria-pressed={attestation?.id === item.id}><span><small>{item.id}</small><StatusBadge status={item.status} /></span><b>{money(item.fundCents)}</b><p>{item.orderId} · {integer.format(item.pairs)} paia</p><small>{item.siteName} · {shortDate(item.transferredAt)}</small></button>)}
            {!filtered.length && <EmptyState title="Nessun risultato" text="Prova a rimuovere ricerca e filtri." action={<button type="button" className="button button--outline" onClick={() => { setQuery(''); setStatus('ALL'); }}>Azzera filtri</button>} />}
          </div>
        </aside>

        {attestation && <section className="attestation-document" aria-labelledby="attestation-title">
          <header className="attestation-document__header"><div><span className="micro-label">ATTESTAZIONE / VERSIONE {attestation.version}</span><h2 id="attestation-title">{attestation.id}</h2><p>{attestation.order?.organizationName} · {attestation.siteName}</p></div><StatusBadge status={attestation.status} /></header>
          {!attestation.reconciliation.valid && <BlockedState title="Riconciliazione non coerente" text="La verifica è bloccata: i valori dell’attestazione non corrispondono all’ordine collegato." />}
          <div className={`reconciliation-banner ${attestation.reconciliation.valid ? 'is-valid' : 'is-invalid'}`}>
            {attestation.reconciliation.valid ? <CheckCircle2 size={25} /> : <CircleDashed size={25} />}<div><span>ESITO RICONCILIAZIONE</span><b>{attestation.reconciliation.valid ? 'Ordine, paia e quota Fondo coerenti' : 'Controlli non superati'}</b></div><strong>{money(attestation.reconciliation.actualFundCents)}</strong>
          </div>

          <div className="document-facts">
            <div><span>ORDINE COLLEGATO</span><b>{attestation.orderId}</b><small>confermato {dateTime(attestation.order?.confirmedAt)}</small></div>
            <div><span>FORNITURA</span><b>{money(attestation.totalCents)}</b><small>{integer.format(attestation.pairs)} paia · {money(Math.round(attestation.totalCents / attestation.pairs))} / paio</small></div>
            <div><span>VERSAMENTO</span><b>{attestation.transferReference}</b><small>{dateTime(attestation.transferredAt)}</small></div>
          </div>

          <section className="fund-formula" aria-labelledby="formula-title">
            <div className="panel-heading"><div><span className="micro-label">CALCOLO IN CENTESIMI</span><h3 id="formula-title">Formula riconciliata</h3></div><Calculator size={21} /></div>
            <div className="formula-flow"><div><span>01 / FORNITURA</span><b>{integer.format(attestation.pairs)} × {money(Math.round(attestation.totalCents / attestation.pairs))}</b><strong>{money(attestation.totalCents)}</strong></div><ArrowRight /><div><span>02 / DEVOLUZIONE {attestation.order?.devolutionRate}%</span><b>{money(attestation.totalCents)} × {attestation.order?.devolutionRate}%</b><strong>{money(attestation.reconciliation.expectedFundCents)}</strong></div><ArrowRight /><div className="is-result"><span>03 / QUOTA PER PAIO</span><b>{money(attestation.fundCents)} ÷ {integer.format(attestation.pairs)}</b><strong>{money(Math.round(attestation.fundCents / attestation.pairs))}</strong></div></div>
            <div className="reconciliation-checks"><span><Check size={16} />Ordine: {attestation.orderId}</span><span><Check size={16} />Paia: {integer.format(attestation.pairs)}</span><span><Check size={16} />Fondo atteso: {money(attestation.reconciliation.expectedFundCents)}</span><span><Check size={16} />Fondo attestato: {money(attestation.reconciliation.actualFundCents)}</span></div>
          </section>

          <section className="movements-panel" aria-labelledby="movements-title">
            <div className="panel-heading"><div><span className="micro-label">MOVIMENTI COLLEGATI</span><h3 id="movements-title">Documento + evidenze</h3></div><ReceiptText size={20} /></div>
            <div className="table-scroll" tabIndex="0" role="region" aria-label="Movimenti dell’attestazione"><table className="data-table"><thead><tr><th>Evento</th><th>Riferimento</th><th>Data</th><th>Valore</th></tr></thead><tbody><tr><th scope="row">Ordine confermato</th><td>{attestation.orderId}</td><td>{shortDate(attestation.order?.confirmedAt)}</td><td>{money(attestation.totalCents)}</td></tr><tr><th scope="row">Versamento al Fondo</th><td>{attestation.transferReference}</td><td>{shortDate(attestation.transferredAt)}</td><td>{money(attestation.fundCents)}</td></tr><tr><th scope="row">Revisione Startup</th><td>{attestation.verifiedBy || 'Revisore demo non assegnato'}</td><td>{shortDate(attestation.reviewedAt || attestation.auditTrail.at(-1)?.at)}</td><td>{attestation.status === 'VERIFIED' ? 'Verifica demo' : 'In attesa'}</td></tr></tbody></table></div>
          </section>

          <section className="public-verification-box">
            <div className="public-verification-box__icon"><FileKey2 size={25} /></div>
            <div><span className="micro-label">VERIFICA PUBBLICA MINIMIZZATA</span><h3>Un link per lo stato, non per i tuoi dati commerciali.</h3><p>La pagina pubblica mostra esito, identificativo, data e progetto. Non espone fornitura, Fondo, organizzazione o riferimento bancario.</p><code>{publicUrl}</code></div>
            <div className="public-verification-box__actions"><CopyButton value={publicUrl} notify={notify} /><a className="button button--outline" href={publicUrl} target="_blank" rel="noreferrer">Apri verifica <ArrowUpRight size={17} /></a></div>
          </section>
        </section>}

        {attestation && <aside className="attestation-review-panel" aria-label="Revisione e audit trail">
          <div className="panel-heading"><div><span className="micro-label">GARANTE TERZO</span><h2>Revisione</h2></div><ShieldCheck size={21} /></div>
          <div className="review-owner"><span>SG</span><div><b>Startup garante</b><small>{attestation.verifiedBy || 'Revisione demo in attesa'}</small></div></div>
          {attestation.status === 'PENDING_REVIEW' && <button className="button button--cobalt button--full" type="button" onClick={() => setReviewOpen(true)} disabled={!attestation.reconciliation.valid}><BadgeCheck size={17} />Registra revisione demo</button>}
          {attestation.status === 'VERIFIED' && <div className="verified-note"><CheckCircle2 size={18} /><p>Revisione demo registrata. Non è una registrazione notarile né una firma qualificata.</p></div>}
          {attestation.reviewNote && <div className="review-note"><span>NOTA DI REVISIONE</span><p>{attestation.reviewNote}</p></div>}
          <div className="audit-trail-heading"><span>AUDIT TRAIL / APPEND-ONLY</span><b>{attestation.auditTrail.length}</b></div>
          <ReviewTimeline events={[...attestation.auditTrail].reverse()} />
          <div className="audit-integrity"><Link2 size={17} /><p>Ogni evento conserva attore, data e descrizione. Le modifiche amministrative reali richiederanno RBAC e identità ufficiali.</p></div>
        </aside>}
      </div>
      {reviewOpen && <ReviewDialog title={`Revisiona ${attestation.id}`} subject="attestazione" onClose={() => setReviewOpen(false)} onSubmit={review} />}
    </div>
  );
}
