export function createArea3Seed() {
  const chapters = [
    {
      id: 'CH-ERG-01', title: 'Postura, appoggio e prevenzione', durationMinutes: 15, videoDurationSeconds: 8,
      videoUrl: '/media/ergonomia-capitolo-1.webm', captionsUrl: '/media/ergonomia-capitolo-1.vtt',
      transcript: [
        'La calzatura tecnica è un dispositivo di protezione individuale e non sostituisce una postura di lavoro corretta. Nel contenuto dimostrativo osserviamo come appoggio, calzata e alternanza delle posizioni contribuiscano al comfort e alla prevenzione.',
        'Il preposto verifica che il modello sia quello assegnato, che la calzata non ostacoli i movimenti e che eventuali segnali di usura o disagio vengano riportati. Il percorso non fornisce diagnosi mediche.',
      ],
      questions: [{ id: 'Q-ERG-01A', prompt: 'Quale comportamento è coerente con la prevenzione?', options: [{ id: 'A', text: 'Ignorare il disagio se la calzatura è nuova' }, { id: 'B', text: 'Verificare calzata, appoggio e segnali di usura' }, { id: 'C', text: 'Modificare autonomamente il DPI' }], correctOptionId: 'B', explanation: 'Calzata, appoggio e integrità del DPI vanno controllati; il disagio non va normalizzato.' }],
    },
    {
      id: 'CH-ERG-02', title: 'Uso corretto e controllo del DPI', durationMinutes: 20, videoDurationSeconds: 8,
      videoUrl: '/media/ergonomia-capitolo-2.webm', captionsUrl: '/media/ergonomia-capitolo-2.vtt',
      transcript: [
        'Prima dell’uso si controllano integrità, allacciatura, suola e pulizia. Una modifica non autorizzata può compromettere le prestazioni previste dal fabbricante e dal percorso di valutazione dei rischi.',
        'Il lavoratore utilizza il DPI secondo le istruzioni ricevute; il preposto registra le anomalie e attiva la sostituzione secondo la procedura dell’organizzazione. I riferimenti di questo capitolo sono interamente dimostrativi.',
      ],
      questions: [{ id: 'Q-ERG-02A', prompt: 'Che cosa fare davanti a una suola danneggiata?', options: [{ id: 'A', text: 'Continuare fino a fine turno senza segnalare' }, { id: 'B', text: 'Coprire il danno con nastro adesivo' }, { id: 'C', text: 'Segnalare l’anomalia e seguire la procedura di sostituzione' }], correctOptionId: 'C', explanation: 'Il danno viene segnalato e gestito con la procedura prevista, senza riparazioni improvvisate.' }],
    },
    {
      id: 'CH-ERG-03', title: 'Ruolo del preposto e tracciabilità', durationMinutes: 25, videoDurationSeconds: 8,
      videoUrl: '/media/ergonomia-capitolo-3.webm', captionsUrl: '/media/ergonomia-capitolo-3.vtt',
      transcript: [
        'Il preposto promuove l’uso corretto del dispositivo, osserva le condizioni operative e favorisce la segnalazione tempestiva. La tracciabilità riguarda consegna, formazione, controlli e azioni successive.',
        'Un attestato digitale può documentare il completamento di un percorso, ma non sostituisce la valutazione dei rischi, la sorveglianza sanitaria o gli obblighi formativi specifici. Questo attestato è demo e non costituisce accreditamento legale.',
      ],
      questions: [{ id: 'Q-ERG-03A', prompt: 'Che cosa dimostra l’attestato di questo percorso demo?', options: [{ id: 'A', text: 'Il completamento tracciato delle attività e dei test demo' }, { id: 'B', text: 'Un accreditamento legale automatico' }, { id: 'C', text: 'La sostituzione della valutazione dei rischi' }], correctOptionId: 'A', explanation: 'L’attestato registra il completamento demo; non crea accreditamenti e non sostituisce altri obblighi.' }],
    },
  ];
  const finalQuestions = [
    { id: 'Q-ERG-F01', chapterId: 'CH-ERG-01', prompt: 'Quale affermazione sul disagio è corretta?', options: [{ id: 'A', text: 'Va sempre ignorato nei primi giorni' }, { id: 'B', text: 'Va segnalato e valutato secondo procedura' }, { id: 'C', text: 'Dimostra che il DPI è adeguato' }], correctOptionId: 'B', explanation: 'Il disagio è un segnale da non normalizzare.' },
    { id: 'Q-ERG-F02', chapterId: 'CH-ERG-02', prompt: 'Chi definisce come gestire una modifica o sostituzione del DPI?', options: [{ id: 'A', text: 'La procedura dell’organizzazione e le istruzioni applicabili' }, { id: 'B', text: 'Il singolo lavoratore senza alcun riferimento' }, { id: 'C', text: 'Il portale di e-learning in autonomia' }], correctOptionId: 'A', explanation: 'Il portale supporta la tracciabilità ma non decide modifiche tecniche.' },
    { id: 'Q-ERG-F03', chapterId: 'CH-ERG-03', prompt: 'Il tempo di riproduzione è sufficiente per il completamento?', options: [{ id: 'A', text: 'Sì, è l’unica prova richiesta' }, { id: 'B', text: 'Solo se il video è lungo' }, { id: 'C', text: 'No, servono anche attività e verifiche di apprendimento' }], correctOptionId: 'C', explanation: 'Il completamento combina video, trascrizione, quiz intermedi e test finale.' },
  ];
  const completedChapters = Object.fromEntries(chapters.map((chapter) => [chapter.id, { videoCompleted: true, transcriptRead: true, quizPassed: true, completedAt: '2026-10-21T10:00:00.000Z', quizAttempts: 1 }]));
  return {
    hospitalityProperties: [
      {
        id: 'HOTEL-DEMO-01', name: 'Albergo Diffuso Borgo Demo', municipality: 'Borgo Demo — Sibillini', image: '/images/hospitality-borgo.png',
        description: 'Camere dimostrative in edifici recuperati nel borgo, con coordinamento esterno della struttura partner.',
        amenities: ['Accesso senza scale alla reception', 'Wi-Fi', 'Colazione convenzionata'],
        cancellationPolicy: 'La richiesta può essere annullata senza penali finché la struttura non ha inviato una conferma esterna. Condizioni definitive comunicate dalla struttura prima dell’accettazione.',
        rooms: [{ id: 'ROOM-BORGO-02', name: 'Camera doppia convenzionata', capacity: 2, baseOccupancy: 2, ratePerNightCents: 7800, extraGuestPerNightCents: 0, taxPerPersonNightCents: 150, availabilityUpdatedAt: '2026-10-23T08:00:00.000Z', inventoryLive: false }],
      },
      {
        id: 'HOTEL-DEMO-02', name: 'Agriturismo Valle Demo', municipality: 'Valle Demo — Monti Sibillini', image: '/images/hospitality-agriturismo.png',
        description: 'Soluzione dimostrativa per piccoli nuclei o trasferte, circondata da prati e percorsi rurali.',
        amenities: ['Parcheggio', 'Colazione locale', 'Spazio esterno accessibile'],
        cancellationPolicy: 'Annullamento della richiesta sempre disponibile nel portale. Eventuali condizioni del soggiorno sono indicate dalla struttura prima della conferma esterna.',
        rooms: [{ id: 'ROOM-VALLE-04', name: 'Camera famiglia', capacity: 4, baseOccupancy: 2, ratePerNightCents: 9500, extraGuestPerNightCents: 2000, taxPerPersonNightCents: 150, availabilityUpdatedAt: '2026-10-10T08:00:00.000Z', inventoryLive: false }],
      },
    ],
    hospitalityRequests: [{
      id: 'OSP-DEMO-001', requestKey: 'seed-hospitality-request', propertyId: 'HOTEL-DEMO-01', roomId: 'ROOM-BORGO-02', checkIn: '2026-11-20', checkOut: '2026-11-22', guests: 2,
      guestName: 'Dipendente Demo', note: 'Richiesta sintetica iniziale', status: 'REQUESTED', currency: 'EUR', nights: 2, roomSubtotalCents: 15600, extraGuestCents: 0, taxesCents: 600, totalCents: 16200,
      consents: { termsAccepted: true, privacyAccepted: true }, receiptId: 'RIC-OSP-DEMO-001', createdAt: '2026-10-22T09:00:00.000Z', updatedAt: '2026-10-22T09:00:00.000Z', cancelledAt: null,
      events: [{ at: '2026-10-22T09:00:00.000Z', actor: 'Portale hospitality demo', event: 'Richiesta registrata; nessuna conferma di prenotazione' }],
    }],
    courses: [{
      id: 'COURSE-ERG-DEMO', title: 'Ergonomia e uso corretto dei DPI', provider: 'Startup innovativa — ente formativo demo',
      accreditationNotice: 'Percorso e attestato dimostrativi: nessun accreditamento legale automatico e nessuna sostituzione degli obblighi formativi o della valutazione dei rischi.',
      verificationCriteria: 'Completamento di video e trascrizione in ogni capitolo, quiz intermedi e test finale con punteggio minimo dell’80%. Il tempo di riproduzione non è l’unica prova.',
      durationMinutes: 60, passScorePercent: 80, chapters, finalQuestions,
    }],
    courseEnrollments: [
      { id: 'ENR-DEMO-001', courseId: 'COURSE-ERG-DEMO', organizationId: 'org-gc-demo', learner: { displayName: 'Preposto Demo', role: 'Preposto' }, status: 'NOT_STARTED', acceptedAt: null, deadlineAt: '2026-12-31T23:59:59.000Z', progress: { chapters: {} }, attempts: [], finalResult: null, certificateId: null, createdAt: '2026-10-23T09:00:00.000Z', updatedAt: '2026-10-23T09:00:00.000Z', events: [] },
      { id: 'ENR-DEMO-002', courseId: 'COURSE-ERG-DEMO', organizationId: 'org-gc-demo', learner: { displayName: 'Capocantiere Demo', role: 'Capocantiere' }, status: 'COMPLETED', acceptedAt: '2026-10-20T09:00:00.000Z', deadlineAt: '2026-12-31T23:59:59.000Z', progress: { chapters: completedChapters }, attempts: [{ id: 'FIN-DEMO-002', at: '2026-10-21T10:00:00.000Z', correct: 3, total: 3, percent: 100, passed: true }], finalResult: { correct: 3, total: 3, percent: 100, passed: true, at: '2026-10-21T10:00:00.000Z' }, certificateId: 'CERT-DEMO-0001', createdAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z', events: [{ at: '2026-10-21T10:00:00.000Z', actor: 'Piattaforma formativa demo', event: 'Test finale superato e attestato demo emesso' }] },
    ],
    certificates: [{ id: 'CERT-DEMO-0001', code: 'SI-ERGO-DEMO-0001', enrollmentId: 'ENR-DEMO-002', courseId: 'COURSE-ERG-DEMO', learnerName: 'Capocantiere Demo', learnerRole: 'Capocantiere', organizationId: 'org-gc-demo', publicToken: 'demo_learning_8a72f41c9e6b4d2f9a3c7e51b08d6f2a', status: 'ACTIVE_DEMO', scorePercent: 100, issuedAt: '2026-10-21T10:00:00.000Z', revokedAt: null, events: [{ at: '2026-10-21T10:00:00.000Z', actor: 'Piattaforma formativa demo', event: 'Attestato demo emesso dopo completamento e test' }] }],
  };
}
