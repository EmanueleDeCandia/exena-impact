# Sibillini Impact — Enterprise Services + Aree 1, 2, 3, 4 e 5

Applicazione React/Vite con landing Enterprise Services e vertical slice full-stack delle **Aree 1, 2, 3, 4 e 5**, implementate secondo [`SKILL.md`](./SKILL.md) e la direzione visiva [`DESIGN.md`](./DESIGN.md).

## Avvio

```bash
npm install
npm run dev
```

Il comando avvia insieme:

- Vite su `0.0.0.0:5173`, configurato per l’host dell’anteprima remota;
- API Express su `0.0.0.0:8787`;
- proxy Vite di `/api` verso il backend, così il browser usa sempre URL relativi.

### Build e anteprima di produzione

```bash
npm run build
npm run preview
```

In produzione Express serve sia le API sia `dist/` sulla porta `8787`, con fallback SPA per le route React. È possibile impostare `PORT`, per esempio `PORT=8790 npm start`.

Le pagine operative C01–C16 e le pagine pubbliche sono **lazy-loaded per route** con fallback di caricamento accessibile: la landing non scarica in anticipo i moduli dei workspace. I deep link di produzione sono verificati con caricamento diretto dei singoli chunk.

## Landing

- Punto di vista dei clienti finali: Procurement, RSPP, ESG Manager, HR e CEO/Board.
- **Percorso Standard** e **Standard + Varianti ad Alto Impatto** sempre distinguibili.
- Cinque aree di servizio, 13 varianti e soglie cumulative A/B/C/D.
- Tre direttrici preservate: Core Value, Trade Marketing ed EaaS con devoluzione al 30%.
- Due fotografie Performing Arts realistiche: hotel e outdoor/site-specific.
- Simulatore deterministico con base Standard e incrementi delle varianti separati.
- Download locale `.txt`, tabella comparativa e form che dichiara di non trasmettere dati.
- Menu mobile, navigazione da tastiera, focus visibili e `prefers-reduced-motion`.

## Area 1 — componenti operativi

Le sette card digitali dell’Area 1 aprono route reali. L’audit fisico resta escluso dalle componenti digitali.

| ID | Route | Funzioni implementate |
|---|---|---|
| C01 | `/app/esg/scope-3` | Dataset per modello/lotto, unità e perimetro, fattori, fonti, hash, versioni, confronto, export CSV/JSON/PDF e cronologia download. |
| C02 | `/app/fondo/attestazioni` | Ordine/Fondo riconciliati in centesimi, quota 30%, audit trail, revisione demo, export PDF/JSON e verifica pubblica minimizzata. |
| C03 | `/app/report` | Template Area Sisma, Cantiere Etico Integrato, CPT e Sintesi Stakeholder; perimetro, deduplica ordini, evidenze, bozze, versioni/diff, revisione ed export. |
| C04 | `/app/evidence-packs` | Checklist BANK/ASSURANCE distinte, collegamento tipizzato delle evidenze, completezza, revisione, ZIP/PDF e link read-only di 24 ore con log e revoca. |

Route pubbliche minimizzate:

- `/verifica/fondo/:token`: stato, ID, versione, data, progetto e revisore demo; nessun importo o dato commerciale.
- `/condivisioni/evidence/:token`: titolo, organizzazione, stato e completezza checklist; nessun documento sorgente o importo.

## Area 2 — Relationship, Content & Public Registry

Le due card Standard e le tre varianti digitali sono collegate. La **Sintesi Stakeholder 2.C** riusa il composer C03 con template dedicato.

| ID | Route | Funzioni implementate |
|---|---|---|
| C05 | `/app/brand-kit` | Logo SVG/PNG/JPEG validato, testi approvati bloccati, template, palette con contrasto, area di sicurezza, anteprima live, archivio, export SVG/PNG reali, inviti di filiera con accettazione e revoca. La query `audience=SUBCONTRACTOR` apre il percorso filiera. |
| C06 | `/app/editoriale` | Tre tipologie editoriali: **Case History**, **Executive Page** e il modulo **Local Shared Value** (questionario esteso sui 6 requisiti territoriali del framework con inquadramento metodologico, selezione pratiche, sintesi per il report e link probatorio obbligatorio). Slug/canonical/metadati social, immagini locali, fonti collegate, bozze noindex, versioni, doppia review fattuale/editoriale (con blocco e verifica dello stato del modulo Local Shared Value collegato tramite `localSharedValueId`), pubblicazione, correzioni versionate e archiviazione. |
| C07 | `/app/registro-partner` | Schede private, consenso, municipalità e progetti pubblicabili, review, pubblicazione, rettifiche e rimozioni tracciate. Directory pubblica con filtri accessibili, dettaglio ed export CSV. |

Route pubbliche Area 2:

- `/inviti/kit/:token`: solo asset e denominazioni necessarie; nessun dato commerciale del General Contractor.
- `/case-history/:slug` e `/best-practice/:slug`: sole versioni pubblicate; bozze assenti e contenuti archiviati non disponibili.
- `/shared-value/:slug`: Dossier Esecutivo Asseverato del Valore Condiviso Locale, con ribbon KPI brutalista 6/6, 6 Master Cards con inquadramento metodologico, opzioni del questionario esteso, dichiarazione per il report e link di riscontro probatorio verificato.
- `/partner`: directory pubblica minimizzata, senza ranking automatico, Partita IVA, importi o dati privati.
- `/partner/:slug`: stato demo, municipalità, progetti, evidenze pubblicabili, aggiornamenti e rettifiche.

Tutte le console `/app/*` impostano `noindex, nofollow, noarchive`. La topbar include il pulsante unificato **Reset Seed** (con modale di conferma) per ripristinare in tempo reale il datastore alle condizioni iniziali coerenti. Le pagine editoriali pubblicate ricevono title, description, canonical, Open Graph e Twitter metadata lato client. Per crawler social e SEO di produzione è raccomandato SSR o pre-rendering delle route pubbliche.

## Area 3 — Hospitality, E-Learning & Digital Certificates

Le card Standard C08 e Variante 3.C C09 aprono componenti full-stack. Le alternative non digitali restano descrittive e non vengono simulate come attive.

| ID | Route | Funzioni implementate |
|---|---|---|
| C08 | `/app/hospitality` | Ricerca per borgo/date/ospiti, strutture e camere partner, tariffe in centesimi, supplementi, tasse ed EUR espliciti, timestamp e disponibilità stale oltre 72 ore, policy, riepilogo prima dell’invio, idempotenza, gestione/annullamento, ricevute PDF/JSON e calendario ICS. |
| C09 | `/app/e-learning` | Assegnazioni HR/RSPP demo, tre capitoli per 60 minuti didattici, video WebM locali con sottotitoli VTT e trascrizione, progresso persistente, quiz intermedi, tentativi, test finale con soglia 80%, attestato PDF/JSON, codice pubblico e revoca. |

- Senza inventario live C08 crea esclusivamente **richieste di disponibilità**, mai prenotazioni confermate. Il pernottamento resta fulfilment esterno.
- Su mobile il riepilogo C08 si apre in un bottom sheet dialog accessibile, senza coprire i campi della ricerca.
- C09 richiede video, trascrizione e quiz in ogni capitolo prima del test finale. Il solo tempo di riproduzione non è sufficiente.
- I video demo sono contenuti testuali locali di 8 secondi, senza audio; la durata didattica prevista dei capitoli resta distinta dalla durata del file dimostrativo.
- L’attestato riporta ente e criteri effettivi ed è marcato demo: nessun accreditamento legale automatico o sostituzione degli obblighi formativi.
- `/verifica/attestato/:token` espone solo codice, corso, ente, stato, date e criteri; non espone nominativo, ruolo, email o punteggio del discente ed è `noindex`.

## Area 4 — Governance, Fund Direction & Board Briefing

La card Standard **Executive Page Indicizzata** apre il percorso C06 esistente con `type=BEST_PRACTICE`. Tavolo CSR e ospitalità fisica restano fulfilment esterno. Le due varianti digitali aprono console riservate con identità demo esplicite.

| ID | Route | Funzioni implementate |
|---|---|---|
| C10 | `/app/governance/indirizzo-fondo` | Quota 30% calcolata da ordini confermati, opzioni per comune o tipologia di opera, finestra/cutoff, solo Board autorizzato, challenge MFA demo monouso di 5 minuti, dichiarazione sul conflitto, conseguenze, conferma forte, controllo di versione ottimistico, storico, ricevute PDF/JSON con regole e audit. Lo stato di attuazione è aggiornabile soltanto dal revisore Startup. |
| C11 | `/app/governance/briefing` | Briefing annuale online di 120 minuti, agenda/fuso, inviti nominativi, accettazione e verifica identità demo, pre-read protetti PDF/JSON, link sala generato dal backend, lobby e ruoli relatore/partecipante, domande/risposte, ingressi/uscite e durata effettiva nella sala del portale, follow-up e materiali finali PDF/JSON. |

- C10 blocca client e API dopo il cutoff; prima del cutoff ogni modifica richiede la versione corrente e crea una nuova ricevuta, senza sovrascrivere lo storico. La quota demo 2026 è **4.500 €**; l’archivio 2025 è **1.800 €**, chiuso e immutabile.
- C11 non incorpora né simula un provider video. Il pannello “canale video esterno non collegato” distingue la presenza nella sala del portale da una presenza nella videoriunione.
- Il link sala è personale, `noindex` e inutilizzabile da anonimi, altra identità o altro tenant. Senza sessione il deep link mostra soltanto il gate di accesso.
- La registrazione è disattivata di default. Il consenso informato è esplicito e verificato per tutti gli invitati; anche con consensi completi l’attivazione resta bloccata finché non esiste un provider reale.
- Le sessioni Governance demo durano 8 ore. Ruolo, Board autorizzato, tenant, invito, cutoff, concorrenza e permessi sono verificati anche lato API; il broker e il codice MFA restano esplicitamente dimostrativi.
- Gli export Governance sono protetti da bearer token e marcati `private, no-store`; nessun token sala o challenge MFA compare nei documenti.

## Area 5 — Digital Operations, filiera e trasparenza

Le tre card Standard e le due Varianti digitali dell’Area 5 aprono componenti full-stack. Il layout a sidebar include tutte le **16 componenti C01–C16**, raggiungibili anche a viewport basso.

| ID | Route | Funzioni implementate |
|---|---|---|
| C12 | `/app/ordini` | Catalogo contrattuale, matrice modello/taglia, stock disponibile/basso/incerto con timestamp, indirizzi per tenant, ricorrenza, quote server-side, revisione con doppia conferma, ordine idempotente, rettifiche motivate e ricevute PDF/JSON. |
| C13 | `/app/dashboard` | Ledger deduplicato, soglie 10/25/50/100, gap e scadenze, Standard distinto dagli incrementi Varianti, entitlement contrattuali/attivabili, richieste, voucher PDF, eventi e viste Rete/Diretta/Cantiere secondo ruolo. |
| C14 | `/trasparenza` e `/trasparenza/:slug` | Registro pubblico derivato da allocazioni approvate e riconciliate con C02, KPI aggregati, filtri, permalink, fonti pubbliche minimizzate, rettifiche, data di aggiornamento ed export CSV coerente con i filtri. |
| C15 | `/app/logistica` | Creazione piano da ordine confermato, siti e capicantiere assegnati, matrice modello/taglia/quantità, import/export CSV, errori puntuali, versioni, validazione cantiere, approvazione Procurement e spedizione idempotente riconciliata con ordine/fabbisogni. |
| C16 | `/app/filiera` | Inviti, identità organizzazione, checksum P. IVA solo formale, accettazione, consensi separati, verifica effettiva demo da Startup Reviewer, relazioni cantiere/periodi, volumi individuali e aggregati senza duplicati, revoca con storico. |

- C12 non integra pagamenti: lo stato resta **“ordine inviato · non pagato”** e `paymentStatus=NOT_INTEGRATED`; la consegna è esterna. Il totale e la devoluzione del 30% sono ricalcolati sul server, senza fidarsi dei prezzi del browser.
- C13 usa lo stesso ledger di ordini e relazioni: rettificare un ordine confermato senza attestazioni o piani collegati aggiorna soglie, entitlement e report senza cancellare la cronologia. Il volume individuale del subappaltatore resta distinto dal volume autorizzato nella rete del General Contractor.
- C14 non espone prezzi unitari, clienti, Partite IVA, indirizzi o nominativi. Le fonti non verificate o non riconciliate escludono il dato dal registro invece di pubblicare un importo stale.
- C15 raccoglie quantità aggregate, non nomi dei lavoratori. `expectedVersion` e chiavi di idempotenza impediscono doppie spedizioni; tracking e consegna fisica restano esterni e non vengono simulati come completati.
- C16 distinque sempre invito, associazione e consenso. La verifica formale della P. IVA non equivale alla verifica effettiva dell’impresa. La revoca chiude i periodi attivi e conserva lo storico; i collegamenti C03/C05/C13 rispettano il perimetro tenant.
- Le sessioni Operations demo durano 8 ore. Il comando **Cambia identità** revoca la sessione e mostra nuovamente il gate senza conservare una vista dell’identità precedente. Un token scaduto o eliminato da un reset viene rimosso automaticamente dal browser e riapre la selezione dei ruoli con un messaggio esplicito.
- C14 resta pubblica e indicizzabile ma condivide sidebar, breadcrumb e navigazione mobile del workspace; non richiede identità e non mostra il selettore organizzazione riservato.

### Identità Operations demo

| Identità | Ruolo e perimetro |
|---|---|
| Procurement General Contractor Demo | Procurement, ordini, dashboard, logistica e inviti di `org-gc-demo`. |
| HR Welfare Demo / Board Operations Demo | Vista C13 rispettivamente diretta e di rete; nessun accesso C12/C15/C16. |
| Capocantiere Ponte Demo | Solo cantieri assegnati; modifica/valida il fabbisogno ma non approva centralmente. |
| Procurement Subappaltatore Demo | Ordini e soglie individuali, consensi e revoca della propria relazione. |
| Nuova Impresa Subappaltatrice Demo / Impresa da Invitare Demo | Percorsi di invito e accettazione separati. |
| Revisore Operations Demo | Verifica effettiva simulata delle relazioni in attesa; non modifica consensi o cantieri. |
| Procurement Altra Organizzazione Demo | Tenant vuoto usato nei test di isolamento. |

### Perché compare “La sessione Operations demo non è più valida”

C12, C13, C15 e C16 condividono una sessione dimostrativa composta da due elementi:

1. un bearer token conservato nel `sessionStorage` della scheda del browser;
2. una sessione corrispondente in `operationsSessions` nel datastore server, con scadenza di 8 ore e riferimento a un’identità demo abilitata.

A ogni richiesta protetta il server verifica token, scadenza e identità. Il messaggio compare quando il browser possiede ancora il token ma il server non lo riconosce più, tipicamente dopo **scadenza, revoca, reset/reseed o ripristino di un backup che ha eliminato le sessioni**. Il semplice riavvio del server non invalida la sessione se il datastore viene conservato.

Dopo il reset finale o una suite QA è quindi previsto vedere il messaggio una volta: non indica un ruolo mancante né una perdita dei dati operativi. Selezionando nuovamente un’identità viene creata una nuova sessione; il token stale viene rimosso automaticamente e non è necessario cancellare manualmente lo storage. Poiché `sessionStorage` è separato per scheda, anche una nuova scheda può richiedere una nuova selezione dell’identità.

Se il messaggio ricompare **immediatamente dopo un nuovo login**, non bisogna ripetere il login all’infinito: occorre verificare che l’anteprima e l’API siano attive e che il datastore non venga continuamente ripristinato. Per gli avanzamenti successivi, le suite QA devono usare un datastore/processo separato da quello della demo interattiva; un reseed dell’ambiente condiviso deve essere annunciato perché invalida intenzionalmente le sessioni esistenti.

C14 è invece pubblica e **non dipende dalla sessione Operations**. Un suo errore di caricamento deve essere trattato come disponibilità API/modulo, non come problema di ruolo.

### Resilienza del registro C14 e delle route lazy

- `/api/area5/transparency` è l’endpoint pubblico di controllo: a seed pulito restituisce 2 progetti, `totalCents=450000` e riconciliazione `RECONCILED_DEMO`.
- Se l’API non è raggiungibile, C14 mostra un errore con **Riprova**, mantenendo sidebar e navigazione.
- Un errore di rendering o un chunk lazy non più disponibile viene intercettato da `RouteErrorBoundary`: la pagina offre **Ricarica la vista** invece di diventare bianca e non modifica i dati server.
- Le regressioni Area 5 simulano sia il fallimento API sia il fallimento del chunk C14 e verificano il recupero su 5173 e 8787 tramite il parametro `AREA5_BASE`.

Gli export Operations privati richiedono bearer token e sono marcati `private, no-store`. Il CSV C14 è pubblico e contiene soltanto il dataset pubblicabile.

### Stati e controlli trasversali

- Stati vuoti, errore API, filtri senza risultati e blocchi durante revisione/verifica.
- Dataset verificati presentati come immutabili; le versioni restano consultabili.
- Report e contenuti editoriali modificabili solo negli stati consentiti.
- Pack incompleti non possono essere inviati o marcati come pronti.
- Ogni voce di checklist accetta solo il tipo di evidenza previsto.
- Link pubblici con revoca immediata; le condivisioni Area 1 hanno anche scadenza e log delle visualizzazioni senza dati personali del visitatore.
- La doppia approvazione editoriale è una macchina a stati reale, ma in demo la stessa identità fittizia può simulare entrambi i revisori: la segregazione formale dei ruoli richiede autenticazione e RBAC.
- Nessuna promessa di rating, finanziamento, attestazione CSRD, registrazione notarile o firma qualificata.

> **Ambiente demo:** tutti i dati sono sintetici e marcati come non validi per reporting, revisione o finalità legali. Le azioni dei revisori sono simulazioni esplicite.

## Backend, file e persistenza

- Express con API JSON ed export generati lato server.
- PDF reali tramite PDFKit, ZIP reali tramite Archiver e PNG reali tramite Sharp.
- Sanitizzazione SVG con DOMPurify/JSDOM; rifiuto di script, eventi e contenuti esterni attivi. PNG/JPEG verificati tramite magic bytes, non soltanto tramite MIME dichiarato.
- Store JSON in `data/area1.json`, migrazione non distruttiva allo schema 5, scrittura atomica e coda per aggiornamenti serializzati. Il controllo `expectedVersion` C10 è testato con due writer concorrenti.
- Calcoli monetari in centesimi e aggregazione ordini deduplicata per ID.
- Seed iniziale coerente in `server/seed.js`, `server/area3Seed.js`, `server/area4Seed.js` e `server/area5Seed.js`; i test non lasciano richieste, assegnazioni, certificati, preferenze, presenze, ordini, spedizioni o relazioni QA nel seed.

Per ripristinare il seed demo, arrestare il server, eliminare `data/area1.json` e riavviare. **Il reset elimina anche le sessioni Operations/Governance: le identità devono essere selezionate nuovamente.** Le suite E2E/Axe che modificano dati ripristinano automaticamente il file al termine, anche in caso di errore; per questo non devono essere eseguite contro una demo che altre persone stanno usando.

## Come vengono trattati oggi i dati inseriti

Il percorso tecnico non è una simulazione visiva:

1. l’utente compila un form o carica un file;
2. il client mostra stati di attesa, errore e blocco;
3. la API riceve la richiesta e applica validazioni lato server;
4. `updateDb` aggiorna lo store in una coda serializzata e con scrittura atomica;
5. la UI ricarica i dati persistenti; versioni, review e rettifiche restano nello storico;
6. gli export vengono generati dal server nei formati reali richiesti.

Questo dimostra il funzionamento **full-stack** del vertical slice. Non equivale ancora a un sistema pronto per dati reali o produzione multi-organizzazione.

### Cosa manca prima dei dati reali

- **Identità e accessi:** autenticazione tramite IdP, MFA reale, RBAC, segregazione dei revisori, tenancy e autorizzazione su ogni oggetto. Le Aree 1–3 usano dati demo senza login; le Aree 4 e 5 hanno broker di identità sintetiche e bearer sessioni con controlli server, ma non sono sistemi di autenticazione di produzione.
- **Persistenza:** database transazionale, migrazioni, vincoli, concorrenza multi-istanza e retention. Il JSON atomico è adatto alla demo locale, non a un deployment distribuito.
- **File:** object storage privato, quota per tenant, antivirus, normalizzazione/re-encoding dove appropriato, URL firmati e policy di retention. I loghi demo sono conservati come data URL nello store.
- **Sicurezza e compliance:** threat modeling, gestione segreti, rate limiting completo, logging sicuro, DPIA/ruoli privacy, backup cifrati e restore provato.
- **Audit e responsabilità:** identità reale dei revisori, timestamp affidabili, audit log append-only e procedura operativa di approvazione. Gli attori correnti sono esplicitamente demo.
- **SEO/pubblicazione:** SSR o pre-rendering per metadati social affidabili, canonical sul dominio definitivo e pipeline di pubblicazione controllata.

Per passare ai dati reali non bisogna modificare manualmente il JSON mentre il server è attivo. Il percorso corretto è introdurre un adapter di persistenza, migrare con mapping e controlli di integrità, collegare identità/tenancy e validare il flusso in staging prima di sostituire il seed.

## Design system

La direzione **Industrial Editorial** usa tipografia condensata, griglie nette, nero/bianco sporco, cobalto e volt. Font e immagini sono locali; la preview non richiede CDN. Il workspace mantiene lo stesso linguaggio della landing con componenti operativi densi, stati testuali, tre pannelli desktop e layout mobile con canvas C05 in evidenza.

## Verifiche

Con il server di sviluppo attivo:

```bash
npm test                 # 40 unit test: landing e regole Aree 1—5
npm run qa:visual        # regressioni landing desktop/mobile
npm run qa:a11y          # Axe landing
npm run qa:area1         # E2E full-stack C01—C04
npm run qa:area1:a11y    # Axe Area 1, dialog, pubbliche e mobile
npm run qa:area2         # E2E C05—C07, inviti, doppia review, export e mobile
npm run qa:area2:a11y    # Axe su 14 contesti Area 2
npm run qa:area3         # E2E C08—C09 su build 8787, export, revoca e sidebar
npm run qa:area3:a11y    # Axe su 15 contesti Area 3
npm run qa:area4         # E2E C10—C11, MFA, concorrenza, tenant, sala, export e mobile
npm run qa:area4:a11y    # Axe su 14 contesti Area 4
npm run qa:area5         # E2E C12—C16, sessioni stale, errori API/chunk, tenant e sidebar
npm run qa:area5:a11y    # Axe su 21 contesti Area 5
```

Le suite Area 3, Area 4 e Area 5 usano di default la build servita su `8787`; durante lo sviluppo è possibile impostare rispettivamente `AREA3_BASE`, `AREA4_BASE` o `AREA5_BASE` su `http://127.0.0.1:5173`. Eseguire `npm run build` prima del collaudo sulla 8787.

Prima esecuzione dei test browser:

```bash
npx playwright install chromium
npx playwright install-deps chromium
```

Gli screenshot sono salvati in `qa/`. Le suite che modificano dati devono essere eseguite sequenzialmente perché effettuano backup e ripristino dello stesso seed demo.

## Struttura

```text
src/
  App.jsx                         Landing e card collegate alle route
  data.js                         Contenuti, servizi e destinazioni Aree 1—5
  styles.css                      Design system landing
  workspace/
    WorkspaceApp.jsx              Router, shell, navigazione e notifiche
    Scope3Page.jsx                C01
    AttestationsPage.jsx          C02
    ReportsPage.jsx               C03
    PacksPage.jsx                 C04
    BrandKitPage.jsx              C05
    EditorialPage.jsx             C06
    PartnerRegistryPage.jsx       C07
    HospitalityPage.jsx           C08
    LearningPage.jsx              C09
    FundDirectionPage.jsx         C10
    BoardBriefingPage.jsx         C11
    BulkOrderPage.jsx             C12
    BenefitDashboardPage.jsx      C13
    TransparencyPublicPages.jsx   C14 registro e permalink pubblici
    LogisticsPlannerPage.jsx      C15
    SubcontractorNetworkPage.jsx  C16
    operations.jsx                Sessioni Operations, gate e download autorizzati
    RouteErrorBoundary.jsx        Fallback per errori rendering e chunk lazy
    governance.jsx                Sessione demo, RBAC UI e download autorizzati
    PublicPages.jsx               Verifiche pubbliche Area 1
    Area2PublicPages.jsx          Inviti, articoli e directory Partner
    Area3PublicPages.jsx          Verifica pubblica minimizzata attestati
    metadata.js                   SEO, canonical, robots e anteprime SVG
    ui.jsx                        Stati, dialog, export, timeline e hook API
    api.js                        Fetch, download e clipboard
    workspace.css                 UI operativa condivisa
    area2.css                     Componenti e responsive Area 2 + sidebar
    area3.css                     Componenti e responsive Area 3
    area4.css                     Componenti e responsive Area 4
    area5.css                     Componenti e responsive Area 5
server/
  index.js                        Express, API e statici di produzione
  area1Routes.js                  Endpoint C01—C04 e pubblici
  area2Routes.js                  Endpoint C05—C07 e pubblici
  area2Utils.js                   Slug, sanitizzazione, contrasto e asset
  area3Routes.js                  Endpoint C08—C09 e verifica attestati
  area3Utils.js                   Quote, disponibilità, quiz e minimizzazione
  area3Seed.js                    Strutture, corso, assegnazioni e certificato demo
  area4Routes.js                  Endpoint protetti C10—C11
  area4Utils.js                   Quote, cutoff, inviti, presenze e consensi
  area4Seed.js                    Identità, finestre Fondo e briefing demo
  area5Routes.js                  Endpoint C12—C16 e registro pubblico
  area5Utils.js                   Quote, ledger, soglie, CSV e regole filiera
  area5Seed.js                    Operations, ordini, entitlement, piani e relazioni demo
  calculations.js                 Regole di calcolo e completezza
  documents.js                    PDF e ZIP
  seed.js                         Dati sintetici iniziali, schema 5
  store.js                        Persistenza JSON atomica e migrazione
scripts/                          Unit, E2E e audit Axe
DESIGN.md                         Direzione visiva
SKILL.md                          Specifica funzionale delle componenti
```
