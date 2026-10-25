import { useContext, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, Clock3, ExternalLink, FileText, GraduationCap, Play, Plus, RotateCcw, ShieldCheck, UserPlus, Users, XCircle } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import { BlockedState, CopyButton, DemoNotice, Dialog, ErrorState, ExportMenu, LoadingState, StatusBadge, dateTime, shortDate, useApiData } from './ui.jsx';

const futureDate = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const chapterComplete = (progress) => Boolean(progress?.videoCompleted && progress?.transcriptRead && progress?.quizPassed);
const formatPercent = (value) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(value);

export function LearningPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area3/learning');
  const [selectedId, setSelectedId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState(null);
  const [chapterAnswer, setChapterAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [finalMode, setFinalMode] = useState(false);
  const [finalIndex, setFinalIndex] = useState(0);
  const [finalAnswers, setFinalAnswers] = useState({});
  const [finalFeedback, setFinalFeedback] = useState(null);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [newLearner, setNewLearner] = useState({ displayName: '', role: 'Preposto', deadline: futureDate(90) });
  const [revokeOpen, setRevokeOpen] = useState(false);

  const enrollment = data?.enrollments.find((item) => item.id === selectedId);
  const course = data?.course;
  const chapter = course?.chapters.find((item) => item.id === chapterId) || course?.chapters[0];
  const chapterProgress = enrollment?.progress.chapters[chapter?.id] || {};
  const completedCount = useMemo(() => course && enrollment ? course.chapters.filter((item) => chapterComplete(enrollment.progress.chapters[item.id])).length : 0, [course, enrollment]);
  const allChaptersComplete = Boolean(course && completedCount === course.chapters.length);
  const finalQuestion = course?.finalQuestions[finalIndex];

  useEffect(() => {
    if (!data || selectedId) return;
    const first = data.enrollments.find((item) => item.status !== 'COMPLETED') || data.enrollments[0];
    setSelectedId(first?.id || '');
    setChapterId(data.course.chapters[0]?.id || '');
  }, [data, selectedId]);

  useEffect(() => {
    if (!course || !enrollment) return;
    const nextChapter = course.chapters.find((item) => !chapterComplete(enrollment.progress.chapters[item.id])) || course.chapters[0];
    setChapterId(nextChapter.id);
    setChapterAnswer(''); setQuizFeedback(null); setFinalMode(false); setFinalAnswers({}); setFinalIndex(0); setFinalFeedback(null); setActionError(null);
  }, [selectedId]); // Il cambio assegnazione reimposta il percorso visuale.

  const selectChapter = (id) => {
    setChapterId(id); setChapterAnswer(''); setQuizFeedback(null); setFinalMode(false); setActionError(null);
  };
  const perform = async (key, operation, successMessage) => {
    setBusy(key); setActionError(null);
    try {
      const result = await operation();
      await reload();
      if (successMessage) notify('success', successMessage);
      return result;
    } catch (reason) { setActionError(reason.message); notify('error', reason.message); return null; }
    finally { setBusy(''); }
  };
  const accept = () => perform('accept', () => api(`/area3/learning/enrollments/${enrollment.id}/accept`, { method: 'POST', body: '{}' }), 'Assegnazione accettata · puoi iniziare');
  const markProgress = (type) => {
    if ((type === 'video' && chapterProgress.videoCompleted) || (type === 'transcript' && chapterProgress.transcriptRead) || busy) return Promise.resolve(null);
    return perform(`${type}-${chapter.id}`, () => api(`/area3/learning/enrollments/${enrollment.id}/chapters/${chapter.id}/progress`, { method: 'POST', body: JSON.stringify({ type }) }), type === 'video' ? 'Video completato e salvato' : 'Trascrizione registrata');
  };
  const submitChapterQuiz = async (event) => {
    event.preventDefault();
    const result = await perform(`quiz-${chapter.id}`, () => api(`/area3/learning/enrollments/${enrollment.id}/chapters/${chapter.id}/quiz`, { method: 'POST', body: JSON.stringify({ questionId: chapter.questions[0].id, answerId: chapterAnswer }) }));
    if (result) {
      setQuizFeedback(result);
      setChapterAnswer('');
      if (result.correct) notify('success', 'Quiz superato · progresso del capitolo aggiornato');
    }
  };
  const submitFinal = async () => {
    const result = await perform('final', () => api(`/area3/learning/enrollments/${enrollment.id}/final-attempts`, { method: 'POST', body: JSON.stringify({ answers: finalAnswers }) }));
    if (!result) return;
    setFinalFeedback(result);
    if (result.passed) {
      setFinalMode(false); setFinalAnswers({}); setFinalIndex(0);
      notify('success', result.alreadyIssued ? 'Attestato già emesso: nessun duplicato' : 'Test superato · attestato demo emesso');
    } else {
      setFinalAnswers({}); setFinalIndex(0);
    }
  };
  const createAssignment = async (event) => {
    event.preventDefault();
    const result = await perform('assignment', () => api('/area3/learning/enrollments', { method: 'POST', body: JSON.stringify({ ...newLearner, deadlineAt: `${newLearner.deadline}T23:59:59.000Z` }) }));
    if (result) {
      setSelectedId(result.enrollment.id); setAssignmentOpen(false); setNewLearner({ displayName: '', role: 'Preposto', deadline: futureDate(90) });
      notify('success', 'Nuova assegnazione demo creata');
    }
  };
  const revokeCertificate = async () => {
    const result = await perform('revoke', () => api(`/area3/learning/certificates/${enrollment.certificate.id}/revoke`, { method: 'POST', body: '{}' }));
    if (result) { setRevokeOpen(false); notify('success', 'Attestato revocato · la verifica pubblica è aggiornata'); }
  };

  if (loading && !data) return <LoadingState label="Caricamento E-Learning & Digital Certificates" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page workspace-page learning-page">
      <header className="module-heading page-header page-header--split">
        <div><span className="micro-label">AREA 03 / C09 · FORMAZIONE ASINCRONA</span><h1>Un’ora per lavorare<br /><em>con più consapevolezza.</em></h1><p>Per preposti e capicantiere: riprendi il corso dove lo hai lasciato, verifica ciò che hai appreso e conserva un attestato controllabile, senza attribuzioni legali automatiche.</p></div>
        <div className="module-heading__actions page-header__actions"><span className="component-status"><span />VERTICAL SLICE · C09</span><button className="button button--cobalt" type="button" onClick={() => { setAssignmentOpen(true); setActionError(null); }}><UserPlus size={17} />Nuova assegnazione</button></div>
      </header>
      <DemoNotice compact />
      <section className="course-identity" aria-label="Informazioni sul corso">
        <div><GraduationCap size={26} /><span><b>{course.title}</b><small>{course.provider}</small></span></div>
        <dl><div><dt>Durata didattica</dt><dd>{course.durationMinutes} minuti</dd></div><div><dt>Capitoli</dt><dd>{course.chapters.length}</dd></div><div><dt>Soglia test finale</dt><dd>{course.passScorePercent}%</dd></div><div><dt>Accreditamento</dt><dd>Nessuno · demo</dd></div></dl>
        <p><ShieldCheck size={16} />{course.accreditationNotice}</p>
      </section>

      <div className="learning-layout">
        <aside className="assignment-panel" aria-labelledby="assignments-title">
          <div className="section-heading"><span className="micro-label">HR / RSPP · DEMO</span><h2 id="assignments-title">Assegnazioni</h2></div>
          <div className="assignment-stats"><span><b>{data.enrollments.length}</b> assegnate</span><span><b>{data.enrollments.filter((item) => item.status === 'COMPLETED').length}</b> complete</span></div>
          <div className="assignment-list">{data.enrollments.map((item) => {
            const done = course.chapters.filter((entry) => chapterComplete(item.progress.chapters[entry.id])).length;
            return <button type="button" key={item.id} className={selectedId === item.id ? 'is-selected' : ''} onClick={() => setSelectedId(item.id)} aria-pressed={selectedId === item.id}>
              <span className="assignment-list__avatar" aria-hidden="true">{item.learner.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
              <span><b>{item.learner.displayName}</b><small>{item.learner.role} · {done}/{course.chapters.length} capitoli</small><StatusBadge status={item.status} /></span><ArrowRight size={16} />
            </button>;
          })}</div>
          <p className="privacy-note">Usa identità sintetiche nella demo. La verifica pubblica dell’attestato non espone il nominativo.</p>
        </aside>

        {enrollment && <main className="course-workspace">
          <header className="learner-header"><div><span className="micro-label">DISCENTE SELEZIONATO / {enrollment.id}</span><h2>{enrollment.learner.displayName}</h2><p>{enrollment.learner.role} · scadenza {shortDate(enrollment.deadlineAt)}</p></div><StatusBadge status={enrollment.status} /></header>
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
          {enrollment.status === 'NOT_STARTED' && <section className="course-accept"><BookOpen size={32} /><span className="micro-label">IL TUO PERCORSO È PRONTO</span><h2>Accetta l’assegnazione e inizia.</h2><p>Potrai interrompere e riprendere: video, trascrizioni, tentativi e risultati restano salvati. Il test finale richiede tutti i capitoli.</p><button className="button button--dark" type="button" data-testid="accept-course" onClick={accept} disabled={busy === 'accept'}>{busy === 'accept' ? 'Attivazione…' : 'Accetta e inizia'}<ArrowRight size={17} /></button></section>}
          {enrollment.status === 'EXPIRED' && <BlockedState title="Assegnazione scaduta" text="Il progresso resta consultabile, ma non è possibile proseguire. HR/RSPP può creare una nuova assegnazione con una scadenza futura." />}

          {enrollment.certificate && <section className={`certificate-card ${enrollment.certificate.status === 'REVOKED' ? 'is-revoked' : ''}`} aria-labelledby="certificate-title">
            <div className="certificate-card__seal"><Award size={38} /><span>DEMO</span></div>
            <div className="certificate-card__content"><span className="micro-label">ATTESTATO DIGITALE / {enrollment.certificate.code}</span><h2 id="certificate-title">{enrollment.certificate.status === 'REVOKED' ? 'Attestato revocato' : 'Percorso completato e verificato.'}</h2><p>Emesso il {dateTime(enrollment.certificate.issuedAt)} dopo il completamento delle attività e il test finale. Non è un accreditamento legale.</p><div className="certificate-card__criteria"><b>Criterio effettivo</b><span>{course.verificationCriteria}</span></div><div className="certificate-card__actions"><ExportMenu label="Scarica attestato" formats={['pdf', 'json']} notify={notify} onExport={(format) => downloadFile(`/area3/learning/certificates/${enrollment.certificate.id}/export?format=${format}`)} /><a className="button button--outline" href={`/verifica/attestato/${enrollment.certificate.publicToken}`} target="_blank" rel="noreferrer">Verifica pubblica<ExternalLink size={16} /></a><CopyButton value={`${window.location.origin}/verifica/attestato/${enrollment.certificate.publicToken}`} notify={notify} />{enrollment.certificate.status !== 'REVOKED' && <button className="button button--ghost" type="button" onClick={() => setRevokeOpen(true)}><XCircle size={16} />Revoca</button>}</div></div>
          </section>}

          {enrollment.status !== 'NOT_STARTED' && enrollment.status !== 'EXPIRED' && (finalMode && !enrollment.certificate ? <section className="final-test" aria-labelledby="final-title">
            <div className="section-heading section-heading--inline"><div><span className="micro-label">TEST FINALE / SOGLIA {course.passScorePercent}%</span><h2 id="final-title">Verifica di apprendimento</h2></div><span className="quiz-step">{finalIndex + 1} / {course.finalQuestions.length}</span></div>
            <p className="final-test__intro">Una domanda alla volta. Le risposte non corrette non rilasciano l’attestato; puoi ripetere il test e i tentativi restano tracciati.</p>
            {finalFeedback && !finalFeedback.passed && <div className="quiz-feedback is-wrong" role="status"><RotateCcw size={20} /><div><b>Test non superato: {formatPercent(finalFeedback.attempt.percent)}%</b><p>Hai risposto correttamente a {finalFeedback.attempt.correct}/{finalFeedback.attempt.total}. Rivedi i capitoli e riprova.</p></div></div>}
            <fieldset className="quiz-card"><legend><span>DOMANDA {finalIndex + 1}</span>{finalQuestion.prompt}</legend><div className="quiz-options">{finalQuestion.options.map((option) => <label key={option.id} className={finalAnswers[finalQuestion.id] === option.id ? 'is-selected' : ''}><input type="radio" name={finalQuestion.id} value={option.id} checked={finalAnswers[finalQuestion.id] === option.id} onChange={() => setFinalAnswers((answers) => ({ ...answers, [finalQuestion.id]: option.id }))} /><span className="quiz-option__letter">{option.id}</span><span>{option.text}</span></label>)}</div></fieldset>
            <div className="final-test__actions"><button className="button button--ghost" type="button" onClick={() => setFinalIndex((index) => Math.max(0, index - 1))} disabled={finalIndex === 0 || busy === 'final'}><ArrowLeft size={17} />Precedente</button>{finalIndex < course.finalQuestions.length - 1 ? <button className="button button--dark" type="button" disabled={!finalAnswers[finalQuestion.id]} onClick={() => setFinalIndex((index) => index + 1)}>Domanda successiva<ArrowRight size={17} /></button> : <button className="button button--cobalt" type="button" data-testid="submit-final" disabled={Object.keys(finalAnswers).length !== course.finalQuestions.length || busy === 'final'} onClick={submitFinal}>{busy === 'final' ? 'Calcolo esito…' : 'Invia test finale'}<Check size={17} /></button>}</div>
            <button className="text-button" type="button" onClick={() => setFinalMode(false)}>Torna ai capitoli</button>
          </section> : <>
            <div className="chapter-tabs" role="tablist" aria-label="Capitoli del corso">{course.chapters.map((item, index) => {
              const progress = enrollment.progress.chapters[item.id] || {};
              return <button key={item.id} type="button" role="tab" aria-selected={chapter.id === item.id} className={chapter.id === item.id ? 'is-selected' : ''} onClick={() => selectChapter(item.id)}><span>{chapterComplete(progress) ? <CheckCircle2 size={17} /> : String(index + 1).padStart(2, '0')}</span><b>{item.title}</b><small>{item.durationMinutes} min</small></button>;
            })}</div>
            <section className="chapter-player" aria-labelledby="chapter-title">
              <div className="chapter-player__heading"><div><span className="micro-label">CAPITOLO {course.chapters.findIndex((item) => item.id === chapter.id) + 1} / {chapter.durationMinutes} MINUTI DIDATTICI</span><h2 id="chapter-title">{chapter.title}</h2></div><StatusBadge status={chapterComplete(chapterProgress) ? 'COMPLETED' : 'IN_PROGRESS'} label={chapterComplete(chapterProgress) ? 'Capitolo completato' : 'Da completare'} /></div>
              <div className="video-shell"><video key={chapter.id} data-testid="chapter-video" controls playsInline preload="metadata" onEnded={() => markProgress('video')} aria-label={`Video dimostrativo: ${chapter.title}`}><source src={chapter.videoUrl} type="video/webm" /><track kind="captions" src={chapter.captionsUrl} srcLang="it" label="Italiano" default />Il browser non supporta il video. Usa la trascrizione sottostante.</video><span className="video-shell__note"><Play size={14} />Video testuale demo · {chapter.videoDurationSeconds} sec · nessun audio · sottotitoli e controlli da tastiera</span></div>
              <div className="chapter-progress-actions"><div><span className={chapterProgress.videoCompleted ? 'is-done' : ''}>{chapterProgress.videoCompleted ? <CheckCircle2 size={17} /> : <Play size={17} />}Video {chapterProgress.videoCompleted ? 'completato' : 'da vedere'}</span><small>Raggiungi la fine per salvare il progresso.</small></div>{!chapterProgress.videoCompleted && <button className="button button--outline" type="button" onClick={() => markProgress('video')} disabled={Boolean(busy)}>Ho completato il video</button>}</div>
              <section className="transcript-card" aria-labelledby="transcript-title"><div className="transcript-card__heading"><FileText size={22} /><div><span className="micro-label">ALTERNATIVA ACCESSIBILE</span><h3 id="transcript-title">Trascrizione del capitolo</h3></div></div>{chapter.transcript.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="transcript-card__footer"><span className={chapterProgress.transcriptRead ? 'is-done' : ''}>{chapterProgress.transcriptRead ? <CheckCircle2 size={17} /> : <BookOpen size={17} />}{chapterProgress.transcriptRead ? 'Trascrizione registrata' : 'Lettura da registrare'}</span>{!chapterProgress.transcriptRead && <button className="button button--outline" type="button" data-testid="read-transcript" onClick={() => markProgress('transcript')} disabled={Boolean(busy)}>Ho letto la trascrizione</button>}</div></section>

              <form className="chapter-quiz" data-testid="chapter-quiz" onSubmit={submitChapterQuiz}>
                <div className="section-heading"><span className="micro-label">QUIZ INTERMEDIO / TENTATIVI {chapterProgress.quizAttempts || 0}</span><h3>Verifica il capitolo</h3></div>
                {!chapterProgress.videoCompleted || !chapterProgress.transcriptRead ? <BlockedState title="Prima completa video e trascrizione" text="Il quiz si attiva dopo entrambe le attività. Il solo tempo di riproduzione non è sufficiente." /> : <>
                  <fieldset className="quiz-card"><legend>{chapter.questions[0].prompt}</legend><div className="quiz-options">{chapter.questions[0].options.map((option) => <label key={option.id} className={chapterAnswer === option.id ? 'is-selected' : ''}><input type="radio" name={chapter.questions[0].id} value={option.id} checked={chapterAnswer === option.id} onChange={() => setChapterAnswer(option.id)} /><span className="quiz-option__letter">{option.id}</span><span>{option.text}</span></label>)}</div></fieldset>
                  {quizFeedback && <div className={`quiz-feedback ${quizFeedback.correct ? 'is-correct' : 'is-wrong'}`} role="status">{quizFeedback.correct ? <CheckCircle2 size={20} /> : <RotateCcw size={20} />}<div><b>{quizFeedback.correct ? 'Risposta corretta' : 'Risposta non corretta · riprova'}</b><p>{quizFeedback.explanation}</p></div></div>}
                  {chapterProgress.quizPassed ? <p className="quiz-passed"><CheckCircle2 size={18} />Quiz già superato. Puoi ripeterlo senza perdere il completamento.</p> : <button className="button button--dark" type="submit" disabled={!chapterAnswer || Boolean(busy)}>{busy.startsWith('quiz') ? 'Verifica…' : 'Verifica risposta'}<ArrowRight size={17} /></button>}
                </>}
              </form>
            </section>
          </>)}
        </main>}

        {enrollment && <aside className="course-progress" aria-labelledby="progress-title">
          <span className="micro-label">RIPRESA E COMPLETAMENTO</span><h2 id="progress-title">Il tuo progresso</h2>
          <div className="progress-figure"><strong>{completedCount}/{course.chapters.length}</strong><span>capitoli completi</span></div><progress max={course.chapters.length} value={completedCount} aria-label={`${completedCount} capitoli completati su ${course.chapters.length}`} />
          <ol>{course.chapters.map((item, index) => {
            const progress = enrollment.progress.chapters[item.id] || {};
            return <li key={item.id} className={chapterComplete(progress) ? 'is-complete' : ''}><button type="button" onClick={() => selectChapter(item.id)} disabled={enrollment.status === 'NOT_STARTED' || enrollment.status === 'EXPIRED'}><span>{chapterComplete(progress) ? <Check size={16} /> : index + 1}</span><div><b>{item.title}</b><small>{progress.videoCompleted ? 'Video ✓' : 'Video —'} · {progress.transcriptRead ? 'Testo ✓' : 'Testo —'} · {progress.quizPassed ? 'Quiz ✓' : 'Quiz —'}</small></div></button></li>;
          })}</ol>
          <div className={`final-unlock ${allChaptersComplete ? 'is-unlocked' : ''}`}><Award size={22} /><div><b>Test finale</b><p>{allChaptersComplete ? `Disponibile · soglia ${course.passScorePercent}%` : 'Si sblocca dopo tutti i capitoli.'}</p></div></div>
          {allChaptersComplete && !enrollment.certificate && enrollment.status !== 'EXPIRED' && <button className="button button--cobalt button--full" type="button" data-testid="open-final" onClick={() => { setFinalMode(true); setFinalIndex(0); setFinalFeedback(null); setActionError(null); }}>Vai al test finale<ArrowRight size={17} /></button>}
          <div className="course-criteria"><b>Come si ottiene l’attestato</b><p>{course.verificationCriteria}</p></div>
          <div className="attempt-summary"><Clock3 size={17} /><span><b>{enrollment.attempts.length}</b> tentativi registrati</span></div>
        </aside>}
      </div>

      {assignmentOpen && <Dialog title="Assegna il percorso" eyebrow="C09 / HR · RSPP · DEMO" onClose={() => !busy && setAssignmentOpen(false)}>
        <form className="stack-form" onSubmit={createAssignment}><p>Crea un’assegnazione con identità sintetica. Nessuna email viene inviata e nessuna idoneità legale viene attribuita.</p><label className="field"><span>Nome dimostrativo del discente *</span><input required minLength="2" maxLength="90" value={newLearner.displayName} onChange={(event) => setNewLearner((value) => ({ ...value, displayName: event.target.value }))} placeholder="Es. Preposto Demo 2" /></label><label className="field"><span>Ruolo *</span><select value={newLearner.role} onChange={(event) => setNewLearner((value) => ({ ...value, role: event.target.value }))}><option>Preposto</option><option>Capocantiere</option></select></label><label className="field"><span>Scadenza assegnazione *</span><input type="date" required min={futureDate(1)} value={newLearner.deadline} onChange={(event) => setNewLearner((value) => ({ ...value, deadline: event.target.value }))} /></label>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setAssignmentOpen(false)}>Annulla</button><button className="button button--cobalt" type="submit" disabled={busy === 'assignment'}><Plus size={17} />{busy === 'assignment' ? 'Creazione…' : 'Crea assegnazione'}</button></div></form>
      </Dialog>}
      {revokeOpen && enrollment.certificate && <Dialog title="Revocare l’attestato demo?" eyebrow={enrollment.certificate.code} onClose={() => !busy && setRevokeOpen(false)}><p>La revoca sarà visibile nella verifica pubblica. Il completamento e i tentativi restano conservati nel percorso privato.</p>{actionError && <p className="form-error" role="alert">{actionError}</p>}<div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setRevokeOpen(false)}>Mantieni attivo</button><button className="button button--danger" type="button" onClick={revokeCertificate} disabled={busy === 'revoke'}>{busy === 'revoke' ? 'Revoca…' : 'Revoca attestato'}</button></div></Dialog>}
    </div>
  );
}
