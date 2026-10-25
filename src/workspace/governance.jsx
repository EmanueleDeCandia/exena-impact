import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, KeyRound, LoaderCircle, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { api, downloadFile } from './api.js';
import { LoadingState } from './ui.jsx';

const STORAGE_KEY = 'sibillini-governance-demo-session';
const readSession = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};
export const roleLabel = (role) => ({ BOARD: 'BOARD', STARTUP_REVIEWER: 'RELATORE / REVISORE', ESG_MANAGER: 'ESG MANAGER' }[role] || role);
export const formatDuration = (seconds = 0) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${rest}s` : `${rest}s`;
};

export function useGovernanceSession() {
  const [session, setSession] = useState(readSession);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    api('/area4/governance/demo-accounts').then((result) => setAccounts(result.accounts)).catch((reason) => setError(reason.message)).finally(() => setAccountsLoading(false));
  }, []);
  useEffect(() => {
    if (session?.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY); setSession(null);
    }
  }, [session]);
  const login = async (memberId) => {
    setBusy(true); setError(null);
    try {
      const result = await api('/area4/governance/session', { method: 'POST', body: JSON.stringify({ memberId }) });
      const value = { token: result.token, member: result.member, expiresAt: result.expiresAt };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); setSession(value);
      return value;
    } catch (reason) { setError(reason.message); return null; }
    finally { setBusy(false); }
  };
  const logout = async () => {
    if (session?.token) await api('/area4/governance/session/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: '{}' }).catch(() => {});
    sessionStorage.removeItem(STORAGE_KEY); setSession(null);
  };
  const authorized = useCallback((path, options = {}) => api(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session?.token || ''}` } }), [session?.token]);
  const download = useCallback((path) => downloadFile(path, { headers: { Authorization: `Bearer ${session?.token || ''}` } }), [session?.token]);
  return { session, accounts, accountsLoading, busy, error, setError, login, logout, authorized, download };
}

export function useGovernanceData(path, session) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(session?.token) });
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!session?.token) { setState({ data: null, error: null, loading: false }); return null; }
    const current = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await api(path, { headers: { Authorization: `Bearer ${session.token}` } });
      if (current === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (current === requestId.current) setState({ data: null, error, loading: false });
      throw error;
    }
  }, [path, session?.token]);
  useEffect(() => { load().catch(() => {}); return () => { requestId.current += 1; }; }, [load]);
  return { ...state, reload: load };
}

export function GovernanceAccess({ accounts, loading, busy, error, onLogin, component = 'C10' }) {
  return <section className="governance-access" aria-labelledby="governance-access-title">
    <div className="governance-access__intro"><KeyRound size={34} /><span className="micro-label">ACCESSO GOVERNANCE / IDENTITÀ DEMO</span><h2 id="governance-access-title">Entra con un’identità autorizzata.</h2><p>{component === 'C10' ? 'La preferenza vincolante richiede un membro Board abilitato. La stessa identità sarà verificata anche dal server.' : 'La sala è riservata agli invitati. Scegli il Board o il relatore demo per verificare i due percorsi.'}</p><div className="governance-access__notice"><ShieldCheck size={18} /><span>Sessione dimostrativa di 8 ore. Non è autenticazione di produzione: MFA, RBAC e tenancy reali restano da collegare.</span></div></div>
    <div className="governance-access__accounts">{loading ? <LoadingState label="Caricamento identità demo" /> : accounts.map((account) => <button type="button" key={account.id} onClick={() => onLogin(account.id)} disabled={busy}>
      <span className="governance-account__icon">{account.role === 'BOARD' ? <UserCheck size={22} /> : <Building2 size={22} />}</span>
      <span><b>{account.displayName}</b><small>{roleLabel(account.role)} · {account.organizationId}</small><em>{account.role === 'BOARD' ? (account.boardAuthorized ? 'Preferenza C10 abilitata' : 'Board non abilitato') : account.briefingSpeaker ? 'Relatore C11 e attuazione C10' : 'Nessun privilegio Board'}</em></span><ArrowRight size={17} />
    </button>)}</div>
    {busy && <p className="governance-access__busy" role="status"><LoaderCircle className="spin" size={18} />Creazione sessione demo…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>;
}

export function GovernanceIdentityBar({ session, onLogout, context }) {
  return <div className="governance-identity"><span className="governance-identity__avatar" aria-hidden="true">{session.member.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><div><b>{session.member.displayName}</b><small>{roleLabel(session.member.role)} · {context} · sessione demo</small></div><button className="button button--ghost" type="button" onClick={onLogout}><LogOut size={16} />Cambia identità</button></div>;
}
