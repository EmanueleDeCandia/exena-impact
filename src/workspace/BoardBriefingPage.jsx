import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarClock, Check, CheckCircle2, Clock3, Download, FileText, Headphones, LockKeyhole, MessageSquare, Mic2, MonitorCheck, PhoneOff, Play, Radio, ShieldCheck, UserCheck, VideoOff } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { BlockedState, DemoNotice, Dialog, EmptyState, ExportMenu, LoadingState, StatusBadge, dateTime } from './ui.jsx';
import { GovernanceAccess, GovernanceIdentityBar, formatDuration, useGovernanceData, useGovernanceSession } from './governance.jsx';

function Countdown({ session }) {
  const [time, setTime] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setTime(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const target = new Date(time < new Date(session.startAt).getTime() ? session.startAt : session.endAt).getTime();
  const seconds = Math.max(0, Math.floor((target - time) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return <span className="briefing-countdown"><Clock3 size={16} />{time < new Date(session.startAt).getTime() ? 'Inizio tra ' : 'Termine tra '}{days ? `${days}g ` : ''}{hours}h {minutes}m {seconds % 60}s</span>;
}

export function BoardBriefingPage() {
  const { notify } = useContext(WorkspaceContext);
  const governance = useGovernanceSession();
  const { session } = governance;
  const { data, error, loading, reload } = useGovernanceData('/area4/briefings', session);
  const [searchParams, setSearchParams] = useSearchParams();
  const joinToken = searchParams.get('join');
  const [sessionId, setSessionId] = useState('');
  const [detail, setDetail] = useState(null);
  const [inRoom, setInRoom] = useState(false);
  const [deviceChecked, setDeviceChecked] = useState(false);
  const [deviceReport, setDeviceReport] = useState('');
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ summary: '', decisionPoints: '', references: '' });

  const current = data?.sessions.find((item) => item.id === sessionId);
  const accepted = current?.invite.status === 'ACCEPTED';
  const ownAttendance = detail?.attendance.find((item) => item.memberId === session?.member.id && !item.leftAt);
  const canJoinByTime = current ? Date.now() >= new Date(current.startAt).getTime() - 15 * 60 * 1000 && Date.now() <= new Date(current.endAt).getTime() && current.state !== 'COMPLETED' : false;

  useEffect(() => {
    if (!data?.sessions) return;
    if (joinToken) {
      const match = data.sessions.find((item) => item.roomUrl?.endsWith(joinToken));
      if (match) setSessionId(match.id);
      else setActionError('Questo link sala non appartiene all’identità corrente o l’invito non è stato accettato.');
      return;
    }
    if (!data.sessions.some((item) => item.id === sessionId)) setSessionId((data.sessions.find((item) => item.state === 'LIVE') || data.sessions[0])?.id || '');
  }, [data, joinToken, sessionId]);
  useEffect(() => {
    setDetail(null); setInRoom(false); setDeviceChecked(false); setDeviceReport(''); setQuestion(''); setActionError(null);
  }, [sessionId]);
  useEffect(() => {
    if (!current || !accepted || (!inRoom && !current.hasFollowUp)) return;
    governance.authorized(`/area4/briefings/${current.id}`).then((result) => setDetail(result.detail)).catch((reason) => setActionError(reason.message));
  }, [current?.id, current?.hasFollowUp, inRoom, accepted]);
  useEffect(() => {
    if (!inRoom || !current) return undefined;
    const timer = window.setInterval(() => governance.authorized(`/area4/briefings/${current.id}/presence`, { method: 'POST', body: '{}' }).catch(() => {}), 30_000);
    return () => window.clearInterval(timer);
  }, [inRoom, current?.id]);

  const acceptInvite = async () => {
    setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/briefings/${current.id}/accept`, { method: 'POST', body: JSON.stringify({ identityConfirmed: true }) });
      setSearchParams({ join: result.roomUrl.split('join=')[1] });
      await reload(); notify('success', 'Invito accettato · link nominativo generato dal backend');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const runDeviceCheck = () => {
    const media = Boolean(navigator.mediaDevices);
    const webm = document.createElement('video').canPlayType('video/webm');
    setDeviceReport(`Browser ${media ? 'compatibile con API media' : 'senza API media'} · WebM ${webm ? 'supportato' : 'non supportato'}. Nessun permesso webcam o microfono richiesto.`);
    setDeviceChecked(true);
  };
  const joinRoom = async () => {
    setBusy(true); setActionError(null);
    try {
      const token = joinToken || current.roomUrl?.split('join=')[1];
      const result = await governance.authorized('/area4/briefings/join', { method: 'POST', body: JSON.stringify({ token, deviceCheckConfirmed: deviceChecked }) });
      setDetail(result.detail); setInRoom(true); await reload(); notify('success', 'Ingresso nella sala registrato con timestamp effettivo');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const loadDetail = async () => {
    const result = await governance.authorized(`/area4/briefings/${current.id}`); setDetail(result.detail); return result.detail;
  };
  const leaveRoom = async () => {
    setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/briefings/${current.id}/leave`, { method: 'POST', body: '{}' });
      setDetail(result.detail); setInRoom(false); setSearchParams({}); await reload(); notify('success', 'Uscita registrata · durata calcolata dai timestamp');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const submitQuestion = async (event) => {
    event.preventDefault(); setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/briefings/${current.id}/questions`, { method: 'POST', body: JSON.stringify({ text: question }) });
      setDetail(result.detail); setQuestion(''); notify('success', 'Domanda inserita nella sala');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const submitAnswer = async (questionId) => {
    setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/briefings/${current.id}/questions/${questionId}/answer`, { method: 'POST', body: JSON.stringify({ answer: answers[questionId] }) });
      setDetail(result.detail); setAnswers((value) => ({ ...value, [questionId]: '' }));
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const recordingConsent = async (consent) => {
    setBusy(true); setActionError(null);
    try {
      await governance.authorized(`/area4/briefings/${current.id}/recording/consent`, { method: 'POST', body: JSON.stringify({ consent }) });
      await reload(); if (inRoom || current.hasFollowUp) await loadDetail();
      notify('success', `Consenso registrazione ${consent ? 'espresso' : 'negato'} · registrazione ancora disattivata`);
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const completeSession = async (event) => {
    event.preventDefault(); setBusy(true); setActionError(null);
    try {
      const result = await governance.authorized(`/area4/briefings/${current.id}/complete`, { method: 'POST', body: JSON.stringify(followUpForm) });
      setDetail(result.detail); setInRoom(false); setCompleteOpen(false); setSearchParams({}); await reload(); notify('success', 'Sessione chiusa · follow-up basato sulle presenze effettive');
    } catch (reason) { setActionError(reason.message); }
    finally { setBusy(false); }
  };
  const exportFile = async (path, format) => {
    try { const filename = await governance.download(`${path}?format=${format}`); notify('success', `${filename} scaricato`); return filename; }
    catch (reason) { notify('error', reason.message); throw reason; }
  };

  return <div className="module-page workspace-page briefing-page">
    <header className="module-heading page-header page-header--split"><div><span className="micro-label">AREA 04 / C11 · BOARD BRIEFING ROOM</span><h1>Due ore di aggiornamento.<br /><em>Un solo perimetro riservato.</em></h1><p>Per Board e relatori: prepara la sessione online, entra con invito nominativo, registra domande e presenze effettive e conserva un follow-up verificabile.</p></div><div className="module-heading__actions page-header__actions"><span className="component-status"><span />VERTICAL SLICE · C11</span>{session && <span className="role-chip">INVITO NOMINATIVO · DEMO</span>}</div></header>
    <DemoNotice compact />
    {!session ? <GovernanceAccess accounts={governance.accounts} loading={governance.accountsLoading} busy={governance.busy} error={governance.error} onLogin={governance.login} component="C11" /> : <>
      <GovernanceIdentityBar session={session} onLogout={() => { setInRoom(false); setSearchParams({}); governance.logout(); }} context="C11" />
      {loading && !data && <LoadingState label="Verifica inviti Board e sessioni online" />}
      {error && !data && <BlockedState title="Inviti non disponibili" text={`${error.message}. Accedi nuovamente con un’identità demo valida.`} />}
      {data && !data.sessions.length && <EmptyState title="Nessun invito per questa identità" text="La modifica di ID o URL non espone sessioni di altri invitati o organizzazioni." />}
      {data && current && <div className="briefing-layout">
        <aside className="briefing-sessions" aria-label="Sessioni Board invitate"><div className="section-heading"><span className="micro-label">I TUOI INVITI</span><h2>Briefing annuali</h2></div>{data.sessions.map((item) => <button type="button" key={item.id} className={item.id === current.id ? 'is-selected' : ''} onClick={() => { setSearchParams({}); setSessionId(item.id); }}><span>{item.state === 'LIVE' ? <Radio size={18} /> : item.state === 'COMPLETED' ? <CheckCircle2 size={18} /> : <CalendarClock size={18} />}</span><div><b>{item.title}</b><small>{dateTime(item.startAt)}</small><StatusBadge status={item.state} label={{ LIVE: 'Sessione live', SCHEDULED: 'Programmata', CLOSED: 'Finestra terminata', COMPLETED: 'Follow-up disponibile' }[item.state]} /></div><ArrowRight size={15} /></button>)}<div className="briefing-provider-note"><VideoOff size={19} /><p><b>Provider video non collegato.</b> Lobby, inviti, domande e presenze del portale sono reali; nessun video o recording viene simulato.</p></div></aside>

        <main className="briefing-main">
          <header className="briefing-session-header"><div><span className="micro-label">{current.id} / {current.timeZone}</span><h2>{current.title}</h2><p>{dateTime(current.startAt)} → {dateTime(current.endAt)} · {current.durationMinutes} minuti</p></div><StatusBadge status={current.state} label={{ LIVE: 'LIVE DEMO', SCHEDULED: 'PROGRAMMATA', CLOSED: 'CHIUSA', COMPLETED: 'COMPLETATA' }[current.state]} /></header>
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
          {!inRoom && !current.hasFollowUp && <>
            <section className="briefing-lobby" aria-labelledby="lobby-title"><div className="briefing-lobby__time"><span className="micro-label">LOBBY RISERVATA / ACCESSO NOMINATIVO</span><h2 id="lobby-title">{accepted ? 'La tua identità è confermata.' : 'Il tuo invito è pronto.'}</h2><Countdown session={current} /><p>{accepted ? `Invito accettato come ${current.invite.role}. Il link generato è personale e richiede comunque la sessione autenticata.` : 'Accetta l’invito e conferma l’identità demo per aprire agenda completa, pre-read e link personale della sala.'}</p>{!accepted && <button className="button button--cobalt" type="button" onClick={acceptInvite} disabled={busy}><UserCheck size={17} />{busy ? 'Verifica…' : 'Accetta invito e conferma identità'}<ArrowRight size={17} /></button>}</div>
              {accepted && <div className="device-check"><div><MonitorCheck size={25} /><span><b>Controllo tecnico prima della sala</b><p>Verifica solo le capability del browser: nessun accesso a webcam o microfono.</p></span></div><button className="button button--outline" type="button" onClick={runDeviceCheck}><Headphones size={17} />Esegui controllo browser</button>{deviceReport && <p role="status"><CheckCircle2 size={16} />{deviceReport}</p>}<button className="button button--dark" type="button" data-testid="join-briefing" onClick={joinRoom} disabled={!deviceChecked || !canJoinByTime || busy}><Play size={17} />{busy ? 'Ingresso…' : canJoinByTime ? 'Entra nella sala' : 'Sala non ancora aperta'}<ArrowRight size={17} /></button>{!canJoinByTime && <small>La sala apre 15 minuti prima dell’inizio e chiude al termine programmato.</small>}</div>}
            </section>
            <section className="preread-section" aria-labelledby="preread-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">PRE-READ / DOCUMENTI VERSIONATI</span><h2 id="preread-title">Preparazione al briefing</h2></div><FileText size={23} /></div>{!accepted && <BlockedState title="Pre-read riservati" text="Accetta l’invito per leggere ed esportare i contenuti. Versione e stato revisione restano visibili senza aprire il documento." />}<div className="preread-grid">{current.preReads.map((preRead) => <article key={preRead.id}><div><span className="version-chip">V{preRead.version}</span><StatusBadge status={preRead.reviewStatus} label="Revisione demo" /></div><h3>{preRead.title}</h3>{accepted ? <><p>{preRead.content}</p><ExportMenu label="Scarica pre-read" formats={['pdf', 'json']} notify={notify} onExport={(format) => exportFile(`/area4/briefings/${current.id}/pre-reads/${preRead.id}/export`, format)} /></> : <small><LockKeyhole size={14} /> Contenuto protetto dall’invito</small>}</article>)}</div></section>
          </>}

          {inRoom && detail && <section className="briefing-room" aria-labelledby="room-title"><div className="briefing-room__top"><div><span className="micro-label">SALA ONLINE / PRESENZA EFFETTIVA</span><h2 id="room-title">Sessione in corso</h2></div><button className="button button--danger" type="button" onClick={leaveRoom} disabled={busy}><PhoneOff size={17} />Esci e registra presenza</button></div>
            <div className="video-provider-placeholder"><VideoOff size={38} /><span className="micro-label">CANALE VIDEO ESTERNO NON COLLEGATO</span><h3>La sala operativa resta accanto al provider.</h3><p>Non viene mostrato un video finto. La presenza qui misurata riguarda soltanto la sala del portale, non la partecipazione a un provider esterno.</p>{ownAttendance && <div><Radio size={16} />Presente dalle {dateTime(ownAttendance.joinedAt)} · {formatDuration(ownAttendance.durationSeconds)}</div>}</div>
            <div className="room-grid"><section className="room-questions" aria-labelledby="questions-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">DOMANDE / MODERAZIONE DEMO</span><h2 id="questions-title">Discussione tracciata</h2></div><MessageSquare size={22} /></div><form onSubmit={submitQuestion}><label className="field"><span>La tua domanda al relatore *</span><textarea rows="3" required minLength="3" maxLength="500" value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button className="button button--cobalt" type="submit" disabled={busy || question.trim().length < 3}>Invia domanda<ArrowRight size={16} /></button></form><div className="question-list">{detail.questions.length ? detail.questions.map((item) => <article key={item.id}><div><b>{item.authorName}</b><time>{dateTime(item.at)}</time></div><p>{item.text}</p>{item.answer ? <blockquote><b>{item.answeredBy}</b><p>{item.answer}</p><time>{dateTime(item.answeredAt)}</time></blockquote> : current.invite.role === 'SPEAKER' ? <div className="answer-form"><label className="field"><span>Rispondi come relatore</span><textarea rows="2" value={answers[item.id] || ''} onChange={(event) => setAnswers((value) => ({ ...value, [item.id]: event.target.value }))} /></label><button className="button button--outline" type="button" onClick={() => submitAnswer(item.id)} disabled={busy || (answers[item.id] || '').trim().length < 3}>Pubblica risposta</button></div> : <small>In attesa di risposta</small>}</article>) : <p className="inline-empty">Nessuna domanda inserita. La cronologia nasce solo dai messaggi effettivi.</p>}</div></section>
              <aside className="room-controls"><section><span className="micro-label">REGISTRAZIONE</span><h3>Disattivata</h3><p>Nessuna registrazione viene avviata. Il consenso viene tracciato separatamente; il provider non collegato impedisce comunque l’attivazione.</p><div className="recording-consent"><span>{current.recording.consented}/{current.recording.required} consensi</span><div><button className="button button--outline" type="button" onClick={() => recordingConsent(true)} disabled={busy}>Acconsento</button><button className="button button--ghost" type="button" onClick={() => recordingConsent(false)} disabled={busy}>Non acconsento</button></div></div></section>{current.invite.role === 'SPEAKER' && <section><span className="micro-label">RELATORE</span><h3>Chiusura e follow-up</h3><p>Puoi chiudere quando esiste almeno una presenza effettiva. Gli ingressi attivi saranno chiusi con lo stesso timestamp reale.</p><button className="button button--dark button--full" type="button" onClick={() => { setFollowUpForm({ summary: '', decisionPoints: '', references: '' }); setCompleteOpen(true); }}>Chiudi e pubblica sintesi</button></section>}</aside>
            </div>
          </section>}

          {current.hasFollowUp && !inRoom && <section className="follow-up" aria-labelledby="followup-title"><div className="section-heading section-heading--inline"><div><span className="micro-label">FOLLOW-UP / VERSIONE {current.followUp.version}</span><h2 id="followup-title">Decisioni e materiali finali</h2></div><StatusBadge status={current.followUp.reviewStatus} label="Follow-up demo" /></div><div className="follow-up__summary"><CheckCircle2 size={25} /><div><b>Pubblicato da {current.followUp.publishedBy}</b><small>{dateTime(current.followUp.publishedAt)} · registrazione mai attivata</small><p>{current.followUp.summary}</p></div></div><div className="follow-up__grid"><section><h3>Punti decisionali</h3>{current.followUp.decisionPoints.length ? <ol>{current.followUp.decisionPoints.map((point) => <li key={point}>{point}</li>)}</ol> : <p>Nessun punto decisionale registrato.</p>}</section><section><h3>Riferimenti</h3>{current.followUp.references.length ? <ul>{current.followUp.references.map((reference) => <li key={reference}>{reference}</li>)}</ul> : <p>Nessun riferimento aggiunto.</p>}</section></div>{detail && <section className="follow-up-attendance"><h3>Presenze effettive nella sala del portale</h3>{detail.attendance.map((item) => <div key={item.id}><span><b>{item.memberName}</b><small>{dateTime(item.joinedAt)} → {item.leftAt ? dateTime(item.leftAt) : 'attivo'}</small></span><strong>{formatDuration(item.durationSeconds)}</strong></div>)}</section>}<ExportMenu label="Scarica follow-up" formats={['pdf', 'json']} notify={notify} onExport={(format) => exportFile(`/area4/briefings/${current.id}/follow-up/export`, format)} /></section>}
        </main>

        <aside className="briefing-agenda" aria-labelledby="agenda-title"><span className="micro-label">AGENDA / 120 MINUTI</span><h2 id="agenda-title">Programma</h2><ol>{current.agenda.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{item.title}</b><small>{item.durationMinutes} min · {item.speaker}</small></div></li>)}</ol><div className="agenda-total"><Clock3 size={18} /><span><b>{current.actualDurationSeconds / 60} minuti programmati</b><small>Fuso {current.timeZone}</small></span></div><div className="agenda-privacy"><ShieldCheck size={18} /><p>Link noindex, invito nominativo e controllo server. La registrazione è disattivata di default.</p></div></aside>
      </div>}
    </>}

    {completeOpen && current && <Dialog title="Chiudi la sessione e pubblica il follow-up" eyebrow="C11 / SOLO RELATORE INVITATO" onClose={() => !busy && setCompleteOpen(false)} className="dialog--governance"><form className="stack-form" onSubmit={completeSession}><div className="binding-warning"><CheckCircle2 size={24} /><div><b>Presenze effettive: {current.attendanceCount}</b><p>La chiusura registra l’orario reale e termina eventuali presenze ancora attive. Nessuna registrazione video viene creata.</p></div></div><label className="field"><span>Sintesi post-sessione *</span><textarea rows="5" required minLength="20" maxLength="4000" value={followUpForm.summary} onChange={(event) => setFollowUpForm((value) => ({ ...value, summary: event.target.value }))} placeholder="Che cosa è stato effettivamente discusso?" /></label><label className="field"><span>Punti decisionali <i>uno per riga</i></span><textarea rows="4" value={followUpForm.decisionPoints} onChange={(event) => setFollowUpForm((value) => ({ ...value, decisionPoints: event.target.value }))} /></label><label className="field"><span>Riferimenti finali <i>uno per riga</i></span><textarea rows="3" value={followUpForm.references} onChange={(event) => setFollowUpForm((value) => ({ ...value, references: event.target.value }))} /></label>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setCompleteOpen(false)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy || followUpForm.summary.trim().length < 20}>Pubblica follow-up<ArrowRight size={17} /></button></div></form></Dialog>}
  </div>;
}
