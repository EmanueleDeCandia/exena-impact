import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Download, FileSearch, Filter, Landmark, MapPin, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { usePageMetadata } from './metadata.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge, dateTime, shortDate, useApiData } from './ui.jsx';
import { operationsMoney } from './operations.jsx';

const statusLabel = { IN_PROGRESS: 'In attuazione', SCHEDULED: 'Programmato', COMPLETED: 'Completato' };

export function TransparencyRegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.toString();
  const { data, error, loading, reload } = useApiData(`/area5/transparency${query ? `?${query}` : ''}`);
  const [draft, setDraft] = useState({ q: searchParams.get('q') || '', municipality: searchParams.get('municipality') || '', status: searchParams.get('status') || '' });
  usePageMetadata({ title: 'Registro Pubblico Trasparente — Sibillini Impact', description: 'Fondi e progetti demo nei borghi con importi pubblicabili, fonti C02 riconciliate e rettifiche visibili.', path: `/trasparenza${query ? `?${query}` : ''}`, index: true });
  const apply = (event) => { event.preventDefault(); const next = Object.fromEntries(Object.entries(draft).filter(([, value]) => value)); setSearchParams(next); };
  const reset = () => { setDraft({ q: '', municipality: '', status: '' }); setSearchParams({}); };
  return <div className="transparency-public">
      <header className="transparency-hero"><div><span className="micro-label">REGISTRO PUBBLICO / LETTURA LIBERA</span><h1>Fondi e progetti.<br /><em>Fonti in chiaro.</em></h1><p>Per cittadini, enti e partner: consulta allocazioni aggregate, territori, stato dei progetti e rettifiche senza accedere a condizioni commerciali o dati personali.</p></div><Landmark size={50} /></header>
      {loading && !data && <LoadingState label="Caricamento dataset pubblico riconciliato" />}
      {error && <ErrorState error={error} onRetry={() => reload().catch(() => {})} />}
      {data && <>
        <section className="transparency-kpis" aria-label="Totali pubblici"><article><span>Fondi pubblicabili</span><strong>{operationsMoney(data.totalCents)}</strong><small>Somma delle allocazioni riconciliate</small></article><article><span>Progetti pubblicati</span><strong>{data.projectCount}</strong><small>{data.municipalities.length} ambiti territoriali demo</small></article><article><span>Aggiornato al</span><strong>{shortDate(data.updatedAt)}</strong><small>{dateTime(data.updatedAt)} · non tempo reale</small></article></section>
        <div className={`transparency-reconciliation transparency-reconciliation--${data.reconciliation.status.toLowerCase()}`}><ShieldCheck size={22} /><div><b>{data.reconciliation.status === 'RECONCILED_DEMO' ? 'Riconciliazione C02 completata · demo' : 'Riconciliazione da revisionare'}</b><p>{data.reconciliation.validSources}/{data.reconciliation.expectedSources} fonti hanno importi pubblicabili coerenti con le attestazioni verificate. Le fonti non coerenti vengono escluse dal dataset.</p></div></div>
        <section className="transparency-register" aria-labelledby="transparency-list-title">
          <div className="transparency-register__toolbar"><div><span className="micro-label">DATASET PUBBLICO / {data.visibleCount} RISULTATI</span><h2 id="transparency-list-title">Progetti nei borghi</h2></div><a className="button button--dark" href={`/api/area5/transparency/export.csv${query ? `?${query}` : ''}`} download><Download size={17} />Esporta CSV</a></div>
          <form className="transparency-filters" onSubmit={apply}><label className="field"><span>Cerca progetto o borgo</span><input value={draft.q} onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))} placeholder="Es. rassegna o Accumoli" /></label><label className="field"><span>Territorio</span><select value={draft.municipality} onChange={(event) => setDraft((current) => ({ ...current, municipality: event.target.value }))}><option value="">Tutti i territori</option>{data.municipalities.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Stato</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="">Tutti gli stati</option><option value="IN_PROGRESS">In attuazione</option><option value="SCHEDULED">Programmato</option><option value="COMPLETED">Completato</option></select></label><div className="transparency-filters__actions"><button className="button button--cobalt" type="submit"><Filter size={16} />Applica filtri</button><button className="icon-button" type="button" onClick={reset} aria-label="Azzera filtri"><RotateCcw size={18} /></button></div></form>
          {data.projects.length ? <div className="transparency-projects"><div className="transparency-projects__header"><span>Progetto / territorio</span><span>Importo pubblicabile</span><span>Stato / aggiornamento</span><span>Fonte</span></div>{data.projects.map((project) => <article key={project.publicId}><div><span className="micro-label">{project.publicId}</span><h3>{project.title}</h3><p><MapPin size={14} />{project.village} · {project.municipality}</p></div><strong>{operationsMoney(project.amountCents)}</strong><div><StatusBadge status={project.operationalStatus} label={statusLabel[project.operationalStatus] || project.operationalStatus} /><small>Aggiornato {shortDate(project.updatedAt)}</small></div><Link className="button button--outline" to={`/trasparenza/${project.slug}`} aria-label={`Apri fonti e dettagli: ${project.title}`}>Dettagli e fonti <ArrowRight size={16} /></Link></article>)}</div> : <EmptyState icon={FileSearch} title="Nessun progetto con questi filtri" text="Azzera i filtri o modifica la ricerca. I progetti non riconciliati non vengono presentati come dati pubblici validi." />}
        </section>
        <footer className="transparency-method"><ShieldCheck size={20} /><p><b>Metodo.</b> Il registro deriva da allocazioni pubblicabili associate ad attestazioni C02 verificate e riconciliate con gli ordini. Non espone prezzi unitari, clienti, Partite IVA, indirizzi o nominativi. Tutti i contenuti sono dimostrativi.</p></footer>
      </>}
  </div>;
}

export function TransparencyProjectPage() {
  const { slug } = useParams();
  const { data, error, loading } = useApiData(`/area5/transparency/projects/${encodeURIComponent(slug)}`);
  const project = data?.project;
  usePageMetadata({ title: project ? `${project.title} — Trasparenza` : 'Progetto pubblico — Trasparenza', description: project?.description || 'Dettaglio pubblico di un progetto territoriale dimostrativo.', path: `/trasparenza/${slug}`, index: true });
  return <div className="transparency-detail">
    <Link className="workspace-back" to="/trasparenza"><ArrowLeft size={17} />Torna al registro</Link>
    {loading && <LoadingState label="Caricamento progetto e fonti" />}
    {error && <div className="public-state-card"><FileSearch size={35} /><h1>Progetto non disponibile.</h1><p>{error.message}. Il permalink può essere errato oppure la fonte non è più riconciliata.</p></div>}
    {project && <article><header><span className="micro-label">{project.publicId} / AGGIORNATO {shortDate(project.updatedAt)}</span><h1>{project.title}</h1><p><MapPin size={17} />{project.village} · {project.municipality}</p><StatusBadge status={project.operationalStatus} label={statusLabel[project.operationalStatus] || project.operationalStatus} /></header><section className="transparency-detail__amount"><span>Importo pubblicabile</span><strong>{operationsMoney(project.amountCents)}</strong><small>Pubblicato il {shortDate(project.publicDate)}</small></section><section><h2>Perimetro del progetto</h2><p>{project.description}</p></section><section><div className="section-heading"><span className="micro-label">FONTI PUBBLICHE / C02</span><h2>Da dove deriva il dato</h2></div>{project.sources.map((source, index) => <div className="transparency-source" key={`${source.publicPath}-${index}`}><CheckCircle2 size={20} /><div><b>{source.label}</b><small>Verificata {dateTime(source.verifiedAt)}</small></div><Link className="button button--outline" to={source.publicPath}>Apri verifica minimizzata <ArrowRight size={16} /></Link></div>)}</section><section><div className="section-heading"><span className="micro-label">RETTIFICHE / STORICO VISIBILE</span><h2>Correzioni pubbliche</h2></div>{project.rectifications.length ? <ol className="transparency-rectifications">{project.rectifications.map((item, index) => <li key={`${item.at}-${index}`}><b>{operationsMoney(item.previousAmountCents)} → {operationsMoney(item.newAmountCents)}</b><p>{item.reason}</p><time>{dateTime(item.at)}</time></li>)}</ol> : <p>Nessuna rettifica pubblicata per questo progetto.</p>}</section></article>}
  </div>;
}
