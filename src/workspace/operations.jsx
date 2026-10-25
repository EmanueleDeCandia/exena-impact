import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ArrowRight, Building2, KeyRound, LoaderCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { api, downloadFile } from './api.js';
import { BlockedState, LoadingState } from './ui.jsx';
import { WorkspaceContext } from './WorkspaceApp.jsx';

const STORAGE_KEY = 'sibillini-operations-demo-session';
const INVALID_SESSION_EVENT = 'sibillini:operations-session-invalid';
const INVALID_SESSION_MESSAGE = 'La sessione Operations demo non è più valida. Seleziona nuovamente un’identità per continuare.';
const announceInvalidSession = () => window.dispatchEvent(new Event(INVALID_SESSION_EVENT));
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null; } catch { return null; } };
export const operationsMoney = (cents = 0) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(cents / 100);
export const operationsRoleLabel = (role, profileType = 'CONSTRUCTION') => {
  if (profileType === 'CSR_ORIENTED') {
    return ({
      PROCUREMENT: 'PROCUREMENT / SOSTENIBILITÀ',
      HR_WELFARE: 'HR / WELFARE & CSR',
      BOARD: 'BOARD ESG',
      SITE_MANAGER: 'RESPONSABILE STABILIMENTO',
      SUBCONTRACTOR: 'FORNITORE DI FILIERA',
      STARTUP_REVIEWER: 'STARTUP REVIEWER'
    }[role] || role);
  }
  return ({
    PROCUREMENT: 'PROCUREMENT',
    HR_WELFARE: 'HR / WELFARE',
    BOARD: 'BOARD',
    SITE_MANAGER: 'CAPOCANTIERE',
    SUBCONTRACTOR: 'SUBAPPALTATORE',
    STARTUP_REVIEWER: 'STARTUP REVIEWER'
  }[role] || role);
};

export function useOperationsSession(explicitOrgId) {
  const context = useContext(WorkspaceContext);
  const targetOrgId = explicitOrgId || context?.bootstrap?.organization?.id;
  const [session, setSession] = useState(readSession);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selectingRole, setSelectingRole] = useState(false);

  useEffect(() => {
    const recover = () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setError(INVALID_SESSION_MESSAGE);
    };
    window.addEventListener(INVALID_SESSION_EVENT, recover);
    return () => window.removeEventListener(INVALID_SESSION_EVENT, recover);
  }, []);

  useEffect(() => {
    api('/area5/operations/demo-accounts')
      .then((result) => setAccounts(result.accounts))
      .catch((reason) => setError(reason.message))
      .finally(() => setAccountsLoading(false));
  }, []);

  useEffect(() => {
    if (session?.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setError(INVALID_SESSION_MESSAGE);
    }
  }, [session]);

  const login = async (memberId) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api('/area5/operations/session', { method: 'POST', body: JSON.stringify({ memberId }) });
      const value = { token: result.token, member: result.member, expiresAt: result.expiresAt };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      setSession(value);
      setSelectingRole(false);
      return value;
    } catch (reason) {
      setError(reason.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Synchronize session with targetOrgId
  useEffect(() => {
    if (!accounts.length || !targetOrgId) return;

    // If session already belongs to targetOrgId, do not overwrite unless forced
    if (session && session.member?.organizationId === targetOrgId) {
      return;
    }

    const orgAccounts = accounts.filter((a) => a.organizationId === targetOrgId);
    if (!orgAccounts.length) return;

    const defaultAccount =
      orgAccounts.find((a) => a.role === 'PROCUREMENT') ||
      orgAccounts.find((a) => a.role === 'SUBCONTRACTOR') ||
      orgAccounts[0];

    if (defaultAccount) {
      login(defaultAccount.id).catch(() => {});
    }
  }, [accounts, targetOrgId, session?.member?.organizationId]);

  // Listen to organization switch event from topbar
  useEffect(() => {
    const handleOrgChanged = () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
    };
    window.addEventListener('sibillini:org-changed', handleOrgChanged);
    return () => window.removeEventListener('sibillini:org-changed', handleOrgChanged);
  }, []);

  const logout = async () => {
    if (session?.token) await api('/area5/operations/session/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: '{}' }).catch(() => {});
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  const authorized = useCallback(async (path, options = {}) => {
    try {
      return await api(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${session?.token || ''}` } });
    } catch (error) {
      if (error.status === 401) announceInvalidSession();
      throw error;
    }
  }, [session?.token]);

  const download = useCallback(async (path) => {
    try {
      return await downloadFile(path, { headers: { Authorization: `Bearer ${session?.token || ''}` } });
    } catch (error) {
      if (error.status === 401) announceInvalidSession();
      throw error;
    }
  }, [session?.token]);

  return {
    session,
    accounts,
    accountsLoading,
    busy,
    error,
    setError,
    login,
    logout,
    authorized,
    download,
    targetOrgId,
    selectingRole,
    setSelectingRole,
  };
}

export function useOperationsData(path, session) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(session?.token) });
  const requestId = useRef(0);
  const load = useCallback(async () => {
    if (!session?.token) { setState({ data: null, error: null, loading: false }); return null; }
    const id = ++requestId.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await api(path, { headers: { Authorization: `Bearer ${session.token}` } });
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (error.status === 401) announceInvalidSession();
      if (id === requestId.current) setState({ data: null, error, loading: false });
      throw error;
    }
  }, [path, session?.token]);
  useEffect(() => { load().catch(() => {}); return () => { requestId.current += 1; }; }, [load]);
  return { ...state, reload: load };
}

export function OperationsAccess({ accounts, loading, busy, error, onLogin, roles, component, onCancel }) {
  const visible = accounts.filter((account) => roles.includes(account.role));
  return (
    <section className="operations-access" aria-labelledby="operations-access-title">
      <div className="operations-access__intro">
        <KeyRound size={34} />
        <span className="micro-label">AREA 5 / IDENTITÀ OPERATIVE DEMO</span>
        <h2 id="operations-access-title">Seleziona il ruolo operativo per questo modulo.</h2>
        <p>{component} applica permessi e perimetri dedicati per ciascun ruolo aziendale demo.</p>
        <div>
          <ShieldCheck size={18} />
          <span>I dati visualizzati si adeguano al ruolo operativo selezionato.</span>
        </div>
      </div>
      <div className="operations-access__accounts">
        {loading ? (
          <LoadingState label="Caricamento ruoli operativi" />
        ) : visible.length ? (
          visible.map((account) => (
            <button type="button" key={account.id} onClick={() => onLogin(account.id)} disabled={busy}>
              <span className="operations-account__icon">{account.role === 'SUBCONTRACTOR' ? <Building2 size={22} /> : <UserCheck size={22} />}</span>
              <span>
                <b>{account.displayName}</b>
                <small>{operationsRoleLabel(account.role)} · {account.organizationName}</small>
                <em>{account.assignedSiteIds?.length ? `${account.assignedSiteIds.length} presidio/i assegnato/i` : 'Accesso secondo perimetro organizzazione'}</em>
              </span>
              <ArrowRight size={17} />
            </button>
          ))
        ) : (
          <p className="operations-access__empty">Nessun ruolo operativo disponibile per questa componente nel profilo attivo.</p>
        )}
      </div>
      {onCancel && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="button button--ghost" type="button" onClick={onCancel}>Annulla e mantieni ruolo attuale</button>
        </div>
      )}
      {busy && <p className="operations-access__busy" role="status"><LoaderCircle className="spin" size={18} />Aggiornamento sessione operativa…</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export function OperationsFrame({ operations, roles, component, children }) {
  const { session, accounts, selectingRole, setSelectingRole, login, busy, accountsLoading, error, targetOrgId } = operations;

  const currentOrgId = targetOrgId || session?.member?.organizationId;
  const filteredAccounts = accounts.filter(
    (a) => roles.includes(a.role) && (a.organizationId === currentOrgId || a.role === 'STARTUP_REVIEWER')
  );
  const hasAlternativeRoles = filteredAccounts.length > 1;

  if (!session || selectingRole) {
    return (
      <OperationsAccess
        accounts={filteredAccounts.length ? filteredAccounts : accounts}
        loading={accountsLoading || busy}
        busy={busy}
        error={error}
        onLogin={login}
        roles={roles}
        component={component}
        onCancel={session ? () => setSelectingRole(false) : null}
      />
    );
  }

  return (
    <>
      <div className="operations-identity">
        <span aria-hidden="true">
          {session.member.displayName.split(' ').map((part) => part[0]).join('').slice(0, 2)}
        </span>
        <div>
          <b>{session.member.displayName}</b>
          <small>{operationsRoleLabel(session.member.role)} · {session.member.organizationName}</small>
        </div>
        {hasAlternativeRoles && (
          <button
            className="button button--ghost"
            type="button"
            onClick={() => setSelectingRole(true)}
            title="Simula un ruolo operativo alternativo all'interno dell'organizzazione"
          >
            <UserCheck size={16} />Simula altro ruolo operativo
          </button>
        )}
      </div>
      {!roles.includes(session.member.role) ? (
        <BlockedState
          title="Ruolo non autorizzato per questa componente"
          text={`${component} non è disponibile per ${operationsRoleLabel(session.member.role)}. Seleziona un ruolo autorizzato.`}
        />
      ) : (
        children
      )}
    </>
  );
}

export function ValidationErrors({ errors = [] }) {
  if (!errors.length) return null;
  return <div className="operations-validation" role="alert"><b>Correggi i seguenti punti</b><ul>{errors.map((error, index) => <li key={`${error.cell}-${index}`}><span>{error.cell}</span>{error.message}</li>)}</ul></div>;
}
