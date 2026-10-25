import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BedDouble, Building2, CalendarDays, CheckCircle2, Clock3, Download, Info, MapPin, ReceiptText, Search, ShieldCheck, Users, XCircle } from 'lucide-react';
import { WorkspaceContext } from './WorkspaceApp.jsx';
import { api, downloadFile } from './api.js';
import { DemoNotice, Dialog, EmptyState, ErrorState, ExportMenu, LoadingState, StatusBadge, dateTime, money, shortDate, useApiData } from './ui.jsx';

const futureDate = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

function QuoteLines({ quote, compact = false }) {
  if (!quote) return null;
  return (
    <dl className={`quote-lines ${compact ? 'quote-lines--compact' : ''}`}>
      <div><dt>Pernottamento · {quote.nights} {quote.nights === 1 ? 'notte' : 'notti'}</dt><dd>{money(quote.roomSubtotalCents)}</dd></div>
      <div><dt>Supplementi ospiti extra</dt><dd>{money(quote.extraGuestCents)}</dd></div>
      <div><dt>Tasse di soggiorno</dt><dd>{money(quote.taxesCents)}</dd></div>
      <div className="quote-lines__total"><dt>Totale richiesta <small>Valuta EUR</small></dt><dd>{money(quote.totalCents)}</dd></div>
    </dl>
  );
}

export function HospitalityPage() {
  const { notify } = useContext(WorkspaceContext);
  const { data, error, loading, reload } = useApiData('/area3/hospitality');
  const [view, setView] = useState('search');
  const [municipality, setMunicipality] = useState('');
  const [checkIn, setCheckIn] = useState(() => futureDate(30));
  const [checkOut, setCheckOut] = useState(() => futureDate(32));
  const [guests, setGuests] = useState(2);
  const [propertyId, setPropertyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [quoteState, setQuoteState] = useState({ data: null, loading: false, error: null });
  const quoteRequest = useRef(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [guestName, setGuestName] = useState('Dipendente Demo');
  const [note, setNote] = useState('');
  const [consents, setConsents] = useState({ termsAccepted: false, privacyAccepted: false });
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [cancelItem, setCancelItem] = useState(null);

  const visibleProperties = useMemo(() => (data?.properties || []).filter((property) => {
    const textMatch = !municipality || `${property.name} ${property.municipality}`.toLowerCase().includes(municipality.toLowerCase());
    return textMatch && property.rooms.some((room) => room.capacity >= Number(guests));
  }), [data, municipality, guests]);
  const property = data?.properties.find((item) => item.id === propertyId);
  const room = property?.rooms.find((item) => item.id === roomId);

  useEffect(() => {
    if (!visibleProperties.length) { setPropertyId(''); setRoomId(''); return; }
    if (!visibleProperties.some((item) => item.id === propertyId)) {
      setPropertyId(visibleProperties[0].id);
      setRoomId(visibleProperties[0].rooms.find((item) => item.capacity >= Number(guests))?.id || visibleProperties[0].rooms[0].id);
    }
  }, [visibleProperties, propertyId, guests]);

  useEffect(() => {
    if (!propertyId || !roomId || !checkIn || !checkOut) return undefined;
    const current = ++quoteRequest.current;
    setQuoteState((state) => ({ ...state, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      api('/area3/hospitality/quote', { method: 'POST', body: JSON.stringify({ propertyId, roomId, checkIn, checkOut, guests: Number(guests) }) })
        .then((result) => { if (current === quoteRequest.current) setQuoteState({ data: result, loading: false, error: null }); })
        .catch((reason) => { if (current === quoteRequest.current) setQuoteState({ data: null, loading: false, error: reason }); });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [propertyId, roomId, checkIn, checkOut, guests]);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!quoteState.data) return;
    setBusy(true); setFormError(null);
    try {
      const result = await api('/area3/hospitality/requests', {
        method: 'POST',
        body: JSON.stringify({ requestKey, propertyId, roomId, checkIn, checkOut, guests: Number(guests), guestName, note, consents }),
      });
      setLastRequest(result.request);
      setReviewOpen(false);
      setView('requests');
      setRequestKey(crypto.randomUUID());
      setConsents({ termsAccepted: false, privacyAccepted: false });
      notify('success', result.idempotent ? 'Richiesta già registrata: nessun duplicato creato' : 'Richiesta inviata · nessuna prenotazione confermata');
      await reload();
    } catch (reason) { setFormError(reason.message); }
    finally { setBusy(false); }
  };

  const cancelRequest = async () => {
    setBusy(true); setFormError(null);
    try {
      const result = await api(`/area3/hospitality/requests/${cancelItem.id}/cancel`, { method: 'POST', body: '{}' });
      setLastRequest(result.request);
      setCancelItem(null);
      notify('success', 'Richiesta annullata e ricevuta aggiornata');
      await reload();
    } catch (reason) { setFormError(reason.message); }
    finally { setBusy(false); }
  };

  if (loading && !data) return <LoadingState label="Caricamento Hospitality Booking Hub" />;
  if (error && !data) return <ErrorState error={error} onRetry={() => reload().catch(() => {})} />;

  return (
    <div className="module-page workspace-page hospitality-page">
      <header className="module-heading page-header page-header--split">
        <div><span className="micro-label">AREA 03 / C08 · HOSPITALITY</span><h1>Dormire nel borgo,<br /><em>senza false conferme.</em></h1><p>Per dipendenti, famiglie e ospiti aziendali o di cantiere: cerca una struttura convenzionata, verifica costi e condizioni e invia una richiesta tracciata alla struttura partner.</p></div>
        <div className="module-heading__actions page-header__actions"><span className="component-status"><span />VERTICAL SLICE · C08</span><button className="button button--outline" type="button" onClick={() => setView(view === 'search' ? 'requests' : 'search')}>{view === 'search' ? <ReceiptText size={17} /> : <Search size={17} />}{view === 'search' ? 'Le mie richieste' : 'Nuova ricerca'}</button></div>
      </header>
      <DemoNotice compact />
      <div className="hospitality-principle"><Info size={20} /><div><b>Nessun inventario live collegato.</b><p>Ogni esito è una <strong>richiesta di disponibilità</strong>. Il portale non conferma mai la prenotazione: il pernottamento è gestito esternamente dalla struttura.</p></div></div>

      {view === 'search' ? <>
        <form className="booking-search" onSubmit={(event) => event.preventDefault()} aria-label="Cerca una struttura partner">
          <label className="field booking-search__place"><span>Borgo o struttura</span><div className="field-with-icon"><MapPin size={18} /><input value={municipality} onChange={(event) => setMunicipality(event.target.value)} placeholder="Es. Borgo Demo" /></div></label>
          <label className="field"><span>Arrivo</span><input type="date" required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} /></label>
          <label className="field"><span>Partenza</span><input type="date" required value={checkOut} onChange={(event) => setCheckOut(event.target.value)} /></label>
          <label className="field"><span>Ospiti</span><select aria-label="Ospiti" value={guests} onChange={(event) => setGuests(Number(event.target.value))}>{[1, 2, 3, 4].map((number) => <option key={number} value={number}>{number} {number === 1 ? 'ospite' : 'ospiti'}</option>)}</select></label>
          <button className="button button--cobalt" type="submit"><Search size={18} />Aggiorna risultati</button>
        </form>
        {quoteState.data && <button className="mobile-summary-launch" type="button" onClick={() => setReviewOpen(true)}><span>Riepilogo richiesta<small>{quoteState.data.quote.nights} notti · {guests} ospiti</small></span><b>{money(quoteState.data.quote.totalCents)}</b></button>}

        <div className="hospitality-layout">
          <section className="hospitality-results" aria-labelledby="results-title">
            <div className="section-heading section-heading--inline"><div><span className="micro-label">STRUTTURE PARTNER / DATI DEMO</span><h2 id="results-title">{visibleProperties.length} soluzioni per la richiesta</h2></div><span className="quiet-label">Tariffe convenzionate · EUR</span></div>
            {!visibleProperties.length && <EmptyState title="Nessuna struttura per questi criteri" text="Modifica borgo o numero di ospiti. Le date non alterano i risultati perché non esiste un inventario live." />}
            <div className="property-grid">
              {visibleProperties.map((item) => <article className={`property-card ${propertyId === item.id ? 'is-selected' : ''}`} key={item.id}>
                <button className="property-card__select" type="button" onClick={() => { setPropertyId(item.id); setRoomId(item.rooms.find((candidate) => candidate.capacity >= Number(guests))?.id || item.rooms[0].id); }} aria-pressed={propertyId === item.id} aria-label={`Seleziona ${item.name}`}>
                  <img src={item.image} alt={`Struttura demo: ${item.name}`} />
                  <span className="property-card__index">PARTNER / {item.id.slice(-2)}</span>
                </button>
                <div className="property-card__body">
                  <span className="property-card__location"><MapPin size={14} />{item.municipality}</span>
                  <h3>{item.name}</h3><p>{item.description}</p>
                  <ul className="amenity-list" aria-label="Servizi">{item.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}</ul>
                  <div className="room-options">
                    {item.rooms.map((option) => <label className={`room-option ${propertyId === item.id && roomId === option.id ? 'is-selected' : ''} ${option.capacity < Number(guests) ? 'is-disabled' : ''}`} key={option.id}>
                      <input type="radio" name={`room-${item.id}`} checked={propertyId === item.id && roomId === option.id} disabled={option.capacity < Number(guests)} onChange={() => { setPropertyId(item.id); setRoomId(option.id); }} />
                      <BedDouble size={20} /><span><b>{option.name}</b><small><Users size={13} /> fino a {option.capacity} · {money(option.ratePerNightCents)}/notte</small></span>
                    </label>)}
                  </div>
                </div>
              </article>)}
            </div>
            {property && room && <section className="booking-conditions" aria-labelledby="conditions-title">
              <div><ShieldCheck size={24} /><span><b>Condizioni prima dell’invio</b><h2 id="conditions-title">Camera e disponibilità</h2></span></div>
              <div className="booking-conditions__grid"><div><span className="micro-label">CAMERA SELEZIONATA</span><h3>{room.name}</h3><p>{property.name} · capienza {room.capacity} ospiti</p></div><div><span className="micro-label">DISPONIBILITÀ</span><StatusBadge status={room.availability.code} label={room.availability.label} /><p><Clock3 size={14} /> Aggiornata: {dateTime(room.availability.updatedAt)}</p>{room.availability.stale && <p className="warning-text">Dato oltre 72 ore: la struttura deve verificarlo nuovamente.</p>}</div></div>
              <details><summary>Policy di cancellazione e condizioni</summary><p>{property.cancellationPolicy}</p><p>Tariffe, supplementi e tasse restano nel riepilogo prima dell’invio. Eventuali condizioni definitive sono comunicate esternamente dalla struttura.</p></details>
            </section>}
          </section>

          <aside className="booking-summary" aria-labelledby="summary-title">
            <span className="micro-label">RIEPILOGO / PRIMA DELL’INVIO</span><h2 id="summary-title">La tua richiesta</h2>
            {quoteState.loading && <LoadingState label="Ricalcolo tariffa" />}
            {quoteState.error && <p className="form-error" role="alert">{quoteState.error.message}</p>}
            {quoteState.data && !quoteState.loading && <>
              <div className="booking-summary__stay"><b>{quoteState.data.property.name}</b><span>{quoteState.data.room.name}</span><p><CalendarDays size={15} />{shortDate(checkIn)} → {shortDate(checkOut)}</p><p><Users size={15} />{guests} {guests === 1 ? 'ospite' : 'ospiti'} · {quoteState.data.quote.nights} notti</p></div>
              <QuoteLines quote={quoteState.data.quote} />
              <StatusBadge status={quoteState.data.availability.code} label={quoteState.data.availability.label} />
              <p className="booking-summary__notice">L’invio non blocca camere e non conferma la prenotazione.</p>
              <button className="button button--dark button--full" type="button" onClick={() => { setFormError(null); setReviewOpen(true); }}>Continua con la richiesta<ArrowRight size={17} /></button>
            </>}
          </aside>
        </div>
      </> : <section className="requests-section" aria-labelledby="requests-title">
        <div className="section-heading section-heading--inline"><div><span className="micro-label">RICEVUTE E GESTIONE</span><h2 id="requests-title">Le mie richieste</h2></div><button className="button button--outline" type="button" onClick={() => setView('search')}><Search size={17} />Nuova ricerca</button></div>
        {lastRequest && <div className="request-success" role="status"><CheckCircle2 size={26} /><div><b>{lastRequest.status === 'CANCELLED' ? 'Richiesta annullata' : 'Operazione registrata'}</b><p>Ricevuta {lastRequest.receiptId} · {lastRequest.status === 'CANCELLED' ? 'lo stato annullato è ora tracciato.' : 'nessuna prenotazione è stata confermata.'}</p></div><StatusBadge status={lastRequest.status} /></div>}
        {!data.requests.length ? <EmptyState title="Nessuna richiesta" text="Le richieste inviate appariranno qui con ricevuta e operazioni." /> : <div className="request-list">{data.requests.map((item) => <article className="request-card" key={item.id}>
          <div className="request-card__top"><span className="micro-label">{item.id} / {item.receiptId}</span><StatusBadge status={item.status} /></div>
          <h3>{item.propertyName}</h3><p>{item.roomName} · {item.guestName}</p>
          <div className="request-card__facts"><span><CalendarDays size={16} />{shortDate(item.checkIn)} → {shortDate(item.checkOut)}</span><span><Users size={16} />{item.guests} ospiti</span><b>{money(item.totalCents)}</b></div>
          <div className="request-card__notice"><Info size={15} />{item.status === 'CANCELLED' ? `Annullata il ${dateTime(item.cancelledAt)}` : 'In attesa di gestione esterna · non confermata'}</div>
          <div className="request-card__actions"><ExportMenu label="Ricevuta" formats={['pdf', 'json', 'ics']} notify={notify} onExport={(format) => downloadFile(`/area3/hospitality/requests/${item.id}/receipt?format=${format}`)} />{item.status === 'REQUESTED' && <button className="button button--outline" type="button" onClick={() => { setCancelItem(item); setFormError(null); }}><XCircle size={17} />Annulla richiesta</button>}</div>
          <details className="request-history"><summary>Cronologia operazioni ({item.events.length})</summary><ol>{item.events.map((event, index) => <li key={`${event.at}-${index}`}><time>{dateTime(event.at)}</time><span>{event.event}</span></li>)}</ol></details>
        </article>)}</div>}
      </section>}

      {reviewOpen && quoteState.data && <Dialog title="Rivedi e invia la richiesta" eyebrow="C08 / NESSUNA PRENOTAZIONE CONFERMATA" onClose={() => !busy && setReviewOpen(false)} className="dialog--booking">
        <form className="stack-form" onSubmit={submitRequest}>
          <div className="review-stay"><Building2 size={24} /><div><b>{quoteState.data.property.name}</b><span>{quoteState.data.room.name} · {shortDate(checkIn)} → {shortDate(checkOut)}</span></div></div>
          <QuoteLines quote={quoteState.data.quote} compact />
          <div className="review-policy"><b>Disponibilità e cancellazione</b><StatusBadge status={quoteState.data.availability.code} label={quoteState.data.availability.label} /><p>{quoteState.data.property.cancellationPolicy}</p></div>
          <label className="field"><span>Nome del referente *</span><input required minLength="2" maxLength="90" autoComplete="name" value={guestName} onChange={(event) => setGuestName(event.target.value)} /><small>Solo il referente: non inserire nomi o dati dei familiari.</small></label>
          <label className="field"><span>Nota alla struttura <i>facoltativa</i></span><textarea rows="3" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Es. esigenze di accesso o orario di arrivo" /></label>
          <div className="consent-stack"><label><input type="checkbox" required checked={consents.termsAccepted} onChange={(event) => setConsents((value) => ({ ...value, termsAccepted: event.target.checked }))} /><span>Ho letto tariffa, tasse, disponibilità e policy di cancellazione.</span></label><label><input type="checkbox" required checked={consents.privacyAccepted} onChange={(event) => setConsents((value) => ({ ...value, privacyAccepted: event.target.checked }))} /><span>Acconsento al trattamento demo dei soli dati necessari alla richiesta.</span></label></div>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="dialog__actions"><button className="button button--ghost" type="button" disabled={busy} onClick={() => setReviewOpen(false)}>Torna al riepilogo</button><button className="button button--cobalt" type="submit" disabled={busy || !consents.termsAccepted || !consents.privacyAccepted}>{busy ? 'Invio in corso…' : `Invia richiesta · ${money(quoteState.data.quote.totalCents)}`}<ArrowRight size={17} /></button></div>
        </form>
      </Dialog>}

      {cancelItem && <Dialog title="Annullare questa richiesta?" eyebrow={`${cancelItem.id} / OPERAZIONE TRACCIATA`} onClose={() => !busy && setCancelItem(null)}>
        <p>Annulli la richiesta per <b>{cancelItem.propertyName}</b>, {shortDate(cancelItem.checkIn)} → {shortDate(cancelItem.checkOut)}. La ricevuta conserverà l’operazione.</p>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="dialog__actions"><button className="button button--ghost" type="button" onClick={() => setCancelItem(null)} disabled={busy}>Mantieni richiesta</button><button className="button button--danger" type="button" onClick={cancelRequest} disabled={busy}>{busy ? 'Annullamento…' : 'Sì, annulla richiesta'}</button></div>
      </Dialog>}
    </div>
  );
}
