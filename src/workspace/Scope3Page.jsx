import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Database,
  FileClock,
  Fingerprint,
  Info,
  Layers3,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { downloadFile } from './api.js';
import {
  BlockedState,
  EmptyState,
  ErrorState,
  ExportMenu,
  LoadingState,
  SourcePill,
  StatusBadge,
  useApiData,
  dateTime,
  decimal,
} from './ui.jsx';

export function Scope3Page() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area1/scope3');
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareId, setCompareId] = useState('');

  useEffect(() => { document.title = 'Scope 3 Data Hub — Sibillini Impact'; }, []);
  useEffect(() => {
    if (!data?.datasets.length) return;
    if (!data.datasets.some((item) => item.id === selectedId)) {
      setSelectedId(data.datasets.find((item) => item.status === 'VERIFIED')?.id || data.datasets[0].id);
    }
  }, [data, selectedId]);

  const datasets = data?.datasets || [];
  const filtered = useMemo(() => datasets.filter((item) => {
    const matchesQuery = `${item.productModel} ${item.lot} ${item.id}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'ALL' || item.status === status);
  }), [datasets, query, status]);
  const dataset = datasets.find((item) => item.id === selectedId) || filtered[0];
  const versions = useMemo(() => dataset ? datasets.filter((item) => item.productModel === dataset.productModel && item.lot === dataset.lot).sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })) : [], [datasets, dataset]);
  const comparisonVersions = versions.filter((item) => item.id !== dataset?.id);
  const compared = comparisonVersions.find((item) => item.id === compareId) || comparisonVersions[0];
  const downloads = (data?.downloads || []).filter((item) => item.datasetId === dataset?.id);

  useEffect(() => { setCompareId(''); setCompareOpen(false); }, [selectedId]);

  const exportDataset = async (format) => {
    const filename = await downloadFile(`/area1/scope3/${dataset.id}/export?format=${format}`);
    await reload();
    return filename;
  };

  if (loading && !data) return <LoadingState label="Caricamento dataset Scope 3" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;
  if (!datasets.length) return <EmptyState title="Nessun dataset disponibile" text="Quando un dataset LCA sarà caricato e verificato, lo troverai in questo spazio." />;

  return (
    <div className="module-page scope3-page">
      <header className="module-heading">
        <div>
          <div className="eyebrow"><span /> C01 / SCOPE 3 DATA HUB</div>
          <h1>Il dato ambientale.<br /><em>Con tutto il suo contesto.</em></h1>
          <p>Per il tuo reporting trovi modello, lotto, unità funzionale, perimetro e fonte prima di ogni numero. Le versioni verificate restano immutabili e ogni export viene registrato.</p>
        </div>
        <div className="module-heading__actions">
          <button className="button button--outline" type="button" onClick={() => setCompareOpen((value) => !value)} disabled={!comparisonVersions.length}><ArrowUpDown size={17} />{compareOpen ? 'Chiudi confronto' : 'Confronta versioni'}</button>
          <ExportMenu onExport={exportDataset} notify={notify} />
        </div>
      </header>

      <div className="dataset-workspace">
        <aside className="dataset-browser" aria-label="Archivio dataset">
          <div className="dataset-browser__heading"><span>DATASET / {datasets.length}</span><Database size={18} /></div>
          <label className="search-field"><Search size={17} /><span className="sr-only">Cerca modello, lotto o identificativo</span><input type="search" placeholder="Modello, lotto o ID…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="compact-field"><span>Stato verifica</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Tutti gli stati</option><option value="VERIFIED">Verificati demo</option><option value="SUPERSEDED">Versioni superate</option></select></label>
          <div className="dataset-list">
            {filtered.map((item) => <button key={item.id} type="button" className={dataset?.id === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)} aria-pressed={dataset?.id === item.id}>
              <span className="dataset-list__top"><small>{item.id}</small><StatusBadge status={item.status} /></span>
              <b>{item.productModel}</b>
              <span>{item.lot} · versione {item.version}</span>
              <span className="dataset-list__foot">{decimal.format(item.carbonFootprintKg)} kgCO₂e / paio<ArrowRight size={16} /></span>
            </button>)}
            {!filtered.length && <EmptyState title="Nessuna corrispondenza" text="Modifica la ricerca o il filtro di stato." action={<button className="button button--outline" type="button" onClick={() => { setQuery(''); setStatus('ALL'); }}>Azzera filtri</button>} />}
          </div>
          <div className="dataset-browser__note"><Info size={17} /><p>I dati sono riservati all’organizzazione demo. Solo la metodologia generale è destinata alla consultazione pubblica.</p></div>
        </aside>

        {dataset && <section className="dataset-detail" aria-labelledby="dataset-title">
          <header className="dataset-detail__header">
            <div><span className="micro-label">{dataset.id} / DATASET v{dataset.version}</span><h2 id="dataset-title">{dataset.productModel}</h2><p>{dataset.lot} · aggiornato {dateTime(dataset.updatedAt)}</p></div>
            <StatusBadge status={dataset.status} />
          </header>

          {dataset.status === 'SUPERSEDED' && <BlockedState title="Stai consultando una versione superata" text="Puoi esportarla per ricostruire uno storico, ma per un nuovo reporting seleziona la versione verificata più recente." />}

          <div className="unit-context"><Layers3 size={22} /><div><span>UNITÀ FUNZIONALE E PERIMETRO</span><b>{dataset.unit}</b><p>{dataset.boundary}</p></div><SourcePill>{dataset.source}</SourcePill></div>

          <div className="dataset-kpis">
            <article className="dataset-kpi dataset-kpi--primary"><span>CARBON FOOTPRINT</span><strong>{decimal.format(dataset.carbonFootprintKg)}<small>kgCO₂e / paio</small></strong><p>Fonte {dataset.source} · v{dataset.version}</p></article>
            <article className="dataset-kpi"><span>RIFERIMENTO CONVENZIONALE</span><strong>{decimal.format(dataset.conventionalFootprintKg)}<small>kgCO₂e / paio</small></strong><p>Stesso perimetro funzionale · v{dataset.version}</p></article>
            <article className="dataset-kpi"><span>DELTA ILLUSTRATIVO</span><strong>{decimal.format(dataset.avoidedKg)}<small>kgCO₂e / paio</small></strong><p>Parametro demo del simulatore, non dato LCA ufficiale</p></article>
          </div>

          {compareOpen && compared && <section className="version-comparison" aria-labelledby="comparison-title">
            <div className="panel-heading"><div><span className="micro-label">CONFRONTO VERSIONI</span><h3 id="comparison-title">Che cosa è cambiato</h3></div><label className="compact-field"><span>Confronta v{dataset.version} con</span><select value={compared.id} onChange={(event) => setCompareId(event.target.value)}>{comparisonVersions.map((item) => <option key={item.id} value={item.id}>Versione {item.version} · {item.id}</option>)}</select></label></div>
            <div className="comparison-metrics"><div><span>Versione corrente</span><b>v{dataset.version}</b><small>{decimal.format(dataset.carbonFootprintKg)} kgCO₂e</small></div><ArrowRight /><div><span>Versione precedente</span><b>v{compared.version}</b><small>{decimal.format(compared.carbonFootprintKg)} kgCO₂e</small></div><div className="comparison-delta"><span>VARIAZIONE</span><strong>{decimal.format(dataset.carbonFootprintKg - compared.carbonFootprintKg)} kgCO₂e</strong></div></div>
            <div className="table-scroll" tabIndex="0" role="region" aria-label="Confronto dei fattori per versione"><table className="data-table"><thead><tr><th>Fase</th><th>v{dataset.version}</th><th>v{compared.version}</th><th>Differenza</th></tr></thead><tbody>{dataset.factors.map((factor) => { const old = compared.factors.find((item) => item.stage === factor.stage)?.kgCo2e || 0; return <tr key={factor.stage}><th scope="row">{factor.stage}</th><td>{decimal.format(factor.kgCo2e)} kg</td><td>{decimal.format(old)} kg</td><td>{decimal.format(factor.kgCo2e - old)} kg</td></tr>; })}</tbody></table></div>
          </section>}

          <section className="factor-panel" aria-labelledby="factors-title">
            <div className="panel-heading"><div><span className="micro-label">FATTORI DI EMISSIONE</span><h3 id="factors-title">Composizione per fase</h3></div><SourcePill>kgCO₂e / {dataset.unit}</SourcePill></div>
            <div className="table-scroll" tabIndex="0" role="region" aria-label="Fattori di emissione per fase"><table className="data-table"><thead><tr><th>Fase del ciclo di vita</th><th>Fattore</th><th>Fonte</th><th>Versione</th></tr></thead><tbody>{dataset.factors.map((factor) => <tr key={factor.stage}><th scope="row">{factor.stage}</th><td><b>{decimal.format(factor.kgCo2e)} kgCO₂e</b></td><td>{dataset.source}</td><td>v{dataset.version}</td></tr>)}</tbody><tfoot><tr><th scope="row">Totale dataset</th><td>{decimal.format(dataset.factors.reduce((sum, factor) => sum + factor.kgCo2e, 0))} kgCO₂e</td><td colSpan="2">Coerente con il valore di Carbon Footprint</td></tr></tfoot></table></div>
          </section>

          <div className="dataset-meta-grid">
            <details className="method-accordion" open><summary><ShieldCheck size={19} />Metodologia, anno e revisione<ArrowRight size={17} /></summary><dl><div><dt>Metodologia</dt><dd>{dataset.methodology}</dd></div><div><dt>Anno di riferimento</dt><dd>{dataset.referenceYear}</dd></div><div><dt>Revisore</dt><dd>{dataset.reviewedBy}</dd></div><div><dt>Fonte</dt><dd>{dataset.source}</dd></div></dl></details>
            <details className="method-accordion"><summary><Fingerprint size={19} />Integrità e immutabilità<ArrowRight size={17} /></summary><dl><div><dt>Hash contenuto</dt><dd><code>{dataset.contentHash}</code></dd></div><div><dt>Versione dataset</dt><dd>{dataset.version}</dd></div><div><dt>Regola di correzione</dt><dd>Una modifica crea una nuova versione; il dato verificato non viene sovrascritto.</dd></div></dl></details>
          </div>

          <section className="version-history" aria-labelledby="versions-title">
            <div className="panel-heading"><div><span className="micro-label">DOCUMENT VERSION LIST</span><h3 id="versions-title">Versioni del modello e lotto</h3></div><CalendarDays size={20} /></div>
            <ol>{versions.map((item) => <li key={item.id} className={item.id === dataset.id ? 'is-current' : ''}><button type="button" onClick={() => setSelectedId(item.id)}><span className="version-history__marker">{item.id === dataset.id ? <CheckCircle2 size={17} /> : <FileClock size={17} />}</span><span><b>Versione {item.version}</b><small>{item.id} · {dateTime(item.updatedAt)}</small></span><StatusBadge status={item.status} /></button></li>)}</ol>
          </section>

          <section className="download-history" aria-labelledby="downloads-title">
            <div className="panel-heading"><div><span className="micro-label">CRONOLOGIA EXPORT</span><h3 id="downloads-title">Download registrati</h3></div><span>{downloads.length} eventi</span></div>
            {downloads.length ? <ol>{downloads.map((event) => <li key={event.id}><span className="file-format">.{event.format.toUpperCase()}</span><div><b>Dataset v{event.datasetVersion}</b><small>{event.actor} · {dateTime(event.at)}</small></div></li>)}</ol> : <p className="inline-empty">Nessun export di questa versione nella cronologia demo.</p>}
          </section>
        </section>}
      </div>
    </div>
  );
}
