export function createArea4Seed() {
  const timestamp = Date.now();
  const liveStart = new Date(timestamp - 30 * 60 * 1000);
  const liveEnd = new Date(liveStart.getTime() + 120 * 60 * 1000);
  const futureStart = new Date(timestamp + 7 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(futureStart.getTime() + 120 * 60 * 1000);
  const members = [
    { id: 'MEM-BOARD-001', organizationId: 'org-gc-demo', displayName: 'Consigliere Board Demo', role: 'BOARD', boardAuthorized: true, briefingSpeaker: false, mfaDemoCode: '246810', demoAccessEnabled: true },
    { id: 'MEM-SPEAKER-001', organizationId: 'org-gc-demo', displayName: 'Relatrice Startup Demo', role: 'STARTUP_REVIEWER', boardAuthorized: false, briefingSpeaker: true, mfaDemoCode: '246810', demoAccessEnabled: true },
    { id: 'MEM-ESG-001', organizationId: 'org-gc-demo', displayName: 'ESG Manager non Board Demo', role: 'ESG_MANAGER', boardAuthorized: false, briefingSpeaker: false, mfaDemoCode: '246810', demoAccessEnabled: true },
    { id: 'MEM-CSR-BOARD', organizationId: 'org-csr-demo', displayName: 'Consigliere Manifattura Sibillini (CSR)', role: 'BOARD', boardAuthorized: true, briefingSpeaker: false, mfaDemoCode: '246810', demoAccessEnabled: true },
    { id: 'MEM-BOARD-OTHER', organizationId: 'org-other-demo', displayName: 'Board Altra Organizzazione Demo', role: 'BOARD', boardAuthorized: true, briefingSpeaker: false, mfaDemoCode: '246810', demoAccessEnabled: true },
  ];
  const agenda = [
    { id: 'AG-01', title: 'Apertura e perimetro delle decisioni Board', durationMinutes: 20, speaker: 'Relatrice Startup Demo' },
    { id: 'AG-02', title: 'Osservatorio normativo europeo — contenuti demo', durationMinutes: 30, speaker: 'Relatrice Startup Demo' },
    { id: 'AG-03', title: 'Impatti su filiera, forniture e governance', durationMinutes: 40, speaker: 'Analisi guidata demo' },
    { id: 'AG-04', title: 'Domande, punti decisionali e follow-up', durationMinutes: 30, speaker: 'Board e relatori demo' },
  ];
  const preReads = [
    { id: 'PRE-NORM-01', title: 'Nota di preparazione normativa — demo', version: '1.0', reviewStatus: 'VERIFIED_DEMO', source: 'Osservatorio Startup — fonte sintetica demo', updatedAt: '2026-10-20T09:00:00.000Z', content: 'Questo pre-read dimostrativo propone una griglia di lettura per cambiamenti normativi, impatti sulla filiera e decisioni del Board. Non contiene interpretazioni giuridiche e non sostituisce consulenza professionale.\n\nPrima della sessione: individua una decisione di fornitura, un soggetto della filiera e un evidenza documentale da discutere.' },
    { id: 'PRE-GOV-02', title: 'Matrice decisionale per il Board — demo', version: '1.1', reviewStatus: 'VERIFIED_DEMO', source: 'Startup garante — metodo dimostrativo', updatedAt: '2026-10-21T09:00:00.000Z', content: 'La matrice collega segno normativo, processo interno, proprietario, evidenza e scadenza. I contenuti sono interamente sintetici.\n\nLa sessione online dura due ore; domande e punti decisionali saranno conservati nel follow-up soltanto se inseriti effettivamente dai partecipanti.' },
  ];
  const makeSession = (id, title, startAt, endAt) => ({
    id, organizationId: 'org-gc-demo', title, startAt: startAt.toISOString(), endAt: endAt.toISOString(), timeZone: 'Europe/Rome', durationMinutes: 120,
    status: 'SCHEDULED', agenda: structuredClone(agenda), preReads: structuredClone(preReads),
    invites: [
      { id: `${id}-INV-BOARD`, memberId: 'MEM-BOARD-001', role: 'PARTICIPANT', status: 'INVITED', acceptedAt: null, identityVerifiedAt: null },
      { id: `${id}-INV-SPEAKER`, memberId: 'MEM-SPEAKER-001', role: 'SPEAKER', status: 'INVITED', acceptedAt: null, identityVerifiedAt: null },
    ],
    roomToken: null, roomTokenGeneratedAt: null, questions: [], attendance: [], recording: { enabled: false, consents: {} }, followUp: null,
    events: [{ at: new Date(timestamp).toISOString(), actor: 'Startup garante — demo', event: 'Sessione online e inviti nominativi creati; registrazione disattivata' }],
  });
  return {
    governanceMembers: members,
    governanceSessions: [],
    mfaChallenges: [],
    fundDirectionOptions: [
      { id: 'OPT-COMUNE-ACCUMOLI', type: 'MUNICIPALITY', title: 'Comune di Accumoli — demo', subtitle: 'Destinazione comunale', description: 'Indirizzo della quota verso progetti da concordare con il comune, senza inventare un progetto già finanziato.', consequences: 'La Startup userà la preferenza come vincolo nella proposta di allocazione; attuazione e documentazione restano tracciate separatamente.' },
      { id: 'OPT-COMUNE-AMATRICE', type: 'MUNICIPALITY', title: 'Comune di Amatrice — demo', subtitle: 'Destinazione comunale', description: 'Preferenza territoriale dimostrativa per future attività di rigenerazione nel comune.', consequences: 'La scelta non certifica un versamento già eseguito: lo stato di attuazione sarà aggiornato dal garante.' },
      { id: 'OPT-OPERA-CENTRO', type: 'PROJECT_TYPE', title: 'Centro aggregativo', subtitle: 'Tipologia di opera sociale', description: 'Indirizzo verso spazi civici e servizi aggregativi da definire con gli enti territoriali.', consequences: 'Il comune resta da determinare nella fase attuativa, nei limiti della versione delle regole registrata.' },
      { id: 'OPT-OPERA-RASSEGNA', type: 'PROJECT_TYPE', title: 'Rassegna culturale diffusa', subtitle: 'Tipologia di opera sociale', description: 'Preferenza per manifestazioni culturali nei borghi, senza attribuire eventi non confermati.', consequences: 'La scelta vincola la tipologia, non costituisce prova di finanziamento o svolgimento dell’evento.' },
    ],
    fundDirectionWindows: [
      { id: 'GOV-WIN-2026', organizationId: 'org-gc-demo', title: 'Indirizzo territoriale Fondo 2026 — demo', ruleVersion: 'REG-FONDO-2026.1', eligibleOrderIds: ['ORD-DEMO-0142'], opensAt: '2026-10-20T08:00:00.000Z', cutoffAt: '2026-12-15T16:00:00.000Z', timeZone: 'Europe/Rome' },
      { id: 'GOV-WIN-CSR-2026', organizationId: 'org-csr-demo', title: 'Indirizzo territoriale Fondo 2026 — Manifattura Sibillini (CSR)', ruleVersion: 'REG-FONDO-2026.1', eligibleOrderIds: ['ORD-CSR-0201'], opensAt: '2026-10-15T08:00:00.000Z', cutoffAt: '2026-12-20T16:00:00.000Z', timeZone: 'Europe/Rome' },
      { id: 'GOV-WIN-2025', organizationId: 'org-gc-demo', title: 'Archivio indirizzo Fondo 2025 — demo', ruleVersion: 'REG-FONDO-2025.4', eligibleOrderIds: ['ORD-DEMO-0118'], opensAt: '2025-11-01T08:00:00.000Z', cutoffAt: '2025-12-15T16:00:00.000Z', timeZone: 'Europe/Rome' },
    ],
    governancePreferences: [{
      id: 'PREF-2025-DEMO', windowId: 'GOV-WIN-2025', organizationId: 'org-gc-demo', currentVersion: 1, status: 'LOCKED', implementationStatus: 'IN_PROGRESS', implementationNote: 'Progetto operativo in definizione con il garante demo.',
      versions: [{ version: 1, optionId: 'OPT-OPERA-RASSEGNA', quotaCents: 180000, ruleVersion: 'REG-FONDO-2025.4', confirmedBy: 'MEM-BOARD-001', confirmedByName: 'Consigliere Board Demo', confirmedAt: '2025-12-10T10:00:00.000Z', receiptId: 'RIC-GOV-2025-001', conflictDeclaration: 'NONE', mfaChallengeId: null }],
      events: [
        { at: '2025-12-10T10:00:00.000Z', actor: 'Consigliere Board Demo', event: 'Preferenza v1 confermata con MFA demo' },
        { at: '2025-12-15T16:00:00.000Z', actor: 'Sistema governance', event: 'Cutoff raggiunto; preferenza bloccata' },
        { at: '2026-10-20T09:00:00.000Z', actor: 'Relatrice Startup Demo', event: 'Attuazione in corso; nessun esito finanziario attestato' },
      ],
    }],
    briefingSessions: [
      makeSession('BRF-LIVE-DEMO', 'Briefing Board — direttive e filiere demo', liveStart, liveEnd),
      makeSession('BRF-FUTURE-DEMO', 'Briefing Board annuale — sessione programmata demo', futureStart, futureEnd),
    ],
  };
}
