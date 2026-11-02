import { Component, lazy, ReactNode, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import ProfessionalCv from './pages/ProfessionalCv';
import BusinessCard from './pages/BusinessCard';
import CommandPalette from './components/CommandPalette';
import { BASENAME } from './lib/locale';
import './styles/app.css';

const Overview = lazy(() => import('./pages/bpr/Overview'));
const Providers = lazy(() => import('./pages/bpr/Providers'));
const ProviderProfile = lazy(() => import('./pages/bpr/ProviderProfile'));
const Verify = lazy(() => import('./pages/bpr/Verify'));
const Ledger = lazy(() => import('./pages/bpr/Ledger'));
const Research = lazy(() => import('./pages/bpr/Research'));
const Developers = lazy(() => import('./pages/bpr/Developers'));
const Status = lazy(() => import('./pages/bpr/Status'));
const Join = lazy(() => import('./pages/bpr/Join'));
const Workspace = lazy(() => import('./pages/bpr/Workspace'));
const Embed = lazy(() => import('./pages/bpr/Embed'));
const Record = lazy(() => import('./pages/bpr/Record'));
const Saudi = lazy(() => import('./pages/bpr/Saudi'));
const Nphies = lazy(() => import('./pages/bpr/Nphies'));
const Slots = lazy(() => import('./pages/Slots'));

function SkipLink() {
  const { ar } = useI18n();
  return <a href="#main-content" className="skip-to-content-link">{ar ? 'تخطي إلى المحتوى' : 'Skip to content'}</a>;
}

function NotFound() {
  const { ar } = useI18n();
  return (
    <div className="profile-page" style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', padding: 30, textAlign: 'center' }}>
      <div className="profile-section-label">404 · BPR</div>
      <h1>{ar ? 'هذه الصفحة غير موجودة' : 'This page is not in the registry'}</h1>
      <p style={{ color: 'var(--profile-muted)' }}>{ar ? 'عد إلى الملف المهني أو افتح سجل مقدمي الخدمة.' : 'Return to the professional profile or open the provider registry.'}</p>
      <div className="profile-actions" style={{ justifyContent: 'center' }}><Link className="profile-button primary" to="/">{ar ? 'الملف الشخصي' : 'Profile'}</Link><Link className="profile-button secondary" to="/bpr">BPR</Link></div>
    </div>
  );
}

function SpidRedirect() {
  const spid = useParams().spid || '';
  return <Navigate to={`/bpr/p/${spid.toUpperCase()}`} replace />;
}

class RouteBoundary extends Component<{ children: ReactNode; ar: boolean; path: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(prev: { path: string }) { if (prev.path !== this.props.path && this.state.failed) this.setState({ failed: false }); }
  render() {
    if (!this.state.failed) return this.props.children;
    const { ar } = this.props;
    return (
      <div className="profile-page" style={{ minHeight: '60vh', display: 'grid', placeContent: 'center', padding: 30, textAlign: 'center' }} role="alert">
        <h1 style={{ fontSize: 28 }}>{ar ? 'تعذّر تحميل هذه الصفحة' : 'This page could not load'}</h1>
        <p style={{ color: 'var(--profile-muted)' }}>{ar ? 'قد يكون الاتصال مقطوعًا. حاول مرة أخرى عند عودة الاتصال.' : 'You may be offline. Try again when the connection is back.'}</p>
        <div className="profile-actions" style={{ justifyContent: 'center' }}><button className="profile-button primary" onClick={() => window.location.reload()}>{ar ? 'إعادة المحاولة' : 'Try again'}</button><Link className="profile-button secondary" to="/">{ar ? 'الملف الشخصي' : 'Profile'}</Link></div>
      </div>
    );
  }
}

function OfflineBanner() {
  const { ar } = useI18n();
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return <div className="offline-banner" role="status">{ar
    ? 'أنت غير متصل. تُعرض النسخة المحفوظة؛ تعمل فحوص التوقيع على اللقطة المحفوظة.'
    : 'You are offline. Showing the saved copy; signature checks run against the saved snapshot.'}</div>;
}

function AppShell() {
  const location = useLocation();
  useEffect(() => {
    document.documentElement.classList.add('profile-home');
  }, []);
  // Route change: jump to the top instantly. Hash link (/#work): scroll to that section, also when
  // the hash changes on the same page — pushState navigation never does this by itself.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const go = () => {
      const el = id ? document.getElementById(id) : null;
      if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    if (id) requestAnimationFrame(() => requestAnimationFrame(go)); else go();
  }, [location.pathname, location.hash]);
  return (
    <>
      <SkipLink />
      <CommandPalette />
      <OfflineBanner />
      <main id="main-content">
        <RouteBoundary ar={document.documentElement.lang === 'ar'} path={location.pathname}>
        <Suspense fallback={<div className="profile-page" style={{ minHeight: '100vh' }} />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cv" element={<ProfessionalCv />} />
          <Route path="/card" element={<BusinessCard />} />
          <Route path="/bpr" element={<Overview />} />
          <Route path="/bpr/providers" element={<Providers />} />
          <Route path="/bpr/p/:spid" element={<ProviderProfile />} />
          <Route path="/bpr/verify" element={<Verify />} />
          <Route path="/bpr/ledger" element={<Ledger />} />
          <Route path="/bpr/research" element={<Research />} />
          <Route path="/bpr/research/:spid" element={<Research />} />
          <Route path="/bpr/developers" element={<Developers />} />
          <Route path="/bpr/status" element={<Status />} />
          <Route path="/bpr/join" element={<Join />} />
          <Route path="/bpr/workspace" element={<Workspace />} />
          <Route path="/bpr/embed/:spid" element={<Embed />} />
          <Route path="/bpr/record" element={<Record />} />
          <Route path="/bpr/saudi" element={<Saudi />} />
          <Route path="/bpr/nphies" element={<Nphies />} />
          <Route path="/slots" element={<Slots />} />
          <Route path="/id" element={<Navigate to="/bpr/record" replace />} />
          <Route path="/doctors/:spid" element={<SpidRedirect />} />
          {['/catalogue', '/store', '/oid', '/learn', '/solutions', '/templates', '/products/bpr', '/doctors'].map((p) => <Route key={p} path={p} element={<Navigate to="/bpr" replace />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteBoundary>
      </main>
    </>
  );
}

export default function App() {
  return <I18nProvider><BrowserRouter basename={BASENAME}><AppShell /></BrowserRouter></I18nProvider>;
}
