import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import ProfessionalCv from './pages/ProfessionalCv';
import BusinessCard from './pages/BusinessCard';
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

function AppShell() {
  const location = useLocation();
  useEffect(() => {
    document.documentElement.classList.add('profile-home');
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <SkipLink />
      <main id="main-content">
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
          <Route path="/doctors/:spid" element={<SpidRedirect />} />
          {['/catalogue', '/store', '/oid', '/learn', '/solutions', '/templates', '/products/bpr', '/doctors'].map((p) => <Route key={p} path={p} element={<Navigate to="/bpr" replace />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
    </>
  );
}

export default function App() {
  return <I18nProvider><BrowserRouter><AppShell /></BrowserRouter></I18nProvider>;
}
