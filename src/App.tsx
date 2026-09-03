import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Languages, Sun, Moon, ShoppingBag } from 'lucide-react';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import { isSignedIn as shopifySignedIn } from './lib/customerAccountAuth';
import { withUtm } from './lib/shopifyRouting';
import './styles/app.css';

const Shelf = lazy(() => import('./pages/Shelf'));
const Build = lazy(() => import('./pages/Build'));
const Benefits = lazy(() => import('./pages/Benefits'));
const InfoPage = lazy(() => import('./pages/InfoPage'));
const Product = lazy(() => import('./pages/Product'));
const Account = lazy(() => import('./pages/Account'));
const AccountAuthorize = lazy(() => import('./pages/AccountAuthorize'));
const Track = lazy(() => import('./pages/Track'));

type Theme = 'dark' | 'light';

/* ═══════════════════════════════════════════════════════════
   Skeleton Loading States
   ═══════════════════════════════════════════════════════════ */

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__cover skeleton" />
      <div className="skeleton-card__body">
        <div className="skeleton skeleton-card__eyebrow" />
        <div className="skeleton skeleton-card__title" />
        <div className="skeleton skeleton-card__prop" />
        <div className="skeleton skeleton-card__price" />
        <div className="skeleton-card__cta">
          <div className="skeleton skeleton-card__btn" />
          <div className="skeleton skeleton-card__btn" />
        </div>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="skeleton" style={{ height: '200px', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }} />
        <div className="skeleton" style={{ height: '28px', width: '60%', margin: '0 auto 1rem', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ height: '16px', width: '80%', margin: '0 auto 2rem', borderRadius: 'var(--radius-sm)' }} />
        <div className="grid is-loading" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   404 Page
   ═══════════════════════════════════════════════════════════ */

function NotFound() {
  const { ar, t } = useI18n();
  return (
    <div className="page" style={{ padding: '4rem 2rem', textAlign: 'center', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '500px' }}>
        <div className="skeleton" style={{ height: '120px', width: '120px', borderRadius: '24px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: '800', color: 'var(--gold)' }}>
          404
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: '28px', marginBottom: '0.5rem' }}>
          {ar ? 'الصفحة غير موجودة' : 'Page Not Found'}
        </h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem', lineHeight: 1.6 }}>
          {ar
            ? 'العذر، الصفحة التي تبحث عنها لم تعد متاحة أو لم تكن موجودة أبداً.'
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="button primary">
            {ar ? '↩ العودة للمتجر' : '↩ Back to Store'}
          </Link>
          <Link to="/learn" className="button secondary">
            📚 {ar ? 'تعلّم' : 'Learn'}
          </Link>
          <Link to="/solutions" className="button secondary">
            🚀 {ar ? 'حلول' : 'Solutions'}
          </Link>
        </div>
        <nav style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/learn" style={{ color: 'var(--ink-soft)', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--line)', background: 'var(--surface)' }}>
            {ar ? 'تعلّم' : 'Learn'}
          </Link>
          <Link to="/build" style={{ color: 'var(--ink-soft)', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--line)', background: 'var(--surface)' }}>
            {ar ? 'ابنِ' : 'Build'}
          </Link>
          <Link to="/solutions" style={{ color: 'var(--ink-soft)', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--line)', background: 'var(--surface)' }}>
            {ar ? 'حلول' : 'Solutions'}
          </Link>
          <Link to="/benefits" style={{ color: 'var(--ink-soft)', fontSize: '13px', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--line)', background: 'var(--surface)' }}>
            {ar ? 'المزايا' : 'Benefits'}
          </Link>
        </nav>
      </div>
    </div>
  );
}

function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const t = localStorage.getItem('bs-theme');
      return t === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('bs-theme', theme); } catch { /* ignore */ }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => (t === 'dark' ? 'light' : 'dark')) };
}

function SkipLink() {
  const { ar } = useI18n();
  return (
    <a href="#main-content" className="skip-to-content-link">
      {ar ? 'تخطي إلى المحتوى' : 'Skip to content'}
    </a>
  );
}

function Header() {
  const { ar, t, toggle } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <header className="site-head">
      <div className="head-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">B</span>
          <span className="brand-name">{t('brand')}</span>
        </Link>
        <nav className="main-nav">
          <NavLink to="/learn">{t('nav.learn')}</NavLink>
          <NavLink to="/build">{t('nav.build')}</NavLink>
          <NavLink to="/solutions">{t('nav.solutions')}</NavLink>
          <a
            href={withUtm('https://store.brainsait.de/collections/solutions-ready', { utm_content: 'nav-solutions-ready' })}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ar ? 'حلول جاهزة' : 'Solutions Ready'}
          </a>
          <a
            href={withUtm('https://store.brainsait.de/collections/all', { utm_content: 'nav-catalog' })}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ar ? 'الكتالوج' : 'Catalog'}
          </a>
          <NavLink to="/benefits">{ar ? 'المزايا' : 'Benefits'}</NavLink>
          <NavLink to="/account">
            {ar ? 'حسابي' : 'Account'}
            {shopifySignedIn() && <span className="acct-dot" aria-hidden="true" />}
          </NavLink>
        </nav>
        <div className="head-actions">
          <a
            className="button secondary sm"
            href={withUtm('https://store.brainsait.de', { utm_content: 'header-store' })}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ar ? 'المتجر' : 'Store'}
          </a>
          <a className="button secondary sm" href="https://brainsait.org"
             target="_blank" rel="noopener noreferrer">brainsait.org</a>
          <button className="icon-btn round" onClick={toggleTheme}
                  aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
                  title={theme === 'dark' ? t('theme.light') : t('theme.dark')}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="lang-btn icon-btn" onClick={toggle}
                  aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
            <Languages size={15} /> {ar ? 'EN' : 'ع'}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const { ar, t } = useI18n();
  return (
    <footer className="site-foot" role="contentinfo">
      <nav className="foot-nav" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.6rem' }}>
        <Link to="/faq">{ar ? 'الأسئلة الشائعة' : 'FAQ'}</Link>
        <Link to="/support">{ar ? 'الدعم' : 'Support'}</Link>
        <Link to="/contact">{ar ? 'تواصل معنا' : 'Contact'}</Link>
        <Link to="/terms">{ar ? 'شروط الخدمة' : 'Terms'}</Link>
      </nav>
      <p>{t('checkout.note')}</p>
      <p className="muted">
        © {new Date().getFullYear()} BrainSAIT LTD ·{' '}
        {ar ? 'جميع الحقوق محفوظة' : 'All rights reserved'}
      </p>
    </footer>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <div className="bg-aurora" aria-hidden="true" />
        <SkipLink />
        <Header />
        <main id="main-content">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/learn" element={<Shelf stage="learn" />} />
              <Route path="/solutions" element={<Shelf stage="solutions" />} />
              <Route path="/build" element={<Build />} />
              <Route path="/benefits" element={<Benefits />} />
              <Route path="/faq" element={<InfoPage page="faq" />} />
              <Route path="/terms" element={<InfoPage page="terms" />} />
              <Route path="/support" element={<InfoPage page="support" />} />
              <Route path="/contact" element={<InfoPage page="contact" />} />
              <Route path="/products/:slug" element={<Product />} />
              <Route path="/account" element={<Account />} />
              <Route path="/account/authorize" element={<AccountAuthorize />} />
              <Route path="/track" element={<Track />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </BrowserRouter>
    </I18nProvider>
  );
}