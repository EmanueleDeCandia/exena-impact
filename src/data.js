export const roles = [
  {
    id: 'procurement',
    short: 'Procurement',
    icon: 'procurement',
    eyebrow: 'ACQUISTI, COMMESSE & SUPPLY CHAIN',
    title: 'Tu governi budget e filiera. Da un’unica fornitura.',
    description:
      'Non devi scegliere tra controllo del prezzo e qualità della filiera. Pianifichi i fabbisogni, associ i subappaltatori alla commessa e tracci la quota destinata al territorio con evidenze digitali utilizzabili dal tuo team.',
    outcomes: [
      'Budget, ordini ricorrenti, taglie e spedizioni per singolo cantiere.',
      'Volume cumulativo del General Contractor senza perdere le soglie individuali dei subappaltatori.',
      'Devoluzione del 30% documentata con audit trail digitale verificabile.',
    ],
    deliverables: 'Bulk Order Portal · Logistica multi-cantiere · Accordo quadro di filiera',
    stat: '3',
    statLabel: 'direttrici coordinate: Core Value, Trade ed EaaS',
  },
  {
    id: 'rspp',
    short: 'RSPP',
    icon: 'safety',
    eyebrow: 'SICUREZZA, ERGONOMIA & GESTIONE OPERATIVA',
    title: 'Tu proteggi le persone. E presidi anche uso e fine vita.',
    description:
      'La conformità del DPI resta il punto di partenza. Puoi aggiungere dati tecnici sulla calzatura, formazione per preposti e capicantiere e un servizio programmato di recupero dei lotti a fine vita.',
    outcomes: [
      'Dati LCA e Carbon Footprint della calzatura pronti per il tuo fascicolo digitale.',
      'Modulo asincrono di un’ora su ergonomia del piede e uso corretto dei DPI.',
      'Ritiro e disassemblaggio delle calzature usate con recupero della suola.',
    ],
    deliverables: 'Dossier Scope 3 · Formazione asseverata · Recupero circolare',
    stat: '4,25 kg',
    statLabel: 'CO₂ Scope 3 evitata stimata per paio',
  },
  {
    id: 'esg',
    short: 'ESG Manager',
    icon: 'esg',
    eyebrow: 'SOSTENIBILITÀ, CSRD & ASSURANCE',
    title: 'Tu consegni al revisore evidenze, non autodichiarazioni.',
    description:
      'Non rincorri informazioni frammentate a fine anno. Ricevi dati LCA, pezze giustificative delle devoluzioni e rendicontazione co-firmata da un soggetto terzo, con un fascicolo digitale già predisposto per la verifica.',
    outcomes: [
      'Dati per ESRS E1, S3 e GRI 413 collegati alla stessa fornitura.',
      'Fascicolo Ready for Assurance strutturato secondo le linee guida ISAE 3000.',
      'Report sociale unitario per commessa, inclusi gli acquisti dei subappaltatori.',
    ],
    deliverables: 'LCA · Audit trail · ISAE 3000 readiness · Report di cantiere',
    stat: '1 fonte',
    statLabel: 'terza per dati ambientali, sociali e devoluzioni',
  },
  {
    id: 'hr',
    short: 'HR & Welfare',
    icon: 'people',
    eyebrow: 'WELFARE, FAMIGLIE & RELAZIONI INDUSTRIALI',
    title: 'Tu offri un beneficio che raggiunge davvero le maestranze.',
    description:
      'Converti una scelta di acquisto in cultura e ospitalità per l’organico: ingressi agli eventi, tariffe convenzionate oppure pernottamenti per lavoratori e famiglie nei borghi che vivono la ricostruzione.',
    outcomes: [
      'VIP Pass e un ingresso omaggio ogni 10 addetti oltre soglia D.',
      'Crediti soggiorno convertibili per maestranze e nuclei familiari.',
      'Relazioni digitali condivisibili con enti paritetici e rappresentanze dei lavoratori.',
    ],
    deliverables: 'VIP Pass · Ospitalità convenzionata · Crediti soggiorno · Relazione CPT',
    stat: '1 / 10',
    statLabel: 'ingresso omaggio ogni 10 addetti oltre soglia D',
  },
  {
    id: 'ceo',
    short: 'CEO & Board',
    icon: 'leadership',
    eyebrow: 'PROPRIETÀ, RATING & POSIZIONAMENTO ISTITUZIONALE',
    title: 'Tu orienti il valore territoriale della tua commessa.',
    description:
      'Non sei soltanto il firmatario di un ordine. Puoi partecipare al Tavolo CSR, supportare il dialogo con banche e committenti e indicare il comune o la tipologia di opera sociale verso cui dirigere la tua quota.',
    outcomes: [
      'Documentazione di supporto per rating ESG e relazioni con stazioni appaltanti.',
      'Ospitalità spesata per il titolare e due figure apicali al Summit.',
      'Diritto di indirizzo territoriale e briefing normativo annuale per il CdA.',
    ],
    deliverables: 'Tavolo CSR · Rating support · Indirizzo del Fondo · Board Briefing',
    stat: '30%',
    statLabel: 'quota della commessa su cui esprimere indirizzo territoriale',
  },
];

export const serviceAreas = [
  {
    id: 'compliance',
    number: '01',
    strategy: 'CORE VALUE · CANALE DIRETTO ISTITUZIONALE',
    title: 'Compliance ESG e Catena di Fornitura',
    audience: 'Per ESG Manager, Procurement, General Contractor e CFO',
    outcome:
      'Tu arrivi a revisioni, incontri bancari e verifiche di filiera con un fascicolo digitale terzo, collegato alla fornitura e alla singola commessa.',
    tags: ['CSRD / ASSURANCE', 'ESRS E1 / S3', 'GRI 413', 'SCOPE 3'],
    standard: [
      {
        title: 'Dossier Tecnico Scope 3 — ESRS E1',
        route: '/app/esg/scope-3',
        description:
          'Ricevi dati verificati di Life Cycle Assessment e Carbon Footprint della calzatura, formattati per confluire nel computo delle emissioni indirette della tua catena di fornitura.',
      },
      {
        title: 'Attestazione di Devoluzione Territoriale — ESRS S3 & GRI 413',
        route: '/app/fondo/attestazioni',
        description:
          'Ottieni il documento digitale che certifica il versamento irrevocabile del 30% del valore d’acquisto, pari a 22,50 € per paio, al Fondo Ricreatività Aree Interne.',
      },
      {
        title: 'Rendicontazione di Impatto Sociale per l’Area Sisma',
        route: '/app/report?template=AREA_SISMA',
        description:
          'Utilizzi un fascicolo digitale descrittivo e quantitativo, co-firmato dalla Startup garante, che attesta il tuo contributo alla rigenerazione dei borghi interni.',
      },
      {
        title: 'Documentazione di Supporto per il Rating ESG Bancario',
        route: '/app/evidence-packs?type=BANK',
        description:
          'Condividi con gli istituti di credito schede di sintesi sull’approvvigionamento sostenibile per supportare il dialogo sulle linee di finanza agevolata.',
      },
      {
        title: 'Audit Tecnico-Valoriale in Cantiere o in Sede',
        description:
          'Lavori con i tecnici della Startup alla pianificazione dei fabbisogni e alla presentazione dei protocolli digitali di rendicontazione.',
      },
    ],
    variants: [
      {
        code: 'VARIANTE 1.A',
        title: 'Fascicolo di Asseverazione — Ready for Assurance',
        route: '/app/evidence-packs?type=ASSURANCE',
        label: 'SUPPORTO DIGITALE PER REVISORI DI SOSTENIBILITÀ',
        description:
          'Ricevi un prospetto tecnico digitale strutturato secondo le linee guida ISAE 3000: pezze giustificative bancarie, audit trail delle devoluzioni e fattori di emissione della calzatura, pronti per la società di revisione incaricata dell’attestazione CSRD.',
        value: 'Per te: riduci il tempo di raccolta delle evidenze e consegni al revisore un percorso documentale già ordinato.',
      },
      {
        code: 'VARIANTE 1.B',
        title: 'Cantiere Etico Integrato — Report per General Contractor',
        route: '/app/report?template=CANTIERE_INTEGRATO',
        label: 'RENDICONTAZIONE UNITARIA DELLA COMMESSA',
        description:
          'Aggrega in un documento d’impatto riferito alla specifica opera le calzature adottate dalla tua impresa e quelle acquistate dai subappaltatori attivi nello stesso cantiere.',
        value: 'Per te: presenti al committente una sola rendicontazione sociale del cantiere, senza perdere il dettaglio dei singoli operatori.',
      },
      {
        code: 'VARIANTE 1.C',
        title: 'Attestazione di Trasparenza per Enti Paritetici e Casse Edili',
        route: '/app/report?template=CPT',
        label: 'RELAZIONE DIGITALE PER LE INTERLOCUZIONI DI FILIERA',
        description:
          'Predisponi una relazione formale congiunta sull’adozione di standard avanzati di benessere, sicurezza e sostenibilità per i lavoratori, utilizzabile con CPT e rappresentanze dei lavoratori.',
        value: 'Per te: rendi condivisibile e verificabile il tuo impegno nelle relazioni industriali e territoriali.',
      },
    ],
  },
  {
    id: 'comunicazione',
    number: '02',
    strategy: 'SOGLIE A & B · TRADE + EaaS',
    title: 'Visibilità Organica, Relazioni Istituzionali e Filiera',
    audience: 'Per General Contractor, Marketing, ESG e Investor Relations',
    outcome:
      'Tu disponi di asset digitali organici e verificabili per valorizzare la commessa e qualificare anche la catena dei subappalti.',
    tags: ['PR ORGANICHE', 'REGISTRO PARTNER', 'FILIERA'],
    standard: [
      {
        title: 'Kit Digital Co-Branding — oltre 10 paia',
        route: '/app/brand-kit?audience=GENERAL_CONTRACTOR',
        description:
          'Generi automaticamente badge “Partner Sibillini Impact”, testi per la sezione Capitale Relazionale del Bilancio di Esercizio/Sostenibilità e infografiche digitali per i tuoi canali interni.',
      },
      {
        title: 'Scheda Editoriale e Case History — oltre 25 paia',
        route: '/app/editoriale?type=CASE_HISTORY',
        description:
          'La Startup redige in modo indipendente una scheda monografica sul portale istituzionale di progetto, documentando il tuo impegno verso il territorio.',
      },
    ],
    variants: [
      {
        code: 'VARIANTE 2.A',
        title: 'Registro dei Partner della Ricostruzione dei Borghi',
        route: '/app/registro-partner',
        label: 'RICONOSCIMENTO PUBBLICO DIGITALE',
        description:
          'Ottieni la registrazione formale nella sezione pubblica curata dalla Startup in raccordo con le municipalità montane del cratere, dedicata alle imprese che reinvestono risorse nell’economia locale.',
        value: 'Per te: rendi rintracciabile il tuo impegno in un contesto istituzionale e territoriale qualificato.',
      },
      {
        code: 'VARIANTE 2.B',
        title: 'Kit di Comunicazione per la Catena dei Subappalti',
        route: '/app/brand-kit?audience=SUBCONTRACTOR',
        label: 'VALORE ESTESO AI PARTNER VIRTUOSI',
        description:
          'Estendi ai tuoi subappaltatori un set di strumenti digitali pre-configurati con cui qualificare a loro volta il proprio impegno sociale.',
        value: 'Per te: comunichi in modo coerente lungo tutta la filiera e rafforzi la qualità dei partner associati alla commessa.',
      },
      {
        code: 'VARIANTE 2.C',
        title: 'Sintesi Monografica d’Impatto per Stakeholder',
        route: '/app/report?template=STAKEHOLDER',
        label: 'EXECUTIVE SUMMARY DIGITALE · 2 PAGINE',
        description:
          'Allega alle presentazioni aziendali una sintesi digitale di due pagine curata dalla Startup garante per assemblee di consorzio e incontri con stazioni appaltanti private.',
        value: 'Per te: comunichi dati essenziali e terzi anche quando il tuo interlocutore ha pochi minuti da dedicarti.',
      },
    ],
  },
  {
    id: 'welfare',
    number: '03',
    strategy: 'SOGLIE C & D · TRADE + EaaS',
    title: 'Welfare, Gestione Operativa e Circolarità',
    audience: 'Per HR, Welfare, RSPP e Direzione Acquisti',
    outcome:
      'Tu trasformi la fornitura in benefici fruibili dalle maestranze e in processi concreti per formazione, ospitalità e recupero dei DPI.',
    tags: ['WELFARE', 'CIRCULARITÀ', 'FORMAZIONE'],
    standard: [
      {
        title: '5 VIP Pass Eventi Culturali — oltre 50 paia',
        description:
          'Metti a disposizione di RSPP o Direzione Personale cinque ingressi gratuiti per rassegne e manifestazioni nei borghi dei Sibillini finanziate dal Fondo.',
      },
      {
        title: 'Accesso al Portale Ospitalità Convenzionata',
        route: '/app/hospitality',
        description:
          'Invii richieste di disponibilità ad alberghi diffusi, agriturismi e strutture partner nei borghi, con tariffe, tasse e condizioni visibili prima dell’invio.',
      },
      {
        title: 'Welfare Proporzionale — oltre 100 paia',
        description:
          'Distribuisci all’organico un biglietto omaggio ogni 10 addetti complessivi: con 200 addetti, per esempio, ottieni 20 ingressi proporzionali.',
      },
    ],
    variants: [
      {
        code: 'VARIANTE 3.A',
        title: 'Crediti Soggiorno per Maestranze e Famiglie',
        label: 'CONVERSIONE DEI PASS CULTURALI IN OSPITALITÀ',
        description:
          'Converti i pass culturali in pernottamenti a costo zero per lavoratori e nuclei familiari presso i borghi montani, rafforzando il legame con le comunità che ospitano la ricostruzione.',
        value: 'Per te: rendi il welfare più inclusivo e fruibile anche da chi non può partecipare agli eventi in calendario.',
      },
      {
        code: 'VARIANTE 3.B',
        title: 'Recupero e Riciclo a Fine Vita — Zero Rifiuto in Cantiere',
        label: 'SERVIZIO CIRCOLARE PROGRAMMATO',
        description:
          'Programmi il ritiro delle calzature usate per disassemblaggio e trasformazione della suola in mescola destinata a pavimentazioni civiche locali.',
        value: 'Per te: presidi il fine vita dei DPI e riduci la gestione dei rifiuti speciali associati al cantiere.',
      },
      {
        code: 'VARIANTE 3.C',
        title: 'Modulo Formativo Asseverato su Ergonomia e Sicurezza',
        route: '/app/e-learning',
        label: 'FORMAZIONE ASINCRONA · 1 ORA',
        description:
          'Attivi per preposti e capicantiere un percorso digitale su postura e uso corretto dei DPI, con attestato nominale verificabile e revocabile. Ente, criteri effettivi e limiti sono espliciti: asseverazione non significa accreditamento legale.',
        value: 'Per te: affianchi alla consegna del dispositivo una verifica formativa tracciabile per le persone che coordinano il lavoro.',
      },
    ],
  },
  {
    id: 'governance',
    number: '04',
    strategy: 'SOGLIA D · CORE VALUE + TRADE + EaaS',
    title: 'Governance e Partecipazione Istituzionale',
    audience: 'Per Proprietà, CEO, CFO e Consiglio di Amministrazione',
    outcome:
      'Tu partecipi alle decisioni sul valore generato e porti dentro il CdA un presidio dedicato all’evoluzione delle filiere industriali.',
    tags: ['CSR FORUM', 'INDIRIZZO FONDO', 'BOARD BRIEFING'],
    standard: [
      {
        title: 'Tavolo Istituzionale CSR — oltre 100 paia',
        description:
          'Ricevi un invito formale al forum annuale con enti territoriali, atenei regionali e rappresentanti pubblici sulle politiche di coesione delle aree interne.',
      },
      {
        title: 'Ospitalità Totale Spesata',
        description:
          'Per il Summit, il pernottamento è interamente coperto dal progetto per il titolare e due figure apicali.',
      },
      {
        title: 'Executive Page Indicizzata',
        route: '/app/editoriale?type=BEST_PRACTICE',
        description:
          'Ottieni una pagina web dedicata e permanente sul portale del progetto che analizza le buone pratiche adottate dalla tua azienda.',
      },
    ],
    variants: [
      {
        code: 'VARIANTE 4.A',
        title: 'Diritto di Indirizzo Territoriale del Fondo',
        route: '/app/governance/indirizzo-fondo',
        label: 'PREFERENZA VINCOLANTE SULLA QUOTA DEL 30%',
        description:
          'Il tuo Board esprime una preferenza vincolante sul comune del cratere o sulla tipologia di opera sociale — centro aggregativo, parco o rassegna culturale — a cui destinare la propria quota.',
        value: 'Per te: colleghi direttamente la commessa a una destinazione territoriale coerente con la tua presenza operativa.',
      },
      {
        code: 'VARIANTE 4.B',
        title: 'Sessione Riservata di Aggiornamento Normativo per il Board',
        route: '/app/governance/briefing',
        label: 'BRIEFING ANNUALE · 2 ORE',
        description:
          'Attivi un incontro riservato con gli analisti della Startup per esaminare l’evoluzione delle direttive europee di sostenibilità e i vincoli emergenti per le filiere industriali.',
        value: 'Per te: porti nel CdA un momento dedicato alla valutazione degli impatti sulle decisioni industriali e di fornitura.',
      },
    ],
  },
  {
    id: 'piattaforma',
    number: '05',
    strategy: 'EaaS & PORTALE B2B · DEVOLUZIONE FISSA 30%',
    title: 'Servizi Digitali e Piattaforma Operativa',
    audience: 'Per Procurement, General Contractor, Consorzi e Capicantiere',
    outcome:
      'Tu elimini attriti amministrativi e magazzino interno, coordinando fabbisogni, taglie, spedizioni e volumi di filiera da strumenti web essenziali.',
    tags: ['BULK ORDER', 'MULTI-CANTIERE', 'REGISTRO PUBBLICO'],
    standard: [
      {
        title: 'Bulk Order Portal',
        route: '/app/ordini',
        description:
          'Gestisci acquisti massivi e ordini ricorrenti con indicazione trasparente della devoluzione al Fondo e dei livelli di soglia maturati.',
      },
      {
        title: 'Dashboard Soglie e Benefit',
        route: '/app/dashboard',
        description:
          'Monitori l’avanzamento dei volumi, scarichi i voucher welfare e verifichi l’attivazione dei servizi da un unico cruscotto web.',
      },
      {
        title: 'Registro Pubblico Trasparente',
        route: '/trasparenza',
        description:
          'Visualizzi in tempo reale i fondi complessivi generati e i progetti finanziati nei singoli borghi.',
      },
    ],
    variants: [
      {
        code: 'VARIANTE 5.A',
        title: 'Portale Logistico Multi-Cantiere e Taglie per Cantiere',
        route: '/app/logistica',
        label: 'FABBISOGNI E SPEDIZIONI FRAZIONATE SUL CAMPO',
        description:
          'I capicantiere inseriscono fabbisogni e taglie per il singolo cantiere operativo; tu profili le commesse e organizzi spedizioni frazionate direttamente sul campo.',
        value: 'Per te: elimini la gestione interna di magazzino e riduci errori, giacenze e movimentazioni secondarie.',
      },
      {
        code: 'VARIANTE 5.B',
        title: 'Accordo Quadro di Filiera per Subappaltatori',
        route: '/app/filiera',
        label: 'VOLUMI INDIVIDUALI + CUMULATIVO DEL CANTIERE',
        description:
          'Associ al tuo profilo le Partite IVA dei subappaltatori: i loro acquisti concorrono sia alle soglie individuali sia al volume cumulativo del cantiere principale.',
        value: 'Per te: aggreghi il valore della filiera senza sottrarre autonomia e benefit ai singoli partner.',
      },
    ],
  },
];

export const thresholds = [
  {
    id: 'A',
    amount: 10,
    title: 'Attivazione',
    standard: 'Kit Digital Co-Branding e testi per il bilancio.',
    variant: 'Aggiungi fascicolo Ready for Assurance e attestazione per CPT.',
  },
  {
    id: 'B',
    amount: 25,
    title: 'Racconto',
    standard: 'Case History redatta e pubblicata dalla Startup.',
    variant: 'Aggiungi Registro Partner, kit subappalti e sintesi stakeholder.',
  },
  {
    id: 'C',
    amount: 50,
    title: 'Welfare',
    standard: '5 VIP Pass e accesso al portale di ospitalità.',
    variant: 'Aggiungi crediti soggiorno, recupero circolare e formazione.',
  },
  {
    id: 'D',
    amount: 100,
    title: 'Governance',
    standard: 'Tavolo CSR, ospitalità executive e welfare proporzionale.',
    variant: 'Aggiungi indirizzo territoriale, Board Briefing e logistica multi-cantiere.',
  },
];

export const comparisonRows = [
  ['Dati per reporting', 'Non previsti', 'LCA, Scope 3 e attestazione Fondo', 'Fascicolo ISAE 3000 + audit trail digitale'],
  ['Visione di cantiere', 'Dati frammentati', 'Rendicontazione sociale dell’impresa', 'Report unitario General Contractor + subappaltatori'],
  ['Visibilità organica', 'Assente', 'Kit digitale + Case History', 'Registro Partner + kit filiera + executive summary'],
  ['Welfare e circolarità', 'Non previsti', 'Eventi, ospitalità e ingressi proporzionali', 'Crediti soggiorno + recupero DPI + formazione'],
  ['Governance', 'Relazione solo commerciale', 'Tavolo CSR + Executive Page', 'Indirizzo territoriale + briefing normativo Board'],
  ['Gestione digitale', 'Ordine puntuale', 'Bulk Portal, dashboard e registro pubblico', 'Taglie e spedizioni per cantiere + accordo di filiera'],
];
