import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Eye,
  FileCheck2,
  FileClock,
  FilePlus2,
  FolderCheck,
  Landmark,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import {
  ActivityList,
  BlockedState,
  CopyButton,
  Dialog,
  EmptyState,
  ErrorState,
  ExportMenu,
  LoadingState,
  ReviewDialog,
  StatusBadge,
  useApiData,
  dateTime,
  shortDate,
} from './ui.jsx';

const evidenceRequirements = {
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

const typeLabels = { LCA_DATASET: 'Dataset LCA', BANK_RECEIPT: 'Giustificativo bancario', SOCIAL_REPORT: 'Report sociale', PROCUREMENT_POLICY: 'Protocollo acquisti', AUDIT_TRAIL: 'Audit trail', EMISSION_FACTORS: 'Fattori di emissione', MANAGEMENT_REPRESENTATION: 'Dichiarazione management' };

function shareState(share) {
  if (share.revokedAt) return 'REVOKED';
  if (new Date(share.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

export function PacksPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area1/packs');
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'ASSURANCE' ? 'ASSURANCE' : 'BANK';
  const [activeType, setActiveType] = useState(initialType);
  const [selections, setSelections] = useState({});
  const [linkingItem, setLinkingItem] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [revokeToken, setRevokeToken] = useState(null);

  useEffect(() => { document.title = 'Assurance & Bank Pack Studio — Sibillini Impact'; }, []);
  useEffect(() => {
    const requested = searchParams.get('type');
    if (requested === 'BANK' || requested === 'ASSURANCE') setActiveType(requested);
  }, [searchParams]);

  const packs = data?.packs || [];
  const pack = packs.find((item) => item.type === activeType);
  const editable = pack && ['DRAFT', 'REJECTED_WITH_REASON'].includes(pack.status);
  const documents = data?.evidenceDocuments || [];

  useEffect(() => { setSelections({}); setReviewOpen(false); setSubmitOpen(false); }, [pack?.id]);

  const selectType = (type) => {
    setActiveType(type);
    setSearchParams({ type }, { replace: true });
  };
  const onTypeKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'BANK' : event.key === 'End' ? 'ASSURANCE' : activeType === 'BANK' ? 'ASSURANCE' : 'BANK';
    selectType(next);
    requestAnimationFrame(() => document.getElementById(`pack-tab-${next.toLowerCase()}`)?.focus());
  };
  const linkEvidence = async (item) => {
    const evidenceId = selections[item.id];
    if (!evidenceId) return;
    setLinkingItem(item.id);
    try {
      await api(`/area1/packs/${pack.id}/evidence`, { method: 'POST', body: JSON.stringify({ itemId: item.id, evidenceId }) });
      await reload();
      notify('success', `Evidenza collegata · ${item.label}`);
    } catch (reason) { notify('error', reason.message); }
    finally { setLinkingItem(null); }
  };
  const submitPack = async () => {
    try {
      await api(`/area1/packs/${pack.id}/submit`, { method: 'POST' });
      await reload();
      setSubmitOpen(false);
      notify('success', 'Pacchetto completo inviato alla revisione Startup demo');
    } catch (reason) { notify('error', reason.message); }
  };
  const reviewPack = async ({ outcome, note }) => {
    await api(`/area1/packs/${pack.id}/review`, { method: 'POST', body: JSON.stringify({ outcome, note }) });
    await reload();
    setReviewOpen(false);
    notify('success', outcome === 'VERIFIED' ? 'Revisione formale demo completata' : 'Pacchetto restituito per integrazioni');
  };
  const createShare = async () => {
    setShareBusy(true);
    try {
      await api(`/area1/packs/${pack.id}/share`, { method: 'POST' });
      await reload();
      notify('success', 'Link read-only creato · scadenza tra 24 ore');
    } catch (reason) { notify('error', reason.message); }
    finally { setShareBusy(false); }
  };
  const revokeShare = async () => {
    try {
      await api(`/area1/shares/${revokeToken}`, { method: 'DELETE' });
      await reload();
      setRevokeToken(null);
      notify('success', 'Link revocato con effetto immediato');
    } catch (reason) { notify('error', reason.message); }
  };

  if (loading && !data) return <LoadingState label="Caricamento checklist ed evidenze" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className={`module-page packs-page packs-page--${activeType.toLowerCase()}`}>
      <header className="module-heading">
        <div><div className="eyebrow"><span /> C04 / ASSURANCE & BANK PACK STUDIO</div><h1>Le evidenze giuste.<br /><em>Per l’interlocutore giusto.</em></h1><p>Per il dialogo con banche e revisori prepari due fascicoli diversi, con checklist dedicate e lacune esplicite. La completezza documentale non promette rating, credito agevolato o esito dell’attestazione.</p></div>
        {pack && <div className="module-heading__actions"><button className="button button--outline" type="button" onClick={() => setShareOpen(true)}><Share2 size={17} />Condividi</button><ExportMenu formats={['zip', 'pdf']} onExport={(format) => downloadFile(`/area1/packs/${pack.id}/export?format=${format}`)} notify={notify} /></div>}
      </header>

      <div className="pack-type-tabs" role="tablist" aria-label="Tipologia di pacchetto" onKeyDown={onTypeKeyDown}>
        <button id="pack-tab-bank" type="button" role="tab" tabIndex={activeType === 'BANK' ? 0 : -1} aria-selected={activeType === 'BANK'} aria-controls="pack-workspace" className={activeType === 'BANK' ? 'is-active' : ''} onClick={() => selectType('BANK')}><Landmark size={25} /><span><small>01 / DIALOGO BANCARIO</small><b>Bank Pack</b><p>Sintesi sul procurement sostenibile per l’istituto di credito.</p></span><ArrowRight /></button>
        <button id="pack-tab-assurance" type="button" role="tab" tabIndex={activeType === 'ASSURANCE' ? 0 : -1} aria-selected={activeType === 'ASSURANCE'} aria-controls="pack-workspace" className={activeType === 'ASSURANCE' ? 'is-active' : ''} onClick={() => selectType('ASSURANCE')}><ShieldCheck size={25} /><span><small>02 / REVISORE DI SOSTENIBILITÀ</small><b>Assurance Pack</b><p>Percorso probatorio e riferimenti ISAE 3000 readiness.</p></span><ArrowRight /></button>
      </div>

      {!pack && <EmptyState title={`Nessun ${activeType} Pack`} text="Il pacchetto sarà disponibile dopo la configurazione della checklist." />}

      {pack && <div id="pack-workspace" role="tabpanel" aria-labelledby={`pack-tab-${activeType.toLowerCase()}`} className="pack-workspace">
        <section className="pack-status-header" aria-labelledby="pack-title">
          <div className="pack-status-header__identity"><span className="micro-label">{pack.id} / VERSIONE {pack.version}</span><h2 id="pack-title">{pack.title}</h2><p>Aggiornato {dateTime(pack.updatedAt)} · owner integrazioni ESG Manager demo</p></div>
          <StatusBadge status={pack.status} />
          <div className="completeness-block"><div><span>COMPLETEZZA DOCUMENTALE</span><strong>{pack.percentage}%</strong></div><div className="completeness-track" role="progressbar" aria-label="Completezza documentale" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pack.percentage}><i style={{ width: `${pack.percentage}%` }} /></div><p><b>{pack.completeItems} di {pack.totalItems} evidenze verificate.</b> Non è un punteggio ESG.</p></div>
        </section>

        {pack.status === 'PENDING_REVIEW' && <BlockedState title="Checklist bloccata durante la revisione" text="Le evidenze non sono modificabili. Puoi esportare l’indice o attendere l’esito del revisore demo." />}
        {pack.status === 'VERIFIED' && <div className="verified-note"><CheckCircle2 size={19} /><p>Completezza formale verificata in ambiente demo. Non costituisce attestazione CSRD, rating bancario o garanzia di finanziamento.</p></div>}
        {pack.status === 'REJECTED_WITH_REASON' && <div className="changes-requested"><CircleDashed size={20} /><div><b>Integrazioni richieste dal revisore demo</b><p>{pack.reviewNote}</p></div></div>}

        <div className="pack-main-grid">
          <section className="pack-checklist" aria-labelledby="checklist-title">
            <div className="panel-heading"><div><span className="micro-label">CHECKLIST {activeType}</span><h3 id="checklist-title">Evidenze e integrazioni</h3></div><span>{pack.completeItems}/{pack.totalItems} complete</span></div>
            <div className="checklist-items">
              {pack.items.map((item, index) => {
                const expectedType = evidenceRequirements[item.id];
                const options = documents.filter((document) => !expectedType || document.type === expectedType);
                const selected = selections[item.id] ?? '';
                return <article key={item.id} className={`checklist-item ${item.complete ? 'is-complete' : 'is-missing'}`}>
                  <div className="checklist-item__number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="checklist-item__main">
                    <div className="checklist-item__title"><div><span>{item.required ? 'OBBLIGATORIA' : 'OPZIONALE'} · {typeLabels[expectedType] || 'EVIDENZA'}</span><h4>{item.label}</h4></div>{item.complete ? <span className="evidence-state evidence-state--ok"><CheckCircle2 size={17} />Verificata demo</span> : <span className="evidence-state evidence-state--missing"><AlertCircle size={17} />{item.evidence ? 'Non verificata' : 'Mancante'}</span>}</div>
                    {item.evidence ? <div className="linked-evidence"><FileCheck2 size={19} /><div><b>{item.evidence.title}</b><p>{item.evidence.id} · v{item.evidence.version} · fonte {item.evidence.sourceId || 'documento organizzazione'}</p><small>Aggiornata {dateTime(item.evidence.updatedAt)}</small></div><StatusBadge status={item.evidence.status} /></div> : <div className="missing-evidence"><FilePlus2 size={20} /><div><b>Collega un’evidenza {typeLabels[expectedType]?.toLowerCase() || 'valida'}</b><p>Owner dell’integrazione: {item.owner}. Il documento deve essere verificato per completare la voce.</p></div></div>}
                    {editable && <div className="evidence-link-control"><label><span>{item.evidence ? 'Sostituisci evidenza' : 'Seleziona evidenza'}</span><select value={selected} onChange={(event) => setSelections((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Scegli dal registro…</option>{options.map((document) => <option key={document.id} value={document.id}>{document.id} · {document.title} · {document.status}</option>)}</select></label><button className="button button--outline" type="button" disabled={!selected || selected === item.evidenceId || linkingItem === item.id} onClick={() => linkEvidence(item)}>{linkingItem === item.id ? <LoaderCircle className="spin" size={17} /> : <Link2 size={17} />}{item.evidence ? 'Sostituisci' : 'Collega'}</button></div>}
                  </div>
                </article>;
              })}
            </div>
            <footer className="pack-review-actions"><div><span>CONTROLLO PRE-REVISIONE</span><b>{pack.complete ? 'Tutte le evidenze obbligatorie sono verificate' : `Mancano ${pack.totalItems - pack.completeItems} evidenze complete`}</b></div>{editable && <button className="button button--cobalt" type="button" disabled={!pack.complete} onClick={() => setSubmitOpen(true)}><Send size={17} />Invia a revisione</button>}{pack.status === 'PENDING_REVIEW' && <button className="button button--cobalt" type="button" onClick={() => setReviewOpen(true)}><BadgeCheck size={17} />Registra revisione demo</button>}</footer>
          </section>

          <aside className="pack-side">
            <section className="pack-index"><div className="panel-heading"><div><span className="micro-label">ANTEPRIMA INDICE</span><h3>Contenuto dell’export</h3></div><FolderCheck size={20} /></div><ol>{pack.items.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{item.label}</b><small>{item.evidence?.id || 'evidenza da collegare'}</small></div>{item.complete ? <Check size={16} /> : <AlertCircle size={16} />}</li>)}</ol><div className="pack-index__files"><span>LEGGIMI.txt</span><span>manifest.json</span><span>indice.pdf</span><span>/evidenze/*.json</span></div></section>
            {activeType === 'ASSURANCE' && <section className="isae-note"><ShieldCheck size={22} /><div><span className="micro-label">ISAE 3000 READINESS</span><p>Il fascicolo ordina evidenze e riferimenti per il revisore incaricato. Non dichiara che un’attestazione ISAE sia stata rilasciata.</p></div></section>}
            {activeType === 'BANK' && <section className="isae-note"><Landmark size={22} /><div><span className="micro-label">DIALOGO BANCARIO</span><p>Il pacchetto supporta la relazione con l’istituto di credito. Non rappresenta un rating né un esito sul merito di credito.</p></div></section>}
            <section className="pack-activity"><div className="panel-heading"><div><span className="micro-label">ATTIVITÀ</span><h3>Registro pacchetto</h3></div><FileClock size={20} /></div><ActivityList activity={pack.activity || []} /></section>
          </aside>
        </div>

        <section className="share-panel" aria-labelledby="share-title">
          <div><span className="micro-label">CONDIVISIONE TEMPORANEA / READ-ONLY</span><h3 id="share-title">Un accesso minimo, con scadenza e revoca.</h3><p>Il destinatario vede titolo, organizzazione, stato e completezza delle voci. Non accede agli importi, ai documenti sorgente o ad altre aree del tenant.</p></div>
          <div className="share-panel__stats"><div><span>LINK TOTALI</span><b>{pack.shares.length}</b></div><div><span>VISUALIZZAZIONI LOGGATE</span><b>{pack.shares.reduce((sum, share) => sum + (share.viewEvents?.length || 0), 0)}</b></div><button className="button button--dark" type="button" onClick={() => setShareOpen(true)}><Share2 size={17} />Gestisci link</button></div>
        </section>
      </div>}

      {submitOpen && <Dialog title="Inviare il pacchetto alla revisione?" eyebrow="CONFERMA AZIONE" onClose={() => setSubmitOpen(false)}><div className="confirm-dialog"><Send size={28} /><p>Hai collegato <b>{pack.completeItems}/{pack.totalItems} evidenze verificate</b>. La checklist sarà bloccata durante la revisione. La completezza formale non anticipa l’esito del revisore.</p><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setSubmitOpen(false)}>Annulla</button><button className="button button--cobalt" type="button" onClick={submitPack}>Conferma invio <ArrowRight size={17} /></button></div></div></Dialog>}
      {reviewOpen && <ReviewDialog title={`Revisiona ${pack.id}`} subject="pacchetto" onClose={() => setReviewOpen(false)} onSubmit={reviewPack} />}

      {shareOpen && pack && <Dialog title="Condivisione read-only" eyebrow={`${pack.id} / LINK TEMPORANEI`} onClose={() => setShareOpen(false)} className="dialog--wide">
        <div className="share-dialog">
          <div className="share-dialog__intro"><Share2 size={25} /><div><h3>Link a scadenza di 24 ore</h3><p>Ogni apertura pubblica viene registrata senza raccogliere dati personali del visitatore. La revoca ha effetto immediato.</p></div></div>
          {pack.status !== 'VERIFIED' ? <BlockedState title="Condivisione non disponibile" text="Solo un pacchetto con revisione demo completata può essere condiviso. Completa checklist e revisione prima di creare un link." /> : <button className="button button--cobalt" type="button" onClick={createShare} disabled={shareBusy}>{shareBusy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Crea un nuovo link di 24 ore</button>}
          <div className="share-list">
            {pack.shares.slice().reverse().map((share) => { const state = shareState(share); const url = `${window.location.origin}/condivisioni/evidence/${share.token}`; return <article key={share.token} className={`share-item share-item--${state.toLowerCase()}`}><div className="share-item__top"><StatusBadge status={state} /><span><Eye size={15} />{share.viewEvents?.length || 0} visualizzazioni</span></div><code>{url}</code><div className="share-item__meta"><span>Creato {dateTime(share.createdAt)}</span><span>Scade {dateTime(share.expiresAt)}</span>{share.revokedAt && <span>Revocato {dateTime(share.revokedAt)}</span>}</div><div className="share-item__actions">{state === 'ACTIVE' && <><CopyButton value={url} notify={notify} /><a className="button button--outline" href={url} target="_blank" rel="noreferrer">Apri <ArrowUpRight size={16} /></a><button className="button button--danger" type="button" onClick={() => setRevokeToken(share.token)}><Trash2 size={16} />Revoca</button></>}</div></article>; })}
            {!pack.shares.length && <EmptyState icon={Link2} title="Nessun link creato" text="Quando il pacchetto è verificato, puoi creare un accesso read-only di 24 ore." />}
          </div>
        </div>
      </Dialog>}

      {revokeToken && <Dialog title="Revocare questo link?" eyebrow="CONFERMA REVOCA" onClose={() => setRevokeToken(null)}><div className="confirm-dialog"><Trash2 size={28} /><p>Il destinatario non potrà più aprire la pagina condivisa, anche se aveva salvato il collegamento. L’azione non elimina il pacchetto né il log delle visualizzazioni.</p><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setRevokeToken(null)}>Annulla</button><button className="button button--danger" type="button" onClick={revokeShare}>Revoca immediatamente</button></div></div></Dialog>}
    </div>
  );
}
