import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  EyeOff,
  FileCheck2,
  Landmark,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import { DemoNotice, EmptyState, ErrorState, LoadingState, StatusBadge, useApiData, dateTime } from './ui.jsx';
import { api } from './api.js';

function usePublicMeta(title) {
  useEffect(() => {
    document.title = title;
    let meta = document.querySelector('meta[name="robots"]');
    const existing = meta?.content;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex, nofollow';
    return () => { if (existing) meta.content = existing; else meta.remove(); };
  }, [title]);
}

export function PublicShell({ children, label, className = '' }) {
  return (
    <div className={`public-verification-page ${className}`}>
      <DemoNotice />
      <header className="public-header"><Link className="workspace-brand" to="/"><span className="brand__mark" aria-hidden="true"><i /><i /><i /></span><span className="brand__name">SIBILLINI<span>IMPACT</span></span></Link><span>{label}</span></header>
      <main>{children}</main>
      <footer className="public-footer"><Link to="/"><ArrowLeft size={16} />Torna a Sibillini Impact</Link><span>Verifica read-only · ambiente demo · dati sintetici</span></footer>
    </div>
  );
}

export function FundVerificationPage() {
  const { token } = useParams();
  usePublicMeta('Verifica attestazione — Sibillini Impact');
  const { data, error, loading, reload } = useApiData(`/public/fund/${encodeURIComponent(token)}`);

  return <PublicShell label="VERIFICA FONDO / ACCESSO PUBBLICO LIMITATO">
    {loading && <LoadingState label="Controllo dell’identificativo nel registro demo" />}
    {error && <div className="public-state-card"><AlertCircle size={34} /><span className="micro-label">VERIFICA NON DISPONIBILE</span><h1>Identificativo non trovato.</h1><p>{error.message}. Il link potrebbe essere incompleto o non più disponibile.</p><Link className="button button--outline" to="/">Torna al portale <ArrowRight size={17} /></Link></div>}
    {data && <article className="public-fund-card">
      <header><div className="public-verification-seal"><ShieldCheck size={35} /></div><div><span className="micro-label">ESITO DELLA VERIFICA DEMO</span><h1>{data.status === 'VERIFIED' ? 'Attestazione presente e verificata nel registro demo.' : 'Attestazione presente, revisione non completata.'}</h1></div><StatusBadge status={data.status} /></header>
      <p className="public-lead">L’identificativo è presente nel registro dimostrativo. Questo controllo non costituisce attestazione professionale, registrazione notarile o firma qualificata.</p>
      <dl className="public-facts"><div><dt>Identificativo</dt><dd>{data.id}</dd></div><div><dt>Versione documento</dt><dd>v{data.version}</dd></div><div><dt>Data versamento registrata</dt><dd>{dateTime(data.transferredAt)}</dd></div><div><dt>Progetto collegato</dt><dd>{data.project}</dd></div><div><dt>Revisione</dt><dd>{data.verifiedBy || 'Revisore demo non assegnato'}</dd></div><div><dt>Ambito dati</dt><dd>Sintetici / non validi per finalità legali</dd></div></dl>
      <section className="public-minimization"><EyeOff size={23} /><div><h2>Dati commerciali non esposti</h2><p>Questa pagina non mostra importo della fornitura, quota Fondo, numero di paia, organizzazione, cantiere o riferimento bancario.</p></div></section>
      <footer><CheckCircle2 size={18} /><span>Controllo effettuato sullo stato corrente del documento demo.</span><time>{new Intl.DateTimeFormat('it-IT', { dateStyle: 'long' }).format(new Date())}</time></footer>
    </article>}
  </PublicShell>;
}

export function PackSharePage() {
  const { token } = useParams();
  usePublicMeta('Evidence Pack condiviso — Sibillini Impact');
  const { data, error, loading } = useApiData(`/public/packs/${encodeURIComponent(token)}`);
  const loggedToken = useRef(null);
  useEffect(() => {
    if (!data || loggedToken.current === token) return;
    loggedToken.current = token;
    api(`/public/packs/${encodeURIComponent(token)}/view`, { method: 'POST' }).catch(() => {});
  }, [data, token]);

  return <PublicShell label="EVIDENCE PACK / CONDIVISIONE READ-ONLY">
    {loading && <LoadingState label="Apertura del pacchetto condiviso" />}
    {error && <div className="public-state-card"><Link2 size={34} /><span className="micro-label">ACCESSO NON DISPONIBILE</span><h1>Link scaduto o revocato.</h1><p>{error.message}. Richiedi al proprietario del pacchetto un nuovo collegamento temporaneo.</p><Link className="button button--outline" to="/">Torna al portale <ArrowRight size={17} /></Link></div>}
    {data && <article className="public-pack-card">
      <header><div><span className="micro-label">{data.type} PACK / ACCESSO TEMPORANEO</span><h1>{data.title}</h1><p>{data.organizationName}</p></div><StatusBadge status={data.status} /></header>
      <div className="public-pack-summary"><div><span>EVIDENZE COMPLETE</span><strong>{data.completeItems}/{data.totalItems}</strong><small>completezza formale, non punteggio ESG</small></div><div><span>SCADENZA LINK</span><strong>{dateTime(data.expiresAt)}</strong><small>accesso read-only revocabile</small></div></div>
      <section className="public-pack-index"><div className="panel-heading"><div><span className="micro-label">INDICE PUBBLICO MINIMIZZATO</span><h2>Checklist del pacchetto</h2></div>{data.type === 'BANK' ? <Landmark size={22} /> : <FileCheck2 size={22} />}</div><ol>{data.items.map((item, index) => <li key={`${item.label}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.label}</b>{item.complete ? <span className="evidence-state evidence-state--ok"><CheckCircle2 size={16} />Completa</span> : <span className="evidence-state evidence-state--missing"><AlertCircle size={16} />Non completa</span>}</li>)}</ol></section>
      <section className="public-minimization"><EyeOff size={23} /><div><h2>Solo l’indice è condiviso</h2><p>Documenti sorgente, importi, ordini, dati bancari e altre aree dell’organizzazione non sono accessibili da questo link.</p></div></section>
      <div className="public-pack-note"><Clock3 size={18} /><p>La visualizzazione è registrata nel log del proprietario senza raccogliere dati personali del visitatore. Completezza e revisione sono simulate in ambiente demo.</p></div>
    </article>}
  </PublicShell>;
}
