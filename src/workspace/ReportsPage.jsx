import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileCheck2,
  FilePlus2,
  Files,
  FileText,
  GitCompareArrows,
  Layers3,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import {
  BlockedState,
  Dialog,
  EmptyState,
  ErrorState,
  ExportMenu,
  LoadingState,
  ReviewDialog,
  ReviewTimeline,
  SourcePill,
  StatusBadge,
  useApiData,
  dateTime,
  integer,
  money,
  shortDate,
} from './ui.jsx';
import { getTerminology } from '../lib/terminology.js';

const templateMeta = {
  AREA_SISMA: { code: '01', short: 'Area Sisma', icon: MapPin, scope: 'Organizzazione / territorio', guidance: 'Racconta il contributo alla rigenerazione dei borghi interni, mantenendo separati dati approvati e testo narrativo.' },
  CSR_BILANCIO: { code: '02', short: 'Bilancio ESG & Filiera', icon: Building2, scope: 'Stabilimento + filiera fornitori', guidance: 'Aggrega ordini dello stabilimento e fornitori di filiera accreditati con deduplica degli ordini e Matching Grant.' },
  CANTIERE_INTEGRATO: { code: '02', short: 'Cantiere Etico', icon: Building2, scope: 'Singolo cantiere + filiera', guidance: 'Aggrega General Contractor e subappaltatori sullo stesso cantiere. Gli ordini sono deduplicati per identificativo.' },
  CPT: { code: '03', short: 'Enti Paritetici / CPT', icon: Users, scope: 'Benessere e lavoratori', guidance: 'Privilégia benessere, sicurezza e condizioni dei lavoratori. Non riutilizza il taglio narrativo del report bancario.' },
  STAKEHOLDER_SUMMARY: { code: '04', short: 'Sintesi Stakeholder', icon: FileText, scope: 'Executive summary / 2 pagine', guidance: 'Sintesi monografica per interlocuzioni rapide. Il testo resta entro 900 caratteri e due pagine digitali.' },
};

const blankDraft = { template: 'AREA_SISMA', siteId: '', from: '2026-01-01', to: '2026-12-31', narrative: '' };

export function ReportsPage() {
  const { notify, bootstrap } = useContext(WorkspaceContext);
  const t = getTerminology(bootstrap?.organization?.profileType);
  const { data, error, loading, reload } = useApiData('/area1/reports');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(blankDraft);
  const [createBusy, setCreateBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [narrative, setNarrative] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [selectedPrevious, setSelectedPrevious] = useState(0);

  useEffect(() => { document.title = 'Impact Report Composer — Sibillini Impact'; }, []);
  useEffect(() => {
    if (!data?.reports.length) return;
    if (!data.reports.some((item) => item.id === selectedId)) setSelectedId(data.reports[0].id);
  }, [data, selectedId]);
  useEffect(() => {
    const requested = searchParams.get('template');
    if (data?.templates[requested]) {
      setDraft({ ...blankDraft, template: requested });
      setCreateOpen(true);
    }
  }, [data, searchParams]);

  const reports = data?.reports || [];
  const report = reports.find((item) => item.id === selectedId);
  const definition = data?.templates[report?.template];
  const meta = templateMeta[report?.template];
  const editable = report && ['DRAFT', 'REJECTED_WITH_REASON'].includes(report.status);
  const maxLength = report?.template === 'STAKEHOLDER_SUMMARY' ? 900 : 3000;
  const site = data?.sites.find((item) => item.id === report?.siteId);
  const linkedEvidence = (report?.evidenceIds || []).map((id) => data?.evidenceDocuments.find((item) => item.id === id)).filter(Boolean);
  const previousVersions = report?.previousVersions || [];
  const previous = previousVersions[selectedPrevious] || previousVersions[0];

  useEffect(() => {
    setNarrative(report?.narrative || '');
    setVersionOpen(false);
    setSelectedPrevious(0);
  }, [report?.id]);

  const closeCreate = () => {
    setCreateOpen(false);
    setFormError(null);
    if (searchParams.has('template')) setSearchParams({}, { replace: true });
  };
  const openCreate = (template = 'AREA_SISMA') => {
    setDraft({ ...blankDraft, template });
    setFormError(null);
    setCreateOpen(true);
  };
  const createReport = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setFormError(null);
    try {
      const payload = await api('/area1/reports', { method: 'POST', body: JSON.stringify({ template: draft.template, siteId: draft.siteId || null, period: { from: draft.from, to: draft.to }, narrative: draft.narrative }) });
      await reload();
      setSelectedId(payload.report.id);
      closeCreate();
      notify('success', `${payload.report.id} creato in stato bozza`);
    } catch (reason) { setFormError(reason.message); }
    finally { setCreateBusy(false); }
  };
  const saveReport = async () => {
    setSaveBusy(true);
    try {
      await api(`/area1/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ narrative }) });
      await reload();
      notify('success', `Bozza salvata · nuova versione ${report.version + 1}`);
    } catch (reason) { notify('error', reason.message); }
    finally { setSaveBusy(false); }
  };
  const submitReport = async () => {
    try {
      if (narrative !== report.narrative) await api(`/area1/reports/${report.id}`, { method: 'PATCH', body: JSON.stringify({ narrative }) });
      await api(`/area1/reports/${report.id}/submit`, { method: 'POST' });
      await reload();
      setSubmitOpen(false);
      notify('success', 'Report inviato alla revisione Startup demo');
    } catch (reason) { notify('error', reason.message); }
  };
  const reviewReport = async ({ outcome, note }) => {
    await api(`/area1/reports/${report.id}/review`, { method: 'POST', body: JSON.stringify({ outcome, note }) });
    await reload();
    setReviewOpen(false);
    notify('success', outcome === 'VERIFIED' ? 'Revisione demo completata' : 'Report restituito con richiesta di integrazioni');
  };

  if (loading && !data) return <LoadingState label="Caricamento template e report" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page reports-page">
      <header className="module-heading">
        <div><div className="eyebrow"><span /> C03 / IMPACT REPORT COMPOSER</div><h1>Quattro destinatari.<br /><em>Quattro report distinti.</em></h1><p>Per la tua organizzazione, i dati approvati diventano output con finalità diverse. Perimetro, fonti e ordini deduplicati restano visibili; la pubblicazione passa sempre dalla revisione del garante.</p></div>
        <div className="module-heading__actions"><button className="button button--cobalt" type="button" onClick={() => openCreate()}><Plus size={17} />Nuovo report</button>{report && <ExportMenu formats={['pdf', 'json']} onExport={(format) => downloadFile(`/area1/reports/${report.id}/export?format=${format}`)} notify={notify} />}</div>
      </header>

      <section className="template-launcher" aria-label="Crea un report da template">
        {Object.entries(data.templates).map(([id, item]) => { const itemMeta = templateMeta[id]; const Icon = itemMeta.icon; return <button type="button" key={id} onClick={() => openCreate(id)}><span className="template-launcher__code">{itemMeta.code}</span><Icon size={22} /><span><b>{itemMeta.short}</b><small>{itemMeta.scope}</small></span><Plus size={17} /></button>; })}
      </section>

      <div className="report-archive-bar">
        <div><Files size={19} /><span>ARCHIVIO REPORT</span><b>{reports.length}</b></div>
        <label className="compact-field compact-field--inline"><span>Apri documento</span><select value={report?.id || ''} onChange={(event) => setSelectedId(event.target.value)} disabled={!reports.length}>{reports.map((item) => <option key={item.id} value={item.id}>{item.id} · {templateMeta[item.template]?.short} · v{item.version}</option>)}</select></label>
        {report && <StatusBadge status={report.status} />}
      </div>

      {!report && <EmptyState title="Nessun report nel workspace" text="Crea il primo documento scegliendo uno dei quattro template. Il perimetro e le fonti verranno collegati automaticamente." action={<button className="button button--cobalt" type="button" onClick={() => openCreate()}><FilePlus2 size={17} />Crea report</button>} />}

      {report && <div className="composer-layout">
        <article className="report-canvas" aria-labelledby="report-title">
          <header className="report-canvas__header">
            <div>
              <span className="micro-label">{definition.title} · v{report.version}</span>
              <h2 id="report-title">{meta.short}</h2>
              <p>{definition.description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {previousVersions.length > 0 && (
                <button className="button button--ghost" type="button" onClick={() => setVersionOpen((value) => !value)}>
                  <GitCompareArrows size={16} />{versionOpen ? 'Chiudi confronto' : `Confronta versioni (${previousVersions.length})`}
                </button>
              )}
              <StatusBadge status={report.status} />
            </div>
          </header>
          <div className="composer-outline__rule" style={{ marginBottom: '18px' }}>
            <LockKeyhole size={17} />
            <p>Template e perimetro sono bloccati dopo la creazione. Per cambiarli crea un nuovo report.</p>
          </div>
          {report.status === 'PENDING_REVIEW' && <BlockedState title="Documento bloccato durante la revisione" text="Puoi consultare ed esportare questa versione. Per modificarla attendi l’esito del revisore demo." />}
          {report.status === 'VERIFIED' && <div className="verified-note"><CheckCircle2 size={19} /><p>Versione verificata in ambiente demo. Il testo è bloccato; l’export conserva stato, fonti e avviso dati sintetici.</p></div>}
          {report.status === 'REJECTED_WITH_REASON' && <div className="changes-requested"><CircleDashed size={20} /><div><b>Il revisore demo ha richiesto integrazioni</b><p>{report.reviewNote}</p></div></div>}

          <section id="report-perimetro" className="report-section">
            <div className="report-section__number">01</div><div className="report-section__content"><span className="micro-label">PERIMETRO DEL REPORT</span><h3>Una finalità, un perimetro.</h3><p>{meta.guidance}</p><dl className="report-facts"><div><dt>Organizzazione</dt><dd>{bootstrap.organization.name}</dd></div><div><dt>{t.siteSingular}</dt><dd>{site ? `${site.name} · ${site.code}` : t.siteScopeLabel}</dd></div><div><dt>Periodo</dt><dd>{shortDate(report.period.from)} — {shortDate(report.period.to)}</dd></div><div><dt>Template</dt><dd><code>{report.template}</code></dd></div></dl></div>
          </section>

          <section id="report-dati" className="report-section">
            <div className="report-section__number">02</div><div className="report-section__content"><span className="micro-label">DATI APPROVATI / ORDINI DEDUPLICATI</span><h3>Numeri che puoi ricondurre alla fonte.</h3><div className="report-metrics"><div><span>PAIA NEL PERIMETRO</span><strong>{integer.format(report.metrics.pairs)}</strong><small>{report.metrics.orderIds.length} ordini distinti</small></div><div><span>VALORE FORNITURE</span><strong>{money(report.metrics.totalCents)}</strong><small>dati sintetici demo</small></div><div><span>FONDO AGGREGATO</span><strong>{money(report.metrics.fundCents)}</strong><small>30% degli ordini collegati</small></div><div><span>ORGANIZZAZIONI</span><strong>{report.metrics.organizationIds.length}</strong><small>{report.template === 'CANTIERE_INTEGRATO' ? 'GC + subappaltatori inclusi' : report.template === 'CSR_BILANCIO' ? 'Stabilimento + filiera inclusi' : 'nel perimetro selezionato'}</small></div></div><div className="order-dedup"><Layers3 size={19} /><div><b>{report.metrics.orderIds.length} ordini contati una sola volta</b><p>{report.metrics.orderIds.join(' · ')}</p></div></div>{report.template === 'STAKEHOLDER_SUMMARY' && <div className="page-budget"><span>PAGINE DIGITALI</span><b>1—2 / 2 max</b><div><i style={{ width: `${Math.max(8, Math.min(100, narrative.length / 9))}%` }} /></div><small>{narrative.length} / 900 caratteri narrativi</small></div>}</div>
          </section>

          <section id="report-narrazione" className="report-section">
            <div className="report-section__number">03</div><div className="report-section__content"><span className="micro-label">NARRAZIONE AUTORIZZATA</span><h3>Il tuo testo, entro campi controllati.</h3><label className="report-editor"><span className="sr-only">Testo narrativo del report</span><textarea rows="8" value={narrative} maxLength={maxLength} disabled={!editable} onChange={(event) => setNarrative(event.target.value)} placeholder="Integra la sintesi narrativa senza modificare i dati approvati…" /><span>{narrative.length} / {maxLength} caratteri</span></label><p className="field-help">Il testo non altera ordini, valori o metriche. Ogni salvataggio crea una versione confrontabile.</p></div>
          </section>

          <section id="report-fonti" className="report-section">
            <div className="report-section__number">04</div><div className="report-section__content"><span className="micro-label">INDICE DELLE FONTI</span><h3>Evidenze collegate al documento.</h3><ul className="source-index">{linkedEvidence.map((evidence) => <li key={evidence.id}><FileCheck2 size={18} /><div><b>{evidence.title}</b><small>{evidence.id} · v{evidence.version}</small></div><StatusBadge status={evidence.status} /></li>)}{!linkedEvidence.length && <li>Nessuna evidenza collegata.</li>}</ul></div>
          </section>

          {versionOpen && previous && <section className="report-diff" aria-labelledby="diff-title"><div className="panel-heading"><div><span className="micro-label">DIFF TRA VERSIONI</span><h3 id="diff-title">Narrazione a confronto</h3></div><label className="compact-field"><span>Versione precedente</span><select value={selectedPrevious} onChange={(event) => setSelectedPrevious(Number(event.target.value))}>{previousVersions.map((item, index) => <option key={`${item.version}-${index}`} value={index}>v{item.version} · {dateTime(item.updatedAt)}</option>)}</select></label></div><div className="report-diff__grid"><div><span>VERSIONE {previous.version}</span><p>{previous.narrative || 'Nessun testo narrativo.'}</p></div><div><span>VERSIONE {report.version} · CORRENTE</span><p>{narrative || 'Nessun testo narrativo.'}</p></div></div></section>}

          <footer className="composer-actions">
            <div><span>STATO LAVORAZIONE</span><b>{editable ? 'Modificabile' : report.status === 'PENDING_REVIEW' ? 'In attesa del garante' : 'Versione bloccata'}</b></div>
            <div>{editable && <><button className="button button--outline" type="button" disabled={saveBusy || narrative === report.narrative} onClick={saveReport}>{saveBusy ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}Salva versione</button><button className="button button--cobalt" type="button" onClick={() => setSubmitOpen(true)}><Send size={17} />Invia a revisione</button></>}{report.status === 'PENDING_REVIEW' && <button className="button button--cobalt" type="button" onClick={() => setReviewOpen(true)}><BadgeCheck size={17} />Registra revisione demo</button>}</div>
          </footer>
        </article>

        <aside className="composer-evidence" aria-label="Evidenze e revisione">
          <section><div className="panel-heading"><div><span className="micro-label">EVIDENCE STATUS</span><h2>Fonti collegate</h2></div><Link2 size={20} /></div><div className="evidence-mini-list">{linkedEvidence.map((evidence) => <article key={evidence.id}><div><FileCheck2 size={17} /><StatusBadge status={evidence.status} /></div><b>{evidence.title}</b><p>{evidence.id} · versione {evidence.version}</p><small>Aggiornata {dateTime(evidence.updatedAt)}</small></article>)}</div><div className="evidence-rule"><ShieldCheck size={18} /><p>Le fonti restano in sola lettura. Le correzioni avvengono nel componente di origine e generano nuove versioni.</p></div></section>
          <section><div className="panel-heading"><div><span className="micro-label">REVIEW TIMELINE</span><h2>Revisione Startup</h2></div><BookOpenCheck size={20} /></div>{report.reviewNote && <div className="review-note"><span>ULTIMA NOTA</span><p>{report.reviewNote}</p></div>}<ReviewTimeline events={[...(report.reviewEvents || [])].reverse()} createdAt={report.createdAt} status={report.status} /></section>
        </aside>
      </div>}

      {createOpen && <Dialog title="Crea un nuovo report" eyebrow="C03 / TEMPLATE E PERIMETRO" onClose={closeCreate} className="dialog--wide">
        <form className="stack-form" onSubmit={createReport}>
          <fieldset className="template-choice"><legend>01 / Scegli il destinatario e la finalità</legend>{Object.entries(data.templates).map(([id, item]) => { const itemMeta = templateMeta[id] || { short: item.title, icon: Building2, guidance: item.description }; const Icon = itemMeta.icon; return <label key={id} className={draft.template === id ? 'is-selected' : ''}><input type="radio" name="template" value={id} checked={draft.template === id} onChange={() => setDraft((current) => ({ ...current, template: id, siteId: data.templates[id]?.requiresSite ? current.siteId : '' }))} /><Icon size={21} /><span><b>{itemMeta.short}</b><small>{item.description}</small></span><Check size={17} /></label>; })}</fieldset>
          <div className="form-section"><span className="form-section__title">02 / Definisci il perimetro</span>{data.templates[draft.template]?.requiresSite && <label className="field"><span>{t.reportScopeField} *</span><select required value={draft.siteId} onChange={(event) => setDraft((current) => ({ ...current, siteId: event.target.value }))}><option value="" disabled>Seleziona {t.siteSingular.toLowerCase()}</option>{data.sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select><small>{draft.template === 'CSR_BILANCIO' ? 'Il report includerà gli ordini dello stabilimento e dei fornitori di filiera accreditati.' : 'Il report includerà anche gli ordini confermati dei subappaltatori sullo stesso cantiere.'}</small></label>}<div className="field-row"><label className="field"><span>Periodo dal *</span><input type="date" required value={draft.from} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} /></label><label className="field"><span>Periodo al *</span><input type="date" required min={draft.from} value={draft.to} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></label></div><div className="scope-preview"><MapPin size={18} /><p>{draft.template === 'CANTIERE_INTEGRATO' ? 'Aggregazione sul cantiere scelto con deduplica degli ordini di tutta la filiera.' : draft.template === 'CSR_BILANCIO' ? 'Aggregazione sullo stabilimento con fornitori di filiera e Matching Grant.' : 'Aggregazione degli ordini confermati nel perimetro dell’organizzazione.'}</p></div></div>
          <div className="form-section"><span className="form-section__title">03 / Integra la narrazione iniziale</span><label className="field"><span>Testo autorizzato <small>facoltativo</small></span><textarea rows="4" maxLength={draft.template === 'STAKEHOLDER_SUMMARY' ? 900 : 3000} value={draft.narrative} onChange={(event) => setDraft((current) => ({ ...current, narrative: event.target.value }))} placeholder={templateMeta[draft.template]?.guidance || ''} /><small>{draft.narrative.length} / {draft.template === 'STAKEHOLDER_SUMMARY' ? 900 : 3000} caratteri</small></label></div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="dialog__actions"><button className="button button--ghost" type="button" onClick={closeCreate}>Annulla</button><button className="button button--cobalt" type="submit" disabled={createBusy}>{createBusy ? <LoaderCircle className="spin" size={17} /> : <FilePlus2 size={17} />}Crea bozza e collega i dati</button></div>
        </form>
      </Dialog>}

      {submitOpen && <Dialog title="Inviare alla revisione?" eyebrow="CONFERMA AZIONE" onClose={() => setSubmitOpen(false)}><div className="confirm-dialog"><Send size={28} /><p>Il report <b>{report.id} · v{narrative !== report.narrative ? report.version + 1 : report.version}</b> sarà bloccato e inviato alla Startup garante. Potrai riprendere le modifiche solo se verranno richieste integrazioni.</p><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setSubmitOpen(false)}>Continua a modificare</button><button className="button button--cobalt" type="button" onClick={submitReport}>Conferma invio <ArrowRight size={17} /></button></div></div></Dialog>}
      {reviewOpen && <ReviewDialog title={`Revisiona ${report.id}`} subject="report" onClose={() => setReviewOpen(false)} onSubmit={reviewReport} />}
    </div>
  );
}
