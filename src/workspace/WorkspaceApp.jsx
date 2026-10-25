import { createContext, lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CheckCircle2,
  ChevronDown,
  Database,
  FileStack,
  Files,
  FolderCheck,
  GraduationCap,
  Gauge,
  Globe2,
  Home,
  Landmark,
  Menu,
  Newspaper,
  Network,
  Palette,
  Presentation,
  ShoppingCart,
  ShieldCheck,
  Truck,
  WalletCards,
  X,
} from 'lucide-react';
import LandingPage from '../App.jsx';
import { BlockedState, DemoNotice, ErrorState, LoadingState, useApiData } from './ui.jsx';
import { api } from './api.js';
import { RouteErrorBoundary } from './RouteErrorBoundary.jsx';
import { getTerminology } from '../lib/terminology.js';

const Scope3Page = lazy(() => import('./Scope3Page.jsx').then((module) => ({ default: module.Scope3Page })));
const AttestationsPage = lazy(() => import('./AttestationsPage.jsx').then((module) => ({ default: module.AttestationsPage })));
const ReportsPage = lazy(() => import('./ReportsPage.jsx').then((module) => ({ default: module.ReportsPage })));
const PacksPage = lazy(() => import('./PacksPage.jsx').then((module) => ({ default: module.PacksPage })));
const BrandKitPage = lazy(() => import('./BrandKitPage.jsx').then((module) => ({ default: module.BrandKitPage })));
const EditorialPage = lazy(() => import('./EditorialPage.jsx').then((module) => ({ default: module.EditorialPage })));
const PartnerRegistryPage = lazy(() => import('./PartnerRegistryPage.jsx').then((module) => ({ default: module.PartnerRegistryPage })));
const HospitalityPage = lazy(() => import('./HospitalityPage.jsx').then((module) => ({ default: module.HospitalityPage })));
const LearningPage = lazy(() => import('./LearningPage.jsx').then((module) => ({ default: module.LearningPage })));
const FundDirectionPage = lazy(() => import('./FundDirectionPage.jsx').then((module) => ({ default: module.FundDirectionPage })));
const BoardBriefingPage = lazy(() => import('./BoardBriefingPage.jsx').then((module) => ({ default: module.BoardBriefingPage })));
const BulkOrderPage = lazy(() => import('./BulkOrderPage.jsx').then((module) => ({ default: module.BulkOrderPage })));
const BenefitDashboardPage = lazy(() => import('./BenefitDashboardPage.jsx').then((module) => ({ default: module.BenefitDashboardPage })));
const LogisticsPlannerPage = lazy(() => import('./LogisticsPlannerPage.jsx').then((module) => ({ default: module.LogisticsPlannerPage })));
const SubcontractorNetworkPage = lazy(() => import('./SubcontractorNetworkPage.jsx').then((module) => ({ default: module.SubcontractorNetworkPage })));
const TransparencyRegisterPage = lazy(() => import('./TransparencyPublicPages.jsx').then((module) => ({ default: module.TransparencyRegisterPage })));
const TransparencyProjectPage = lazy(() => import('./TransparencyPublicPages.jsx').then((module) => ({ default: module.TransparencyProjectPage })));
const FundVerificationPage = lazy(() => import('./PublicPages.jsx').then((module) => ({ default: module.FundVerificationPage })));
const PackSharePage = lazy(() => import('./PublicPages.jsx').then((module) => ({ default: module.PackSharePage })));
const BrandInvitationPage = lazy(() => import('./Area2PublicPages.jsx').then((module) => ({ default: module.BrandInvitationPage })));
const EditorialPublicPage = lazy(() => import('./Area2PublicPages.jsx').then((module) => ({ default: module.EditorialPublicPage })));
const PartnerDirectoryPage = lazy(() => import('./Area2PublicPages.jsx').then((module) => ({ default: module.PartnerDirectoryPage })));
const PartnerPublicDetailPage = lazy(() => import('./Area2PublicPages.jsx').then((module) => ({ default: module.PartnerPublicDetailPage })));
const CertificateVerificationPage = lazy(() => import('./Area3PublicPages.jsx').then((module) => ({ default: module.CertificateVerificationPage })));

export const WorkspaceContext = createContext(null);

export const RESTRICTED_SUB_MODULES = new Set(['C03', 'C04', 'C06', 'C10', 'C11', 'C15']);

export function getNavigationItems(profileType, role) {
  const isSub = role === 'SUBCONTRACTOR';
  const isCsr = profileType === 'CSR_ORIENTED';
  const items = [
    { path: '/app/esg/scope-3', id: 'C01', title: 'Scope 3 Data Hub', short: 'Scope 3', icon: Database, area: '01' },
    { path: '/app/fondo/attestazioni', id: 'C02', title: 'Fondo & Audit Trail', short: 'Attestazioni', icon: WalletCards, area: '01' },
    { path: '/app/report', id: 'C03', title: isCsr ? 'Bilancio ESG & Report Composer' : 'Impact Report Composer', short: isCsr ? 'Bilancio ESG' : 'Report', icon: Files, area: '01' },
    { path: '/app/evidence-packs', id: 'C04', title: 'Assurance & Bank Pack', short: 'Evidence Pack', icon: FolderCheck, area: '01' },
    { path: '/app/brand-kit', id: 'C05', title: 'Co-Brand Asset Studio', short: 'Brand Kit', icon: Palette, area: '02' },
    { path: '/app/editoriale', id: 'C06', title: 'Editorial & Executive CMS', short: 'CMS', icon: Newspaper, area: '02' },
    { path: '/app/registro-partner', id: 'C07', title: 'Public Partner Registry', short: 'Partner', icon: Building2, area: '02' },
    { path: '/app/hospitality', id: 'C08', title: 'Hospitality Booking Hub', short: 'Hospitality', icon: BedDouble, area: '03' },
    { path: '/app/e-learning', id: 'C09', title: 'E-Learning & Certificates', short: 'E-Learning', icon: GraduationCap, area: '03' },
    { path: '/app/governance/indirizzo-fondo', id: 'C10', title: 'Fund Direction Console', short: 'Indirizzo Fondo', icon: Landmark, area: '04' },
    { path: '/app/governance/briefing', id: 'C11', title: 'Board Briefing Room', short: 'Board Briefing', icon: Presentation, area: '04' },
    { path: '/app/ordini', id: 'C12', title: 'Bulk Order Portal', short: 'Ordini', icon: ShoppingCart, area: '05' },
    { path: '/app/dashboard', id: 'C13', title: 'Benefit & Threshold Dashboard', short: 'Dashboard', icon: Gauge, area: '05' },
    { path: '/trasparenza', id: 'C14', title: 'Public Transparency Register', short: 'Trasparenza', icon: Globe2, area: '05' },
    { path: '/app/logistica', id: 'C15', title: isCsr ? 'Logistica Sedi & Spedizioni' : 'Multi-Site Logistics Planner', short: 'Logistica', icon: Truck, area: '05' },
    { path: '/app/filiera', id: 'C16', title: isCsr ? 'Supply Chain & Partner Network' : 'Subcontractor Network Console', short: isCsr ? 'Supply Chain' : 'Filiera', icon: Network, area: '05' },
  ];
  return items.filter((item) => !isSub || !RESTRICTED_SUB_MODULES.has(item.id));
}

export const workspaceNavigation = [
  { path: '/app/esg/scope-3', id: 'C01', title: 'Scope 3 Data Hub', short: 'Scope 3', icon: Database, area: '01' },
  { path: '/app/fondo/attestazioni', id: 'C02', title: 'Fondo & Audit Trail', short: 'Attestazioni', icon: WalletCards, area: '01' },
  { path: '/app/report', id: 'C03', title: 'Impact Report Composer', short: 'Report', icon: Files, area: '01' },
  { path: '/app/evidence-packs', id: 'C04', title: 'Assurance & Bank Pack', short: 'Evidence Pack', icon: FolderCheck, area: '01' },
  { path: '/app/brand-kit', id: 'C05', title: 'Co-Brand Asset Studio', short: 'Brand Kit', icon: Palette, area: '02' },
  { path: '/app/editoriale', id: 'C06', title: 'Editorial & Executive CMS', short: 'CMS', icon: Newspaper, area: '02' },
  { path: '/app/registro-partner', id: 'C07', title: 'Public Partner Registry', short: 'Partner', icon: Building2, area: '02' },
  { path: '/app/hospitality', id: 'C08', title: 'Hospitality Booking Hub', short: 'Hospitality', icon: BedDouble, area: '03' },
  { path: '/app/e-learning', id: 'C09', title: 'E-Learning & Certificates', short: 'E-Learning', icon: GraduationCap, area: '03' },
  { path: '/app/governance/indirizzo-fondo', id: 'C10', title: 'Fund Direction Console', short: 'Indirizzo Fondo', icon: Landmark, area: '04' },
  { path: '/app/governance/briefing', id: 'C11', title: 'Board Briefing Room', short: 'Board Briefing', icon: Presentation, area: '04' },
  { path: '/app/ordini', id: 'C12', title: 'Bulk Order Portal', short: 'Ordini', icon: ShoppingCart, area: '05' },
  { path: '/app/dashboard', id: 'C13', title: 'Benefit & Threshold Dashboard', short: 'Dashboard', icon: Gauge, area: '05' },
  { path: '/trasparenza', id: 'C14', title: 'Public Transparency Register', short: 'Trasparenza', icon: Globe2, area: '05' },
  { path: '/app/logistica', id: 'C15', title: 'Multi-Site Logistics Planner', short: 'Logistica', icon: Truck, area: '05' },
  { path: '/app/filiera', id: 'C16', title: 'Subcontractor Network Console', short: 'Filiera', icon: Network, area: '05' },
];

function WorkspaceBrand() {
  return (
    <Link className="workspace-brand" to="/" aria-label="Sibillini Impact, torna alla landing">
      <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
      <span className="brand__name">SIBILLINI<span>IMPACT</span></span>
      <small>AREE 01—05 / WORKSPACE</small>
    </Link>
  );
}

function WorkspaceLayout() {
  const { data, error, loading, reload } = useApiData('/area1/bootstrap');
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const location = useLocation();
  const isPublicRegister = location.pathname === '/trasparenza' || location.pathname.startsWith('/trasparenza/');

  const activeNavigation = useMemo(() => {
    return getNavigationItems(data?.organization?.profileType, data?.organization?.role);
  }, [data?.organization]);

  const currentNavigation = activeNavigation.find((item) => item.path === location.pathname)
    || workspaceNavigation.find((item) => item.path === location.pathname)
    || (isPublicRegister ? workspaceNavigation.find((item) => item.id === 'C14') : null);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const previous = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.append(meta);
    }
    meta.setAttribute('content', isPublicRegister ? 'index, follow' : 'noindex, nofollow, noarchive');
    return () => {
      if (previous === null) meta.remove();
      else meta.setAttribute('content', previous);
    };
  }, [isPublicRegister]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);
  const notify = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, type, message }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4500);
  }, []);

  const [switching, setSwitching] = useState(false);
  const handleSwitchOrg = async (organizationId) => {
    if (!organizationId || organizationId === data?.organization?.id) return;
    setSwitching(true);
    try {
      await api('/area1/organization/switch', {
        method: 'POST',
        body: JSON.stringify({ organizationId })
      });
      const targetOrg = data?.organizations?.find((o) => o.id === organizationId);
      notify('success', `Profilo attivo: ${targetOrg?.name || organizationId}`);
      await reload();
      window.dispatchEvent(new Event('sibillini:org-changed'));
    } catch (err) {
      notify('error', 'Impossibile cambiare organizzazione: ' + err.message);
    } finally {
      setSwitching(false);
    }
  };

  const context = useMemo(() => ({ bootstrap: data, notify }), [data, notify]);

  const navGroups = [
    { area: '01', label: 'COMPLIANCE ESG' },
    { area: '02', label: 'RELATIONSHIP & CONTENT' },
    { area: '03', label: 'WELFARE & OPERATIONS' },
    { area: '04', label: 'GOVERNANCE & BOARD' },
    { area: '05', label: 'DIGITAL OPERATIONS' },
  ];

  return (
    <WorkspaceContext.Provider value={context}>
      <a className="skip-link" href="#workspace-main">Vai al contenuto operativo</a>
      <div className="workspace-shell">
        <aside className={`workspace-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Aree servizi">
          <div className="workspace-sidebar__top"><WorkspaceBrand /><button className="icon-button workspace-sidebar__close" type="button" onClick={() => setMenuOpen(false)} aria-label="Chiudi navigazione"><X /></button></div>
          <div className="workspace-sidebar__areas">
            {navGroups.map((group) => {
              const groupItems = activeNavigation.filter((item) => item.area === group.area);
              if (!groupItems.length) return null;
              return (
                <div className="workspace-nav-group" key={group.area}>
                  <div className="workspace-sidebar__section-label"><span>{group.label}</span><b>{group.area}</b></div>
                  <nav className="workspace-nav" aria-label={`Componenti digitali Area ${Number(group.area)}`}>
                    {groupItems.map(({ path, id, title, icon: Icon }) => (
                      <NavLink key={path} to={path} className={({ isActive }) => isActive ? 'is-active' : ''}>
                        <Icon size={20} /><span><small>{id}</small>{title}</span><ArrowRight size={16} />
                      </NavLink>
                    ))}
                  </nav>
                </div>
              );
            })}
          </div>
          <div className="workspace-sidebar__lower">
            <div className="workspace-assurance"><ShieldCheck size={20} /><div><b>Presidio del garante</b><p>Stati di revisione separati dai dati e dalle evidenze.</p></div></div>
            <Link className="workspace-back" to="/"><ArrowLeft size={17} />Torna ai servizi</Link>
            <div className="workspace-user">
              <span>{isPublicRegister ? 'C14' : data?.organization?.profileType === 'CSR_ORIENTED' ? 'CSR' : data?.organization?.role === 'SUBCONTRACTOR' ? 'SUB' : 'GC'}</span>
              <div>
                <b>{isPublicRegister ? 'Accesso pubblico' : data?.organization?.name || 'Utente demo'}</b>
                <small>
                  {isPublicRegister
                    ? 'Nessuna identità richiesta · dati aggregati'
                    : data?.organization?.profileType === 'CSR_ORIENTED'
                    ? 'Impresa CSR-oriented · Partner Promotore'
                    : data?.organization?.role === 'SUBCONTRACTOR'
                    ? 'Impresa di Filiera · Subappaltatore Aderente'
                    : 'General Contractor · Commessa & Cantieri'}
                </small>
              </div>
            </div>
          </div>
        </aside>
        {menuOpen && <button className="workspace-scrim" type="button" aria-label="Chiudi navigazione" onClick={() => setMenuOpen(false)} />}
        <div className="workspace-content">
          <DemoNotice />
          <header className="workspace-topbar">
            <button className="icon-button workspace-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Apri navigazione workspace" aria-expanded={menuOpen}><Menu /></button>
            <div className="workspace-breadcrumb"><Home size={15} /><span>Area {Number(currentNavigation?.area || 1)}</span><span>/</span><b>{currentNavigation?.short || 'Workspace'}</b></div>
            <div className="workspace-topbar__actions">
              {isPublicRegister ? <span className="role-chip">REGISTRO PUBBLICO · LETTURA LIBERA</span> : <>
                <label className="organization-switcher" title="Cambia account / tenant per testare profili diversi">
                  <Building2 size={18} />
                  <span className="sr-only">Organizzazione corrente</span>
                  <select
                    aria-label="Organizzazione corrente"
                    value={data?.organization?.id || ''}
                    onChange={(e) => handleSwitchOrg(e.target.value)}
                    disabled={!data || switching}
                  >
                    {(data?.organizations || [data?.organization]).filter(Boolean).map((org) => {
                      const roleDesc = org.profileType === 'CSR_ORIENTED'
                        ? 'Impresa CSR (Stabilimenti & Filiera)'
                        : org.role === 'SUBCONTRACTOR'
                        ? 'Subappaltatore (Filiera Operativa)'
                        : 'General Contractor (Edilizia & Cantieri)';
                      return (
                        <option key={org.id} value={org.id}>
                          {org.name} · {roleDesc}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown size={15} />
                </label>
                <span className="role-chip">
                  {data?.organization?.profileType === 'CSR_ORIENTED'
                    ? 'COMMITTENTE CSR · DEMO'
                    : data?.organization?.role === 'SUBCONTRACTOR'
                    ? 'FILIERA / SUBAPPALTO · DEMO'
                    : 'GENERAL CONTRACTOR · DEMO'}
                </span>
              </>}
            </div>
          </header>
          <main id="workspace-main" className="workspace-main" tabIndex="-1">
            {isPublicRegister ? <RouteErrorBoundary resetKey={location.pathname}><Suspense fallback={<LoadingState label="Caricamento registro pubblico" />}><Outlet /></Suspense></RouteErrorBoundary> : <>
              {loading && !data && <LoadingState label="Inizializzazione workspace demo" />}
              {error && <ErrorState error={error} onRetry={() => reload().catch(() => {})} />}
              {data && <RouteErrorBoundary resetKey={`${location.pathname}-${data?.organization?.id}`}><Suspense fallback={<LoadingState label="Caricamento modulo operativo" />}><Outlet key={data?.organization?.id} /></Suspense></RouteErrorBoundary>}
            </>}
          </main>
          <footer className="workspace-footer"><span>SIBILLINI IMPACT / AREE 01—05</span><span>Vertical slice C01—C16 · dati persistenti nel workspace demo</span></footer>
        </div>
      </div>
      <div className="toast-region" aria-live="polite" aria-atomic="false">{toasts.map((toast) => <div className={`toast toast--${toast.type}`} key={toast.id}>{toast.type === 'success' ? <CheckCircle2 size={19} /> : <FileStack size={19} />}<span>{toast.message}</span><button type="button" onClick={() => setToasts((items) => items.filter((item) => item.id !== toast.id))} aria-label="Chiudi notifica"><X size={16} /></button></div>)}</div>
    </WorkspaceContext.Provider>
  );
}

function RoleGuard({ id, title, children }) {
  const { bootstrap } = useContext(WorkspaceContext);
  const isSub = bootstrap?.organization?.role === 'SUBCONTRACTOR';
  if (isSub && RESTRICTED_SUB_MODULES.has(id)) {
    return (
      <div className="module-page workspace-page">
        <header className="module-heading">
          <div>
            <div className="eyebrow"><span /> ACCESSO RISERVATO AL COMMITTENTE</div>
            <h1>{title}<br /><em>Non accessibile per profilo filiera.</em></h1>
            <p>Questo servizio è riservato all’Impresa Committente (General Contractor o Impresa CSR Promotrice). In qualità di Impresa di Filiera / Subappaltatore hai accesso ad attestazioni, ordini, badge, formazioni e dashboard benefit.</p>
          </div>
        </header>
        <BlockedState
          title={`Modulo ${id} non disponibile per Subappaltatori / Imprese di Filiera`}
          text="I tuoi permessi attuali non includono la governance o il reporting consolidato del committente. Utilizza il selettore in alto per passare a un profilo Committente se desideri testare queste funzionalità."
        />
        <div style={{ marginTop: '24px' }}>
          <Link className="button button--cobalt" to="/app/dashboard">Vai alla Dashboard Benefit (C13) <ArrowRight size={16} /></Link>
        </div>
      </div>
    );
  }
  return children;
}

function PublicRoute({ children }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundary resetKey={pathname}><Suspense fallback={<main className="public-state-page"><LoadingState label="Caricamento pagina pubblica" /></main>}>{children}</Suspense></RouteErrorBoundary>;
}

function NotFound() {
  return <main className="public-state-page"><DemoNotice /><div className="public-state-card"><span className="micro-label">ERRORE 404</span><h1>Questo percorso non esiste.</h1><p>La route richiesta non è disponibile oppure il collegamento non è corretto.</p><Link className="button button--dark" to="/">Torna a Sibillini Impact <ArrowRight size={17} /></Link></div></main>;
}

function ScrollManager() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

export default function WorkspaceApp() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<WorkspaceLayout />}>
          <Route path="/app" element={<Navigate to="/app/esg/scope-3" replace />} />
          <Route path="/app/esg/scope-3" element={<Scope3Page />} />
          <Route path="/app/fondo/attestazioni" element={<AttestationsPage />} />
          <Route path="/app/report" element={<RoleGuard id="C03" title="Impact Report Composer"><ReportsPage /></RoleGuard>} />
          <Route path="/app/evidence-packs" element={<RoleGuard id="C04" title="Assurance & Bank Pack"><PacksPage /></RoleGuard>} />
          <Route path="/app/brand-kit" element={<BrandKitPage />} />
          <Route path="/app/editoriale" element={<RoleGuard id="C06" title="Editorial & Executive CMS"><EditorialPage /></RoleGuard>} />
          <Route path="/app/registro-partner" element={<PartnerRegistryPage />} />
          <Route path="/app/hospitality" element={<HospitalityPage />} />
          <Route path="/app/e-learning" element={<LearningPage />} />
          <Route path="/app/governance/indirizzo-fondo" element={<RoleGuard id="C10" title="Fund Direction Console"><FundDirectionPage /></RoleGuard>} />
          <Route path="/app/governance/briefing" element={<RoleGuard id="C11" title="Board Briefing Room"><BoardBriefingPage /></RoleGuard>} />
          <Route path="/app/ordini" element={<BulkOrderPage />} />
          <Route path="/app/dashboard" element={<BenefitDashboardPage />} />
          <Route path="/trasparenza" element={<TransparencyRegisterPage />} />
          <Route path="/trasparenza/:slug" element={<TransparencyProjectPage />} />
          <Route path="/app/logistica" element={<RoleGuard id="C15" title="Multi-Site Logistics Planner"><LogisticsPlannerPage /></RoleGuard>} />
          <Route path="/app/filiera" element={<SubcontractorNetworkPage />} />
        </Route>
        <Route path="/verifica/fondo/:token" element={<PublicRoute><FundVerificationPage /></PublicRoute>} />
        <Route path="/condivisioni/evidence/:token" element={<PublicRoute><PackSharePage /></PublicRoute>} />
        <Route path="/inviti/kit/:token" element={<PublicRoute><BrandInvitationPage /></PublicRoute>} />
        <Route path="/case-history/:slug" element={<PublicRoute><EditorialPublicPage type="case-history" /></PublicRoute>} />
        <Route path="/best-practice/:slug" element={<PublicRoute><EditorialPublicPage type="best-practice" /></PublicRoute>} />
        <Route path="/partner" element={<PublicRoute><PartnerDirectoryPage /></PublicRoute>} />
        <Route path="/partner/:slug" element={<PublicRoute><PartnerPublicDetailPage /></PublicRoute>} />
        <Route path="/verifica/attestato/:token" element={<PublicRoute><CertificateVerificationPage /></PublicRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
