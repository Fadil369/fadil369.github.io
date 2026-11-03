import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Command, Languages, Menu, Moon, Sun, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { localized } from '../lib/locale';
import { openPalette, setTheme } from './CommandPalette';

// One header for every page. Items depend on where you are: on the profile, in-page sections;
// elsewhere, the other surfaces. Below 900px the nav collapses into a disclosure menu.
export function ProfileHeader() {
  const { ar, toggle } = useI18n();
  const loc = useLocation();
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme !== 'light');
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.dataset.theme !== 'light');
    window.addEventListener('bs-theme', sync);
    return () => window.removeEventListener('bs-theme', sync);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); menuBtn.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const home = loc.pathname === '/' || loc.pathname === '/profile';
  const items = home
    ? [['/profile#work', 'Work', 'الأعمال'], ['/profile#journey', 'Journey', 'المسار'], ['/profile#research', 'Research', 'البحث'], ['/cv', 'CV', 'السيرة'], ['/bpr', 'BPR', 'BPR'], ['/card', 'Card', 'البطاقة']]
    : [['/profile', 'Profile', 'الملف'], ['/cv', 'CV', 'السيرة'], ['/card', 'Card', 'البطاقة'], ['/bpr', 'BPR', 'BPR']];

  return (
    <header className="profile-head">
      <Link className="profile-brand" to="/profile" aria-label="Dr. Mohamed El Fadil">
        <span>EF</span><strong>{ar ? 'د. محمد الفاضل' : 'Dr. El Fadil'}</strong>
      </Link>
      <nav id="profile-nav" data-open={open} aria-label={ar ? 'التنقل الرئيسي' : 'Main navigation'}>
        {items.map(([to, en, a]) => to.includes('#')
          ? <Link key={to} to={to}>{ar ? a : en}</Link>
          : <NavLink key={to} to={to} end={to === '/'}>{ar ? a : en}</NavLink>)}
      </nav>
      <div className="profile-controls">
        <a href={localized('/')} aria-label={ar ? 'بوابة BrainSAIT' : 'BrainSAIT platform'} title={ar ? 'بوابة BrainSAIT' : 'BrainSAIT platform'}>↗</a>
        <button className="profile-cmdk" onClick={openPalette} aria-label={ar ? 'لوحة الأوامر (Ctrl+K)' : 'Command palette (Ctrl+K)'} aria-keyshortcuts="Control+K Meta+K">
          <Command size={15} /><span>K</span>
        </button>
        <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? (ar ? 'الوضع الفاتح' : 'Light mode') : (ar ? 'الوضع الداكن' : 'Dark mode')}>
          {dark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button onClick={toggle} aria-label={ar ? 'Switch to English' : 'التبديل إلى العربية'}>
          <Languages size={16} /><span>{ar ? 'EN' : 'ع'}</span>
        </button>
        <button ref={menuBtn} className="profile-menu" aria-expanded={open} aria-controls="profile-nav" aria-label={ar ? 'القائمة' : 'Menu'} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
    </header>
  );
}
