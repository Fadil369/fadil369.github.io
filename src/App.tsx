import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import BprHub from './pages/BprHub';
import './styles/app.css';

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
      <div className="profile-actions" style={{ justifyContent: 'center' }}><Link className="profile-button primary" to="/">{ar ? 'الملف الشخصي' : 'Profile'}</Link><Link className="profile-button secondary" to="/catalogue">BPR Hub</Link></div>
    </div>
  );
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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogue" element={<BprHub />} />
          <Route path="/store" element={<BprHub />} />
          <Route path="/oid" element={<BprHub />} />
          <Route path="/learn" element={<BprHub />} />
          <Route path="/solutions" element={<BprHub />} />
          <Route path="/templates" element={<BprHub />} />
          <Route path="/products/bpr" element={<BprHub />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return <I18nProvider><BrowserRouter><AppShell /></BrowserRouter></I18nProvider>;
}
