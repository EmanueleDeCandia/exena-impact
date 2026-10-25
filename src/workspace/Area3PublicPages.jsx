import { Award, CheckCircle2, FileQuestion, ShieldCheck, XCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PublicShell } from './PublicPages.jsx';
import { usePageMetadata } from './metadata.js';
import { LoadingState, StatusBadge, dateTime, useApiData } from './ui.jsx';

export function CertificateVerificationPage() {
  const { token } = useParams();
  const path = `/verifica/attestato/${token}`;
  const { data, error, loading } = useApiData(`/public/certificates/${encodeURIComponent(token)}`);
  usePageMetadata({
    title: data ? `Verifica ${data.code} — Sibillini Impact` : 'Verifica attestato — Sibillini Impact',
    description: 'Verifica pubblica minimizzata dello stato di un attestato formativo digitale dimostrativo.',
    path,
    index: false,
  });
  const revoked = data?.status === 'REVOKED';
  return <PublicShell label="DIGITAL CERTIFICATES / VERIFICA PUBBLICA" className="certificate-public-shell">
    {loading && <LoadingState label="Verifica del codice attestato" />}
    {error && <div className="public-state-card"><FileQuestion size={36} /><span className="micro-label">CODICE NON RICONOSCIUTO</span><h1>Attestato non trovato.</h1><p>{error.message}. Controlla il link o richiedi un nuovo codice di verifica.</p></div>}
    {data && <article className={`certificate-verification ${revoked ? 'is-revoked' : ''}`}>
      <header><div className="certificate-verification__icon">{revoked ? <XCircle size={38} /> : <CheckCircle2 size={38} />}</div><div><span className="micro-label">ESITO DELLA VERIFICA / DATI DEMO</span><h1>{revoked ? 'Attestato revocato.' : 'Attestato attivo.'}</h1><p>{revoked ? 'Il codice esiste, ma l’emittente demo ne ha revocato la validità.' : 'Il codice corrisponde a un attestato demo emesso dopo il completamento tracciato del percorso.'}</p></div><StatusBadge status={data.status} /></header>
      <dl className="certificate-verification__facts"><div><dt>Codice</dt><dd>{data.code}</dd></div><div><dt>Percorso</dt><dd>{data.courseTitle}</dd></div><div><dt>Ente effettivo</dt><dd>{data.provider}</dd></div><div><dt>Emesso il</dt><dd>{dateTime(data.issuedAt)}</dd></div>{data.revokedAt && <div><dt>Revocato il</dt><dd>{dateTime(data.revokedAt)}</dd></div>}<div><dt>Ambito</dt><dd>Attestato dimostrativo · nessun accreditamento legale</dd></div></dl>
      <section><Award size={24} /><div><span className="micro-label">CRITERIO DI EMISSIONE</span><h2>Che cosa è stato verificato</h2><p>{data.verificationCriteria}</p></div></section>
      <div className="public-minimization"><ShieldCheck size={24} /><div><h2>Identità del discente protetta</h2><p>{data.identityNotice}</p></div></div>
      <footer>AMBIENTE DEMO / NESSUN VALORE LEGALE AUTOMATICO / VERIFICA LIMITATA ALLO STATO DEL CODICE</footer>
    </article>}
  </PublicShell>;
}
