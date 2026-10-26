import { useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Archive,
  BadgeCheck,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Eye,
  FileCheck2,
  FilePlus2,
  FileText,
  GitBranch,
  Globe2,
  Image,
  Link2,
  LoaderCircle,
  LockKeyhole,
  PenLine,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api } from './api.js';
import { getTerminology } from '../lib/terminology.js';
import {
  BlockedState,
  DemoNotice,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  ReviewTimeline,
  SourcePill,
  StatusBadge,
  dateTime,
  shortDate,
  useApiData,
} from './ui.jsx';

const editorFields = (content) => content ? ({
  title: content.title,
  excerpt: content.excerpt,
  metaDescription: content.metaDescription,
  image: content.image,
  imageAlt: content.imageAlt,
  sections: structuredClone(content.sections),
  questions: content.questions ? structuredClone(content.questions) : [],
  linkedData: { ...content.linkedData },
}) : null;

function EditorialReviewDialog({ kind, content, contents, onClose, onSubmit, onOpenLsv }) {
  const [outcome, setOutcome] = useState('APPROVE');
  const [note, setNote] = useState(kind === 'factual' ? 'Fatti, valori e riferimenti controllati in ambiente demo.' : 'Testo, fonti e giudizio editoriale approvati in ambiente demo.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const factual = kind === 'factual';

  const lsvContent = contents?.find((item) => item.id === content?.linkedData?.localSharedValueId) || contents?.find((item) => item.type === 'LOCAL_SHARED_VALUE');
  const lsvQuestions = lsvContent?.questions || [];
  const isLsvComplete = Boolean(lsvContent && lsvQuestions.length > 0 && lsvQuestions.every((q) => q.answer?.trim() && q.documentUrl?.trim()));

  const submit = async (event) => {
    event.preventDefault();
    if (factual && outcome === 'APPROVE' && !isLsvComplete) {
      setError('Impossibile approvare: il modulo Local Shared Value deve essere completato con tutti i dati e i link ai documenti.');
      return;
    }
    setBusy(true);
    try { await onSubmit({ outcome, note }); }
    catch (reason) { setError(reason.message); setBusy(false); }
  };

  return (
    <Dialog title={factual ? 'Verifica dei fatti' : 'Revisione editoriale finale'} eyebrow={`${content.id} / AZIONE DEMO`} onClose={onClose}>
      <form className="stack-form" onSubmit={submit}>
        <DemoNotice compact />
        <p>
          {factual
            ? 'L’impresa verifica soltanto fatti e riferimenti che la riguardano. Non modifica il giudizio indipendente della redazione.'
            : 'La redazione verifica la versione già approvata fattualmente. Solo questa seconda approvazione può pubblicare il contenuto.'}
        </p>

        {factual && (
          <div className={`lsv-status-banner ${isLsvComplete ? 'is-complete' : 'is-incomplete'}`}>
            <div className="lsv-status-banner__top">
              <div>
                <span className="micro-label">MODULO VERIFICA COLLEGATO</span>
                <h3>Local Shared Value: <b>{isLsvComplete ? 'È COMPLETA' : 'DA COMPLETARE'}</b></h3>
              </div>
              <span className={isLsvComplete ? 'lsv-badge-success' : 'lsv-badge-warning'}>
                {isLsvComplete ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                {isLsvComplete ? 'È completa' : 'Da completare'}
              </span>
            </div>
            <p className="lsv-status-banner__desc">
              {isLsvComplete
                ? `Tutti i fatti territoriali e di fornitura sono stati documentati con successo (${lsvQuestions.length}/${lsvQuestions.length} voci con risposta e link al documento probatorio).`
                : `Il modulo Local Shared Value non è completo (${lsvQuestions.filter((q) => q.answer?.trim() && q.documentUrl?.trim()).length}/${lsvQuestions.length || 5} voci completate). Per ogni domanda l'impresa deve inserire la risposta e il link dove si trova il documento probatorio.`}
            </p>

            {lsvQuestions.length > 0 && (
              <div className="lsv-factual-preview-list">
                {lsvQuestions.map((q, idx) => {
                  const itemComplete = Boolean(q.answer?.trim() && q.documentUrl?.trim());
                  return (
                    <div key={q.id || idx} className={`lsv-factual-preview-item ${itemComplete ? 'is-done' : 'is-missing'}`}>
                      <div className="lsv-factual-preview-item__q">
                        <span>{String(idx + 1).padStart(2, '0')}.</span>
                        <b>{q.category}:</b> {q.question}
                      </div>
                      {itemComplete ? (
                        <div className="lsv-factual-preview-item__a">
                          <span className="lsv-factual-answer-text">{q.answer}</span>
                          <a href={q.documentUrl} target="_blank" rel="noopener noreferrer" className="lsv-link-badge">
                            <Link2 size={12} /> Documento ↗
                          </a>
                        </div>
                      ) : (
                        <div className="lsv-missing-tag">
                          <CircleDashed size={13} />
                          <span>{!q.answer?.trim() && !q.documentUrl?.trim() ? 'Risposta e link documento mancanti' : !q.answer?.trim() ? 'Risposta mancante' : 'Link documento mancante'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="lsv-status-banner__actions">
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={() => {
                  onClose();
                  if (onOpenLsv) onOpenLsv(lsvContent?.id);
                }}
              >
                <BookOpenCheck size={15} />
                {isLsvComplete ? 'Visualizza / modifica modulo Local Shared Value' : 'Apri e compila modulo Local Shared Value'}
              </button>
            </div>
          </div>
        )}

        <fieldset className="choice-cards choice-cards--two">
          <legend>Esito</legend>
          <label className={outcome === 'APPROVE' ? 'is-selected' : ''}>
            <input type="radio" name="outcome" checked={outcome === 'APPROVE'} onChange={() => setOutcome('APPROVE')} />
            <CheckCircle2 size={20} />
            <span>
              <b>Approva demo</b>
              <small>{factual ? 'Passa alla revisione editoriale' : 'Pubblica questa versione'}</small>
            </span>
          </label>
          <label className={outcome === 'REJECT' ? 'is-selected' : ''}>
            <input type="radio" name="outcome" checked={outcome === 'REJECT'} onChange={() => setOutcome('REJECT')} />
            <CircleDashed size={20} />
            <span>
              <b>Richiedi integrazioni</b>
              <small>La bozza torna modificabile</small>
            </span>
          </label>
        </fieldset>

        <label className="field">
          <span>Nota di revisione *</span>
          <textarea rows="4" required minLength="3" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog__actions">
          <button className="button button--ghost" type="button" onClick={onClose}>Annulla</button>
          <button className="button button--cobalt" type="submit" disabled={busy || (factual && outcome === 'APPROVE' && !isLsvComplete)}>
            {busy && <LoaderCircle className="spin" size={17} />}Registra esito demo
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function EditorialPage() {
  const { notify, data: bootstrap } = useContext(WorkspaceContext);
  const t = getTerminology(bootstrap?.organization?.profileType);
  const { data, error, loading, reload } = useApiData('/area2/editorial');
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type');
  const [typeFilter, setTypeFilter] = useState(
    initialType === 'BEST_PRACTICE' ? 'BEST_PRACTICE' : initialType === 'LOCAL_SHARED_VALUE' ? 'LOCAL_SHARED_VALUE' : 'CASE_HISTORY'
  );
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [mode, setMode] = useState('edit');
  const [createOpen, setCreateOpen] = useState(false);
  const [newContent, setNewContent] = useState({ type: 'CASE_HISTORY', title: '', slug: '' });
  const [createBusy, setCreateBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [reviewKind, setReviewKind] = useState(null);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('Aggiornamento versionato dei contenuti e delle fonti.');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveNote, setArchiveNote] = useState('Contenuto ritirato dalla pubblicazione in ambiente demo.');

  useEffect(() => { document.title = 'Editorial & Executive CMS — Sibillini Impact'; }, []);
  const contents = data?.contents || [];
  const filtered = useMemo(() => contents.filter((item) => item.type === typeFilter), [contents, typeFilter]);
  const content = contents.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!contents.length) return;
    const requested = searchParams.get('type');
    if (!contents.some((item) => item.id === selectedId)) setSelectedId((contents.find((item) => item.type === (requested || typeFilter)) || contents[0]).id);
  }, [data, selectedId, searchParams]);
  useEffect(() => {
    if (!content || content.type !== typeFilter) {
      const next = filtered[0];
      if (next) setSelectedId(next.id);
    }
  }, [typeFilter]);
  useEffect(() => { setDraft(editorFields(content)); setMode('edit'); }, [content?.id]);

  const editable = content && ['DRAFT', 'CHANGES_REQUESTED'].includes(content.status);
  const dirty = content && draft && JSON.stringify(draft) !== JSON.stringify(editorFields(content));
  const publicSources = useMemo(() => {
    if (!data || !draft) return [];
    return [
      data.sources.sites.find((item) => item.id === draft.linkedData.siteId) && { type: t.siteSingular, label: data.sources.sites.find((item) => item.id === draft.linkedData.siteId).name },
      data.sources.datasets.find((item) => item.id === draft.linkedData.datasetId) && { type: 'Dataset', label: `${draft.linkedData.datasetId} · v${data.sources.datasets.find((item) => item.id === draft.linkedData.datasetId).version}` },
      data.sources.attestations.find((item) => item.id === draft.linkedData.attestationId) && { type: 'Attestazione', label: draft.linkedData.attestationId },
      data.sources.reports.find((item) => item.id === draft.linkedData.reportId) && { type: 'Report', label: draft.linkedData.reportId },
    ].filter(Boolean);
  }, [data, draft]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateSection = (index, key, value) => setDraft((current) => ({ ...current, sections: current.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, [key]: value } : section) }));
  const updateQuestion = (index, key, value) => setDraft((current) => ({ ...current, questions: (current.questions || []).map((q, qIndex) => qIndex === index ? { ...q, [key]: value } : q) }));
  const updateSource = (key, value) => setDraft((current) => ({ ...current, linkedData: { ...current.linkedData, [key]: value || null } }));

  const handleOpenLsv = (lsvId) => {
    setTypeFilter('LOCAL_SHARED_VALUE');
    if (lsvId) setSelectedId(lsvId);
  };

  const save = async () => {
    const result = await api(`/area2/editorial/${content.id}`, { method: 'PATCH', body: JSON.stringify(draft) });
    await reload();
    return result.content;
  };
  const saveWithNotice = async () => {
    setSaveBusy(true);
    try { await save(); notify('success', `Bozza salvata · versione ${content.version + 1}`); }
    catch (reason) { notify('error', reason.message); }
    finally { setSaveBusy(false); }
  };
  const submitFactual = async () => {
    try {
      if (dirty) await save();
      await api(`/area2/editorial/${content.id}/submit-factual`, { method: 'POST' });
      await reload();
      notify('success', 'Versione inviata alla verifica dei fatti');
      setReviewKind('factual');
    } catch (reason) { notify('error', reason.message); }
  };
  const review = async ({ outcome, note }) => {
    await api(`/area2/editorial/${content.id}/review-${reviewKind}`, { method: 'POST', body: JSON.stringify({ outcome, note }) });
    await reload();
    setReviewKind(null);
    notify('success', outcome === 'APPROVE' ? 'Approvazione demo registrata' : 'Contenuto restituito per integrazioni');
  };
  const createContent = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setFormError(null);
    try {
      const result = await api('/area2/editorial', { method: 'POST', body: JSON.stringify(newContent) });
      await reload();
      setTypeFilter(result.content.type);
      setSelectedId(result.content.id);
      setCreateOpen(false);
      setNewContent({ type: 'CASE_HISTORY', title: '', slug: '' });
      notify('success', 'Bozza editoriale creata · anteprima noindex');
    } catch (reason) { setFormError(reason.message); }
    finally { setCreateBusy(false); }
  };
  const createCorrection = async () => {
    try {
      const result = await api(`/area2/editorial/${content.id}/corrections`, { method: 'POST', body: JSON.stringify({ note: correctionNote }) });
      await reload();
      setSelectedId(result.content.id);
      setCorrectionOpen(false);
      notify('success', `Nuova versione di correzione creata · v${result.content.version}`);
    } catch (reason) { notify('error', reason.message); }
  };
  const archiveContent = async () => {
    try {
      await api(`/area2/editorial/${content.id}/archive`, { method: 'POST', body: JSON.stringify({ note: archiveNote }) });
      await reload();
      setArchiveOpen(false);
      notify('success', 'Contenuto archiviato e rimosso dalle route pubbliche');
    } catch (reason) { notify('error', reason.message); }
  };

  if (loading && !data) return <LoadingState label="Caricamento CMS e revisioni" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page editorial-page">
      <header className="module-heading">
        <div>
          <div className="eyebrow"><span /> C06 / EDITORIAL & EXECUTIVE CMS</div>
          <h1>Fatti verificati.<br /><em>Giudizio indipendente.</em></h1>
          <p>Per la tua impresa, la Case History documenta i fatti, l’Executive Page conserva profondità e autonomia, e il modulo Local Shared Value certifica le evidenze e i documenti sul territorio.</p>
        </div>
        <div className="module-heading__actions">
          <button className="button button--cobalt" type="button" onClick={() => { setNewContent((current) => ({ ...current, type: typeFilter })); setCreateOpen(true); }}>
            <Plus size={17} />Nuovo contenuto
          </button>
          {content?.status === 'PUBLISHED' && (
            <a className="button button--outline" href={content.publicPath} target="_blank" rel="noreferrer">
              Apri pubblico <ArrowUpRight size={17} />
            </a>
          )}
        </div>
      </header>

      <div className="editorial-type-switch" role="group" aria-label="Filtra tipologia editoriale">
        <button type="button" className={typeFilter === 'CASE_HISTORY' ? 'is-selected' : ''} onClick={() => setTypeFilter('CASE_HISTORY')}>
          <FileText size={21} />
          <span><b>Case History</b><small>Documenta un impegno e le sue evidenze</small></span>
          <ArrowRight size={17} />
        </button>
        <button type="button" className={typeFilter === 'BEST_PRACTICE' ? 'is-selected' : ''} onClick={() => setTypeFilter('BEST_PRACTICE')}>
          <BookOpenCheck size={21} />
          <span><b>Executive Page</b><small>Analisi editoriale di buone pratiche</small></span>
          <ArrowRight size={17} />
        </button>
        <button type="button" className={typeFilter === 'LOCAL_SHARED_VALUE' ? 'is-selected' : ''} onClick={() => setTypeFilter('LOCAL_SHARED_VALUE')}>
          <ShieldCheck size={21} />
          <span><b>Local Shared Value</b><small>Verifica fatti e valore condiviso locale</small></span>
          <ArrowRight size={17} />
        </button>
        <div className="editorial-seo-note">
          <Globe2 size={18} />
          <span>Bozze <b>noindex</b> · pubblicati con <b>canonical</b></span>
        </div>
      </div>

      {!filtered.length && (
        <EmptyState
          title="Nessun contenuto in questa sezione"
          text="Crea una nuova bozza: resterà privata e non indicizzabile fino alla doppia approvazione."
          action={<button className="button button--cobalt" type="button" onClick={() => setCreateOpen(true)}><FilePlus2 size={17} />Crea bozza</button>}
        />
      )}

      {content && draft && (
        <div className="editorial-workspace">
          <aside className="editorial-archive" aria-label="Archivio editoriale">
            <div className="panel-heading">
              <div>
                <span className="micro-label">ARCHIVIO / {filtered.length}</span>
                <h2>Contenuti</h2>
              </div>
              <Archive size={19} />
            </div>
            <div className="editorial-archive__list">
              {filtered.map((item) => (
                <button type="button" key={item.id} className={item.id === content.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}>
                  <span><small>{item.id}</small><StatusBadge status={item.status} /></span>
                  <b>{item.title}</b>
                  <p>v{item.version} · {shortDate(item.updatedAt)}</p>
                </button>
              ))}
            </div>
            <div className="editorial-archive__version">
              <span>VERSIONE APERTA</span>
              <strong>v{content.version}</strong>
              <small>{content.previousVersions?.length || 0} versioni nello storico</small>
            </div>
            {content.previousVersions?.length > 0 && (
              <details className="editorial-history">
                <summary>Storico versioni <ChevronRight size={15} /></summary>
                <ol>
                  {[...content.previousVersions].reverse().map((version, index) => (
                    <li key={`${version.version}-${index}`}>
                      <b>v{version.version}</b>
                      <span>{version.title}</span>
                      <small>{dateTime(version.updatedAt)}</small>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </aside>

          <section className="editorial-editor">
            <header className="editorial-editor__header">
              <div>
                <span className="micro-label">{content.type} / {content.id}</span>
                <h2>{content.title}</h2>
                <p>Slug permanente: <code>/{content.type === 'LOCAL_SHARED_VALUE' ? 'shared-value' : content.type === 'CASE_HISTORY' ? 'case-history' : 'best-practice'}/{content.slug}</code></p>
              </div>
              <StatusBadge status={content.status} />
            </header>
            <div className="editorial-mode-switch" role="group" aria-label="Modalità editor">
              <button type="button" className={mode === 'edit' ? 'is-selected' : ''} onClick={() => setMode('edit')}><PenLine size={16} />Editor</button>
              <button type="button" className={mode === 'preview' ? 'is-selected' : ''} onClick={() => setMode('preview')}><Eye size={16} />Anteprima privata</button>
              <span>NOINDEX</span>
            </div>
            {!editable && (
              <BlockedState
                title={content.status === 'PUBLISHED' ? 'Versione pubblicata e bloccata' : content.status === 'ARCHIVED' ? 'Contenuto archiviato' : 'Editor bloccato durante la revisione'}
                text={content.status === 'PUBLISHED' ? 'Per aggiornare il contenuto crea una correzione versionata: la pagina attuale resta online finché la nuova versione non supera entrambe le revisioni.' : 'Puoi consultare l’anteprima e lo storico. Le modifiche richiedono una bozza o una richiesta di integrazioni.'}
              />
            )}
            {content.correctionOf && (
              <div className="changes-requested">
                <GitBranch size={20} />
                <div>
                  <b>Correzione di {content.correctionOf}</b>
                  <p>{content.correctionNote}</p>
                </div>
              </div>
            )}

            {mode === 'edit' ? (
              <div className="editorial-form">
                <section className="editorial-form__section">
                  <div className="editorial-form__section-title">
                    <span>01</span>
                    <div>
                      <b>Contenuto e metadati</b>
                      <small>Canonical e anteprima social derivano da questi campi.</small>
                    </div>
                  </div>
                  <label className="field">
                    <span>Titolo *</span>
                    <input value={draft.title} maxLength="180" disabled={!editable} onChange={(event) => update('title', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Excerpt *</span>
                    <textarea rows="3" maxLength="400" disabled={!editable} value={draft.excerpt} onChange={(event) => update('excerpt', event.target.value)} />
                    <small>{draft.excerpt.length} / 400 caratteri</small>
                  </label>
                  <label className="field">
                    <span>Meta description *</span>
                    <textarea rows="2" maxLength="180" disabled={!editable} value={draft.metaDescription} onChange={(event) => update('metaDescription', event.target.value)} />
                    <small>{draft.metaDescription.length} / 180 caratteri · minimo 40</small>
                  </label>
                  <div className="field-row">
                    <label className="field">
                      <span>Immagine locale *</span>
                      <select disabled={!editable} value={draft.image} onChange={(event) => update('image', event.target.value)}>
                        {data.images.map((image) => <option key={image.path} value={image.path}>{image.label}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Testo alternativo *</span>
                      <input disabled={!editable} maxLength="220" value={draft.imageAlt} onChange={(event) => update('imageAlt', event.target.value)} />
                    </label>
                  </div>
                </section>

                {content.type === 'LOCAL_SHARED_VALUE' && (
                  <section className="editorial-form__section">
                    <div className="editorial-form__section-title">
                      <span>02</span>
                      <div>
                        <b>Questionario Esteso & Riscontri Probatori — Local Shared Value</b>
                        <small>6 Requisiti territoriali con opzioni selezionabili, sintesi per il report e link obbligatorio al documento probatorio.</small>
                      </div>
                    </div>
                    <div className="lsv-questions-editor">
                      {(draft.questions || []).map((q, index) => (
                        <article key={q.id || index} className="lsv-question-card">
                          <div className="lsv-question-card__top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="lsv-public-idx">REQUISITO {String(index + 1).padStart(2, '0')}</span>
                              <span className="lsv-public-cat">{q.category || 'VALORE CONDIVISO'}</span>
                            </div>
                            <span className="lsv-public-badge-verified">
                              <CheckCircle2 size={13} /> Fatto Verificato
                            </span>
                          </div>

                          <div className="field-row">
                            <label className="field">
                              <span>Categoria / Ambito Territoriale *</span>
                              <input
                                disabled={!editable}
                                maxLength="120"
                                value={q.category || ''}
                                onChange={(e) => updateQuestion(index, 'category', e.target.value)}
                                placeholder="Ambito territoriale"
                              />
                            </label>
                          </div>

                          {q.description && (
                            <div className="lsv-item-guide">
                              <div>
                                <span className="micro-label" style={{ display: 'block', marginBottom: '3px', color: 'var(--cobalt)', fontWeight: 800 }}>INQUADRAMENTO METODOLOGICO (DA NUOVE COMPONENTI)</span>
                                <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.5 }}>{q.description}</p>
                              </div>
                            </div>
                          )}

                          <label className="field">
                            <span>Domanda Ufficiale di Rilevazione *</span>
                            <textarea
                              disabled={!editable}
                              rows="2"
                              maxLength="350"
                              value={q.question || ''}
                              onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                              placeholder="Domanda o requisito territoriale del questionario"
                            />
                          </label>

                          {q.options && q.options.length > 0 && (
                            <div className="lsv-options-selector">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink)' }}>
                                  Opzioni e Risposte del Questionario Esteso:
                                </span>
                                <small style={{ color: 'var(--workspace-muted)', fontSize: '10px' }}>
                                  {(q.selectedOptions || []).length} di {q.options.length} selezionate
                                </small>
                              </div>
                              <div className="lsv-options-checklist">
                                {q.options.map((opt, optIdx) => {
                                  const isChecked = (q.selectedOptions || []).includes(opt);
                                  return (
                                    <label key={optIdx} className="lsv-option-checkbox">
                                      <input
                                        type="checkbox"
                                        disabled={!editable}
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const prev = q.selectedOptions || [];
                                          const next = e.target.checked
                                            ? [...prev, opt]
                                            : prev.filter((item) => item !== opt);
                                          updateQuestion(index, 'selectedOptions', next);
                                        }}
                                      />
                                      <span style={{ fontWeight: 400 }}>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <label className="field">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Dichiarazione Sintetica per il Report di Sostenibilità *</span>
                              <span className="micro-label" style={{ color: 'var(--cobalt)' }}>TESTO COMPLETO PUBBLICAZIONE</span>
                            </div>
                            <textarea
                              disabled={!editable}
                              rows="4"
                              maxLength="2500"
                              value={q.answer || ''}
                              onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                              placeholder="Inserisci la sintesi completa dei fatti e misure adottate per il report"
                            />
                          </label>

                          <label className="field">
                            <span>Link dove si trova il documento probatorio (Obbligatorio) *</span>
                            <div className="doc-link-input-row">
                              <input
                                type="url"
                                disabled={!editable}
                                maxLength="500"
                                value={q.documentUrl || ''}
                                onChange={(e) => updateQuestion(index, 'documentUrl', e.target.value)}
                                placeholder="https://... link al documento (PDF, attestato, convenzione)"
                              />
                              {q.documentUrl && (
                                <a href={q.documentUrl} target="_blank" rel="noopener noreferrer" className="button button--outline button--sm">
                                  <ArrowUpRight size={14} />Apri link
                                </a>
                              )}
                            </div>
                          </label>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                <section className="editorial-form__section">
                  <div className="editorial-form__section-title">
                    <span>{content.type === 'LOCAL_SHARED_VALUE' ? '03' : '02'}</span>
                    <div>
                      <b>Narrazione editoriale</b>
                      <small>La verifica dell’impresa riguarda i fatti, non il giudizio della redazione.</small>
                    </div>
                  </div>
                  <div className="editorial-sections">
                    {draft.sections.map((section, index) => (
                      <article key={index}>
                        <div className="editorial-sections__top">
                          <span>SEZIONE {String(index + 1).padStart(2, '0')}</span>
                          {editable && draft.sections.length > 1 && (
                            <button type="button" onClick={() => update('sections', draft.sections.filter((_, sectionIndex) => sectionIndex !== index))} aria-label={`Rimuovi sezione ${index + 1}`}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                        <label className="field">
                          <span>Titolo sezione *</span>
                          <input disabled={!editable} maxLength="120" value={section.heading} onChange={(event) => updateSection(index, 'heading', event.target.value)} />
                        </label>
                        <label className="field">
                          <span>Testo *</span>
                          <textarea disabled={!editable} rows="5" maxLength="5000" value={section.text} onChange={(event) => updateSection(index, 'text', event.target.value)} />
                          <small>{section.text.length} / 5.000 caratteri</small>
                        </label>
                      </article>
                    ))}
                  </div>
                  {editable && draft.sections.length < 6 && (
                    <button className="button button--outline" type="button" onClick={() => update('sections', [...draft.sections, { heading: 'Nuova sezione', text: 'Inserisci qui il testo della nuova sezione editoriale.' }])}>
                      <Plus size={16} />Aggiungi sezione
                    </button>
                  )}
                </section>

                <section className="editorial-form__section">
                  <div className="editorial-form__section-title">
                    <span>{content.type === 'LOCAL_SHARED_VALUE' ? '04' : '03'}</span>
                    <div>
                      <b>Fonti e dati collegati</b>
                      <small>Almeno una fonte è obbligatoria prima della verifica fattuale.</small>
                    </div>
                  </div>
                  <div className="field-row">
                    <label className="field">
                      <span>{t.siteSingular}</span>
                      <select disabled={!editable} value={draft.linkedData.siteId || ''} onChange={(event) => updateSource('siteId', event.target.value)}>
                        <option value="">Nessuno</option>
                        {data.sources.sites.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Dataset</span>
                      <select disabled={!editable} value={draft.linkedData.datasetId || ''} onChange={(event) => updateSource('datasetId', event.target.value)}>
                        <option value="">Nessuno</option>
                        {data.sources.datasets.map((source) => <option key={source.id} value={source.id}>{source.id} · v{source.version}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="field-row">
                    <label className="field">
                      <span>Attestazione</span>
                      <select disabled={!editable} value={draft.linkedData.attestationId || ''} onChange={(event) => updateSource('attestationId', event.target.value)}>
                        <option value="">Nessuna</option>
                        {data.sources.attestations.map((source) => <option key={source.id} value={source.id}>{source.id} · {source.status}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span>Report</span>
                      <select disabled={!editable} value={draft.linkedData.reportId || ''} onChange={(event) => updateSource('reportId', event.target.value)}>
                        <option value="">Nessuno</option>
                        {data.sources.reports.map((source) => <option key={source.id} value={source.id}>{source.id} · {source.status}</option>)}
                      </select>
                    </label>
                  </div>
                </section>
              </div>
            ) : (
              <article className="editorial-public-preview">
                <div className="private-preview-label"><Eye size={16} />ANTEPRIMA PRIVATA · NOINDEX, NOFOLLOW</div>
                <img src={draft.image} alt={draft.imageAlt} />
                <div className="editorial-public-preview__body">
                  <span className="micro-label">{content.type} / DEMO</span>
                  <h1>{draft.title}</h1>
                  <p className="editorial-public-preview__excerpt">{draft.excerpt}</p>
                  <div className="editorial-public-preview__meta">
                    <span>{content.author}</span>
                    <span>Versione {content.version}</span>
                    <span>{shortDate(content.updatedAt)}</span>
                  </div>

                  {draft.questions && draft.questions.length > 0 && (
                    <div className="editorial-public-questions">
                      <div className="panel-heading">
                        <div>
                          <span className="micro-label">VERIFICA DEI FATTI & RISCONTRI PROBATORI</span>
                          <h2>Valore Condiviso Locale Documentato</h2>
                        </div>
                        <ShieldCheck size={20} />
                      </div>
                      <div className="editorial-public-questions__list">
                        {draft.questions.map((q, index) => (
                          <article key={q.id || index} className="editorial-public-question-card">
                            <div className="editorial-public-question-card__top">
                              <span className="question-idx">{String(index + 1).padStart(2, '0')}</span>
                              <span className="question-category">{q.category || 'Valore Condiviso'}</span>
                              <span className="question-verified-tag"><CheckCircle2 size={14} /> Fatto verificato</span>
                            </div>
                            <h3>{q.question}</h3>
                            <p className="question-answer">{q.answer}</p>
                            {q.documentUrl && (
                              <div className="question-doc">
                                <span className="micro-label">DOCUMENTO PROBATORIO</span>
                                <a href={q.documentUrl} target="_blank" rel="noopener noreferrer" className="question-doc-link">
                                  <FileCheck2 size={16} />
                                  <span>Apri documento di riscontro</span>
                                  <ArrowUpRight size={14} />
                                </a>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {draft.sections.map((section, index) => (
                    <section key={index}>
                      <h2>{section.heading}</h2>
                      <p>{section.text}</p>
                    </section>
                  ))}
                  <div className="editorial-public-preview__sources">
                    <h3>Fonti collegate</h3>
                    {publicSources.map((source) => (
                      <span key={`${source.type}-${source.label}`}><FileCheck2 size={16} /><b>{source.type}</b>{source.label}</span>
                    ))}
                    {!publicSources.length && <p>Nessuna fonte collegata: la verifica fattuale è bloccata.</p>}
                  </div>
                </div>
              </article>
            )}

            <footer className="editorial-actions">
              <div>
                <span>CANONICAL</span>
                <code>{content.publicPath}</code>
              </div>
              <div>
                {editable && (
                  <>
                    <button className="button button--outline" type="button" disabled={!dirty || saveBusy} onClick={saveWithNotice}>
                      {saveBusy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Salva versione
                    </button>
                    <button className="button button--cobalt" type="button" onClick={submitFactual}>
                      <Send size={16} />Invia verifica fatti
                    </button>
                  </>
                )}
                {content.status === 'FACTUAL_REVIEW' && (
                  <button className="button button--cobalt" type="button" onClick={() => setReviewKind('factual')}>
                    <BadgeCheck size={16} />Verifica fatti demo
                  </button>
                )}
                {content.status === 'EDITORIAL_REVIEW' && (
                  <button className="button button--cobalt" type="button" onClick={() => setReviewKind('editorial')}>
                    <BadgeCheck size={16} />Revisione editoriale demo
                  </button>
                )}
                {content.status === 'PUBLISHED' && (
                  <>
                    <button className="button button--outline" type="button" onClick={() => setCorrectionOpen(true)}>
                      <GitBranch size={16} />Nuova correzione
                    </button>
                    <button className="button button--danger" type="button" onClick={() => setArchiveOpen(true)}>
                      <Archive size={16} />Archivia
                    </button>
                  </>
                )}
              </div>
            </footer>
          </section>

          <aside className="editorial-review-panel">
            <section>
              <div className="panel-heading">
                <div>
                  <span className="micro-label">DOPPIA APPROVAZIONE</span>
                  <h2>Flusso editoriale</h2>
                </div>
                <ShieldCheck size={20} />
              </div>
              <ol className="editorial-workflow">
                <li className={content.status !== 'DRAFT' ? 'is-done' : 'is-current'}>
                  <span>01</span>
                  <div><b>Bozza redazionale</b><small>Testi, immagini e fonti collegate</small></div>
                </li>
                <li className={['EDITORIAL_REVIEW', 'PUBLISHED'].includes(content.status) ? 'is-done' : content.status === 'FACTUAL_REVIEW' ? 'is-current' : ''}>
                  <span>02</span>
                  <div><b>Verifica dei fatti</b><small>Impresa · modulo Local Shared Value</small></div>
                </li>
                <li className={content.status === 'PUBLISHED' ? 'is-done' : content.status === 'EDITORIAL_REVIEW' ? 'is-current' : ''}>
                  <span>03</span>
                  <div><b>Revisione editoriale</b><small>Startup · approvazione indipendente</small></div>
                </li>
                <li className={content.status === 'PUBLISHED' ? 'is-current' : ''}>
                  <span>04</span>
                  <div><b>Pubblicazione</b><small>Canonical, metadati social e URL permanente</small></div>
                </li>
              </ol>
            </section>
            <section>
              <div className="panel-heading">
                <div>
                  <span className="micro-label">FONTI COLLEGATE</span>
                  <h2>Evidence panel</h2>
                </div>
                <Link2 size={19} />
              </div>
              <div className="editorial-source-list">
                {publicSources.map((source) => (
                  <div key={`${source.type}-${source.label}`}>
                    <FileCheck2 size={16} />
                    <span><b>{source.type}</b><small>{source.label}</small></span>
                  </div>
                ))}
                {!publicSources.length && <p>Nessuna fonte collegata.</p>}
              </div>
            </section>
            <section>
              <div className="panel-heading">
                <div>
                  <span className="micro-label">REVIEW TIMELINE</span>
                  <h2>Storico revisioni</h2>
                </div>
                <BookOpenCheck size={19} />
              </div>
              <ReviewTimeline events={[...(content.reviewEvents || [])].reverse()} createdAt={content.createdAt} status={content.status} />
            </section>
          </aside>
        </div>
      )}

      {createOpen && (
        <Dialog title="Nuova bozza editoriale" eyebrow="C06 / PRIVATE NOINDEX" onClose={() => setCreateOpen(false)}>
          <form className="stack-form" onSubmit={createContent}>
            <DemoNotice compact />
            <fieldset className="choice-cards choice-cards--three">
              <legend>Tipologia</legend>
              {['CASE_HISTORY', 'BEST_PRACTICE', 'LOCAL_SHARED_VALUE'].map((type) => (
                <label key={type} className={newContent.type === type ? 'is-selected' : ''}>
                  <input type="radio" name="type" checked={newContent.type === type} onChange={() => setNewContent((current) => ({ ...current, type }))} />
                  {type === 'CASE_HISTORY' ? <FileText size={20} /> : type === 'BEST_PRACTICE' ? <BookOpenCheck size={20} /> : <ShieldCheck size={20} />}
                  <span>
                    <b>{type === 'CASE_HISTORY' ? 'Case History' : type === 'BEST_PRACTICE' ? 'Executive Page' : 'Local Shared Value'}</b>
                    <small>{type === 'CASE_HISTORY' ? 'Impegno documentato' : type === 'BEST_PRACTICE' ? 'Analisi di buona pratica' : 'Verifica fatti e valore condiviso'}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <label className="field">
              <span>Titolo iniziale *</span>
              <input required minLength="5" maxLength="180" value={newContent.title} onChange={(event) => setNewContent((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Slug personalizzato <small>facoltativo</small></span>
              <input maxLength="90" value={newContent.slug} onChange={(event) => setNewContent((current) => ({ ...current, slug: event.target.value }))} placeholder="Generato automaticamente dal titolo" />
            </label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="dialog__actions">
              <button className="button button--ghost" type="button" onClick={() => setCreateOpen(false)}>Annulla</button>
              <button className="button button--cobalt" type="submit" disabled={createBusy}>
                {createBusy ? <LoaderCircle className="spin" size={17} /> : <FilePlus2 size={17} />}Crea bozza noindex
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {reviewKind && (
        <EditorialReviewDialog
          kind={reviewKind}
          content={content}
          contents={contents}
          onClose={() => setReviewKind(null)}
          onSubmit={review}
          onOpenLsv={handleOpenLsv}
        />
      )}
      {correctionOpen && (
        <Dialog title="Crea una correzione versionata" eyebrow="PUBBLICAZIONE CORRENTE ONLINE" onClose={() => setCorrectionOpen(false)}>
          <div className="stack-form">
            <p>La versione pubblicata resta online. La nuova bozza userà lo stesso slug e la sostituirà soltanto dopo verifica fattuale e revisione editoriale.</p>
            <label className="field">
              <span>Motivo della correzione *</span>
              <textarea rows="4" value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} />
            </label>
            <div className="dialog__actions">
              <button className="button button--ghost" type="button" onClick={() => setCorrectionOpen(false)}>Annulla</button>
              <button className="button button--cobalt" type="button" onClick={createCorrection}><GitBranch size={16} />Crea nuova versione</button>
            </div>
          </div>
        </Dialog>
      )}
      {archiveOpen && (
        <Dialog title="Archiviare il contenuto?" eyebrow="CONFERMA ARCHIVIAZIONE" onClose={() => setArchiveOpen(false)}>
          <div className="stack-form">
            <p>La route pubblica restituirà “contenuto archiviato”. Storico, revisioni e motivo restano nel CMS.</p>
            <label className="field">
              <span>Motivo *</span>
              <textarea rows="4" value={archiveNote} onChange={(event) => setArchiveNote(event.target.value)} />
            </label>
            <div className="dialog__actions">
              <button className="button button--ghost" type="button" onClick={() => setArchiveOpen(false)}>Annulla</button>
              <button className="button button--danger" type="button" onClick={archiveContent}><Archive size={16} />Archivia contenuto</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
