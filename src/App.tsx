import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Languages, Sun, Moon } from 'lucide-react';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import Shelf from './pages/Shelf';
import Build from './pages/Build';
import Benefits from './pages/Benefits';
import InfoPage from './pages/InfoPage';
import Product from './pages/Product';
import Account from './pages/Account';
import AccountAuthorize from './pages/AccountAuthorize';
import Track from './pages/Track';
import { isSignedIn as shopifySignedIn } from './lib/customerAccountAuth';
import { withUtm } from './lib/shopifyRouting';
import './styles/app.css';

type Theme = 'dark' | 'light';

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
          {/* Store-side collections that have no gh.io equivalent — route straight to
              Shopify with UTM attribution so both surfaces expose the same catalog. */}
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
          {/* Bidirectional surface switch: Shopify's footer links back to gh.io, so the
              storefront links to the store (checkout) the same way. */}
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
    <footer className="site-foot">
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
        <div className="bg-aurora" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <Header />
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
          <Route path="*" element={<Home />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </I18nProvider>
  );
}
