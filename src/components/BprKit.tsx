import { ReactNode, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowUpRight, Check, CircleDashed, Database, Hourglass, LayoutGrid, Minus, Radio, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { ProfileHeader } from './ProfileHeader';
import { Check as CheckT, REGISTRY, safeUrl, Source, Trust, useManifest } from '../lib/bpr';
import '../styles/profile.css';
import '../styles/bpr.css';

const NAV = [
  { to: '/bpr', end: true, en: 'Overview', ar: 'نظرة عامة' },
  { to: '/bpr/workspace', en: 'Workspace', ar: 'مساحة العمل' },
  { to: '/bpr/providers', en: 'Directory', ar: 'الدليل' },
  { to: '/slots', en: 'Hospital slots', ar: 'شواغر المستشفيات' },
  { to: '/bpr/saudi', en: 'For organizations', ar: 'للمؤسسات' },
  { to: '/bpr/verify', en: 'Verify', ar: 'التحقق' },
  { to: '/bpr/ledger', en: 'Ledger', ar: 'السجل الشفاف' },
  { to: '/bpr/research', en: 'Research', ar: 'البحث' },
  { to: '/bpr/developers', en: 'FHIR & API', ar: 'FHIR والواجهات' },
  { to: '/bpr/join', en: 'Join', ar: 'انضم' },
];

export function BprLayout({ children, kicker, title, lead, actions }: { children: ReactNode; kicker: string; title: string; lead?: ReactNode; actions?: ReactNode }) {
  const { ar } = useI18n();
  const loc = useLocation();
  const strip = useRef<HTMLDivElement>(null);
  // On narrow screens keep the current app's pill in view instead of scrolled off the strip.
  useEffect(() => { strip.current?.querySelector('a.active')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [loc.pathname]);
  return (
    <div className="profile-page bpr-app" id="top">
      <ProfileHeader />
      <nav className="bpr-subnav" aria-label={ar ? 'تطبيقات BPR' : 'BPR apps'}>
        <span className="bpr-subnav-mark" aria-hidden="true">BPR</span>
        <div ref={strip}>{NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{ar ? n.ar : n.en}</NavLink>)}</div>
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
    <footer className="bpr-footer">
      <div className="bpr-footer-main">
        <div className="bpr-footer-brand"><strong>BPR</strong><p>{ar ? 'هوية مهنية موقّعة، وأدوات سريرية مترابطة، ودليل عام يمكن التحقق منه — مصنوع للممارسين الصحيين.' : 'Signed professional identity, connected clinical tools and a public directory anyone can verify — built for healthcare professionals.'}</p></div>
        <nav aria-label={ar ? 'روابط BPR في التذييل' : 'BPR footer navigation'}>
          <div><strong>{ar ? 'استكشف' : 'Explore'}</strong><Link to="/bpr/providers">{ar ? 'دليل مقدمي الرعاية' : 'Provider directory'}</Link><Link to="/slots">{ar ? 'شواغر المستشفيات' : 'Hospital slots'}</Link><Link to="/bpr/research">{ar ? 'البصمة البحثية' : 'Research footprint'}</Link></div>
          <div><strong>{ar ? 'ابنِ وتحقق' : 'Build & verify'}</strong><Link to="/bpr/verify">{ar ? 'التحقق العام' : 'Public verification'}</Link><Link to="/bpr/developers">FHIR & API</Link><Link to="/bpr/workspace">{ar ? 'مساحة العمل' : 'Provider workspace'}</Link></div>
          <div><strong>BrainSAIT</strong><Link to="/">{ar ? 'الملف المهني' : 'Professional profile'}</Link><a href="https://calendar.app.google/rAqiE6pNumtECdnd7" target="_blank" rel="noreferrer">Book via Google Calendar <ArrowUpRight size={12} /></a><Link to="/bpr/join">{ar ? 'انضم إلى BPR' : 'Join BPR'}</Link><a href={REGISTRY} target="_blank" rel="noreferrer">registry.brainsait.de <ArrowUpRight size={12} /></a></div>
        </nav>
      </div>
      <div className="bpr-footer-base"><span>© {new Date().getFullYear()} BrainSAIT · BPR</span><span className="bpr-footer-snap">{m ? `${ar ? 'لقطة دون اتصال' : 'Offline snapshot'} · ${fmtDate(m.snapshotAt, ar, true)}` : ''}</span></div>
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
    : <span className="bpr-source snap" title={ar ? 'تعذّر الوصول إلى السجل؛ تُعرض لقطة البناء' : 'The registry could not be reached, so the build snapshot is shown'}>
      <Database size={12} />{ar ? 'لقطة' : 'Snapshot'}{m ? ` · ${fmtDate(m.snapshotAt, ar, true)}` : ''}</span>;
}

const CHECK_ICON = { ok: Check, fail: X, pending: CircleDashed, unavailable: AlertTriangle };

export function CheckRow({ label, check, okText, children }: { label: string; check: CheckT; okText?: string; children?: ReactNode }) {
  const { ar } = useI18n();
  const Icon = CHECK_ICON[check.state];
  const how = check.how === 'device' ? (ar ? 'على جهازك' : 'on your device') : check.how === 'server' ? (ar ? 'عبر السجل' : 'by the registry') : '';
  const word = check.state === 'ok' ? (okText || (ar ? 'ناجح' : 'Pass')) : check.state === 'fail' ? (ar ? 'فشل' : 'Fail') : check.state === 'pending' ? (ar ? 'جارٍ…' : 'Checking…') : (ar ? 'غير متاح' : 'Unavailable');
  return (
    <div className={`bpr-check ${check.state}`} data-check={label} data-state={check.state}>
      <Icon size={17} aria-hidden="true" />
      <span className="bpr-check-label">{label}</span>
      <strong>{word}</strong>
      <small dir="auto">{[check.detail, how].filter(Boolean).join(' · ')}</small>
      {children}
    </div>
  );
}

export const TRUST_LABEL: Record<keyof Trust, [string, string]> = {
  identity: ['ORCID identity', 'هوية ORCID'],
  signature: ['Signed credential', 'الاعتماد الموقّع'],
  membership: ['Membership', 'العضوية'],
  licence: ['Professional licence', 'الترخيص المهني'],
  qualifications: ['Qualifications', 'المؤهلات'],
  privileges: ['Hospital privileges', 'الامتيازات السريرية'],
};
// Who stands behind each state — taken from the registry's own API note.
const ATTESTOR: Record<keyof Trust, [string, string]> = {
  identity: ['ORCID sign-in', 'تسجيل الدخول عبر ORCID'],
  signature: ['BrainSAIT Ed25519 signature', 'توقيع برينسايت Ed25519'],
  membership: ['BPR membership (commercial)', 'عضوية BPR (تجارية)'],
  licence: ['Issuer, checked by a reviewer', 'الجهة المصدِرة، بمراجعة مراجع'],
  qualifications: ['Issuer, checked by a reviewer', 'الجهة المصدِرة، بمراجعة مراجع'],
  privileges: ['Recorded hospital privileges', 'امتيازات المستشفى المسجلة'],
};
const VALUE_LABEL: Record<string, [string, string]> = {
  confirmed: ['Confirmed', 'مؤكدة'], not_linked: ['Not linked', 'غير مرتبط'], current: ['Current', 'ساري'],
  none: ['None', 'لا يوجد'], active: ['Active', 'فعّالة'], renew_due: ['Renewal due', 'التجديد مستحق'], expired: ['Expired', 'منتهية'],
  not_assessed: ['Not assessed', 'لم يُقيَّم'], verified: ['Verified', 'موثّق'], superseded: ['Superseded', 'مستبدل'], revoked: ['Revoked', 'ملغى'],
};
export const valueLabel = (v: string | null | undefined, ar: boolean) => (v && VALUE_LABEL[v] ? VALUE_LABEL[v][ar ? 1 : 0] : v || '—');
const POSITIVE = new Set(['confirmed', 'current', 'active', 'verified']);
const NEGATIVE = new Set(['expired', 'revoked', 'superseded']);
export type TrustTone = 'pos' | 'na' | 'neg' | 'none';
export const trustTone = (v: string): TrustTone => POSITIVE.has(v) ? 'pos' : NEGATIVE.has(v) ? 'neg' : v === 'not_assessed' ? 'na' : 'none';
export function TrustGlyph({ tone }: { tone: TrustTone }) {
  const I = tone === 'pos' ? Check : tone === 'neg' ? X : tone === 'na' ? CircleDashed : Minus;
  return <I size={13} aria-hidden="true" className="bpr-glyph" />;
}

// Licence and qualification checks need the Saudi Commission for Health Specialties. Until the
// official integration exists, BPR does not assess them — say so wherever "not assessed" appears.
export const SCFHS_REG_CHECK = 'https://scfhs.org.sa/ar/E-Services/regvaliddescription';
const SCFHS_DEPENDENT = new Set<keyof Trust>(['licence', 'qualifications']);

/** The registry keeps each trust dimension separate; so does this grid. No score, no merged badge. */
export function TrustGrid({ trust, legend = true }: { trust: Trust; legend?: boolean }) {
  const { ar } = useI18n();
  return (
    <>
      <dl className="bpr-trust">
        {(Object.keys(TRUST_LABEL) as (keyof Trust)[]).map((k) => {
          const tone = trustTone(trust[k]);
          const pending = SCFHS_DEPENDENT.has(k) && trust[k] === 'not_assessed';
          return (
            <div key={k} className={tone}>
              <dt>{TRUST_LABEL[k][ar ? 1 : 0]}</dt>
              <dd>
                <span className="bpr-trust-value"><TrustGlyph tone={tone} />{valueLabel(trust[k], ar)}</span>
                <small className="bpr-attestor">{ATTESTOR[k][ar ? 1 : 0]}</small>
                {pending && <small className="bpr-pending"><Hourglass size={11} aria-hidden="true" />{ar ? 'تكامل الهيئة جارٍ' : 'SCFHS integration ongoing'}</small>}
              </dd>
            </div>
          );
        })}
      </dl>
      {legend && <details className="bpr-legend">
        <summary>{ar ? 'كيف تقرأ هذا' : 'How to read this'}</summary>
        <p>{ar
          ? 'لكل بُعد حالته الخاصة ولا تُدمج في درجة واحدة. نجاح التوقيع يثبت أن السجل أصدر هذه البيانات تمامًا دون تعديل؛ لا يثبت الترخيص ولا المؤهلات ولا الامتيازات. «لم يُقيَّم» تعني أن أحدًا لم يتحقق بعد — ليست نتيجة سلبية.'
          : 'Each dimension is its own state; none is merged into a score. A signature pass proves the registry issued exactly these claims, unaltered — it does not prove licence, qualifications or privileges. “Not assessed” means nobody has checked yet — not a negative finding.'}</p>
      </details>}
    </>
  );
}

/** Explains why licence and qualifications read "not assessed", and where to check them today. */
export function ScfhsPending({ compact = false }: { compact?: boolean }) {
  const { ar } = useI18n();
  return (
    <aside className={`bpr-scfhs${compact ? ' compact' : ''}`} role="note">
      <Hourglass size={18} aria-hidden="true" />
      <div>
        <strong>{ar ? 'الترخيص والمؤهلات — التكامل مع الهيئة السعودية للتخصصات الصحية جارٍ' : 'Licence & qualifications — SCFHS credential integration ongoing'}</strong>
        {!compact && <p>{ar
          ? 'التكامل مع الهيئة السعودية للتخصصات الصحية جارٍ. وإلى أن يكتمل، تظهر التراخيص والمؤهلات «لم تُقيَّم»، ويمكن التحقق من تسجيل الممارس مباشرة لدى الهيئة.'
          : 'Integration with the Saudi Commission for Health Specialties is ongoing. Until it goes live, licences and qualifications show as “not assessed” — you can check a practitioner’s registration directly with SCFHS.'}</p>}
        <div className="bpr-scfhs-links">
          <ExtLink href={SCFHS_REG_CHECK}>{ar ? 'التحقق من التسجيل لدى الهيئة' : 'SCFHS registration check'}</ExtLink>
          {!compact && <ExtLink href={`${REGISTRY}/scfhs.php`}>{ar ? 'دليل التصنيف المهني' : 'Classification guide'}</ExtLink>}
        </div>
      </div>
    </aside>
  );
}

/** Compact pointer to the provider workspace; live and planned capabilities stay visibly separate. */
export function WorkspaceBand() {
  const { ar } = useI18n();
  const live = ar ? ['مساحة OpenEMR خاصة', 'مساعد سريري بـ14 مهارة', 'إملاء صوتي عربي', 'FHIR R4', 'الحاسبات والنماذج', 'صفحة البحث'] : ['Private OpenEMR workspace', '14-skill Copilot', 'Arabic voice-to-text', 'FHIR R4', 'Calculators & forms', 'Research page'];
  const ongoing = ar ? ['التحقق من اعتماد الهيئة', 'نفيس'] : ['SCFHS credential check', 'NPHIES'];
  const planned = ar ? ['مراجعة الأقران', 'فريقك', 'الإرشاد والتدريب', 'مطابقة المناوبات'] : ['Peer review', 'Your team', 'Mentoring & training', 'Shift matching'];
  return (
    <section className="ws-band" aria-label={ar ? 'مساحة عمل مقدم الرعاية' : 'Provider workspace'}>
      <LayoutGrid size={26} aria-hidden="true" />
      <div>
        <h2>{ar ? 'لكل مقدم رعاية مساحة عمل ذكية متكاملة' : 'Every provider gets a complete, intelligent workspace'}</h2>
        <div className="ws-band-row"><span className="ws-status live">{ar ? 'يعمل اليوم' : 'Live today'}</span>{live.map((x) => <em key={x}>{x}</em>)}</div>
        <div className="ws-band-row"><span className="ws-status awaiting">{ar ? 'تكامل جارٍ' : 'Ongoing integration'}</span>{ongoing.map((x) => <em key={x} className="planned">{x}</em>)}</div>
        <div className="ws-band-row"><span className="ws-status planned">{ar ? 'قادمًا' : 'Coming next'}</span>{planned.map((x) => <em key={x} className="planned">{x}</em>)}</div>
      </div>
      <Link className="profile-button primary" to="/bpr/workspace">{ar ? 'استكشف مساحة العمل' : 'Explore the workspace'}<ArrowRight size={16} /></Link>
    </section>
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
  const safe = safeUrl(href);
  if (!safe) return null;
  return <a href={safe} target="_blank" rel="noreferrer" className="bpr-ext">{children}<ArrowUpRight size={13} /></a>;
}
