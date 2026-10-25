# Skill: Sibillini Impact — Digital Service Components Generator

## 1. Metadata & Scope

- **Skill Name:** `sibillini-digital-service-components`
- **Version:** `1.1.0` — hardening sessioni demo, resilienza route pubbliche e isolamento QA
- **Parent Skill:** `sibillini-enterprise-services-landing@2.0.0`
- **Target Role:** Senior Full-Stack Engineer, B2B Product Architect, UX Engineer e Accessibility Specialist
- **Primary Objective:** guidare l’implementazione delle componenti web attivate quando l’utente clicca su un servizio digitale della landing Sibillini Impact.
- **Design Reference:** `DESIGN.md` del progetto. La direzione resta **Industrial Editorial**, ma nelle aree operative privilegia densità informativa, leggibilità, velocità e gestione degli stati.
- **Output atteso:** applicazioni web responsive, accessibili, multi-tenant e integrate in un’unica area riservata; non semplici modali informative o mockup non funzionanti.

### 1.1 Regola fondamentale

L’agente deve distinguere:

1. **Digitale end-to-end:** input, lavorazione, erogazione, verifica e conservazione dell’output avvengono online.
2. **Piattaforma digitale con fulfilment esterno:** il servizio software è interamente online; beni o attività fisiche successive, come consegna delle calzature o pernottamento, restano fuori dal componente e sono rappresentati solo tramite stato e conferme.
3. **Servizio fisico o ibrido:** il beneficio principale richiede presenza, evento, soggiorno, ritiro o attività sul campo. Non deve essere spacciato per servizio completamente digitale.

Tutti gli output documentali, editoriali e di rendicontazione devono essere **digitali**, versionati e verificabili. Le API interne dell’applicazione e gli export standard sono ammessi; non sono richieste integrazioni gestionali proprietarie.

### 1.2 Principi non negoziabili

- Ogni clic deve portare a una destinazione utile: **anteprima pubblica, workspace autenticato, stato bloccato motivato oppure richiesta di attivazione**.
- Non mostrare pulsanti finti, download simulati, disponibilità inventate o stati “verificato” non supportati da dati reali.
- Separare sempre **diritto all’anteprima** da **diritto all’uso** e da **stato di verifica della Startup**.
- La configurazione Standard e gli incrementi delle Varianti devono restare distinti anche nei permessi e nella contabilità dei benefit.
- Il valore di un documento nasce da dati, revisione e terzietà, non da timbri grafici o linguaggio ufficiale generico.
- La produzione usa esclusivamente dati confermati; il simulatore pubblico resta illustrativo e non modifica automaticamente contratti o devoluzioni.

---

## 2. Analisi dei 29 servizi e perimetro digitale

Legenda:

- **D** = servizio digitale end-to-end.
- **P** = piattaforma digitale; il fulfilment fisico successivo è esterno al componente.
- **L** = servizio live erogabile integralmente online, con personale umano in video sessione.
- **X** = escluso da questa Skill perché il beneficio principale è fisico o ibrido.

### Area 1 — Compliance ESG e Catena di Fornitura

| Servizio | Classe | Componente |
|---|---:|---|
| Dossier Tecnico Scope 3 | D | C01 — Scope 3 Data Hub |
| Attestazione di Devoluzione Territoriale | D | C02 — Fund Attestation & Audit Trail |
| Rendicontazione di Impatto Sociale Area Sisma | D | C03 — Impact Report Composer |
| Documentazione per Rating ESG Bancario | D | C04 — Assurance & Bank Pack Studio |
| Audit Tecnico-Valoriale in sede/cantiere | X | Attività sul campo; la sola prenotazione online non la rende digitale |
| 1.A Fascicolo Ready for Assurance | D | C04 — Assurance & Bank Pack Studio |
| 1.B Cantiere Etico Integrato | D | C03 — Impact Report Composer |
| 1.C Trasparenza per Enti Paritetici e Casse Edili | D | C03 — Impact Report Composer |

### Area 2 — Visibilità Organica, Relazioni Istituzionali e Filiera

| Servizio | Classe | Componente |
|---|---:|---|
| Kit Digital Co-Branding | D | C05 — Co-Brand Asset Studio |
| Scheda Editoriale e Case History | D | C06 — Editorial & Executive CMS |
| 2.A Registro Partner della Ricostruzione | D | C07 — Public Partner Registry |
| 2.B Kit per la Catena dei Subappalti | D | C05 — Co-Brand Asset Studio, con distribuzione tramite C16 |
| 2.C Sintesi Monografica per Stakeholder | D | C03 — Impact Report Composer |

### Area 3 — Welfare, Gestione Operativa e Circolarità

| Servizio | Classe | Componente |
|---|---:|---|
| 5 VIP Pass Eventi Culturali | X | Evento fisico; il pass è solo la rappresentazione digitale del benefit |
| Portale Ospitalità Convenzionata | P | C08 — Hospitality Booking Hub; il soggiorno è fulfilment esterno |
| Welfare Proporzionale | X | Benefit legato a manifestazioni fisiche; visibile in C13 senza diventare servizio digitale autonomo |
| 3.A Crediti Soggiorno per famiglie | X | Conversione e pernottamento sono un flusso ibrido; non incluso nel perimetro puro |
| 3.B Recupero e Riciclo Fine Vita | X | Ritiro e trasformazione materiale sono attività fisiche |
| 3.C Modulo Formativo Ergonomia e Sicurezza | D | C09 — E-Learning & Digital Certificates |

### Area 4 — Governance e Partecipazione Istituzionale

| Servizio | Classe | Componente |
|---|---:|---|
| Tavolo Istituzionale CSR | X | Forum e Summit presuppongono partecipazione istituzionale/live non esclusivamente online |
| Ospitalità Totale Spesata | X | Pernottamento fisico |
| Executive Page Indicizzata | D | C06 — Editorial & Executive CMS |
| 4.A Diritto di Indirizzo Territoriale | D | C10 — Fund Direction Console |
| 4.B Aggiornamento Normativo Board | L | C11 — Board Briefing Room; digitale solo se l’intera sessione è online |

### Area 5 — Servizi Digitali e Piattaforma Operativa

| Servizio | Classe | Componente |
|---|---:|---|
| Bulk Order Portal | P | C12 — Bulk Order Portal; consegna delle calzature esterna |
| Dashboard Soglie e Benefit | D | C13 — Benefit & Threshold Dashboard |
| Registro Pubblico Trasparente | D | C14 — Public Transparency Register |
| 5.A Portale Logistico Multi-Cantiere | P | C15 — Multi-Site Logistics Planner; spedizione fisica esterna |
| 5.B Accordo Quadro per Subappaltatori | D | C16 — Subcontractor Network Console |

**Risultato:** 22 servizi digitali o con piattaforma digitale dedicata, ricondotti a 16 componenti; 7 servizi esclusi perché prevalentemente fisici o ibridi.

---

## 3. Architettura del clic e Service Registry

### 3.1 Catalogo dichiarativo

Ogni card della landing deve riferirsi a un `serviceId` stabile, non a logica condizionale dispersa nei componenti grafici.

```ts
type ServiceDefinition = {
  serviceId: string;
  componentId: 'C01' | 'C02' | 'C03' | 'C04' | 'C05' | 'C06' | 'C07' | 'C08' |
    'C09' | 'C10' | 'C11' | 'C12' | 'C13' | 'C14' | 'C15' | 'C16';
  track: 'STANDARD' | 'VARIANT';
  requiredPairs?: 10 | 25 | 50 | 100;
  access: 'PUBLIC' | 'AUTHENTICATED' | 'BOARD_ONLY' | 'STARTUP_REVIEW';
  route: string;
  previewRoute?: string;
  requiresActiveContract: boolean;
};
```

Il backend resta l’autorità su entitlement e soglie. Il client può mostrare una previsione, ma non concedere accessi.

### 3.2 Risoluzione del clic

1. **Lettura definizione:** identificare componente, percorso, ruolo e soglia.
2. **Servizio pubblico:** aprire direttamente la route, con SEO e deep link funzionanti.
3. **Servizio privato senza sessione:** mostrare anteprima essenziale e login con `returnTo` sicuro.
4. **Soglia non raggiunta:** mostrare volume attuale, volume richiesto, ordini idonei e azione per colmare il gap.
5. **Variante non contrattualizzata:** mostrare contenuto dimostrativo chiaramente etichettato e CTA “Richiedi attivazione”; non attivare il servizio con un semplice toggle.
6. **Servizio disponibile:** aprire il workspace nel contesto corretto di organizzazione e cantiere.
7. **Completamento:** salvare una voce nella cronologia e suggerire la prossima azione, senza reindirizzamenti forzati.

### 3.3 Stati comuni

Tutti i componenti devono progettare esplicitamente:

`PREVIEW` · `LOCKED_THRESHOLD` · `ACTIVATION_REQUIRED` · `DRAFT` · `PENDING_REVIEW` · `ACTIVE` · `VERIFIED` · `REJECTED_WITH_REASON` · `EXPIRED` · `ARCHIVED` · `ERROR_RETRYABLE`

Lo stato vuoto deve spiegare **perché è vuoto e quale azione lo modifica**. Skeleton e spinner non devono sostituire il messaggio di errore.

`ERROR_RETRYABLE` comprende anche API non raggiungibile, sessione non più riconosciuta e chunk lazy non disponibile. **Nessuno di questi stati può produrre una schermata bianca:** conservare shell e navigazione, offrire Riprova/Ricarica e non modificare i dati server durante il recupero.

Per una sessione privata non più valida, rimuovere il token locale stale e riaprire la selezione dell’identità con una spiegazione; non continuare a mostrare ruolo o organizzazione come se fossero attivi. Una route pubblica non deve ereditare questo blocco.

### 3.4 Pattern di navigazione

- **Drawer laterale** solo per anteprima, stato entitlement e breve spiegazione.
- **Pagina dedicata** per qualsiasi attività con input, tabelle, documenti o transazioni.
- **Dialog di conferma** solo per azioni irreversibili o legalmente rilevanti.
- Deep link, pulsante indietro, cronologia e focus devono funzionare correttamente.
- Dopo login o attivazione, ripristinare route, organizzazione, cantiere e bozza non sensibile.

---

## 4. Architettura tecnica condivisa

### 4.1 Applicazione e moduli

- Conservare la landing React/Vite e caricare i workspace con **route lazy-loaded**.
- Proteggere ogni route lazy con un error boundary e reset alla navigazione. Dopo deploy, rebuild o ripristino del workspace, un manifest/chunk stale deve offrire una ricarica completa senza smontare l’intera SPA.
- Introdurre un application shell con contesto `organizationId`, `siteId`, ruolo, entitlement e stato contrattuale.
- Usare un backend con API documentate, database transazionale, object storage privato e coda per export, notifiche ed elaborazioni lente.
- Gli URL dei documenti privati devono essere firmati, brevi e generati solo dopo controllo autorizzativo.
- Non mettere segreti, token di storage o credenziali video nel bundle frontend.

### 4.2 Multi-tenancy e ruoli

Ruoli minimi:

- `ORG_ADMIN`: gestione organizzazione, utenti e contratti.
- `PROCUREMENT`: ordini, logistica, filiera e report operativi.
- `RSPP`: dataset prodotto, formazione e sicurezza.
- `ESG_MANAGER`: dati, evidenze, report e pacchetti di revisione.
- `HR_WELFARE`: ospitalità, benefit e formazione nei limiti del ruolo.
- `BOARD`: governance, preferenze vincolanti e briefing riservati.
- `SITE_MANAGER`: solo cantieri assegnati e fabbisogni/taglie.
- `SUBCONTRACTOR`: propri dati, ordini, soglie e kit; mai dati riservati del General Contractor.
- `STARTUP_REVIEWER`: revisione, pubblicazione e asseverazione nei propri ambiti.
- `PUBLIC`: soli contenuti esplicitamente pubblicati.

Ogni query deve applicare il filtro tenant lato server. Nascondere un bottone non è un controllo di sicurezza.

Per le identità demo, il token browser è solo un riferimento: la sessione server, la sua scadenza e l’abilitazione del membro restano autorevoli. Scadenza, revoca, reset o restore possono invalidarlo; il semplice riavvio con persistenza invariata no. Il recupero richiede una nuova selezione/login esplicita, mai accettare ruolo o tenant dal solo payload del browser. In produzione il broker demo deve essere sostituito da IdP, autenticazione reale e gestione sessioni appropriata.

### 4.3 Entità condivise

`Organization`, `Membership`, `Site`, `Product`, `Order`, `OrderItem`, `ThresholdLedger`, `ServiceEntitlement`, `FundTransfer`, `EvidenceDocument`, `Report`, `AssetKit`, `EditorialPage`, `RegistryEntry`, `CourseEnrollment`, `GovernancePreference`, `BriefingSession`, `Booking`, `SubcontractorLink`, `AuditEvent`.

Regole:

- Denaro in centesimi interi o tipo decimale equivalente; mai floating point per la contabilità.
- Date in UTC, visualizzazione nel fuso Europe/Rome quando rilevante.
- Ogni documento ha `version`, `createdAt`, `createdBy`, `reviewStatus`, `contentHash` e riferimenti alle fonti.
- Le metriche di CO₂ conservano unità, metodo, anno e versione del fattore.
- Le soglie nascono da un ledger di ordini idonei, non da un campo modificabile manualmente.

### 4.4 Regole contabili e di aggregazione

- Carrelli e bozze non incrementano volumi o Fondo.
- Ordini annullati, rimborsati o duplicati generano movimenti di rettifica, non cancellazioni silenti.
- Un ordine del subappaltatore alimenta la soglia individuale e quella del cantiere senza essere contato due volte nello stesso aggregato.
- EaaS applica la devoluzione contrattuale prevista; il selettore 10–50% del simulatore non altera la regola produzione.
- Gli incrementi delle Varianti sono separati dalla base Standard e vengono attivati solo da entitlement effettivo.

### 4.5 Sicurezza, privacy e fiducia

- MFA obbligatoria per Board e Startup Reviewer; disponibile per tutti gli amministratori.
- Controlli anti CSRF/XSS, rate limiting, validazione server, logging degli accessi sensibili e cifratura dei dati.
- Upload con limite dimensione, scansione malware, whitelist MIME e sanitizzazione SVG.
- Dati dipendente minimizzati: per taglie e fabbisogni preferire aggregati; non raccogliere nomi se non indispensabili.
- Consensi e finalità distinti per pubblicazione registro, editoriali, video e dati familiari.
- Conservazione, revoca ed export devono rispettare finalità e accordi contrattuali.
- Non definire “firmato”, “asseverato” o “verificato” un output solo perché possiede un QR, un hash o un badge grafico.

---

## 5. Design system operativo

### 5.1 Linguaggio visivo

- Riutilizzare Ink, Paper, Cobalt e Volt, Barlow Condensed e Inter già definiti in `DESIGN.md`.
- Il marketing usa grandi titoli; il workspace usa titoli 32–48px, corpo 14–16px e tabelle dense ma respirabili.
- Volt identifica azioni o moduli potenziati; Cobalt identifica azione primaria e dati tecnici; nessuno stato dipende solo dal colore.
- Niente glassmorphism, ombre decorative o animazioni che ritardino un compito.

### 5.2 Shell desktop e mobile

Desktop:

- Header con organizzazione, cantiere, ruolo e stato account.
- Sidebar con “Panoramica, Documenti, Report, Ordini, Cantieri, Filiera, Formazione, Governance”.
- Area centrale a 12 colonne; pannello contestuale destro solo per riepiloghi e controlli.

Mobile:

- Navigazione compatta, filtri in drawer, CTA principale sticky solo se non copre contenuti.
- Tabelle trasformate in schede oppure scroll locale con prima colonna identificabile.
- Moduli a colonna singola e stepper per flussi lunghi.

### 5.3 Componenti comuni

`ServiceStatusBadge`, `EntitlementBanner`, `EvidenceStatus`, `DocumentVersionList`, `ReviewTimeline`, `ExportMenu`, `ShareLinkDialog`, `OrganizationSwitcher`, `SiteSelector`, `EmptyState`, `ErrorState`, `AuditTrailTable`, `ConfirmActionDialog`.

Focus visibile, target minimo 44px, navigazione tastiera, annunci live per completamenti ed errori, nessuna dipendenza da hover. Obiettivo minimo WCAG 2.2 AA.

---

## 6. Specifiche dei 16 componenti

### 6.1 Route e livelli di accesso

| ID | Route operativa | Accesso e anteprima |
|---|---|---|
| C01 | `/app/esg/scope-3` | ESG/RSPP autenticati; metodologia generale pubblica |
| C02 | `/app/fondo/attestazioni` | Tenant autenticato; verifica limitata su `/verifica/fondo/:token` |
| C03 | `/app/report` | Autenticato per ruolo; revisione Startup obbligatoria |
| C04 | `/app/evidence-packs` | ESG/CFO/Board autorizzati; condivisione read-only temporanea |
| C05 | `/app/brand-kit` | Org Admin/marketing e subappaltatori delegati |
| C06 | `/app/editoriale` | Redazione e impresa autorizzata; output pubblici su `/case-history/:slug` e `/best-practice/:slug` |
| C07 | `/partner` | Registro pubblico; gestione su `/app/registro-partner` |
| C08 | `/app/ospitalita` | HR e utenti abilitati; dettaglio condizioni visibile prima della richiesta |
| C09 | `/app/formazione/ergonomia` | Discenti assegnati; verifica attestato pubblica e minimizzata |
| C10 | `/app/governance/indirizzo-fondo` | Board autenticato con MFA |
| C11 | `/app/governance/briefing` | Solo Board invitato e relatori Startup |
| C12 | `/app/ordini` | Procurement autenticato; catalogo generale opzionalmente pubblico |
| C13 | `/app/dashboard` | Tutti i ruoli autenticati con viste differenziate |
| C14 | `/trasparenza` | Pubblico, indicizzabile e read-only |
| C15 | `/app/logistica` | Procurement e Site Manager sui cantieri assegnati |
| C16 | `/app/filiera` | General Contractor e subappaltatore nel proprio perimetro |

Le route pubbliche non devono includere identificativi sequenziali di documenti privati. Le route private devono essere inserite nel flusso `returnTo` dopo autenticazione e cambio organizzazione.

### C01 — Scope 3 Data Hub

**Servizio coperto:** Dossier Tecnico Scope 3.

**Funzione d’uso.** Permette a ESG Manager e RSPP di trovare il dato ambientale corretto per modello e lotto, comprenderne perimetro e versione e riutilizzarlo nel reporting senza copiare numeri da documenti non strutturati. Il fattore illustrativo di 4,25 kg per paio del simulatore non deve essere confuso con il valore LCA ufficiale del prodotto.

**Attributi tecnici.** Modello e lotto, unità funzionale, confini del sistema, fattori di emissione, kgCO₂e, anno di riferimento, metodologia, fonte, stato verifica, versione dataset, validità e hash. Export CSV e documento digitale con manifest dei metadati. Dataset immutabile dopo verifica: le correzioni creano una nuova versione. Accesso pubblico solo a una scheda metodologica generale; dati riservati dietro autenticazione.

**Percorso utente.** Clic sulla card → selezione organizzazione/modello → scheda dataset → confronto tra versioni → verifica metodo e fonti → export → registrazione del download nella cronologia.

**Design.** Header con modello e stato; KPI numerici solo dopo il contesto unitario; tabella dei fattori; accordion metodologico; timeline versioni; barra export sempre raggiungibile. Su mobile, KPI impilati e tabelle convertite in definizioni.

**Done se.** Ogni valore mostra unità/fonte/versione; gli export riproducono esattamente il dataset; nessun valore simulato viene etichettato come dato ufficiale.

### C02 — Fund Attestation & Audit Trail

**Servizio coperto:** Attestazione di Devoluzione Territoriale.

**Funzione d’uso.** Consente di dimostrare quanto è stato versato, su quale fornitura, con quale regola e in quale stato di verifica della Startup. La verifica pubblica deve confermare autenticità e integrità senza rivelare dati commerciali riservati.

**Attributi tecnici.** Ordine, organizzazione, importo imponibile della fornitura, aliquota applicata, quota per paio, numero paia, Fondo generato, riferimento versamento mascherato, data, stato, attestazione collegata, revisione Startup e audit trail append-only. Export digitale e link di verifica con identificativo non indovinabile. Nessuna rappresentazione come registrazione notarile o firma qualificata se non esiste il relativo servizio.

**Percorso utente.** Clic → elenco attestazioni filtrabile → dettaglio ordine/Fondo → controllo riconciliazione → apertura audit trail → export oppure condivisione del link pubblico limitato.

**Design.** Layout “documento + evidenze”: riepilogo in alto, formula nel centro, movimenti in tabella, timeline di revisione a destra. La vista pubblica contiene solo esito, identificativo, data e progetto collegato.

**Done se.** Totale e quota sono riconciliati con l’ordine; ogni modifica è tracciata; il link pubblico non espone importi o dati non autorizzati.

### C03 — Impact Report Composer

**Servizi coperti:** Rendicontazione Area Sisma, Cantiere Etico Integrato, relazione per Enti Paritetici/Casse Edili e Sintesi Monografica Stakeholder.

**Funzione d’uso.** Trasforma dati approvati in quattro output distinti, evitando che un unico report generico venga riutilizzato per finalità diverse. Il report di cantiere aggrega General Contractor e subappaltatori; la sintesi stakeholder resta entro due pagine digitali; la relazione CPT privilegia benessere, sicurezza e condizioni dei lavoratori.

**Attributi tecnici.** Motore template, scelta perimetro organizzazione/cantiere/periodo, dataset versionati, evidenze collegate, testi narrativi modificabili solo nei campi autorizzati, stati bozza/revisione/pubblicato, commenti di revisione e diff tra versioni. Deduplica degli ordini e regole di consenso per i subappaltatori. Export digitale con indice delle fonti e manifest.

**Percorso utente.** Clic sul tipo di report → scelta template e perimetro → anteprima dati → integrazione dei campi consentiti → invio alla Startup → gestione osservazioni → pubblicazione/export/condivisione.

**Design.** Outline a sinistra, anteprima centrale, pannello evidenze a destra. La sintesi mostra contatore pagine e contenuto in overflow. Su mobile il flusso diventa stepper: perimetro, dati, testo, revisione, output.

**Done se.** I quattro template non sono intercambiabili per errore; nessun ordine è contato due volte; la sintesi rispetta due pagine; la pubblicazione richiede revisione Startup.

### C04 — Assurance & Bank Pack Studio

**Servizi coperti:** Documentazione Rating ESG Bancario e Fascicolo Ready for Assurance.

**Funzione d’uso.** Prepara due pacchetti con finalità differenti: sintesi per l’istituto di credito e fascicolo probatorio per il revisore. Il sistema deve segnalare lacune e non promettere rating, credito agevolato o esito dell’attestazione.

**Attributi tecnici.** Checklist configurabile, evidenze bancarie, audit trail, fattori di emissione, riferimenti ISAE 3000, controlli completezza, documenti mancanti/scaduti, owner per ogni integrazione, review Startup, export con indice e link read-only a scadenza. Log di visualizzazioni e revoca immediata dei link.

**Percorso utente.** Selezione “Banca” o “Assurance” → punteggio di completezza → risoluzione documenti mancanti → controllo incrociato → revisione → esportazione o condivisione temporanea.

**Design.** Due tab molto distinti, checklist centrale, stato completezza non presentato come “punteggio ESG”, anteprima indice e pannello attività. Le lacune usano testo e icona, non solo rosso.

**Done se.** Ogni evidenza è tracciabile alla fonte; uno stato incompleto non può diventare “Ready”; i link scadono e sono revocabili; le due tipologie hanno checklist differenti.

### C05 — Co-Brand Asset Studio

**Servizi coperti:** Kit Digital Co-Branding e Kit per la Catena dei Subappalti.

**Funzione d’uso.** Genera badge, testi approvati e infografiche digitali coerenti con progetto e impresa. Per il General Contractor aggiunge distribuzione controllata ai subappaltatori, che possono usare il kit con la propria identità senza accedere a dati riservati del committente.

**Attributi tecnici.** Denominazione approvata, logo, template, varianti colore, testi versionati, formati SVG/PNG, controlli contrasto e area di sicurezza, sanitizzazione SVG, anteprima e archivio generazioni. Inviti a subappaltatori tramite C16, stato accettazione e revoca. La Partita IVA non è considerata verificata solo perché formalmente valida.

**Percorso utente.** Clic → caricamento/selezione logo → anteprima asset → controllo testo e contrasto → generazione → download oppure invito alla filiera → monitoraggio adozione.

**Design.** Form a sinistra, canvas centrale, asset e formati a destra. Il kit condiviso mostra chiaramente “General Contractor” e “Subappaltatore” senza confondere i loghi. Mobile con anteprima prima delle opzioni avanzate.

**Done se.** File malevoli sono rifiutati; i testi bloccati non sono alterabili; ogni organizzazione vede solo il proprio kit; gli asset rispettano contrasto e leggibilità.

### C06 — Editorial & Executive CMS

**Servizi coperti:** Case History sul portale ed Executive Page indicizzata.

**Funzione d’uso.** Gestisce contenuti editoriali indipendenti, permanenti e indicizzabili. La Case History documenta un impegno; l’Executive Page analizza buone pratiche e ha maggiore profondità istituzionale. La verifica aziendale riguarda i fatti, non l’indipendenza del giudizio della Startup.

**Attributi tecnici.** CMS con bozze, autore, revisore, slug, canonical, metadati social, immagini locali ottimizzate, dati collegati, stato pubblicazione, correzioni e archivio. Anteprime private noindex; pubblicazione solo dopo doppia approvazione fattuale e editoriale. Nessun meccanismo di posizionamento a pagamento.

**Percorso utente.** Richiesta dalla card → raccolta dati online → bozza Startup → verifica fatti da parte dell’impresa → revisione finale → pubblicazione → condivisione URL → eventuali aggiornamenti versionati.

**Design.** Editor con anteprima pubblica e pannello fonti; front-end editoriale con grande immagine, dati essenziali, narrativa e progetti collegati. URL permanente e pagina leggibile senza JavaScript dove possibile.

**Done se.** SEO e canonical sono corretti; nessuna bozza è indicizzabile; le affermazioni numeriche hanno fonte; gli aggiornamenti conservano storico e data di revisione.

### C07 — Public Partner Registry

**Servizio coperto:** Registro dei Partner della Ricostruzione dei Borghi.

**Funzione d’uso.** Rende reperibili le imprese registrate e il loro collegamento con municipalità e progetti. Il registro non deve diventare una classifica reputazionale automatica o una vetrina basata sul volume speso.

**Attributi tecnici.** Organizzazione, consenso alla pubblicazione, municipalità collegate, data di iscrizione, stato verifica, progetti pubblici e riferimento alle evidenze pubblicabili. Filtri per territorio e stato, pagina dettaglio, procedura di rettifica e rimozione. Esporre la Partita IVA solo se necessario e autorizzato.

**Percorso utente.** Clic pubblico → ricerca/filtro → scheda impresa → progetti collegati → verifica dello stato → eventuale richiesta di rettifica autenticata.

**Design.** Directory con filtri superiori, risultati in tabella desktop e card mobile, badge testuale di verifica e dati ultimo aggiornamento. Una mappa è opzionale e non deve rendere il registro inutilizzabile senza rete esterna.

**Done se.** Solo soggetti approvati sono pubblici; filtri accessibili da tastiera; nessun dato privato compare; rettifiche e rimozioni sono tracciate.

### C08 — Hospitality Booking Hub

**Servizio coperto:** Portale Ospitalità Convenzionata. Il pernottamento resta fulfilment esterno.

**Funzione d’uso.** Consente a HR e dipendenti autorizzati di trovare strutture partner, comprendere tariffa e condizioni e inviare una prenotazione o richiesta di disponibilità. Se non esiste inventario live, il sistema deve usare sempre “richiesta”, mai “prenotazione confermata”.

**Attributi tecnici.** Strutture, camere, date, ospiti, tariffe convenzionate, supplementi, policy cancellazione, disponibilità e relativo timestamp, richieste, conferme, cancellazioni e consensi. Prezzi con valuta e tasse esplicite. Integrazione calendario opzionale; dati familiari ridotti al necessario.

**Percorso utente.** Login → ricerca per borgo/date/ospiti → scheda struttura → verifica tariffa e policy → richiesta o prenotazione → conferma digitale → gestione da area personale.

**Design.** Ricerca prominente, card con fotografie locali, prezzo e disponibilità non ambigui, riepilogo sticky prima della conferma. Su mobile il riepilogo diventa bottom sheet accessibile.

**Done se.** Nessuna doppia conferma; tariffa finale e condizioni sono visibili prima dell’invio; disponibilità non aggiornata è marcata; ogni operazione produce ricevuta digitale.

### C09 — E-Learning & Digital Certificates

**Servizio coperto:** Modulo Formativo Asseverato su Ergonomia e Sicurezza.

**Funzione d’uso.** Eroga un’ora di formazione asincrona a preposti e capicantiere, verifica la partecipazione e produce un attestato nominale digitale integrabile nel fascicolo formativo. “Asseverato” non implica automaticamente accreditamento legale: il sistema mostra l’ente e il criterio di verifica effettivi.

**Attributi tecnici.** Capitoli, durata effettiva, video accessibili, sottotitoli, trascrizione, quiz con banca domande, ripresa progresso, tentativi, soglia superamento configurabile, identità del discente, log eventi, attestato con codice di verifica e revoca. Non usare il semplice tempo di riproduzione come unica prova di apprendimento.

**Percorso utente.** Assegnazione da HR/RSPP → accettazione → capitoli → quiz intermedi → test finale → eventuale ripetizione → attestato → verifica pubblica limitata.

**Design.** Player con indice capitoli, progresso e trascrizione; quiz a una domanda per schermata su mobile; dashboard assegnazioni con stato non iniziato/in corso/completato/scaduto.

**Done se.** Progresso e test persistono; sottotitoli e tastiera sono completi; l’attestato nasce solo da completamento reale; la verifica pubblica non espone altri dati del discente.

### C10 — Fund Direction Console

**Servizio coperto:** Diritto di Indirizzo Territoriale del Fondo.

**Funzione d’uso.** Permette al Board di esprimere la preferenza vincolante prevista sul comune o sulla tipologia di opera sociale, con identità, tempi e conseguenze espliciti. Non è un semplice sondaggio né un voto anonimo.

**Attributi tecnici.** Opzioni ammesse, quota indirizzabile, finestra decisionale, membri Board autorizzati, MFA, dichiarazione di conflitto di interessi, conferma forte, audit log, ricevuta e stato di attuazione. Una preferenza vincolante diventa immutabile alla scadenza; modifiche precedenti richiedono permessi e storico completo.

**Percorso utente.** Accesso Board → revisione quota e opzioni → dettaglio comune/opera → selezione → riepilogo delle conseguenze → MFA e conferma → ricevuta digitale → monitoraggio stato.

**Design.** Tabella decisionale con schede comparabili, pannello laterale con quota e scadenza, dialog finale con formulazione non ambigua. Niente slider o gesti accidentali per azioni vincolanti.

**Done se.** Solo Board autorizzato conferma; ogni passaggio è auditabile; dopo il cutoff non esiste modifica client o API; la ricevuta riporta esattamente scelta e versione delle regole.

### C11 — Board Briefing Room

**Servizio coperto:** Sessione riservata di Aggiornamento Normativo per il Board, quando erogata online.

**Funzione d’uso.** Gestisce invito, preparazione, partecipazione e follow-up di un briefing annuale di due ore con analisti della Startup. Il componente non deve trasformarsi in una piattaforma video generalista: può orchestrare un provider sicuro mantenendo identità e permessi nel portale.

**Attributi tecnici.** Agenda, fuso orario, inviti nominativi, pre-read digitali, link generato dal backend, sala d’attesa, ruoli relatore/partecipante, domande, presenze effettive e sintesi post-sessione. Registrazione disattivata di default e attivabile solo con consenso informato.

**Percorso utente.** Invito → accettazione e verifica identità → agenda/pre-read → ingresso nella sala → sessione live → domande → materiali finali e sintesi.

**Design.** Lobby con data, countdown, agenda e controllo dispositivo; durante la sessione il portale conserva agenda e note senza coprire il video; follow-up con punti decisionali e riferimenti.

**Done se.** Link non indicizzati né condivisibili anonimamente; solo invitati entrano; presenze non inventate; nessuna registrazione parte senza consenso esplicito.

### C12 — Bulk Order Portal

**Servizio coperto:** Bulk Order Portal. La consegna delle calzature resta fulfilment esterno.

**Funzione d’uso.** Permette acquisti massivi e ricorrenti con prezzo, devoluzione, soglie e riepilogo trasparenti. Deve ridurre errori e duplicati, non replicare un ecommerce consumer basato su stimoli promozionali.

**Attributi tecnici.** Catalogo, varianti modello/taglia, disponibilità aggiornata, listino contrattuale, prezzo base quando applicabile, quantità, ricorrenza, indirizzi, ordine idempotente, stato pagamento/conferma, devoluzione e ricevuta. Il carrello non cambia i ledger. Se il pagamento non è integrato, il risultato è “ordine inviato”, mai “pagato”.

**Percorso utente.** Login Procurement → catalogo o matrice taglie → carrello → indirizzo/ricorrenza → revisione importi e devoluzione → conferma → ricevuta → tracking in dashboard.

**Design.** Tabella taglie/quantità, riepilogo laterale con totale, quota Fondo e soglie, conferma in due passaggi. Mobile con immissione per modello e riepilogo collapsible.

**Done se.** Prezzi e calcoli sono server-side; doppio clic non duplica ordini; stock incerto è segnalato; ogni stato ha significato coerente tra portale e dashboard.

### C13 — Benefit & Threshold Dashboard

**Servizio coperto:** Dashboard Soglie e Benefit.

**Funzione d’uso.** È il centro operativo che mostra volumi idonei, soglie 10/25/50/100, servizi Standard, incrementi Varianti e azioni disponibili. Può rappresentare digitalmente pass o benefit fisici senza dichiararli servizi digitali end-to-end.

**Attributi tecnici.** Ledger volumi, entitlement, progresso soglia, stato servizio, scadenze, download voucher quando previsti, cronologia attivazioni e notifiche. Viste differenti per Procurement, HR, Board e subappaltatore. Aggiornamento event-driven dopo conferma/rettifica ordine.

**Percorso utente.** Login → panoramica → selezione cantiere/organizzazione → apertura soglia → attivazione servizio → download o route al componente → cronologia.

**Design.** KPI sintetici, pipeline orizzontale desktop e verticale mobile, “Azioni richieste” prima delle metriche secondarie. Ogni card mostra stato e prossima azione, non solo il nome del benefit.

**Done se.** Dashboard e ledger coincidono; un ordine rettificato aggiorna anche benefit e report; nessun subappaltatore vede volumi privati di altri; ogni stato ha testo accessibile.

### C14 — Public Transparency Register

**Servizio coperto:** Registro Pubblico Trasparente.

**Funzione d’uso.** Mostra fondi complessivi e progetti finanziati nei borghi, con dati aggregati e ultimo aggiornamento. Deve consentire scrutinio pubblico senza esporre dati personali o condizioni commerciali riservate.

**Attributi tecnici.** Dataset pubblico derivato da dati approvati, aggregazioni, progetto, borgo, importo pubblicabile, stato, data, ultimo aggiornamento, fonti e rettifiche. Endpoint read-only, cache breve, export CSV pubblico e riconciliazione periodica con C02. La route è indipendente dalle sessioni Operations, mantiene sidebar/breadcrumb del workspace e prevede errore API recuperabile ed error boundary per il chunk lazy.

**Percorso utente.** Clic pubblico → KPI aggregati → filtro territorio/progetto → dettaglio → fonti pubbliche → export → ritorno al progetto tramite permalink.

**Design.** Grandi numeri seguiti da tabella e progetti; grafici solo con equivalente tabellare; indicazione “aggiornato al” invece di un generico “tempo reale” se esiste latenza.

**Done se.** Aggregati riconciliano con il registro interno; rettifiche restano visibili; nessun dato privato entra nel dataset; permalink e filtri sono accessibili; registro e dettaglio funzionano senza identità; indisponibilità API o chunk non producono mai una schermata bianca e offrono recupero verificato.

### C15 — Multi-Site Logistics Planner

**Servizio coperto:** Portale Logistico Multi-Cantiere e Taglie. La spedizione resta fulfilment esterno.

**Funzione d’uso.** Permette a Procurement e capicantiere di raccogliere fabbisogni e taglie per sito, validarli e generare un piano di spedizione frazionata. L’obiettivo è eliminare passaggi manuali e magazzino interno solo dove il servizio è effettivamente attivo.

**Attributi tecnici.** Siti, membership capicantiere, matrice modello/taglia/quantità, indirizzi, finestre di consegna, scadenze, validazioni, approvazioni, spedizioni e stati. Import/export CSV standard; preferire quantità aggregate per ridurre dati personali. Controllo che somma fabbisogni, ordine e piano coincidano.

**Percorso utente.** Creazione/selezione cantiere → assegnazione capocantiere → inserimento fabbisogni → validazione → approvazione centrale → piano spedizioni → stato per destinazione.

**Design.** Albero cantieri a sinistra, matrice centrale, errori e riepilogo a destra. Mobile con una scheda per cantiere/modello, non una tabella larga. Conferme multiple solo per approvazione finale.

**Done se.** Ogni capocantiere accede solo ai propri siti; nessuna spedizione ha quantità incoerenti; errori indicano cella e correzione; storico import e modifiche è disponibile.

### C16 — Subcontractor Network Console

**Servizio coperto:** Accordo Quadro di Filiera per Subappaltatori; alimenta C03 e C05.

**Funzione d’uso.** Consente al General Contractor di invitare imprese, associare Partite IVA ai cantieri e aggregare volumi senza sottrarre autonomia ai subappaltatori. È il presupposto per report unitari e distribuzione controllata dei kit.

**Attributi tecnici.** Invito, identità organizzazione, verifica formale e stato verifica effettiva, relazione cantiere, consensi, data inizio/fine, regole di attribuzione, ledger individuale e aggregato, revoca e conservazione storica. Non considerare attiva un’associazione basata solo su un invito email.

**Percorso utente.** GC invita → subappaltatore accetta e verifica → associazione a uno o più cantieri → acquisti autonomi → doppia attribuzione controllata → report/kit → eventuale revoca con storico preservato.

**Design.** Vista rete/cantieri, tabella imprese con stato e volumi, drawer dettaglio con permessi e relazioni. Invito guidato che spiega quali dati saranno condivisi prima dell’accettazione.

**Done se.** Nessun ordine è duplicato negli aggregati; il subappaltatore conserva soglie e documenti propri; revoca e periodi storici sono coerenti; nessun dato riservato attraversa tenant senza autorizzazione.

---

## 7. Eventi, notifiche e misurazione

### 7.1 Eventi analytics minimi

`service_preview_opened` · `service_activation_requested` · `login_return_completed` · `document_generated` · `document_exported` · `review_submitted` · `review_approved` · `share_link_created` · `course_completed` · `preference_confirmed` · `order_submitted` · `subcontractor_linked`

Non inviare a sistemi analytics dati personali, contenuti dei documenti, Partite IVA, indirizzi o riferimenti bancari. Misurare completamento, errori e abbandono per migliorare i flussi, non per profilazione pubblicitaria.

### 7.2 Notifiche

- In-app per stati e attività richieste.
- Email per inviti, revisioni, scadenze e conferme, con link firmati o deep link dopo login.
- Nessuna notifica deve contenere allegati privati non protetti.
- Preferenze e disiscrizione per comunicazioni non obbligatorie; le ricevute transazionali restano distinte.

---

## 8. Piano di implementazione

### Fase 0 — Fondazioni

Service Registry, routing, identità, tenant, ruoli, entitlement, ledger, audit log, shell, stati comuni e design tokens. Nessun componente deve aggirare queste fondazioni.

### Fase 1 — Trasparenza e consultazione

C01, C02, C06, C07, C13, C14. Sono il nucleo per dimostrare dati, documenti e pubblicazione terza.

### Fase 2 — Report e distribuzione

C03, C04, C05, C16. Prima attribuzione e consensi della filiera, poi aggregazione e output.

### Fase 3 — Formazione e prenotazioni

C08, C09. Verificare preventivamente disponibilità reale dei dati e processi di conferma.

### Fase 4 — Governance e operazioni

C10, C11, C12, C15. Richiedono controlli transazionali, test di concorrenza e criteri di accettazione più rigorosi.

Ogni fase deve rilasciare route complete, permessi, stati, export, test e contenuti reali; non soltanto interfaccia grafica.

---

## 9. Test e Definition of Done globale

### 9.1 Test obbligatori

- Unitari per calcoli, entitlement, soglie, deduplica e versioning.
- Integrazione per tenant, ruoli, upload, export, revoca link e stati di revisione.
- E2E per ogni percorso dal clic della landing all’output.
- Test cross-tenant: un utente non deve mai leggere dati di un’altra organizzazione modificando ID o URL.
- Test di concorrenza per ordini, prenotazioni, preferenze e spedizioni.
- Test su disponibilità assente, documento scaduto, upload malevolo, errore export e perdita connessione.
- Test con token stale dopo reset/restore: gate identità, rimozione token e nuovo login; nessuna identità residua presentata come valida.
- Test con API e chunk lazy non disponibili per ogni shell pubblica condivisa: errore navigabile, sidebar integra, retry/reload e assenza di schermata bianca.
- Test tastiera, screen reader, zoom 200%, contrasto, responsive e `prefers-reduced-motion`.
- Verifica che tutti gli output scaricati contengano versione, data, fonte e stato di revisione.

### 9.2 Done globale

Un componente è completo solo se:

1. La card della landing apre una route reale e ripristinabile dopo login.
2. Preview, blocco soglia, attivazione e utilizzo sono stati distinti.
3. Il backend applica entitlement e tenant su ogni operazione.
4. Non esistono dati o conferme finte nel percorso felice.
5. Errori e stati vuoti hanno azioni di recupero.
6. Mobile e tastiera consentono di completare lo stesso compito del desktop.
7. L’output finale è consultabile nella cronologia e, se previsto, esportabile in formato digitale.
8. Gli eventi fisici esterni sono sempre descritti come fulfilment separato.

### 9.3 Avanzamenti di robustezza introdotti in v1.1

1. **Isolamento QA/demo:** i prossimi avanzamenti devono separare datastore e processo delle suite da quelli dell’anteprima interattiva. La condivisione temporanea dello stesso JSON è ammessa solo localmente, in sequenza e senza utenti attivi; non è il target per staging o demo condivise.
2. **Reset consapevole:** reset, reseed e restore devono dichiarare che invalidano le sessioni e richiedono una nuova selezione delle identità. Non eseguirli silenziosamente durante una demo e non confonderli con un normale riavvio.
3. **Preview e build:** dopo rebuild o restore verificare entrambe le superfici dev/produzione, inclusi deep link e chunk lazy. Un errore di disponibilità deve lasciare shell, sidebar e azione di recupero; mai una pagina bianca.
4. **Migrazione successiva:** database transazionale e IdP definitivo devono preservare queste invarianti senza mantenere a lungo token bearer demo in `sessionStorage`. La migrazione va pianificata dopo la validazione funzionale delle componenti, con mapping esplicito di sessioni, ruoli e tenant.

---

## 10. Anti-pattern da rifiutare

- Una modale generica con testo commerciale al posto del servizio.
- Un toggle “Varianti” che concede accesso senza contratto.
- PDF generati con numeri statici o non riconciliati.
- Badge “verificato” derivati dal solo caricamento di un file.
- Dashboard modificabile manualmente senza ledger.
- Registro pubblico alimentato direttamente da dati privati.
- Videoconferenza con link pubblico o registrazione automatica.
- Tabelle desktop ridotte senza alternativa mobile.
- Download che avvia un file vuoto o una pagina HTML rinominata.
- Prenotazione “confermata” quando è soltanto una richiesta.
- Aggregazione dei subappaltatori basata su copie manuali degli ordini.

L’agente deve privilegiare **pochi moduli condivisi, dati verificabili e compiti completi** rispetto a una moltiplicazione di interfacce apparenti.
