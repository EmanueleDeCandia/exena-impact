/**
 * Sibillini Impact - Unified Terminology Engine
 * Adatta dinamicamente il vocabolario dell'interfaccia in base al tipo di organizzazione:
 * - 'CSR_ORIENTED': Impresa orientata a sostenibilità / manifatturiera / servizi
 * - 'CONSTRUCTION': General Contractor / Edilizia e Cantieri
 * - 'SUBCONTRACTOR': Impresa di filiera / fornitore
 */

export function getTerminology(profileType = 'CONSTRUCTION') {
  const isCsr = profileType === 'CSR_ORIENTED';

  return {
    isCsr,
    // Unità operative
    siteSingular: isCsr ? 'Stabilimento' : 'Cantiere',
    sitePlural: isCsr ? 'Stabilimenti' : 'Cantieri',
    siteCodePrefix: isCsr ? 'STAB' : 'CANT',
    siteScopeLabel: isCsr ? 'Perimetro stabilimenti e filiera' : 'Perimetro commessa e cantieri',

    // Rete e Filiera
    supplierSingular: isCsr ? 'Fornitore di filiera' : 'Subappaltatore',
    supplierPlural: isCsr ? 'Fornitori di filiera' : 'Subappaltatori',
    supplierEnterprise: isCsr ? 'Impresa fornitrice' : 'Impresa subappaltatrice',
    networkTitle: isCsr ? 'Supply Chain & Partner Network' : 'Subcontractor Network Console',
    networkSubtitle: isCsr ? 'Filiera Fornitori Sostenibili' : 'Rete Subappalti di Cantiere',
    networkAgreement: isCsr ? 'Accordo di fornitura sostenibile' : 'Accordo di subappalto cantiere',
    leadOrgLabel: isCsr ? 'Impresa committente' : 'General Contractor',

    // Ruolo operativo sul campo
    managerRole: isCsr ? 'Responsabile di stabilimento' : 'Capocantiere',
    managersRolePlural: isCsr ? 'Responsabili di stabilimento' : 'Capicantiere',

    // Logistica e Distribuzione
    logisticsTitle: isCsr ? 'Multi-Site Logistics Planner — Sedi & Hub' : 'Multi-Site Logistics Planner — Cantieri',
    logisticsNeedsTitle: isCsr ? 'Fabbisogni per stabilimento' : 'Fabbisogni per cantiere',
    logisticsAddressLabel: isCsr ? 'Indirizzo della sede / stabilimento' : 'Indirizzo del cantiere',
    logisticsValidatedStatus: isCsr ? 'Validato dallo stabilimento' : 'Validato dal cantiere',

    // Report e Rendicontazione
    reportScopeField: isCsr ? 'Sede / Stabilimento e filiera' : 'Cantiere e filiera',
    integratedReportName: isCsr ? 'Bilancio di Sostenibilità & Fornitori Sostenibili' : 'Cantiere Etico Integrato',
    integratedReportDesc: isCsr
      ? 'Rendicontazione aziendale integrata con ordini degli stabilimenti e fornitori di filiera accreditati.'
      : 'Aggrega General Contractor e subappaltatori sullo stesso cantiere con deduplica degli ordini.',

    // Ordini e Volumi
    volumeBySiteLabel: isCsr ? 'Volumi per sede / stabilimento' : 'Volumi per cantiere',
    orderDestinationLabel: isCsr ? 'Sede / Stabilimento di consegna' : 'Cantiere di destinazione',
  };
}
