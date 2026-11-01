import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { useI18n } from '../i18n';
import { providers, Provider, SPID_RE } from '../lib/bpr';
import { buildVCard, OWNER } from '../utils/identity';
import '../styles/palette.css';

// ⌘K / Ctrl+K anywhere: jump to a page, find a provider, verify an SPID, or run an action.
// Opened from the header button too. Providers load from the registry the first time it opens.

type Item = { id: string; group: string; label: string; hint?: string; keys?: string; run: () => void };

export function openPalette() { window.dispatchEvent(new Event('bs-palette')); }

export function setTheme(next: 'light' | 'dark') {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('bs-theme', next); } catch { /* storage is optional */ }
  window.dispatchEvent(new Event('bs-theme'));
}

export function downloadVCard() {
  const blob = new Blob([buildVCard(OWNER)], { type: 'text/vcard;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Dr-Mohamed-El-Fadil.vcf';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا');

export default function CommandPalette() {
  const { ar, toggle } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [list, setList] = useState<Provider[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('bs-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('bs-palette', onOpen); };
  }, []);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    setQ(''); setActive(0);
    setTimeout(() => input.current?.focus(), 0);
    if (!list.length) providers().then((r) => setList(r.data.items), () => {});
    return () => { (opener.current as HTMLElement | null)?.focus?.(); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (to: string) => () => { setOpen(false); nav(to); };
  const items = useMemo<Item[]>(() => {
    const P = ar ? 'الصفحات' : 'Pages', B = 'BPR', A = ar ? 'إجراءات' : 'Actions', D = ar ? 'مقدمو الرعاية' : 'Providers';
    const base: Item[] = [
      { id: 'home', group: P, label: ar ? 'الملف المهني' : 'Professional profile', hint: '/', run: go('/') },
      { id: 'cv', group: P, label: ar ? 'السيرة الذاتية' : 'CV', hint: '/cv', run: go('/cv') },
      { id: 'card', group: P, label: ar ? 'بطاقة الأعمال' : 'Business card', hint: '/card', run: go('/card') },
      { id: 'bpr', group: B, label: ar ? 'نظرة عامة على BPR' : 'BPR overview', hint: '/bpr', run: go('/bpr') },
      { id: 'rec', group: B, label: ar ? 'سجل BPR الخاص بي' : 'My BPR record', hint: '/bpr/record', run: go('/bpr/record') },
      { id: 'ksa', group: B, label: ar ? 'BPR في المنظومة الصحية السعودية' : 'BPR across the Saudi health system', hint: '/bpr/saudi', run: go('/bpr/saudi') },
      { id: 'ws', group: B, label: ar ? 'مساحة عمل مقدم الرعاية' : 'Provider workspace', hint: '/bpr/workspace', run: go('/bpr/workspace') },
      { id: 'dir', group: B, label: ar ? 'دليل مقدمي الرعاية' : 'Provider directory', hint: '/bpr/providers', run: go('/bpr/providers') },
      { id: 'ver', group: B, label: ar ? 'التحقق من مقدم رعاية' : 'Verify a provider', hint: '/bpr/verify', run: go('/bpr/verify') },
      { id: 'led', group: B, label: ar ? 'السجل الشفاف' : 'Transparency log', hint: '/bpr/ledger', run: go('/bpr/ledger') },
      { id: 'res', group: B, label: ar ? 'البصمة البحثية' : 'Research footprint', hint: '/bpr/research', run: go('/bpr/research') },
      { id: 'dev', group: B, label: ar ? 'FHIR والواجهة العامة' : 'FHIR & public API', hint: '/bpr/developers', run: go('/bpr/developers') },
      { id: 'sta', group: B, label: ar ? 'حالة التشغيل' : 'Operations status', hint: '/bpr/status', run: go('/bpr/status') },
      { id: 'join', group: B, label: ar ? 'انضم إلى BPR' : 'Join BPR', hint: '/bpr/join', run: go('/bpr/join') },
      { id: 'vcf', group: A, label: ar ? 'حفظ جهة الاتصال (vCard)' : 'Save contact (vCard)', run: () => { setOpen(false); downloadVCard(); } },
      { id: 'pdf', group: A, label: ar ? 'تنزيل السيرة الذاتية PDF' : 'Download CV (PDF)', run: () => { setOpen(false); window.location.href = '/assets/Dr_Mohamed_El_Fadil_CV_2026_Redesigned.pdf'; } },
      { id: 'lang', group: A, label: ar ? 'Switch to English' : 'التبديل إلى العربية', run: () => { setOpen(false); toggle(); } },
      { id: 'theme', group: A, label: ar ? 'تبديل الوضع الفاتح/الداكن' : 'Toggle light / dark', run: () => { setOpen(false); setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); } },
    ];
    const provs: Item[] = list.map((p) => ({ id: p.spid, group: D, label: ar ? p.name_ar : p.name_en, hint: p.spid, keys: `${p.name_en} ${p.name_ar} ${p.specialty || ''}`, run: go(`/bpr/p/${p.spid}`) }));
    const n = norm(q.trim());
    const id = q.trim().toUpperCase();
    const verify: Item[] = SPID_RE.test(id) ? [{ id: 'v-' + id, group: B, label: (ar ? 'تحقق من ' : 'Verify ') + id, hint: '↵', run: go(`/bpr/verify?spid=${id}`) }] : [];
    if (!n) return [...base, ...provs];
    const match = (i: Item) => norm(`${i.label} ${i.hint || ''} ${i.keys || ''}`).includes(n);
    return [...verify, ...provs.filter(match), ...base.filter(match)];
  }, [q, list, ar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setActive(0); }, [q]);
  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); }
    else if (e.key === 'Tab') e.preventDefault();
  };

  let lastGroup = '';
  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label={ar ? 'لوحة الأوامر' : 'Command palette'} onKeyDown={onKeyDown}>
        <div className="palette-input">
          <Search size={17} aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} role="combobox" aria-expanded="true" aria-controls="palette-list"
            aria-activedescendant={items[active] ? `pal-${items[active].id}` : undefined} aria-autocomplete="list"
            placeholder={ar ? 'ابحث عن صفحة أو مقدم رعاية أو أدخل SPID…' : 'Search pages, providers, or type an SPID…'} />
          <kbd>Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="palette-list">
          {items.length === 0 && <li className="palette-empty">{ar ? 'لا نتائج' : 'No results'}</li>}
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? (lastGroup = it.group) : '';
            return (
              <li key={it.id} role="presentation">
                {head && <div className="palette-group" aria-hidden="true">{head}</div>}
                <div id={`pal-${it.id}`} role="option" aria-selected={i === active} className="palette-item"
                  onMouseMove={() => setActive(i)} onClick={it.run}>
                  <span dir="auto">{it.label}</span>
                  {it.hint && <small dir="ltr">{it.hint}</small>}
                  {i === active && <CornerDownLeft size={14} aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> {ar ? 'تنقل' : 'move'}</span><span><kbd>↵</kbd> {ar ? 'فتح' : 'open'}</span><span><kbd>⌘</kbd><kbd>K</kbd> {ar ? 'فتح/إغلاق' : 'toggle'}</span></div>
      </div>
    </div>
  );
}
