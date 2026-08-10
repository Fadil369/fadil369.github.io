import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { I18nProvider, useI18n } from './i18n';
import Home from './pages/Home';
import Shelf from './pages/Shelf';
import Build from './pages/Build';
import Product from './pages/Product';
import './styles/app.css';

function Header() {
  const { ar, t, toggle } = useI18n();
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
        </nav>
        <div className="head-actions">
          <a className="button secondary sm" href="https://brainsait.org"
             target="_blank" rel="noopener noreferrer">brainsait.org</a>
          <button className="lang-btn" onClick={toggle}
                  aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
            <Languages size={16} /> {ar ? 'EN' : 'ع'}
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
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learn" element={<Shelf stage="learn" />} />
          <Route path="/solutions" element={<Shelf stage="solutions" />} />
          <Route path="/build" element={<Build />} />
          <Route path="/products/:slug" element={<Product />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </I18nProvider>
  );
}
