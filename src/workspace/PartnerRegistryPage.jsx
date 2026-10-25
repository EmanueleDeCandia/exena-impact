import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  Globe2,
  Link2,
  LoaderCircle,
  MapPin,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api } from './api.js';
import {
  BlockedState,
  DemoNotice,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  ReviewTimeline,
  StatusBadge,
  dateTime,
  shortDate,
  useApiData,
} from './ui.jsx';

const emptyProject = { name: '', municipality: '', description: '', publicEvidence: '' };
const entryDraft = (entry) => entry ? ({ organizationName: entry.organizationName, municipalities: [...entry.municipalities], projects: structuredClone(entry.projects), consentToPublish: entry.consentToPublish }) : null;

function RegistryReviewDialog({ entry, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState('PUBLISHED');
  const [note, setNote] = useState('Consenso, municipalità e riferimenti pubblicabili verificati in ambiente demo.');
  const [error, setError] = useState(null);
  const submit = async (event) => { event.preventDefault(); try { await onSubmit({ outcome, note }); } catch (reason) { setError(reason.message); } };
  return <Dialog title="Revisiona la scheda Partner" eyebrow={`${entry.id} / REVISORE DEMO`} onClose={onClose}><form className="stack-form" onSubmit={submit}><DemoNotice compact /><fieldset className="choice-cards choice-cards--two"><legend>Esito revisione</legend><label className={outcome === 'PUBLISHED' ? 'is-selected' : ''}><input type="radio" name="outcome" checked={outcome === 'PUBLISHED'} onChange={() => setOutcome('PUBLISHED')} /><CheckCircle2 size={20} /><span><b>Pubblica demo</b><small>Rendi visibile solo i dati approvati</small></span></label><label className={outcome === 'REJECTED_WITH_REASON' ? 'is-selected' : ''}><input type="radio" name="outcome" checked={outcome === 'REJECTED_WITH_REASON'} onChange={() => setOutcome('REJECTED_WITH_REASON')} /><CircleDashed size={20} /><span><b>Richiedi integrazioni</b><small>La scheda resta privata</small></span></label></fieldset><label className="field"><span>Nota *</span><textarea rows="4" required value={note} onChange={(event) => setNote(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={onClose}>Annulla</button><button className="button button--cobalt" type="submit">Registra esito demo</button></div></form></Dialog>;
}

export function PartnerRegistryPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area2/partners');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [rectifyMode, setRectifyMode] = useState(false);
  const [rectificationNote, setRectificationNote] = useState('Aggiornamento dei dati pubblici e dei riferimenti di progetto.');
  const [saveBusy, setSaveBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeNote, setRemoveNote] = useState('Rimozione dal registro pubblico in ambiente demo.');
  const [newEntry, setNewEntry] = useState({ organizationName: '', municipality: '', projectName: '', description: '', publicEvidence: '', consentToPublish: false });

  useEffect(() => { document.title = 'Public Partner Registry — Sibillini Impact'; }, []);
  const entries = data?.entries || [];
  const filtered = useMemo(() => entries.filter((entry) => (statusFilter === 'ALL' || entry.status === statusFilter) && `${entry.organizationName} ${entry.municipalities.join(' ')} ${entry.projects.map((project) => project.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())), [entries, statusFilter, query]);
  const entry = entries.find((item) => item.id === selectedId);
  useEffect(() => { if (entries.length && !entries.some((item) => item.id === selectedId)) setSelectedId(entries.find((item) => item.status === 'PUBLISHED')?.id || entries[0].id); }, [data, selectedId]);
  useEffect(() => { setDraft(entryDraft(entry)); setRectifyMode(false); }, [entry?.id]);

  const editable = entry && (['DRAFT', 'REJECTED_WITH_REASON'].includes(entry.status) || rectifyMode);
  const dirty = entry && draft && JSON.stringify(draft) !== JSON.stringify(entryDraft(entry));
  const publishedCount = entries.filter((item) => item.status === 'PUBLISHED').length;
  const pendingCount = entries.filter((item) => item.status === 'PENDING_REVIEW').length;

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateProject = (index, key, value) => setDraft((current) => ({ ...current, projects: current.projects.map((project, projectIndex) => projectIndex === index ? { ...project, [key]: value } : project) }));
  const save = async () => {
    const result = await api(`/area2/partners/${entry.id}`, { method: 'PATCH', body: JSON.stringify(draft) });
    await reload();
    return result.entry;
  };
  const saveWithNotice = async () => {
    setSaveBusy(true);
    try { await save(); notify('success', `Scheda salvata · versione ${entry.version + 1}`); }
    catch (reason) { notify('error', reason.message); }
    finally { setSaveBusy(false); }
  };
  const submitReview = async () => {
    try {
      if (dirty) await save();
      await api(`/area2/partners/${entry.id}/submit`, { method: 'POST' });
      await reload();
      notify('success', 'Scheda inviata alla verifica della Startup demo');
    } catch (reason) { notify('error', reason.message); }
  };
  const review = async ({ outcome, note }) => {
    await api(`/area2/partners/${entry.id}/review`, { method: 'POST', body: JSON.stringify({ outcome, note }) });
    await reload();
    setReviewOpen(false);
    notify('success', outcome === 'PUBLISHED' ? 'Scheda pubblicata nel registro demo' : 'Scheda restituita per integrazioni');
  };
  const rectify = async () => {
    try {
      await api(`/area2/partners/${entry.id}/rectifications`, { method: 'POST', body: JSON.stringify({ ...draft, note: rectificationNote }) });
      await reload();
      setRectifyMode(false);
      notify('success', 'Rettifica pubblica registrata e versionata');
    } catch (reason) { notify('error', reason.message); }
  };
  const remove = async () => {
    try {
      await api(`/area2/partners/${entry.id}/remove`, { method: 'POST', body: JSON.stringify({ note: removeNote }) });
      await reload();
      setRemoveOpen(false);
      notify('success', 'Scheda rimossa dal registro pubblico · storico conservato');
    } catch (reason) { notify('error', reason.message); }
  };
  const createEntry = async (event) => {
    event.preventDefault();
    setCreateBusy(true);
    setFormError(null);
    try {
      const payload = {
        organizationName: newEntry.organizationName,
        municipalities: [newEntry.municipality],
        projects: [{ name: newEntry.projectName, municipality: newEntry.municipality, description: newEntry.description, publicEvidence: newEntry.publicEvidence }],
        consentToPublish: newEntry.consentToPublish,
      };
      const result = await api('/area2/partners', { method: 'POST', body: JSON.stringify(payload) });
      await reload();
      setSelectedId(result.entry.id);
      setCreateOpen(false);
      notify('success', 'Bozza Partner creata · non visibile pubblicamente');
    } catch (reason) { setFormError(reason.message); }
    finally { setCreateBusy(false); }
  };

  if (loading && !data) return <LoadingState label="Caricamento registro e consensi" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page partner-registry-page">
      <header className="module-heading"><div><div className="eyebrow"><span /> C07 / PUBLIC PARTNER REGISTRY</div><h1>Partner reperibili.<br /><em>Non una classifica di spesa.</em></h1><p>Per imprese e municipalità, il registro rende visibili soltanto soggetti approvati, consensi e progetti pubblicabili. Rettifiche e rimozioni restano tracciate senza esporre dati privati.</p></div><div className="module-heading__actions"><a className="button button--outline" href="/partner" target="_blank" rel="noreferrer"><Globe2 size={17} />Registro pubblico</a><button className="button button--cobalt" type="button" onClick={() => setCreateOpen(true)}><Plus size={17} />Nuova organizzazione</button></div></header>

      <div className="summary-strip partner-summary"><div><span>SCHEDE PUBBLICATE</span><strong>{publishedCount}</strong><small>solo con consenso e verifica demo</small></div><div><span>IN REVISIONE</span><strong>{pendingCount}</strong><small>non visibili nel registro pubblico</small></div><div><span>DATI PUBBLICI</span><strong>MINIMI</strong><small>nessuna Partita IVA o importo</small></div><div><span>RETTIFICHE TRACCIATE</span><strong>{entries.reduce((sum, item) => sum + item.rectifications.length, 0)}</strong><small>storico e data sempre conservati</small></div></div>

      <div className="partner-workspace">
        <aside className="partner-list-panel"><div className="panel-heading"><div><span className="micro-label">ORGANIZZAZIONI / {entries.length}</span><h2>Registro interno</h2></div><Users size={20} /></div><label className="search-field"><Search size={17} /><span className="sr-only">Cerca organizzazione o progetto</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Organizzazione o progetto…" /></label><label className="compact-field"><span>Stato pubblicazione</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">Tutti gli stati</option><option value="PUBLISHED">Pubblicati</option><option value="DRAFT">Bozze</option><option value="PENDING_REVIEW">In revisione</option><option value="REJECTED_WITH_REASON">Integrazioni richieste</option><option value="REMOVED">Rimossi</option></select></label><div className="partner-list">{filtered.map((item) => <button type="button" key={item.id} className={item.id === entry?.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)}><span><Building2 size={17} /><StatusBadge status={item.status} /></span><b>{item.organizationName}</b><p>{item.municipalities.join(' · ')}</p><small>v{item.version} · aggiornato {shortDate(item.updatedAt)}</small></button>)}{!filtered.length && <EmptyState title="Nessun risultato" text="Modifica ricerca o filtro." action={<button className="button button--outline" type="button" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>Azzera filtri</button>} />}</div></aside>

        {entry && draft && <section className="partner-editor" aria-labelledby="partner-entry-title"><header className="partner-editor__header"><div><span className="micro-label">{entry.id} / VERSIONE {entry.version}</span><h2 id="partner-entry-title">{entry.organizationName}</h2><p>Iscrizione {shortDate(entry.joinedAt)} · slug pubblico <code>/partner/{entry.publicSlug}</code></p></div><StatusBadge status={entry.status} /></header>{entry.status === 'REMOVED' && <BlockedState title="Scheda rimossa dal registro pubblico" text={`Rimozione registrata ${dateTime(entry.removedAt)}. Lo storico resta disponibile nel perimetro autorizzato.`} />}{entry.status === 'PENDING_REVIEW' && <BlockedState title="Scheda bloccata durante la verifica" text="I dati non sono pubblici finché il revisore demo non registra l’approvazione." />}{rectifyMode && <div className="changes-requested"><FileCheck2 size={20} /><div><b>Procedura di rettifica pubblica</b><p>Le modifiche aggiornano la pagina pubblica e creano una nuova versione con nota, data e storico.</p></div></div>}

          <div className="partner-public-card"><div className="partner-public-card__top"><div className="partner-avatar">{entry.organizationName.slice(0, 2).toUpperCase()}</div><div><span className="micro-label">SCHEDA PUBBLICA</span><h3>{draft.organizationName}</h3><p>{draft.municipalities.join(' · ')}</p></div><StatusBadge status={entry.status === 'PUBLISHED' ? 'VERIFIED_DEMO' : entry.status} /></div><div className="partner-consent"><ShieldCheck size={18} /><span>{draft.consentToPublish ? 'Consenso alla pubblicazione presente' : 'Consenso alla pubblicazione assente: pubblicazione bloccata'}</span></div></div>

          <div className="partner-form">
            <section><div className="editorial-form__section-title"><span>01</span><div><b>Organizzazione e consenso</b><small>Solo i campi necessari alla directory pubblica.</small></div></div><label className="field"><span>Denominazione pubblica *</span><input disabled={!editable} maxLength="140" value={draft.organizationName} onChange={(event) => update('organizationName', event.target.value)} /></label><label className="field"><span>Municipalità collegate * <small>separate da virgola</small></span><input disabled={!editable} value={draft.municipalities.join(', ')} onChange={(event) => update('municipalities', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} /></label><label className="partner-consent-check"><input type="checkbox" disabled={!editable} checked={draft.consentToPublish} onChange={(event) => update('consentToPublish', event.target.checked)} /><span><b>Consenso alla pubblicazione</b><small>Autorizza la diffusione dei soli dati presenti in questa scheda. La Partita IVA non è richiesta né esposta.</small></span></label></section>
            <section><div className="editorial-form__section-title"><span>02</span><div><b>Progetti pubblici</b><small>Ogni progetto richiede una fonte pubblicabile prima della revisione.</small></div></div><div className="partner-projects">{draft.projects.map((project, index) => <article key={index}><div className="partner-projects__top"><span>PROGETTO {String(index + 1).padStart(2, '0')}</span>{editable && draft.projects.length > 1 && <button type="button" onClick={() => update('projects', draft.projects.filter((_, projectIndex) => projectIndex !== index))} aria-label={`Rimuovi progetto ${index + 1}`}><Trash2 size={15} /></button>}</div><div className="field-row"><label className="field"><span>Nome progetto *</span><input disabled={!editable} maxLength="160" value={project.name} onChange={(event) => updateProject(index, 'name', event.target.value)} /></label><label className="field"><span>Municipalità *</span><input disabled={!editable} maxLength="140" value={project.municipality} onChange={(event) => updateProject(index, 'municipality', event.target.value)} /></label></div><label className="field"><span>Descrizione pubblica *</span><textarea disabled={!editable} rows="3" maxLength="1000" value={project.description} onChange={(event) => updateProject(index, 'description', event.target.value)} /></label><label className="field"><span>Evidenza pubblicabile *</span><input disabled={!editable} maxLength="240" value={project.publicEvidence} onChange={(event) => updateProject(index, 'publicEvidence', event.target.value)} placeholder="Es. Attestazione pubblica verificata — demo" /></label></article>)}</div>{editable && draft.projects.length < 5 && <button className="button button--outline" type="button" onClick={() => update('projects', [...draft.projects, { ...emptyProject, municipality: draft.municipalities[0] || '' }])}><Plus size={16} />Aggiungi progetto</button>}</section>
            {rectifyMode && <label className="field rectification-note"><span>Nota pubblica di rettifica *</span><textarea rows="3" value={rectificationNote} onChange={(event) => setRectificationNote(event.target.value)} /></label>}
          </div>

          <footer className="partner-actions"><div>{entry.status === 'PUBLISHED' && <a className="text-link" href={`/partner/${entry.publicSlug}`} target="_blank" rel="noreferrer">Apri scheda pubblica <ArrowUpRight size={17} /></a>}<span>Ultimo aggiornamento {dateTime(entry.updatedAt)}</span></div><div>{['DRAFT', 'REJECTED_WITH_REASON'].includes(entry.status) && <><button className="button button--outline" type="button" disabled={!dirty || saveBusy} onClick={saveWithNotice}>{saveBusy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Salva</button><button className="button button--cobalt" type="button" onClick={submitReview}><Send size={16} />Invia a revisione</button></>}{entry.status === 'PENDING_REVIEW' && <button className="button button--cobalt" type="button" onClick={() => setReviewOpen(true)}><BadgeCheck size={16} />Registra revisione demo</button>}{entry.status === 'PUBLISHED' && !rectifyMode && <><button className="button button--outline" type="button" onClick={() => setRectifyMode(true)}><FileCheck2 size={16} />Procedura rettifica</button><button className="button button--danger" type="button" onClick={() => setRemoveOpen(true)}><Trash2 size={16} />Rimuovi dal pubblico</button></>}{rectifyMode && <><button className="button button--ghost" type="button" onClick={() => { setDraft(entryDraft(entry)); setRectifyMode(false); }}>Annulla</button><button className="button button--cobalt" type="button" onClick={rectify}><FileCheck2 size={16} />Registra rettifica demo</button></>}</div></footer>
        </section>}

        {entry && <aside className="partner-review-panel"><section><div className="panel-heading"><div><span className="micro-label">PUBBLICAZIONE</span><h2>Regole del registro</h2></div><Globe2 size={19} /></div><ul className="registry-rules"><li><CheckCircle2 size={16} />Solo schede approvate sono pubbliche</li><li><CheckCircle2 size={16} />Il consenso è obbligatorio</li><li><CheckCircle2 size={16} />Nessuna classifica basata sul volume</li><li><CheckCircle2 size={16} />Rettifiche e rimozioni conservano storico</li></ul></section><section><div className="panel-heading"><div><span className="micro-label">REVIEW TIMELINE</span><h2>Attività</h2></div><UserCheck size={19} /></div><ReviewTimeline events={[...(entry.reviewEvents || [])].reverse()} createdAt={entry.joinedAt} status={entry.status} /></section>{entry.rectifications.length > 0 && <section><div className="panel-heading"><div><span className="micro-label">RETTIFICHE</span><h2>Storico pubblico</h2></div><FileCheck2 size={19} /></div>{[...entry.rectifications].reverse().map((item) => <div className="review-note" key={item.id}><span>{dateTime(item.at)}</span><p>{item.note}</p></div>)}</section>}</aside>}
      </div>

      {createOpen && <Dialog title="Nuova organizzazione Partner" eyebrow="C07 / BOZZA PRIVATA" onClose={() => setCreateOpen(false)}><form className="stack-form" onSubmit={createEntry}><DemoNotice compact /><label className="field"><span>Denominazione organizzazione *</span><input required minLength="3" value={newEntry.organizationName} onChange={(event) => setNewEntry((current) => ({ ...current, organizationName: event.target.value }))} /></label><label className="field"><span>Municipalità iniziale *</span><input required value={newEntry.municipality} onChange={(event) => setNewEntry((current) => ({ ...current, municipality: event.target.value }))} /></label><label className="field"><span>Nome progetto *</span><input required value={newEntry.projectName} onChange={(event) => setNewEntry((current) => ({ ...current, projectName: event.target.value }))} /></label><label className="field"><span>Descrizione pubblica *</span><textarea rows="3" required minLength="20" value={newEntry.description} onChange={(event) => setNewEntry((current) => ({ ...current, description: event.target.value }))} /></label><label className="field"><span>Evidenza pubblicabile <small>obbligatoria prima della revisione</small></span><input value={newEntry.publicEvidence} onChange={(event) => setNewEntry((current) => ({ ...current, publicEvidence: event.target.value }))} /></label><label className="partner-consent-check"><input type="checkbox" checked={newEntry.consentToPublish} onChange={(event) => setNewEntry((current) => ({ ...current, consentToPublish: event.target.checked }))} /><span><b>Consenso alla pubblicazione</b><small>Può essere acquisito anche prima dell’invio a revisione.</small></span></label>{formError && <p className="form-error">{formError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setCreateOpen(false)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={createBusy}>{createBusy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Crea bozza privata</button></div></form></Dialog>}
      {reviewOpen && <RegistryReviewDialog entry={entry} onClose={() => setReviewOpen(false)} onSubmit={review} />}
      {removeOpen && <Dialog title="Rimuovere dal registro pubblico?" eyebrow="CONFERMA RIMOZIONE TRACCIATA" onClose={() => setRemoveOpen(false)}><div className="stack-form"><p>La pagina pubblica non sarà più disponibile. Organizzazione, consensi, versioni e motivo della rimozione restano nello storico autorizzato.</p><label className="field"><span>Motivo *</span><textarea rows="4" value={removeNote} onChange={(event) => setRemoveNote(event.target.value)} /></label><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setRemoveOpen(false)}>Annulla</button><button className="button button--danger" type="button" onClick={remove}>Rimuovi e registra</button></div></div></Dialog>}
    </div>
  );
}
