import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileImage,
  Globe2,
  Link2,
  MapPin,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicShell } from './PublicPages.jsx';
import { api, downloadFile } from './api.js';
import { usePageMetadata } from './metadata.js';
import { EmptyState, LoadingState, StatusBadge, dateTime, shortDate, useApiData } from './ui.jsx';

export function BrandInvitationPage() {
  const { token } = useParams();
  const path = `/inviti/kit/${token}`;
  const { data, error, loading, reload } = useApiData(`/public/brand-invitations/${encodeURIComponent(token)}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  usePageMetadata({ title: 'Kit di filiera condiviso — Sibillini Impact', description: 'Invito demo read-only a un asset co-brand di filiera.', path, index: false });
  const accept = async () => {
    setBusy(true);
    setActionError(null);
    try { await api(`/public/brand-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }); await reload(); }
    catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  return <PublicShell label="KIT FILIERA / INVITO CONTROLLATO" className="brand-invitation-shell">{loading && <LoadingState label="Apertura dell’invito di filiera" />}{error && <div className="public-state-card"><Link2 size={34} /><span className="micro-label">INVITO NON DISPONIBILE</span><h1>Link revocato o non valido.</h1><p>{error.message}. Richiedi al General Contractor un nuovo invito.</p></div>}{data && <article className="brand-invitation-card"><header><div><span className="micro-label">ASSET CO-BRAND / DATI DEMO</span><h1>Il tuo kit di filiera.</h1><p><b>General Contractor:</b> {data.generalContractorName}<br /><b>Subappaltatore:</b> {data.subcontractorName}</p></div><StatusBadge status={data.status} /></header><div className="brand-invitation-asset"><img src={data.assetPath} alt={`Kit co-brand per ${data.subcontractorName}`} /></div><div className="public-minimization"><ShieldCheck size={23} /><div><h2>Solo l’asset destinato alla tua impresa</h2><p>Questo invito non apre dati commerciali, ordini, report o altre informazioni riservate del General Contractor.</p></div></div>{actionError && <p className="form-error" role="alert">{actionError}</p>}<footer><a className="button button--outline" href={data.assetPath} download="kit-filiera-demo.svg"><Download size={17} />Scarica SVG</a>{data.status !== 'ACCEPTED_DEMO' ? <button className="button button--cobalt" type="button" onClick={accept} disabled={busy}><Check size={17} />{busy ? 'Registrazione…' : 'Accetta kit demo'}</button> : <span className="invitation-accepted"><CheckCircle2 size={19} />Accettato {dateTime(data.acceptedAt)}</span>}</footer></article>}</PublicShell>;
}

export function EditorialPublicPage({ type }) {
  const { slug } = useParams();
  const location = useLocation();
  const { data, error, loading } = useApiData(`/public/editorial/${type}/${encodeURIComponent(slug)}`);
  usePageMetadata({
    title: data ? `${data.title} — Sibillini Impact` : 'Contenuto editoriale — Sibillini Impact',
    description: data?.metaDescription || 'Contenuto editoriale non disponibile o non pubblicato.',
    path: data?.canonicalPath || location.pathname,
    image: data?.image,
    index: Boolean(data),
    type: 'article',
  });
  const shellLabel = data?.type === 'LOCAL_SHARED_VALUE' || type === 'shared-value'
    ? 'LOCAL SHARED VALUE / RENDICONTAZIONE TERRITORIALE'
    : type === 'case-history'
    ? 'CASE HISTORY / EVIDENZE E NARRATIVA'
    : 'EXECUTIVE PAGE / ANALISI EDITORIALE';

  const typeLabel = data?.type === 'LOCAL_SHARED_VALUE'
    ? 'LOCAL SHARED VALUE'
    : data?.type === 'CASE_HISTORY'
    ? 'CASE HISTORY'
    : 'EXECUTIVE PAGE';

  return (
    <PublicShell label={shellLabel} className="editorial-public-shell">
      {loading && <LoadingState label="Caricamento contenuto editoriale" />}
      {error && (
        <div className="public-state-card">
          <FileCheck2 size={34} />
          <span className="micro-label">CONTENUTO NON DISPONIBILE</span>
          <h1>{error.status === 410 ? 'Contenuto archiviato.' : 'Pagina non trovata.'}</h1>
          <p>{error.message}. Le bozze private non sono accessibili né indicizzabili.</p>
          <Link className="button button--outline" to="/">Torna al portale <ArrowRight size={17} /></Link>
        </div>
      )}
      {data && data.type === 'LOCAL_SHARED_VALUE' && (
        <article className="editorial-public-article lsv-public-dossier">
          <header>
            <div className="editorial-public-article__labels">
              <span>LOCAL SHARED VALUE</span>
              <span>ATTESTAZIONE ASSEVERATA</span>
              <span>VERSIONE {data.version}.0</span>
              <span>RISCONTRI PROBATORI TRACCIATI</span>
            </div>
            <h1>{data.title}</h1>
            <p>{data.excerpt}</p>
            <div className="editorial-public-article__byline">
              <span><b>Asseveratore:</b> {data.author}</span>
              <span><b>Data emissione:</b> {shortDate(data.publishedAt)}</span>
              <span><b>Aggiornamento:</b> {shortDate(data.updatedAt)}</span>
              <span><b>Stato:</b> Riscontro Fatti Approvato</span>
            </div>

            <div className="lsv-public-kpis">
              <div className="lsv-public-kpi-item">
                <span className="lsv-public-kpi-label">REQUISITI TERRITORIALI</span>
                <span className="lsv-public-kpi-val">6 / 6</span>
                <span className="lsv-public-kpi-sub">100% macro-ambiti asseverati</span>
              </div>
              <div className="lsv-public-kpi-item">
                <span className="lsv-public-kpi-label">RISCONTRI PROBATORI</span>
                <span className="lsv-public-kpi-val">6 ATTI</span>
                <span className="lsv-public-kpi-sub">Atti e contratti documentati</span>
              </div>
              <div className="lsv-public-kpi-item">
                <span className="lsv-public-kpi-label">MATCHING GRANT</span>
                <span className="lsv-public-kpi-val">ATTIVO</span>
                <span className="lsv-public-kpi-sub">Pareggio paritario donazioni</span>
              </div>
              <div className="lsv-public-kpi-item">
                <span className="lsv-public-kpi-label">AUDIT SIBILLINI</span>
                <span className="lsv-public-kpi-val">CONFERMATO</span>
                <span className="lsv-public-kpi-sub">Indipendenza giudizio redazionale</span>
              </div>
            </div>
          </header>

          <div className="editorial-public-article__content">
            {data.sections.map((section, index) => (
              <section key={index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{section.heading}</h2>
                  <p>{section.text}</p>
                </div>
              </section>
            ))}
          </div>

          {data.questions && data.questions.length > 0 && (
            <section className="editorial-public-questions">
              <div className="panel-heading">
                <div>
                  <span className="micro-label">REGISTRO DI VALUTAZIONE E QUESTIONARIO ESTESO</span>
                  <h2>6 Requisiti Asseverati con Riscontro Probatorio</h2>
                </div>
                <ShieldCheck size={26} />
              </div>
              <div className="editorial-public-questions__list">
                {data.questions.map((q, index) => (
                  <article key={q.id || index} className="lsv-public-master-card">
                    <div className="lsv-public-master-card__header">
                      <div className="lsv-public-master-card__tags">
                        <span className="lsv-public-idx">REQUISITO {String(index + 1).padStart(2, '0')}</span>
                        <span className="lsv-public-cat">{q.category || 'Valore Condiviso'}</span>
                      </div>
                      <span className="lsv-public-badge-verified">
                        <CheckCircle2 size={14} /> Riscontro Asseverato
                      </span>
                    </div>

                    <h3>{q.title || q.question}</h3>

                    {q.description && (
                      <div className="lsv-public-guide">
                        <span className="micro-label" style={{ display: 'block', marginBottom: '4px', color: 'var(--cobalt)', fontWeight: 800 }}>INQUADRAMENTO METODOLOGICO (FRAMEWORK SIBILLINI IMPACT)</span>
                        <p style={{ margin: 0 }}>{q.description}</p>
                      </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                      <span className="micro-label" style={{ display: 'block', marginBottom: '4px', color: '#64748b', fontWeight: 800 }}>DOMANDA UFFICIALE DI RILEVAZIONE</span>
                      <p className="lsv-public-question-prompt" style={{ margin: 0 }}>{q.question}</p>
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div className="lsv-public-options-box">
                        <h4>Pratiche e Risposte del Questionario Esteso Rilevate:</h4>
                        <ul className="lsv-public-options-list">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = (q.selectedOptions || []).includes(opt);
                            return (
                              <li key={optIdx} style={{ opacity: isSelected ? 1 : 0.65 }}>
                                {isSelected ? <CheckCircle2 size={15} style={{ color: 'var(--cobalt)', flexShrink: 0 }} /> : <span style={{ width: 15, display: 'inline-block', textAlign: 'center', color: '#94a3b8' }}>—</span>}
                                <span style={{ fontWeight: 400, color: isSelected ? 'var(--ink)' : '#64748b' }}>
                                  {opt}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="lsv-public-statement">
                      <span>Dichiarazione Asseverata per il Report di Sostenibilità</span>
                      <p>{q.answer}</p>
                    </div>

                    {q.documentUrl && (
                      <div className="lsv-public-doc-strip">
                        <div className="lsv-public-doc-strip__info">
                          <FileCheck2 size={20} />
                          <div>
                            <strong>DOCUMENTO PROBATORIO ASSEVERATO</strong>
                            <small>{q.documentUrl}</small>
                          </div>
                        </div>
                        <a
                          href={q.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button button--outline button--sm"
                        >
                          Apri documento <ArrowUpRight size={14} />
                        </a>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="editorial-public-sources">
            <div className="panel-heading">
              <div>
                <span className="micro-label">FONTI E RIFERIMENTI DI SISTEMA</span>
                <h2>Dati essenziali collegati alla rendicontazione</h2>
              </div>
              <FileCheck2 size={23} />
            </div>
            <div>
              {data.sources.map((source) => (
                <article key={`${source.type}-${source.label}`}>
                  <span>{source.type}</span>
                  <b>{source.label}</b>
                  <StatusBadge status={source.status} label={source.status.replaceAll('_', ' ')} />
                  {source.detail && <small>{source.detail}</small>}
                  {source.href && (
                    <Link to={source.href}>
                      Vai alla fonte <ArrowUpRight size={13} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>

          <footer>
            <ShieldCheck size={28} />
            <div>
              <b>Attestazione del Valore Condiviso Locale — Convalida Redazionale & Garante</b>
              <p>I fatti, i contratti e le donazioni riportati nella presente scheda sono stati verificati con riscontro probatorio documentale. Il giudizio editoriale e la misurazione d'impatto sono resi in conformità al disciplinare del Fondo Sibillini Impact.</p>
            </div>
          </footer>
        </article>
      )}

      {data && data.type !== 'LOCAL_SHARED_VALUE' && (
        <article className="editorial-public-article">
          <header>
            <div className="editorial-public-article__labels">
              <span>{typeLabel}</span>
              <span>VERSIONE {data.version}</span>
              <span>DEMO / DATI SINTETICI</span>
            </div>
            <h1>{data.title}</h1>
            <p>{data.excerpt}</p>
            <div className="editorial-public-article__byline">
              <span>{data.author}</span>
              <span>Pubblicato {shortDate(data.publishedAt)}</span>
              <span>Aggiornato {shortDate(data.updatedAt)}</span>
            </div>
          </header>
          <figure>
            <img src={data.image} alt={data.imageAlt} />
            <figcaption>Immagine editoriale locale · contenuto dimostrativo</figcaption>
          </figure>
          <div className="editorial-public-article__content">
            {data.sections.map((section, index) => (
              <section key={index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{section.heading}</h2>
                  <p>{section.text}</p>
                </div>
              </section>
            ))}
          </div>

          <section className="editorial-public-sources">
            <div className="panel-heading">
              <div>
                <span className="micro-label">FONTI E RIFERIMENTI</span>
                <h2>Dati essenziali collegati</h2>
              </div>
              <FileCheck2 size={23} />
            </div>
            <div>
              {data.sources.map((source) => (
                <article key={`${source.type}-${source.label}`}>
                  <span>{source.type}</span>
                  <b>{source.label}</b>
                  <StatusBadge status={source.status} label={source.status.replaceAll('_', ' ')} />
                  {source.detail && <small>{source.detail}</small>}
                  {source.href && (
                    <Link to={source.href}>
                      Vai alla fonte <ArrowUpRight size={13} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>

          {data.corrections && data.corrections.length > 0 && (
            <section className="editorial-public-corrections">
              <h2>Note di revisione e correzione</h2>
              {data.corrections.map((correction, index) => (
                <div key={index}>
                  <time>{dateTime(correction.at)}</time>
                  <p>{correction.note}</p>
                </div>
              ))}
            </section>
          )}

          <footer>
            <ShieldCheck size={24} />
            <div>
              <b>Garanzia di trasparenza editoriale</b>
              <p>La verifica dell’impresa riguarda i fatti e le misurazioni. La redazione mantiene la titolarità dell’analisi e della sintesi narrativa.</p>
            </div>
          </footer>
        </article>
      )}
    </PublicShell>
  );
}

export function PartnerDirectoryPage() {
  const { data, error, loading } = useApiData('/public/partners');
  const [query, setQuery] = useState('');
  const [municipality, setMunicipality] = useState('ALL');
  const [project, setProject] = useState('ALL');
  const [exportMessage, setExportMessage] = useState('');
  usePageMetadata({ title: 'Registro Partner della Ricostruzione — Sibillini Impact', description: 'Directory pubblica demo delle imprese e dei progetti collegati alle municipalità delle aree interne.', path: '/partner', index: true });
  const entries = data?.entries || [];
  const municipalities = useMemo(() => [...new Set(entries.flatMap((entry) => entry.municipalities))].sort(), [entries]);
  const projects = useMemo(() => [...new Set(entries.flatMap((entry) => entry.projects.map((item) => item.name)))].sort(), [entries]);
  const filtered = useMemo(() => entries.filter((entry) => {
    const text = `${entry.organizationName} ${entry.projects.map((item) => item.name).join(' ')}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (municipality === 'ALL' || entry.municipalities.includes(municipality)) && (project === 'ALL' || entry.projects.some((item) => item.name === project));
  }), [entries, query, municipality, project]);
  const exportCsv = async () => {
    try { const filename = await downloadFile('/public/partners/export.csv'); setExportMessage(`${filename} scaricato`); }
    catch (reason) { setExportMessage(reason.message); }
  };
  return <PublicShell label="PUBLIC PARTNER REGISTRY / DIRECTORY" className="partner-public-shell"><section className="partner-directory-hero"><div><span className="micro-label">RETRIABILITY, NOT RANKING</span><h1>Partner e progetti.<br /><em>Reperibili, non classificati.</em></h1></div><p>Il registro pubblico mostra organizzazioni approvate, municipalità e progetti senza classifiche reputazionali o vetrine basate sul volume speso. Tutti i contenuti sono dimostrativi.</p></section><section className="partner-directory-filters" aria-label="Filtri del registro"><label className="search-field"><Search size={18} /><span className="sr-only">Cerca organizzazione o progetto</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca organizzazione o progetto…" /></label><label className="compact-field"><span>Municipalità</span><select value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option value="ALL">Tutte le municipalità</option>{municipalities.map((item) => <option key={item}>{item}</option>)}</select></label><label className="compact-field"><span>Progetto</span><select value={project} onChange={(event) => setProject(event.target.value)}><option value="ALL">Tutti i progetti</option>{projects.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button--dark" type="button" onClick={exportCsv}><Download size={17} />Export CSV</button></section><div className="partner-directory-status"><span><b>{filtered.length}</b> organizzazioni nei risultati</span><span>Solo schede verificate in ambiente demo</span></div><div className="sr-only" aria-live="polite">{exportMessage}</div>{exportMessage && <p className="inline-empty">{exportMessage}</p>}{loading && <LoadingState label="Caricamento directory Partner" />}{error && <div className="public-state-card"><h1>Registro non disponibile.</h1><p>{error.message}</p></div>}{data && <>{filtered.length ? <><div className="table-scroll partner-directory-table" tabIndex="0" role="region" aria-label="Organizzazioni Partner"><table className="data-table"><thead><tr><th>Organizzazione</th><th>Municipalità</th><th>Progetti</th><th>Stato</th><th>Aggiornamento</th><th><span className="sr-only">Apri</span></th></tr></thead><tbody>{filtered.map((entry) => <tr key={entry.slug}><th scope="row"><Link to={entry.publicPath}>{entry.organizationName}</Link><small>Iscritta {shortDate(entry.joinedAt)}</small></th><td>{entry.municipalities.join(' · ')}</td><td>{entry.projects.map((item) => item.name).join(' · ')}</td><td><StatusBadge status={entry.status} /></td><td>{shortDate(entry.updatedAt)}</td><td><Link to={entry.publicPath} aria-label={`Apri ${entry.organizationName}`}><ArrowUpRight size={18} /></Link></td></tr>)}</tbody></table></div><div className="partner-directory-cards">{filtered.map((entry) => <Link key={entry.slug} to={entry.publicPath} className="partner-directory-card"><div><Building2 size={22} /><StatusBadge status={entry.status} /></div><h2>{entry.organizationName}</h2><p><MapPin size={15} />{entry.municipalities.join(' · ')}</p><span>{entry.projects.length} progetti pubblici · aggiornato {shortDate(entry.updatedAt)}</span><ArrowRight size={18} /></Link>)}</div></> : <EmptyState title="Nessuna organizzazione nei risultati" text="Modifica i filtri o azzera la ricerca." action={<button className="button button--outline" type="button" onClick={() => { setQuery(''); setMunicipality('ALL'); setProject('ALL'); }}>Azzera filtri</button>} />}</>}</PublicShell>;
}

export function PartnerPublicDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { data, error, loading } = useApiData(`/public/partners/${encodeURIComponent(slug)}`);
  usePageMetadata({ title: data ? `${data.organizationName} — Registro Partner` : 'Scheda Partner — Sibillini Impact', description: data ? `${data.organizationName}: municipalità e progetti pubblici nel registro dimostrativo Sibillini Impact.` : 'Scheda Partner non disponibile.', path: data?.publicPath || location.pathname, index: Boolean(data) });
  return <PublicShell label="PUBLIC PARTNER REGISTRY / SCHEDA IMPRESA" className="partner-public-shell">{loading && <LoadingState label="Caricamento scheda Partner" />}{error && <div className="public-state-card"><Users size={34} /><span className="micro-label">SCHEDA NON DISPONIBILE</span><h1>{error.status === 410 ? 'Scheda rimossa.' : 'Organizzazione non trovata.'}</h1><p>{error.message}.</p><Link className="button button--outline" to="/partner">Torna al registro <ArrowRight size={17} /></Link></div>}{data && <article className="partner-public-detail"><header><div className="partner-avatar">{data.organizationName.slice(0, 2).toUpperCase()}</div><div><span className="micro-label">ORGANIZZAZIONE REGISTRATA / DEMO</span><h1>{data.organizationName}</h1><p><MapPin size={17} />{data.municipalities.join(' · ')}</p></div><StatusBadge status={data.status} /></header><dl className="public-facts"><div><dt>Stato</dt><dd>Verificata in ambiente demo</dd></div><div><dt>Data di iscrizione</dt><dd>{shortDate(data.joinedAt)}</dd></div><div><dt>Ultimo aggiornamento</dt><dd>{dateTime(data.updatedAt)}</dd></div><div><dt>Dati esposti</dt><dd>Solo consenso, municipalità e progetti pubblici</dd></div></dl><section className="partner-public-projects"><div className="panel-heading"><div><span className="micro-label">PROGETTI COLLEGATI</span><h2>Impegno nelle aree interne</h2></div><Globe2 size={22} /></div>{data.projects.map((project, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{project.name}</h3><p className="partner-project-municipality"><MapPin size={15} />{project.municipality}</p><p>{project.description}</p><div><FileCheck2 size={17} /><span><b>Evidenza pubblicabile</b>{project.publicEvidence}</span></div></div></article>)}</section>{data.rectifications.length > 0 && <section className="partner-public-rectifications"><h2>Rettifiche registrate</h2>{data.rectifications.map((item, index) => <div key={index}><time>{dateTime(item.at)}</time><p>{item.note}</p></div>)}</section>}<div className="public-minimization"><ShieldCheck size={23} /><div><h2>Nessuna classifica, nessun dato privato</h2><p>La scheda non espone Partita IVA, importi, ordini o documenti riservati. Rettifiche e rimozioni sono gestite nel perimetro autenticato.</p></div></div><Link className="back-directory" to="/partner"><ArrowLeft size={17} />Torna alla directory</Link></article>}</PublicShell>;
}
