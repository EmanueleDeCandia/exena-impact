import { useContext, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, FileKey, History, KeyRound, Landmark, LockKeyhole, MapPin, Scale, ShieldCheck } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { BlockedState, DemoNotice, Dialog, EmptyState, ErrorState, ExportMenu, LoadingState, StatusBadge, dateTime } from './ui.jsx';

const fundMoney = (cents = 0) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(cents / 100);
import { GovernanceAccess, GovernanceIdentityBar, useGovernanceData, useGovernanceSession } from './governance.jsx';

const implementationLabel = { NOT_STARTED: 'Da attuare', IN_PROGRESS: 'In attuazione', IMPLEMENTED: 'Attuazione registrata · demo' };

export function FundDirectionPage() {
  const { notify } = useContext(WorkspaceContext);
  const governance = useGovernanceSession();
  const { session } = governance;
  const { data, error, loading, reload } = useGovernanceData('/area4/fund-direction', session);
  const [windowId, setWindowId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noConflict, setNoConflict] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [demoCode, setDemoCode] = useState('');
  const [otp, setOtp] = useState('');
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [implementationOpen, setImplementationOpen] = useState(false);
  const [implementation, setImplementation] = useState({ status: 'IN_PROGRESS', note: '' });

  const currentWindow = data?.windows.find((item) => item.id === windowId);
  const currentPreference = currentWindow?.preference;
  const currentVersion = currentPreference?.versions.find((item) => item.version === currentPreference.currentVersion);
  const selectedOption = data?.options.find((item) => item.id === optionId);

  useEffect(() => {
    if (!data?.windows.length) return;
    const selected = data.windows.find((item) => item.id === windowId);
    if (!selected) setWindowId((data.windows.find((item) => item.state === 'OPEN') || data.windows[0]).id);
  }, [data, windowId]);
  useEffect(() => {
    if (!currentWindow) return;
    const current = currentWindow.preference?.versions.find((item) => item.version === currentWindow.preference.currentVersion);
    setOptionId(current?.optionId || '');
    setConfirmOpen(false); setActionError(null);
  }, [windowId]);

  const openConfirmation = () => {
    setNoConflict(false); setPhrase(''); setOtp(''); setChallenge(null); setDemoCode(''); setActionError(null); setConfirmOpen(true);
  };
  const createChallenge = async () => {
    setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized('/area4/governance/mfa-challenges', { method: 'POST', body: '{}' });
      setChallenge(result.challenge); setDemoCode(result.challenge.demoCode);
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const confirmPreference = async (event) => {
    event.preventDefault();
    setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/fund-direction/windows/${currentWindow.id}/preferences`, {
        method: 'POST',
        body: JSON.stringify({ optionId, expectedVersion: currentPreference?.currentVersion || 0, noConflictAccepted: noConflict, confirmationPhrase: phrase, challengeId: challenge?.id, otp }),
      });
      setConfirmOpen(false); await reload();
      notify('success', `Preferenza v${result.version.version} registrata · ricevuta disponibile`);
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const downloadReceipt = async (version, format) => {
    try { const filename = await governance.download(`/area4/fund-direction/preferences/${currentPreference.id}/versions/${version.version}/receipt?format=${format}`); notify('success', `${filename} scaricato`); return filename; }
    catch (reason) { notify('error', reason.message); throw reason; }
  };
  const updateImplementation = async (event) => {
    event.preventDefault(); setBusy(true); setActionError(null);
    try {
      await governance.authorized(`/area4/fund-direction/preferences/${currentPreference.id}/implementation`, { method: 'POST', body: JSON.stringify(implementation) });
      setImplementationOpen(false); await reload(); notify('success', 'Stato di attuazione aggiornato e audit trail conservato');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const versions = useMemo(() => [...(currentPreference?.versions || [])].sort((a, b) => b.version - a.version), [currentPreference]);

  return <div className="module-page workspace-page fund-direction-page">
    <header className="module-heading page-header page-header--split"><div><span className="micro-label">AREA 04 / C10 · FUND DIRECTION</span><h1>La quota del Fondo,<br /><em>decisa con responsabilità.</em></h1><p>Per il Board: confronta destinazioni ammesse, comprendi le conseguenze e registra una preferenza vincolante con identità, MFA, versione delle regole e audit trail.</p></div><div className="module-heading__actions page-header__actions"><span className="component-status"><span />VERTICAL SLICE · C10</span>{session && <span className="role-chip">BOARD GOVERNANCE · DEMO</span>}</div></header>
    <DemoNotice compact />
    {!session ? <GovernanceAccess accounts={governance.accounts} loading={governance.accountsLoading} busy={governance.busy} error={governance.error} onLogin={governance.login} component="C10" /> : <>
      <GovernanceIdentityBar session={session} onLogout={governance.logout} context="C10" />
      {loading && !data && <LoadingState label="Verifica ruolo Board e finestre decisionali" />}
      {error && !data && <BlockedState title={error.status === 403 ? 'Accesso Board negato' : 'Sessione non disponibile'} text={`${error.message}. Cambia identità demo o accedi con un membro autorizzato.`} />}
      {data && !data.windows.length && <EmptyState title="Nessuna finestra per questa organizzazione" text="Il filtro tenant impedisce di leggere finestre e preferenze di altre organizzazioni." />}
      {data && currentWindow && <>
        <div className="governance-window-tabs" role="tablist" aria-label="Finestre decisionali">{data.windows.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === currentWindow.id} className={item.id === currentWindow.id ? 'is-selected' : ''} onClick={() => setWindowId(item.id)}><span>{item.state === 'OPEN' ? <Scale size={18} /> : <LockKeyhole size={18} />}</span><b>{item.title}</b><small>{item.state === 'OPEN' ? `Cutoff ${dateTime(item.cutoffAt)}` : 'Chiusa e immutabile'}</small></button>)}</div>
        <div className="fund-direction-layout">
          <main className="fund-options" aria-labelledby="options-title">
            <div className="section-heading section-heading--inline"><div><span className="micro-label">OPZIONI AMESSE / {currentWindow.ruleVersion}</span><h2 id="options-title">Confronta le destinazioni</h2></div><StatusBadge status={currentWindow.state} label={currentWindow.state === 'OPEN' ? 'Finestra aperta' : 'Preferenza bloccata'} /></div>
            <div className="fund-option-table" role="radiogroup" aria-label="Destinazione della quota">
              <div className="fund-option-table__header" aria-hidden="true"><span>Destinazione</span><span>Conseguenze</span><span>Scelta</span></div>
              {data.options.map((option) => <label key={option.id} className={`fund-option ${optionId === option.id ? 'is-selected' : ''} ${currentWindow.state === 'CLOSED' ? 'is-locked' : ''}`}>
                <input type="radio" name="fund-option" value={option.id} checked={optionId === option.id} disabled={currentWindow.state === 'CLOSED'} onChange={() => setOptionId(option.id)} />
                <span className="fund-option__title"><MapPin size={20} /><span><small>{option.subtitle}</small><b>{option.title}</b><p>{option.description}</p></span></span>
                <span className="fund-option__consequences">{option.consequences}</span>
                <span className="fund-option__choice">{optionId === option.id ? <CheckCircle2 size={22} /> : <ArrowRight size={18} />}</span>
              </label>)}
            </div>
            {currentWindow.state === 'CLOSED' && <BlockedState title="Cutoff superato" text="La scelta è immutabile sia nel client sia nelle API. La cronologia e le ricevute restano consultabili." />}
            {currentPreference && <section className="preference-history" aria-labelledby="history-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">STORICO COMPLETO / {currentPreference.id}</span><h2 id="history-title">Versioni e ricevute</h2></div><History size={23} /></div>{versions.map((version) => {
              const option = data.options.find((item) => item.id === version.optionId);
              return <article key={version.version}><div><span className="version-chip">V{version.version}</span><span><b>{option.title}</b><small>{dateTime(version.confirmedAt)} · {version.confirmedByName} · {version.ruleVersion}</small></span></div><strong>{fundMoney(version.quotaCents)}</strong><div className="preference-history__actions"><ExportMenu label="Ricevuta" formats={['pdf', 'json']} notify={notify} onExport={(format) => downloadReceipt(version, format)} /></div></article>;
            })}</section>}
          </main>

          <aside className="direction-summary" aria-labelledby="direction-summary-title">
            <span className="micro-label">QUOTA E DECISIONE</span><h2 id="direction-summary-title">Riepilogo vincolante</h2>
            <div className="direction-quota"><span>Quota indirizzabile da ordini confermati</span><strong>{fundMoney(currentWindow.quotaCents)}</strong><small>{currentWindow.eligibleOrderIds.join(' · ')} · devoluzione 30%</small></div>
            <dl className="direction-facts"><div><dt>Regole</dt><dd>{currentWindow.ruleVersion}</dd></div><div><dt>Cutoff</dt><dd>{dateTime(currentWindow.cutoffAt)}</dd></div><div><dt>Fuso</dt><dd>{currentWindow.timeZone}</dd></div><div><dt>Versione corrente</dt><dd>V{currentPreference?.currentVersion || 0}</dd></div></dl>
            {currentVersion && <div className="current-preference"><span className="micro-label">PREFERENZA REGISTRATA</span><b>{data.options.find((item) => item.id === currentVersion.optionId)?.title}</b><p>{fundMoney(currentVersion.quotaCents)} · V{currentVersion.version}</p><StatusBadge status={currentPreference.implementationStatus} label={implementationLabel[currentPreference.implementationStatus]} />{currentPreference.implementationNote && <small>{currentPreference.implementationNote}</small>}</div>}
            {currentWindow.state === 'OPEN' && session.member.role === 'BOARD' && <button className="button button--cobalt button--full" type="button" disabled={!optionId} onClick={openConfirmation}><KeyRound size={17} />{currentPreference ? 'Rivedi nuova versione' : 'Rivedi e conferma'}<ArrowRight size={17} /></button>}
            {currentPreference && currentWindow.permissions.canUpdateImplementation && <button className="button button--dark button--full" type="button" onClick={() => { setImplementation({ status: currentPreference.implementationStatus, note: currentPreference.implementationNote }); setImplementationOpen(true); }}>Aggiorna attuazione</button>}
            <p className="direction-summary__note"><ShieldCheck size={15} />Nessun slider o gesto accidentale. MFA e conferma forte sono obbligatori.</p>
          </aside>
        </div>
        <section className="governance-audit" aria-labelledby="audit-title"><div className="section-heading"><span className="micro-label">AUDIT LOG / EVENTI IMMUTABILI</span><h2 id="audit-title">Passaggi registrati</h2></div>{currentPreference?.events.length ? <ol>{[...currentPreference.events].reverse().map((event, index) => <li key={`${event.at}-${index}`}><span /><div><b>{event.event}</b><small>{event.actor} · {dateTime(event.at)}</small></div></li>)}</ol> : <p>Nessuna preferenza confermata in questa finestra. La quota è calcolata ma non ancora indirizzata.</p>}</section>
      </>}
    </>}

    {confirmOpen && currentWindow && selectedOption && <Dialog title={currentPreference ? 'Conferma una nuova versione' : 'Conferma la preferenza vincolante'} eyebrow="C10 / AZIONE BOARD CON MFA DEMO" onClose={() => !busy && setConfirmOpen(false)} className="dialog--governance">
      <form className="stack-form" onSubmit={confirmPreference}>
        <div className="binding-warning"><Landmark size={25} /><div><b>Stai indirizzando {fundMoney(currentWindow.quotaCents)}</b><p>Destinazione: <strong>{selectedOption.title}</strong>. Versione regole: <strong>{currentWindow.ruleVersion}</strong>. Versione preferenza attesa: <strong>V{(currentPreference?.currentVersion || 0) + 1}</strong>.</p></div></div>
        <div className="binding-consequences"><b>Conseguenze prima della conferma</b><p>{selectedOption.consequences}</p><p>Dopo il cutoff del {dateTime(currentWindow.cutoffAt)} non sarà possibile modificare la scelta. Prima del cutoff ogni modifica crea una nuova versione.</p></div>
        <label className="binding-checkbox"><input type="checkbox" checked={noConflict} onChange={(event) => setNoConflict(event.target.checked)} required /><span>Dichiaro, in ambiente demo, l’assenza di conflitti di interesse rispetto a questa destinazione e comprendo che la dichiarazione sarà conservata nella ricevuta.</span></label>
        <label className="field"><span>Digita CONFERMO *</span><input required autoComplete="off" value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="CONFERMO" /></label>
        <div className="mfa-challenge"><div><KeyRound size={22} /><span><b>Secondo fattore dimostrativo</b><small>La challenge è valida 5 minuti e monouso. Nessun SMS o authenticator reale viene inviato.</small></span></div>{!challenge ? <button className="button button--outline" type="button" onClick={createChallenge} disabled={busy}>Genera challenge MFA demo</button> : <div className="mfa-challenge__code" role="note"><span>Challenge {challenge.id.slice(0, 18)}…</span><b>Codice demo: {demoCode}</b></div>}</div>
        {challenge && <label className="field"><span>Codice MFA a 6 cifre *</span><input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="246810" /></label>}
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
        <div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setConfirmOpen(false)} disabled={busy}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy || !noConflict || phrase !== 'CONFERMO' || !challenge || otp.length !== 6}>{busy ? 'Registrazione…' : `Conferma ${fundMoney(currentWindow.quotaCents)}`}<ArrowRight size={17} /></button></div>
      </form>
    </Dialog>}

    {implementationOpen && currentPreference && <Dialog title="Aggiorna stato di attuazione" eyebrow={`${currentPreference.id} / SOLO STARTUP REVIEWER`} onClose={() => !busy && setImplementationOpen(false)}><form className="stack-form" onSubmit={updateImplementation}><p>Questa operazione non modifica la scelta del Board. Aggiorna soltanto il percorso attuativo e aggiunge un evento all’audit trail.</p><label className="field"><span>Stato *</span><select value={implementation.status} onChange={(event) => setImplementation((value) => ({ ...value, status: event.target.value }))}><option value="NOT_STARTED">Da attuare</option><option value="IN_PROGRESS">In attuazione</option><option value="IMPLEMENTED">Attuazione registrata demo</option></select></label><label className="field"><span>Nota di attuazione *</span><textarea rows="4" required minLength="3" maxLength="800" value={implementation.note} onChange={(event) => setImplementation((value) => ({ ...value, note: event.target.value }))} /></label>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setImplementationOpen(false)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy}>Registra attuazione</button></div></form></Dialog>}
  </div>;
}
