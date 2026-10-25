import { useContext, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BellRing, CheckCircle2, Gauge, Gift, Layers3, LockKeyhole, Network, TicketCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { DemoNotice, EmptyState, ErrorState, ExportMenu, LoadingState, StatusBadge, dateTime } from './ui.jsx';
import { OperationsFrame, useOperationsData, useOperationsSession } from './operations.jsx';
import { getTerminology } from '../lib/terminology.js';

const roles = ['PROCUREMENT', 'HR_WELFARE', 'BOARD', 'SITE_MANAGER', 'SUBCONTRACTOR'];
const stateLabel = { ACTIVE: 'Attivo', AVAILABLE: 'Da attivare', LOCKED_THRESHOLD: 'Soglia non raggiunta', ACTIVATION_REQUIRED: 'Attivazione contrattuale richiesta', EXPIRED: 'Scaduto' };

export function BenefitDashboardPage() {
  const { notify, data: bootstrap } = useContext(WorkspaceContext);
  const t = getTerminology(bootstrap?.organization?.profileType);
  const operations = useOperationsSession();
  const session = operations.session && roles.includes(operations.session?.member?.role) ? operations.session : null;
  const { data, error, loading, reload } = useOperationsData('/area5/dashboard', session);
  const [viewId, setViewId] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const current = data?.views.find((view) => view.id === viewId) || data?.views[0];
  useEffect(() => { if (data?.views.length && !data.views.some((view) => view.id === viewId)) setViewId(data.views[0].id); }, [data, viewId]);
  const services = useMemo(() => (current?.services || []).filter((service) => filter === 'ALL' || (filter === 'ACTIONS' ? ['AVAILABLE', 'ACTIVATION_REQUIRED'].includes(service.state) && !service.requestPending : service.track === filter)), [current, filter]);
  const activate = async (service) => {
    setBusyId(service.id); setActionError(null);
    try { await operations.authorized(`/area5/dashboard/entitlements/${service.id}/activate`, { method: 'POST', body: JSON.stringify({ viewId: current.id }) }); notify('success', `${service.title} attivato dal ledger ${current.label}`); await reload(); }
    catch (reason) { setActionError(reason.message); }
    finally { setBusyId(null); }
  };
  const requestActivation = async (service) => {
    setBusyId(service.id); setActionError(null);
    try { await operations.authorized(`/area5/dashboard/entitlements/${service.id}/activation-request`, { method: 'POST', body: '{}' }); notify('success', 'Richiesta registrata: nessun entitlement attivato automaticamente'); await reload(); }
    catch (reason) { setActionError(reason.message); }
    finally { setBusyId(null); }
  };
  const activeCount = current?.services.filter((service) => service.state === 'ACTIVE').length || 0;
  const actionCount = current?.services.filter((service) => ['AVAILABLE', 'ACTIVATION_REQUIRED'].includes(service.state) && !service.requestPending).length || 0;

  return <div className="operations-page benefit-dashboard-page">
    <header className="module-heading"><div><div className="eyebrow"><span /> AREA 05 / C13 · BENEFIT & THRESHOLD DASHBOARD</div><h1>Il volume maturato.<br /><em>La prossima azione chiara.</em></h1><p>Per Procurement, HR, Board, {t.managerRole.toLowerCase()} e {t.supplierPlural.toLowerCase()}: leggi lo stesso ledger nel tuo perimetro, distingui Standard e Varianti e agisci solo quando i requisiti sono soddisfatti.</p></div><div className="component-status"><span className="live-dot" />LEDGER DEDUPLICATO<span className="status-tag">10 / 25 / 50 / 100</span></div></header>
    <DemoNotice />
    <OperationsFrame operations={operations} roles={roles} component="C13 Benefit & Threshold Dashboard">
      {loading && !data && <LoadingState label="Allineamento ledger, soglie ed entitlement" />}
      {error && <ErrorState error={error} onRetry={() => reload().catch(() => {})} />}
      {data && current && <>
        <div className="dashboard-view-tabs" role="tablist" aria-label="Perimetro del ledger">{data.views.map((view) => <button key={view.id} type="button" role="tab" aria-selected={current.id === view.id} className={current.id === view.id ? 'is-selected' : ''} onClick={() => setViewId(view.id)}><Network size={17} /><span><b>{view.label}</b><small>{view.ledger.pairs} paia idonee</small></span></button>)}</div>
        <section className="dashboard-actions-required" aria-labelledby="actions-required-title"><BellRing size={22} /><div><span className="micro-label">AZIONI RICHIESTE</span><h2 id="actions-required-title">{actionCount ? `${actionCount} azioni disponibili nel tuo perimetro` : 'Nessuna attivazione in sospeso'}</h2><p>{actionCount ? 'Controlla le card “Da attivare” o completa la richiesta contrattuale. Le soglie bloccate non possono essere forzate.' : 'Le attivazioni disponibili sono state gestite. Eventuali soglie future restano indicate nella pipeline.'}</p></div></section>
        <section className="dashboard-kpis" aria-label="Indicatori del ledger"><article><span>Paia idonee</span><strong>{current.ledger.pairs}</strong><small>Ordini confermati e deduplicati</small></article><article><span>Volume diretto</span><strong>{current.ledger.directPairs}</strong><small>{current.ledger.networkAddedPairs ? `+ ${current.ledger.networkAddedPairs} paia di filiera autorizzate` : 'Nessun volume aggiuntivo condiviso'}</small></article><article><span>Servizi attivi</span><strong>{activeCount}</strong><small>Su {current.services.length} servizi nel perimetro</small></article><article><span>Prossima soglia</span><strong>{current.ledger.progress.nextThreshold?.value || 'Max'}</strong><small>{current.ledger.progress.nextThreshold ? `Mancano ${current.ledger.progress.nextThreshold.missingPairs} paia` : 'Tutte le soglie raggiunte'}</small></article></section>
        <section className="threshold-pipeline" aria-labelledby="pipeline-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">PROGRESSIONE / {current.label}</span><h2 id="pipeline-title">Soglie e benefit</h2></div><Gauge size={24} /></div><ol>{current.ledger.progress.thresholds.map((threshold) => <li key={threshold.id} className={threshold.unlocked ? 'is-unlocked' : ''}><span>{threshold.id}</span><div><b>{threshold.value} paia</b><small>{threshold.unlocked ? 'Soglia raggiunta' : `Mancano ${threshold.missingPairs} paia`}</small></div>{threshold.unlocked ? <CheckCircle2 size={19} /> : <LockKeyhole size={18} />}</li>)}</ol></section>
        <div className="dashboard-service-toolbar"><div><span className="micro-label">ENTITLEMENT / STATO E PROSSIMA AZIONE</span><h2>Servizi nel perimetro</h2></div><div className="dashboard-filters" role="group" aria-label="Filtra servizi">{[['ALL', 'Tutti'], ['ACTIONS', 'Azioni'], ['STANDARD', 'Standard'], ['VARIANT', 'Varianti']].map(([id, label]) => <button type="button" key={id} className={filter === id ? 'is-selected' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div></div>
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
        {services.length ? <div className="benefit-service-grid">{services.map((service) => <article key={service.id} className={`benefit-service benefit-service--${service.state.toLowerCase()}`}><div className="benefit-service__top"><span className={`track-chip track-chip--${service.track.toLowerCase()}`}>{service.track === 'STANDARD' ? 'STANDARD' : 'VARIANTE'}</span><StatusBadge status={service.state} label={service.requestPending && service.state === 'ACTIVATION_REQUIRED' ? 'Richiesta registrata' : stateLabel[service.state]} /></div><span className="micro-label">{service.componentId} / SOGLIA {service.requiredPairs}</span><h3>{service.title}</h3><p>{service.state === 'LOCKED_THRESHOLD' ? `Mancano ${service.missingPairs} paia. Il volume attuale non concede questo benefit.` : service.state === 'ACTIVATION_REQUIRED' ? service.requestPending ? 'La richiesta è nello storico; il contratto resta invariato fino alla revisione.' : 'La soglia da sola non attiva la Variante: serve il relativo entitlement contrattuale.' : service.state === 'AVAILABLE' ? 'Contratto e soglia sono coerenti: puoi registrare l’attivazione.' : service.fulfilment === 'PHYSICAL' ? 'Benefit fisico rappresentato digitalmente; evento e ingresso restano esterni.' : 'Entitlement attivo nel perimetro selezionato.'}</p><div className="benefit-service__action">
          {service.state === 'AVAILABLE' && <button className="button button--cobalt" type="button" disabled={busyId === service.id} onClick={() => activate(service)}>Attiva servizio <ArrowRight size={16} /></button>}
          {service.state === 'ACTIVATION_REQUIRED' && !service.requestPending && <button className="button button--outline" type="button" disabled={busyId === service.id} onClick={() => requestActivation(service)}>Richiedi attivazione</button>}
          {service.state === 'LOCKED_THRESHOLD' && ['PROCUREMENT', 'SUBCONTRACTOR'].includes(session?.member?.role) && <Link className="button button--outline" to="/app/ordini">Colma il gap <ArrowRight size={16} /></Link>}
          {service.state === 'ACTIVE' && service.route && <Link className="button button--dark" to={service.route}>Apri componente <ArrowRight size={16} /></Link>}
          {service.state === 'ACTIVE' && service.voucher && <ExportMenu label="Voucher demo" formats={['pdf', 'json']} onExport={(format) => operations.download(`/area5/dashboard/entitlements/${service.id}/voucher?format=${format}&viewId=${encodeURIComponent(current.id)}`)} notify={notify} />}
        </div></article>)}</div> : <EmptyState icon={Gift} title="Nessun servizio in questo filtro" text="Cambia filtro per vedere entitlement, soglie e azioni disponibili." />}
        <section className="dashboard-ledger-detail"><div><span className="micro-label">{t.volumeBySiteLabel.toUpperCase()}</span><h2>Origine del volume</h2>{current.ledger.sites.length ? <dl>{current.ledger.sites.map((site) => <div key={site.siteId}><dt>{site.siteId}</dt><dd>{site.pairs} paia</dd></div>)}</dl> : <p>Nessun ordine confermato in questa vista.</p>}</div><div><span className="micro-label">CRONOLOGIA ATTIVAZIONI</span><h2>Eventi registrati</h2>{data.events.length ? <ol>{data.events.map((event) => <li key={event.id}><b>{event.type === 'ACTIVATED' ? 'Servizio attivato' : 'Richiesta di attivazione'}</b><p>{event.note}</p><small>{event.actor} · {dateTime(event.at)}</small></li>)}</ol> : <p>Nessuna attivazione manuale registrata. Gli entitlement seed restano distinti dal ledger.</p>}</div></section>
      </>}
    </OperationsFrame>
  </div>;
}
