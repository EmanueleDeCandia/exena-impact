import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  FileQuestion,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api, copyText } from './api.js';

export const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
export const integer = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
export const decimal = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (cents = 0) => euro.format(cents / 100);
export const dateTime = (value) => value ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
export const shortDate = (value) => value ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

const statusLabels = {
  VERIFIED: 'Verificato · demo',
  PENDING_REVIEW: 'In revisione',
  DRAFT: 'Bozza',
  SUPERSEDED: 'Versione superata',
  REJECTED_WITH_REASON: 'Integrazioni richieste',
  CONFIRMED: 'Confermato',
  ACTIVE: 'Attivo',
  REVOKED: 'Revocato',
  EXPIRED: 'Scaduto',
  GENERATED: 'Generato',
  SENT: 'Inviato',
  ACCEPTED_DEMO: 'Accettato · demo',
  FACTUAL_REVIEW: 'Verifica fattuale',
  EDITORIAL_REVIEW: 'Revisione editoriale',
  PUBLISHED: 'Pubblicato',
  ARCHIVED: 'Archiviato',
  CHANGES_REQUESTED: 'Integrazioni richieste',
  VERIFIED_DEMO: 'Verificato · demo',
  REMOVED: 'Rimosso dal pubblico',
  REQUESTED: 'Richiesta inviata',
  CANCELLED: 'Annullata',
  NOT_STARTED: 'Da accettare',
  IN_PROGRESS: 'In corso',
  COMPLETED: 'Completato',
  ACTIVE_DEMO: 'Attivo · demo',
  REQUEST_ONLY: 'Solo richiesta',
  STALE: 'Disponibilità non aggiornata',
  OPEN: 'Aperta',
  CLOSED: 'Chiusa',
  SCHEDULED: 'Programmata',
  LIVE: 'Live',
  IMPLEMENTED: 'Attuata · demo',
  FOLLOWUP_DEMO: 'Follow-up · demo',
  SUBMITTED: 'Inviato · non pagato',
  RECTIFIED: 'Rettificato',
  AVAILABLE: 'Da attivare',
  ACTIVATION_REQUIRED: 'Attivazione richiesta',
  LOCKED_THRESHOLD: 'Soglia non raggiunta',
  VALIDATED: 'Validato',
  APPROVED: 'Approvato',
  SHIPMENT_PLANNED: 'Spedizione pianificata',
  PLANNED: 'Pianificata',
  INVITED: 'Invitata',
  PENDING_VERIFICATION: 'In verifica',
  RECONCILED_DEMO: 'Riconciliato · demo',
};

export function StatusBadge({ status, label }) {
  return <span className={`status-badge status-badge--${String(status).toLowerCase()}`}><span aria-hidden="true" />{label || statusLabels[status] || status}</span>;
}

export function DemoNotice({ compact = false }) {
  return (
    <div className={`demo-notice ${compact ? 'demo-notice--compact' : ''}`} role="note">
      <AlertCircle size={16} aria-hidden="true" />
      <span><b>Ambiente demo.</b> Dati sintetici, non validi per reporting, revisione o finalità legali.</span>
    </div>
  );
}

export function LoadingState({ label = 'Caricamento dati' }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <span>{label}</span>
      <div className="loading-state__lines" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Non riesco a caricare questa vista' }) {
  return (
    <div className="state-card state-card--error" role="alert">
      <AlertCircle size={28} aria-hidden="true" />
      <div><h2>{title}</h2><p>{error?.message || 'Servizio temporaneamente non disponibile.'}</p></div>
      {onRetry && <button className="button button--outline" type="button" onClick={onRetry}><RefreshCw size={17} />Riprova</button>}
    </div>
  );
}

export function EmptyState({ title = 'Nessun elemento', text, action, icon: Icon = FileQuestion }) {
  return (
    <div className="state-card state-card--empty">
      <Icon size={30} aria-hidden="true" />
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function BlockedState({ title, text }) {
  return (
    <div className="blocked-state" role="note">
      <LockKeyhole size={20} aria-hidden="true" />
      <div><b>{title}</b><p>{text}</p></div>
    </div>
  );
}

export function useApiData(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await api(path);
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === requestId.current) setState({ data: null, error, loading: false });
      throw error;
    }
  }, [path]);
  useEffect(() => {
    load().catch(() => {});
    return () => { requestId.current += 1; };
  }, [load]);
  return { ...state, reload: load };
}

export function Dialog({ title, eyebrow, children, onClose, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
    >
      <div className="dialog__surface">
        <header className="dialog__header">
          <div>{eyebrow && <span className="micro-label">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi finestra"><X /></button>
        </header>
        <div className="dialog__body">{children}</div>
      </div>
    </dialog>
  );
}

export function ExportMenu({ onExport, notify, formats = ['pdf', 'csv', 'json'], label = 'Esporta' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  const run = async (format) => {
    setBusy(true);
    try {
      const filename = await onExport(format);
      notify?.('success', filename ? `${filename} scaricato` : 'Export completato');
      setOpen(false);
    } catch (error) {
      notify?.('error', error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="export-menu" ref={rootRef}>
      <button className="button button--dark" type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)} disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}{busy ? 'Preparazione…' : label}<ChevronDown size={16} />
      </button>
      {open && <div className="export-menu__list" role="menu">
        {formats.map((format) => <button key={format} type="button" role="menuitem" onClick={() => run(format)}><span>.{format.toUpperCase()}</span><small>{format === 'zip' ? 'Indice + manifest + evidenze' : format === 'pdf' ? 'Documento digitale' : 'Dati strutturati'}</small><ArrowRight size={16} /></button>)}
      </div>}
    </div>
  );
}

export function CopyButton({ value, notify, label = 'Copia link' }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await copyText(value);
      setCopied(true);
      notify?.('success', 'Link copiato negli appunti');
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) { notify?.('error', error.message); }
  };
  return <button className="button button--outline" type="button" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Copiato' : label}</button>;
}

export function ReviewDialog({ title, onClose, onSubmit, subject = 'documento' }) {
  const [outcome, setOutcome] = useState('VERIFIED');
  const [note, setNote] = useState('Completezza formale e riferimenti controllati in ambiente demo.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try { await onSubmit({ outcome, note }); }
    catch (reason) { setError(reason.message); setBusy(false); }
  };
  return (
    <Dialog title={title} eyebrow="AZIONE REVISORE / SIMULAZIONE DEMO" onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <DemoNotice compact />
        <p>Registra un esito fittizio per provare il flusso. Non equivale a una verifica professionale e resta marcato come demo in ogni output.</p>
        <fieldset className="choice-cards choice-cards--two">
          <legend>Esito della revisione del {subject}</legend>
          <label className={outcome === 'VERIFIED' ? 'is-selected' : ''}><input type="radio" name="outcome" value="VERIFIED" checked={outcome === 'VERIFIED'} onChange={(event) => setOutcome(event.target.value)} /><CheckCircle2 size={20} /><span><b>Verifica demo</b><small>Requisiti formali completi</small></span></label>
          <label className={outcome === 'REJECTED_WITH_REASON' ? 'is-selected' : ''}><input type="radio" name="outcome" value="REJECTED_WITH_REASON" checked={outcome === 'REJECTED_WITH_REASON'} onChange={(event) => setOutcome(event.target.value)} /><CircleDashed size={20} /><span><b>Richiedi integrazioni</b><small>Il documento torna modificabile</small></span></label>
        </fieldset>
        <label className="field"><span>Nota di revisione *</span><textarea rows="4" required minLength="3" value={note} onChange={(event) => setNote(event.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog__actions"><button className="button button--ghost" type="button" onClick={onClose}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />}Registra esito demo</button></div>
      </form>
    </Dialog>
  );
}

export function ReviewTimeline({ events = [], createdAt, status }) {
  return (
    <ol className="review-timeline">
      {events.map((event, index) => <li key={`${event.at}-${index}`}><span className="review-timeline__dot" /><div><b>{event.note || event.event}</b><p>{event.actor}</p><time>{dateTime(event.at)}</time></div></li>)}
      {createdAt && <li><span className="review-timeline__dot" /><div><b>Documento creato</b><p>Stato iniziale e versione registrati</p><time>{dateTime(createdAt)}</time></div></li>}
      {!events.length && !createdAt && <li><span className="review-timeline__dot" /><div><b>Nessuna attività di revisione</b><p>Stato corrente: {statusLabels[status] || status}</p></div></li>}
    </ol>
  );
}

export function SourcePill({ children }) {
  return <span className="source-pill"><ShieldCheck size={14} aria-hidden="true" />{children}</span>;
}

export function ActivityList({ activity = [] }) {
  if (!activity.length) return <EmptyState icon={Clock3} title="Nessuna attività recente" text="Le operazioni sul pacchetto appariranno qui." />;
  return <ol className="activity-list">{[...activity].reverse().map((event, index) => <li key={`${event.at}-${index}`}><span /><div><b>{event.event}</b><small>{event.actor} · {dateTime(event.at)}</small></div></li>)}</ol>;
}
