import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Check, CircleDashed, Database, Radio, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { ProfileHeader } from '../pages/Home';
import { Check as CheckT, REGISTRY, Source, Trust, useManifest } from '../lib/bpr';
import '../styles/profile.css';
import '../styles/bpr.css';

const NAV = [
  { to: '/bpr', end: true, en: 'Overview', ar: 'نظرة عامة' },
  { to: '/bpr/providers', en: 'Directory', ar: 'الدليل' },
  { to: '/bpr/verify', en: 'Verify', ar: 'التحقق' },
  { to: '/bpr/ledger', en: 'Ledger', ar: 'السجل الشفاف' },
  { to: '/bpr/research', en: 'Research', ar: 'البحث' },
  { to: '/bpr/developers', en: 'FHIR & API', ar: 'FHIR والواجهات' },
  { to: '/bpr/status', en: 'Status', ar: 'الحالة' },
  { to: '/bpr/join', en: 'Join', ar: 'انضم' },
];

export function BprLayout({ children, kicker, title, lead, actions }: { children: ReactNode; kicker: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  const { ar } = useI18n();
  return (
    <div className="profile-page bpr-app" id="top">
      <ProfileHeader />
      <nav className="bpr-subnav" aria-label={ar ? 'تطبيقات BPR' : 'BPR apps'}>
        <span className="bpr-subnav-mark" aria-hidden="true">BPR</span>
        <div>{NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{ar ? n.ar : n.en}</NavLink>)}</div>
      </nav>
      <div className="bpr-app-body">
        <header className="bpr-app-head">
          <div className="profile-eyebrow"><span />{kicker}</div>
          <h1>{title}</h1>
          {lead && <p>{lead}</p>}
          {actions && <div className="profile-actions">{actions}</div>}
        </header>
        {children}
      </div>
      <BprFooter />
    </div>
  );
}

function BprFooter() {
  const { ar } = useI18n();
  const m = useManifest();
  return (
    <footer className="profile-footer bpr-footer">
      <span>© {new Date().getFullYear()} BrainSAIT · BPR</span>
      <div>
        <a href={REGISTRY} target="_blank" rel="noreferrer">registry.brainsait.de <ArrowUpRight size={12} /></a>
        <Link to="/">{ar ? 'الملف المهني' : 'Profile'}</Link>
      </div>
      <span className="bpr-footer-snap" dir="ltr">{m ? `snapshot ${fmtDate(m.snapshotAt, false, true)}` : ''}</span>
    </footer>
  );
}

export function fmtDate(iso: string | null | undefined, ar: boolean, time = false) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00Z' : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(ar ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', time
    ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }
    : { dateStyle: 'medium', timeZone: 'UTC' });
}

/** Says where the numbers on screen came from. */
export function SourceBadge({ source }: { source: Source }) {
  const { ar } = useI18n();
  const m = useManifest();
  return source === 'live'
    ? <span className="bpr-source live"><Radio size={12} />{ar ? 'مباشر من السجل' : 'Live from registry'}</span>
    : <span className="bpr-source snap" title={ar ? 'الواجهة لا تسمح بالطلب من المتصفح؛ تُعرض لقطة البناء' : 'The registry blocks this request from browsers, so the build snapshot is shown'}>
      <Database size={12} />{ar ? 'لقطة' : 'Snapshot'}{m ? ` · ${fmtDate(m.snapshotAt, ar, true)}` : ''}</span>;
}

const CHECK_ICON = { ok: Check, fail: X, pending: CircleDashed, unavailable: AlertTriangle };

export function CheckRow({ label, check, okText, children }: { label: string; check: CheckT; okText?: string; children?: ReactNode }) {
  const { ar } = useI18n();
  const Icon = CHECK_ICON[check.state];
  const how = check.how === 'device' ? (ar ? 'على جهازك' : 'on your device') : check.how === 'server' ? (ar ? 'عبر السجل' : 'by the registry') : '';
  const word = check.state === 'ok' ? (okText || (ar ? 'ناجح' : 'Pass')) : check.state === 'fail' ? (ar ? 'فشل' : 'Fail') : check.state === 'pending' ? (ar ? 'جارٍ…' : 'Checking…') : (ar ? 'غير متاح' : 'Unavailable');
  return (
    <div className={`bpr-check ${check.state}`}>
      <Icon size={17} aria-hidden="true" />
      <span className="bpr-check-label">{label}</span>
      <strong>{word}</strong>
      <small dir="auto">{[check.detail, how].filter(Boolean).join(' · ')}</small>
      {children}
    </div>
  );
}

const TRUST_LABEL: Record<keyof Trust, [string, string]> = {
  identity: ['ORCID identity', 'هوية ORCID'],
  signature: ['Signed credential', 'الاعتماد الموقّع'],
  membership: ['Membership', 'العضوية'],
  licence: ['Professional licence', 'الترخيص المهني'],
  qualifications: ['Qualifications', 'المؤهلات'],
  privileges: ['Hospital privileges', 'الامتيازات السريرية'],
};
const VALUE_LABEL: Record<string, [string, string]> = {
  confirmed: ['Confirmed', 'مؤكدة'], not_linked: ['Not linked', 'غير مرتبط'], current: ['Current', 'ساري'],
  none: ['None', 'لا يوجد'], active: ['Active', 'فعّالة'], renew_due: ['Renewal due', 'التجديد مستحق'], expired: ['Expired', 'منتهية'],
  not_assessed: ['Not assessed', 'لم يُقيَّم'], verified: ['Verified', 'موثّق'], superseded: ['Superseded', 'مستبدل'], revoked: ['Revoked', 'ملغى'],
};
export const valueLabel = (v: string | null | undefined, ar: boolean) => (v && VALUE_LABEL[v] ? VALUE_LABEL[v][ar ? 1 : 0] : v || '—');
const POSITIVE = new Set(['confirmed', 'current', 'active', 'verified']);

/** The registry keeps each trust dimension separate; so does this grid. */
export function TrustGrid({ trust }: { trust: Trust }) {
  const { ar } = useI18n();
  return (
    <dl className="bpr-trust">
      {(Object.keys(TRUST_LABEL) as (keyof Trust)[]).map((k) => (
        <div key={k} className={POSITIVE.has(trust[k]) ? 'pos' : 'neutral'}>
          <dt>{TRUST_LABEL[k][ar ? 1 : 0]}</dt><dd>{valueLabel(trust[k], ar)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Loading({ label }: { label?: string }) {
  const { ar } = useI18n();
  return <div className="bpr-state" role="status"><CircleDashed size={18} className="bpr-spin" />{label || (ar ? 'جارٍ التحميل…' : 'Loading…')}</div>;
}
export function Failed({ children }: { children?: ReactNode }) {
  const { ar } = useI18n();
  return <div className="bpr-state fail" role="alert"><AlertTriangle size={18} />{children || (ar ? 'تعذّر تحميل البيانات.' : 'Could not load this data.')}</div>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer" className="bpr-ext">{children}<ArrowUpRight size={13} /></a>;
}
