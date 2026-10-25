import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  Download,
  FileImage,
  ImagePlus,
  Layers3,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Palette,
  Plus,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import { svgDataUrl } from './metadata.js';
import {
  BlockedState,
  CopyButton,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  SourcePill,
  StatusBadge,
  dateTime,
  useApiData,
} from './ui.jsx';

const initialConfig = { template: 'BADGE', palette: 'MONO', audience: 'GENERAL_CONTRACTOR', logoAssetId: '', textVersionId: '', subcontractorName: '' };

export function BrandKitPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area2/brand-kit');
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState(initialConfig);
  const [initialized, setInitialized] = useState(false);
  const [preview, setPreview] = useState({ svg: '', loading: false, error: null });
  const [generateBusy, setGenerateBusy] = useState(false);
  const [selectedGenerationId, setSelectedGenerationId] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteGenerationId, setInviteGenerationId] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [revokeToken, setRevokeToken] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => { document.title = 'Co-Brand Asset Studio — Sibillini Impact'; }, []);
  useEffect(() => {
    if (!data || initialized) return;
    setConfig({
      ...initialConfig,
      audience: searchParams.get('audience') === 'SUBCONTRACTOR' ? 'SUBCONTRACTOR' : 'GENERAL_CONTRACTOR',
      logoAssetId: data.assets[0]?.id || '',
      textVersionId: data.textVersions.at(-1)?.id || '',
    });
    setInitialized(true);
  }, [data, initialized, searchParams]);

  useEffect(() => {
    if (!initialized || !config.logoAssetId || !config.textVersionId || (config.audience === 'SUBCONTRACTOR' && config.subcontractorName.trim().length < 2)) {
      setPreview({ svg: '', loading: false, error: null });
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setPreview((current) => ({ ...current, loading: true, error: null }));
      try {
        const result = await api('/area2/brand-kit/preview', { method: 'POST', body: JSON.stringify(config) });
        if (active) setPreview({ svg: result.svg, loading: false, error: null });
      } catch (reason) { if (active) setPreview({ svg: '', loading: false, error: reason }); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [config, initialized]);

  const generations = data?.generations || [];
  const subcontractorGenerations = generations.filter((item) => item.audience === 'SUBCONTRACTOR');
  const selectedGeneration = generations.find((item) => item.id === selectedGenerationId) || generations[0];
  const selectedText = data?.textVersions.find((item) => item.id === config.textVersionId);
  const selectedPalette = data?.palettes[config.palette];
  const invitations = data?.invitations || [];

  const update = (key, value) => setConfig((current) => ({ ...current, [key]: value }));
  const generate = async () => {
    setGenerateBusy(true);
    try {
      const result = await api('/area2/brand-kit/generations', { method: 'POST', body: JSON.stringify(config) });
      await reload();
      setSelectedGenerationId(result.generation.id);
      notify('success', `${result.generation.id} generato e archiviato`);
    } catch (reason) { notify('error', reason.message); }
    finally { setGenerateBusy(false); }
  };
  const uploadLogo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) return notify('error', 'Il logo supera il limite demo di 2 MB');
    if (!['image/svg+xml', 'image/png', 'image/jpeg'].includes(file.type)) return notify('error', 'Formato non supportato: usa SVG, PNG o JPEG');
    setUploadBusy(true);
    try {
      const result = await api('/area2/brand-kit/assets', { method: 'POST', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }, body: file });
      await reload();
      update('logoAssetId', result.asset.id);
      notify('success', `${file.name} caricato e validato`);
    } catch (reason) { notify('error', reason.message); }
    finally { setUploadBusy(false); }
  };
  const exportGeneration = async (generation, format) => {
    try {
      const filename = await downloadFile(`/area2/brand-kit/generations/${generation.id}/export?format=${format}`);
      notify('success', `${filename} scaricato`);
    } catch (reason) { notify('error', reason.message); }
  };
  const openShare = () => {
    setInviteGenerationId(selectedGeneration?.audience === 'SUBCONTRACTOR' ? selectedGeneration.id : subcontractorGenerations[0]?.id || '');
    setShareOpen(true);
  };
  const createInvitation = async () => {
    setInviteBusy(true);
    try {
      await api('/area2/brand-kit/invitations', { method: 'POST', body: JSON.stringify({ generationId: inviteGenerationId }) });
      await reload();
      notify('success', 'Invito demo creato · nessuna email inviata');
    } catch (reason) { notify('error', reason.message); }
    finally { setInviteBusy(false); }
  };
  const revokeInvitation = async () => {
    try {
      await api(`/area2/brand-invitations/${revokeToken}`, { method: 'DELETE' });
      await reload();
      setRevokeToken(null);
      notify('success', 'Invito revocato');
    } catch (reason) { notify('error', reason.message); }
  };

  if (loading && !data) return <LoadingState label="Caricamento loghi, testi e generazioni" />;
  if (error) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page brand-kit-page">
      <header className="module-heading">
        <div><div className="eyebrow"><span /> C05 / CO-BRAND ASSET STUDIO</div><h1>La tua identità.<br /><em>Il kit già sotto controllo.</em></h1><p>Per la tua impresa e la filiera generi badge e infografiche con denominazione, logo e testi approvati. Contrasto e area di sicurezza sono verificati prima dell’archiviazione.</p></div>
        <div className="module-heading__actions"><button className="button button--outline" type="button" onClick={openShare}><Share2 size={17} />Distribuzione filiera</button></div>
      </header>

      <div className="brand-studio">
        <aside className="brand-controls" aria-label="Configurazione asset">
          <div className="panel-heading"><div><span className="micro-label">01 / INPUT APPROVATI</span><h2>Configura il kit</h2></div><Layers3 size={20} /></div>
          <section className="brand-control-section">
            <div className="brand-control-section__title"><span>LOGO ORGANIZZAZIONE</span><button type="button" onClick={() => fileInput.current?.click()} disabled={uploadBusy} aria-label="Carica un nuovo logo">{uploadBusy ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}</button></div>
            <input ref={fileInput} className="sr-only" type="file" aria-label="Carica un logo SVG, PNG o JPEG" accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg" onChange={uploadLogo} />
            <div className="logo-options">{data.assets.map((asset) => <button type="button" key={asset.id} className={config.logoAssetId === asset.id ? 'is-selected' : ''} onClick={() => update('logoAssetId', asset.id)}><span><img src={asset.dataUrl} alt="" /></span><b>{asset.originalName}</b><small>{asset.mime.replace('image/', '').toUpperCase()} · validato demo</small>{config.logoAssetId === asset.id && <Check size={15} />}</button>)}</div>
            <button className="button button--outline button--full" type="button" onClick={() => fileInput.current?.click()} disabled={uploadBusy}><ImagePlus size={16} />Carica logo</button>
            <p className="field-help">SVG sanitizzato; PNG/JPEG con firma del file verificata. Limite demo 2 MB.</p>
          </section>

          <section className="brand-control-section"><span className="brand-control-section__label">DESTINATARIO</span><div className="segmented-control"><button type="button" className={config.audience === 'GENERAL_CONTRACTOR' ? 'is-selected' : ''} onClick={() => update('audience', 'GENERAL_CONTRACTOR')}><Building2 size={16} />Impresa</button><button type="button" className={config.audience === 'SUBCONTRACTOR' ? 'is-selected' : ''} onClick={() => update('audience', 'SUBCONTRACTOR')}><Users size={16} />Filiera</button></div>{config.audience === 'SUBCONTRACTOR' && <label className="field"><span>Denominazione subappaltatore *</span><input value={config.subcontractorName} maxLength="90" onChange={(event) => update('subcontractorName', event.target.value)} placeholder="Es. Subappaltatore Demo S.r.l." /></label>}</section>

          <section className="brand-control-section"><span className="brand-control-section__label">TEMPLATE</span><div className="template-options">{Object.entries(data.templates).map(([id, template]) => <button type="button" key={id} className={config.template === id ? 'is-selected' : ''} onClick={() => update('template', id)}><span className={`template-icon template-icon--${id.toLowerCase()}`} /><span><b>{template.label}</b><small>{template.width} × {template.height} px</small></span></button>)}</div></section>

          <section className="brand-control-section"><span className="brand-control-section__label">VARIANTE COLORE</span><div className="palette-options">{Object.entries(data.palettes).map(([id, palette]) => <button type="button" key={id} className={config.palette === id ? 'is-selected' : ''} onClick={() => update('palette', id)} aria-label={`Palette ${id}, contrasto ${palette.contrastRatio} a 1`}><span style={{ background: palette.background }}><i style={{ background: palette.accent }} /></span><b>{id}</b><small>{palette.contrastRatio}:1</small></button>)}</div></section>

          <section className="brand-control-section"><label className="field"><span>Testo approvato e bloccato</span><select value={config.textVersionId} onChange={(event) => update('textVersionId', event.target.value)}>{data.textVersions.map((text) => <option key={text.id} value={text.id}>Versione {text.version} · {text.id}</option>)}</select></label><div className="locked-text"><LockKeyhole size={16} /><p>{selectedText?.text}</p><small>{selectedText?.approvedBy} · {dateTime(selectedText?.approvedAt)}</small></div></section>
        </aside>

        <section className="brand-canvas" aria-labelledby="brand-preview-title">
          <div className="brand-canvas__top"><div><span className="micro-label">02 / ANTEPRIMA LIVE</span><h2 id="brand-preview-title">Canvas asset</h2></div><SourcePill>{config.template} · {config.palette}</SourcePill></div>
          <div className={`brand-preview brand-preview--${config.template.toLowerCase()}`}>
            {preview.loading && <div className="brand-preview__loading"><LoaderCircle className="spin" size={25} /><span>Aggiornamento anteprima…</span></div>}
            {!preview.loading && preview.svg && <img src={svgDataUrl(preview.svg)} alt={`Anteprima ${data.templates[config.template].label} per ${config.audience === 'SUBCONTRACTOR' ? config.subcontractorName : data.organization.approvedName}`} />}
            {!preview.loading && !preview.svg && <EmptyState icon={FileImage} title="Anteprima non disponibile" text={config.audience === 'SUBCONTRACTOR' && config.subcontractorName.trim().length < 2 ? 'Inserisci la denominazione del subappaltatore per generare il kit di filiera.' : preview.error?.message || 'Completa la configurazione per vedere l’asset.'} />}
          </div>
          <div className="brand-quality-grid"><div><span>CONTRASTO TESTO</span><b>{selectedPalette?.contrastRatio}:1</b><small>minimo richiesto 4,5:1</small></div><div><span>AREA DI SICUREZZA</span><b>56 px</b><small>nessun testo o logo sul bordo</small></div><div><span>TESTO</span><b>{selectedText ? `v${selectedText.version}` : '—'}</b><small>versione bloccata e approvata</small></div></div>
          {config.audience === 'SUBCONTRACTOR' && <div className="identity-separation"><Building2 size={18} /><div><b>General Contractor: {data.organization.approvedName}</b><span>Subappaltatore: {config.subcontractorName || 'denominazione da inserire'}</span></div></div>}
          <div className="brand-canvas__actions"><p>La generazione archivia configurazione e riferimenti, non modifica il testo approvato.</p><button className="button button--cobalt" type="button" disabled={!preview.svg || preview.loading || generateBusy} onClick={generate}>{generateBusy ? <LoaderCircle className="spin" size={17} /> : <BadgeCheck size={17} />}Genera e archivia</button></div>
        </section>

        <aside className="brand-archive" aria-label="Archivio generazioni">
          <div className="panel-heading"><div><span className="micro-label">03 / ARCHIVIO</span><h2>Asset generati</h2></div><span>{generations.length}</span></div>
          {selectedGeneration && <div className="archive-export"><span>EXPORT SELEZIONATO</span><b>{selectedGeneration.id}</b><div><button className="button button--dark" type="button" onClick={() => exportGeneration(selectedGeneration, 'svg')}><Download size={16} />.SVG</button><button className="button button--dark" type="button" onClick={() => exportGeneration(selectedGeneration, 'png')}><Download size={16} />.PNG</button></div></div>}
          <div className="generation-list">{generations.map((generation) => <button type="button" key={generation.id} className={selectedGeneration?.id === generation.id ? 'is-selected' : ''} onClick={() => setSelectedGenerationId(generation.id)}><span><FileImage size={17} /><StatusBadge status={generation.status} /></span><b>{data.templates[generation.template]?.label}</b><p>{generation.audience === 'SUBCONTRACTOR' ? generation.subcontractorName : data.organization.approvedName}</p><small>{generation.id} · {dateTime(generation.createdAt)}</small></button>)}{!generations.length && <EmptyState icon={FileImage} title="Nessuna generazione" text="Configura il primo asset e salvalo nell’archivio demo." />}</div>
          <div className="brand-archive__rules"><ShieldCheck size={18} /><p>Ogni export riprende la configurazione archiviata e include il marchio “demo / dati sintetici”.</p></div>
        </aside>
      </div>

      {shareOpen && <Dialog title="Distribuzione controllata alla filiera" eyebrow="C05 / INVITI SUBAPPALTATORI" onClose={() => setShareOpen(false)} className="dialog--wide"><div className="share-dialog"><div className="share-dialog__intro"><Users size={25} /><div><h3>Un link per il kit, non per i dati del committente.</h3><p>L’invito demo mostra solo l’asset destinato al subappaltatore. Nessuna email viene inviata e nessun dato riservato del General Contractor viene esposto.</p></div></div>{subcontractorGenerations.length ? <div className="invitation-create"><label className="field"><span>Asset di filiera da condividere</span><select value={inviteGenerationId} onChange={(event) => setInviteGenerationId(event.target.value)}>{subcontractorGenerations.map((generation) => <option key={generation.id} value={generation.id}>{generation.subcontractorName} · {generation.id}</option>)}</select></label><button className="button button--cobalt" type="button" disabled={!inviteGenerationId || inviteBusy} onClick={createInvitation}>{inviteBusy ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}Crea invito demo</button></div> : <BlockedState title="Nessun asset di filiera disponibile" text="Chiudi questa finestra, seleziona “Filiera”, genera un asset con la denominazione del subappaltatore e poi crea l’invito." />}<div className="share-list">{invitations.slice().reverse().map((invitation) => { const url = `${window.location.origin}/inviti/kit/${invitation.token}`; const revoked = invitation.status === 'REVOKED'; return <article className="share-item" key={invitation.token}><div className="share-item__top"><StatusBadge status={invitation.status} /><span>{invitation.subcontractorName}</span></div><code>{url}</code><div className="share-item__meta"><span>Creato {dateTime(invitation.createdAt)}</span>{invitation.acceptedAt && <span>Accettato {dateTime(invitation.acceptedAt)}</span>}</div><div className="share-item__actions">{!revoked && <><CopyButton value={url} notify={notify} /><a className="button button--outline" href={url} target="_blank" rel="noreferrer">Apri <ArrowUpRight size={16} /></a><button className="button button--danger" type="button" onClick={() => setRevokeToken(invitation.token)}><Trash2 size={16} />Revoca</button></>}</div></article>; })}{!invitations.length && <EmptyState icon={Link2} title="Nessun invito" text="Gli inviti creati per gli asset di filiera appariranno qui." />}</div></div></Dialog>}
      {revokeToken && <Dialog title="Revocare l’invito?" eyebrow="CONFERMA REVOCA" onClose={() => setRevokeToken(null)}><div className="confirm-dialog"><Trash2 size={28} /><p>Il subappaltatore non potrà più aprire il kit tramite questo link. L’asset archiviato resta disponibile alla tua organizzazione.</p><div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setRevokeToken(null)}>Annulla</button><button className="button button--danger" type="button" onClick={revokeInvitation}>Revoca invito</button></div></div></Dialog>}
    </div>
  );
}
