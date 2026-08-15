import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Globe, KeyRound, Lock, CheckCircle2, LogOut, UserPlus, Building2, TrendingUp, Mail, Phone, MapPin, BookOpen, Brain, Code2, Send, CalendarDays } from 'lucide-react';
import { useI18n } from '../i18n';
import { BUILD_APPLY_BASE, FOUNDER_OS_URL, ULTIMATE_BRAIN_BUILD_URL, FORGE_BOT_URL, CALENDAR_URL } from '../config/build';

interface ProfileView {
  id: string;
  oid?: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  country?: string;
  roles: string[];
  lang?: string;
  capabilities?: string[];
  local?: boolean;
  buildRef?: string;
}

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  admin: { ar: 'مدير', en: 'Admin' },
  founder: { ar: 'مؤسس', en: 'Founder' },
  telegram_user: { ar: 'عضو تيليغرام', en: 'Telegram user' },
  customer: { ar: 'عميل', en: 'Customer' },
  investor: { ar: 'مستثمر', en: 'Investor' },
  developer: { ar: 'مطوّر', en: 'Developer' },
  partner: { ar: 'شريك', en: 'Partner' },
  student: { ar: 'طالب', en: 'Student' },
  chef: { ar: 'شيف', en: 'Chef' },
  driver: { ar: 'سائق', en: 'Driver' },
};

const PROFILE_KEY = 'bs_profile';
const BUILD_REF_KEY = 'bs_build_ref';
const FORGE_TOKEN_KEY = 'bs_forge_token';
const FORGE_PROFILE_KEY = 'bs_forge_profile';
const FORGE_ME = 'https://forge.brainsait.org/profile/me';
const CUSTOMER_SYNC_API = 'https://build-apply.brainsait.org/customer/sync';
const PORTAL_PARTNER_STATUS = 'https://portal.brainsait.de/api/integration/partner-status';
const INSTALLMENT_API = `${BUILD_APPLY_BASE}/installment`;

interface PartnerStatus {
  ok: boolean;
  profile_id?: string;
  name?: string;
  status?: string;
  tier?: string;
  application_id?: string;
  order_id?: string;
  fulfillment_id?: string;
  gift_card_id?: string;
  company_id?: string;
  github_username?: string;
  track_url?: string;
  notion_url?: string;
  suspended_reason?: string;
  suspended_at?: string;
}
interface InstallmentItem {
  no: number;
  label: string;
  amount: number;
  dueAt: string;
  status: string;
  paidAt?: string;
  payUrl?: string;
}
interface InstallmentView {
  ok: boolean;
  plan?: {
    ref: string;
    plan: string;
    total: number;
    status: string;
    createdAt: string;
    suspendedAt?: string;
    installments: InstallmentItem[];
  };
}

function readForgeToken(): string {
  try { return localStorage.getItem(FORGE_TOKEN_KEY) || ''; } catch { return ''; }
}

function readForgeProfile(): ProfileView | null {
  try {
    const raw = localStorage.getItem(FORGE_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Resolve the Builder launch identity — network first, then the locally
 *  persisted forge profile (the gateway returns it at login time). */
async function resolveForgeIdentity(): Promise<ProfileView | null> {
  const token = readForgeToken();
  if (token) {
    try {
      const r = await fetch(FORGE_ME, { headers: { 'X-Token': token } });
      if (r.ok) {
        const d = await r.json();
        if (d?.authenticated && d.profile) {
          const p = d.profile;
          return {
            id: p.id || 'forge',
            oid: p.oid,
            name: p.name || '',
            name_ar: p.name_ar || p.name || '',
            email: p.email || '',
            roles: Array.isArray(p.roles) ? p.roles : ['telegram_user'],
            lang: p.lang,
            capabilities: p.capabilities,
            local: false,
          };
        }
      }
    } catch { /* fall through to local profile */ }
  }
  const local = readForgeProfile();
  if (local && local.name) {
    return { ...local, id: local.id || 'forge', local: false };
  }
  return null;
}

function readLocalProfile(): ProfileView | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalProfile(p: ProfileView) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function readBuildRef(): string {
  try { return localStorage.getItem(BUILD_REF_KEY) || ''; } catch { return ''; }
}

/** Register the account holder in the Shopify store's customer/marketing
 *  record so their email lands in the messaging centre (storefront-registered,
 *  build-applicant, forge-member tags). Best-effort and non-blocking. */
async function syncShopifyCustomer(p: ProfileView) {
  if (!p?.email) return;
  try {
    await fetch(CUSTOMER_SYNC_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: p.email,
        fullName: p.name,
        phone: p.phone || '',
        country: p.country || '',
        applicationRef: p.buildRef || readBuildRef() || undefined,
        acceptsMarketing: true,
      }),
    });
  } catch { /* non-fatal */ }
}

/** Wait up to ~4s for the deferred SSO bridge, then resolve. */
function resolveSession(): Promise<{ profile_id: string; name?: string; roles?: string[] } | null> {
  return new Promise((resolve) => {
    const tryResolve = () => {
      const bs = window.BrainSAIT;
      if (bs?.session?.resolve) {
        bs.session.resolve().then(resolve).catch(() => resolve(null));
        return true;
      }
      return false;
    };
    if (tryResolve()) return;
    const iv = window.setInterval(() => { if (tryResolve()) window.clearInterval(iv); }, 250);
    window.setTimeout(() => { window.clearInterval(iv); resolve(null); }, 4000);
  });
}

export default function Account() {
  const { ar, toggle } = useI18n();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'view' | 'signin' | 'create'>('view');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [authError, setAuthError] = useState('');
  const [saving, setSaving] = useState(false);
  const [langMsg, setLangMsg] = useState('');
  const [progress, setProgress] = useState<{ pct: number; done: number; total: number; next: string; badges: string[]; repoUrl?: string; notionUrl?: string } | null>(null);
  const [partner, setPartner] = useState<PartnerStatus | null>(null);
  const [installment, setInstallment] = useState<InstallmentView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await resolveSession();
      if (cancelled) return;
      if (id) {
        // Signed in via SSO → pull the full profile from the portal.
        try {
          const r = await fetch('https://brainsait.de/api/profile/me', {
            headers: { 'X-Token': localStorage.getItem('brainsait_x_token') || '' },
          });
          if (r.ok) {
            const d = await r.json();
            const p: ProfileView = { id: id.profile_id, name: id.name || '', email: d.profile?.email || '', phone: d.profile?.phone, roles: id.roles || [], capabilities: d.profile?.capabilities, lang: d.profile?.lang, oid: d.profile?.oid, name_ar: d.profile?.name_ar };
            // Enrich with the forge (Builder launch) identity when a forge
            // session exists on this device — roles/oid merge for display.
            const forge = await resolveForgeIdentity();
            if (forge) {
              p.roles = Array.from(new Set([...(p.roles || []), ...(forge.roles || [])]));
              p.oid = p.oid || forge.oid;
            }
            setProfile(p);
            setLoading(false);
            return;
          }
        } catch { /* fall through to local */ }
        const local = readLocalProfile();
        const forge = await resolveForgeIdentity();
        setProfile({ ...(local || {}), ...(forge || {}), id: id.profile_id, name: (forge?.name || local?.name || id.name || ''), roles: forge?.roles || local?.roles || id.roles || [], local: false });
        setLoading(false);
        return;
      }
      // No portal session → try the forge (Telegram) identity, then local.
      const forge = await resolveForgeIdentity();
      if (forge?.name) {
        setProfile({ ...readLocalProfile(), ...forge, local: false });
        setLoading(false);
        return;
      }
      // No SSO → use local profile if present.
      const local = readLocalProfile();
      if (local) {
        setProfile(local);
        setLoading(false);
      } else {
        setProfile(null);
        setMode('signin');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load build progress when we know the build ref.
  useEffect(() => {
    const ref = readBuildRef();
    if (!ref || !profile) return;
    fetch(`${BUILD_APPLY_BASE}/progress/${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setProgress({ pct: Math.round(d.percent * 100), done: d.doneTasks, total: d.totalTasks, next: d.nextTask, badges: d.badges, repoUrl: d.repoUrl, notionUrl: d.notionUrl }); })
      .catch(() => { /* ignore */ });
  }, [profile]);

  // Load the partner customer account status + installment plan.
  useEffect(() => {
    if (!profile?.email) return;
    fetch(`${PORTAL_PARTNER_STATUS}?email=${encodeURIComponent(profile.email)}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPartner(d); })
      .catch(() => { /* not a partner yet — ignore */ });
    const ref = profile.buildRef || readBuildRef();
    if (ref) {
      fetch(`${INSTALLMENT_API}/${encodeURIComponent(ref)}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setInstallment(d); })
        .catch(() => { /* not on a plan — ignore */ });
    }
  }, [profile]);

  const signIn = async () => {
    setSaving(true);
    setAuthError('');
    const bs = window.BrainSAIT;
    if (!bs?.session?.login) {
      setAuthError(ar ? 'خدمة تسجيل الدخول غير متاحة الآن' : 'Sign-in service unavailable');
      setSaving(false);
      return;
    }
    try {
      const res = await bs.session.login(email, password);
      if (res && res.token) {
        const id = await bs.session.resolve();
        if (id) {
          const local = readLocalProfile();
          const p: ProfileView = { id: id.profile_id, name: local?.name || id.name || email, email, roles: id.roles || [], local: false, phone: local?.phone, country: local?.country };
          setProfile(p);
          setMode('view');
          syncShopifyCustomer(p);
        } else {
          setAuthError(ar ? 'تعذر التحقق من الحساب' : 'Could not verify account');
        }
      } else {
        setAuthError(res?.error || (ar ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'));
      }
    } catch {
      setAuthError(ar ? 'تعذر الاتصال بخدمة الدخول' : 'Could not reach sign-in service');
    } finally { setSaving(false); }
  };

  const createLocal = () => {
    if (!name.trim()) { setAuthError(ar ? 'الاسم مطلوب' : 'Name is required'); return; }
    const p: ProfileView = { id: 'local-' + Date.now(), name: name.trim(), email: email.trim(), phone, country, roles: ['customer'], local: true, buildRef: readBuildRef() };
    saveLocalProfile(p);
    setProfile(p);
    setMode('view');
    syncShopifyCustomer(p);
  };

  const updateLocalField = (patch: Partial<ProfileView>) => {
    if (!profile) return;
    const next = { ...profile, ...patch };
    setProfile(next);
    saveLocalProfile(next);
  };

  const setLangPref = async (lang: 'ar' | 'en') => {
    // Apply site-wide immediately.
    if ((lang === 'ar') !== (document.documentElement.lang === 'ar')) toggle();
    try {
      const r = await fetch('https://brainsait.de/api/profile/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': localStorage.getItem('brainsait_x_token') || '' },
        body: JSON.stringify({ lang }),
      });
      if (r.ok) setLangMsg(ar ? 'تم حفظ تفضيل اللغة ✓' : 'Language preference saved ✓');
      else throw new Error('portal');
    } catch {
      // Portal has no session → try the forge (OID) identity instead.
      const forgeTok = readForgeToken();
      let ok = false;
      if (forgeTok) {
        try {
          const r = await fetch(`${FORGE_ME.replace('/profile/me', '')}/profile/lang`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Token': forgeTok },
            body: JSON.stringify({ lang }),
          });
          ok = r.ok;
        } catch { /* ignore */ }
      }
      setLangMsg(ok ? (ar ? 'تم حفظ تفضيل اللغة عبر بوابة البناء ✓' : 'Saved via Build gateway ✓') : (ar ? 'تم الحفظ محليًا ✓' : 'Saved locally ✓'));
    }
  };

  const signOut = () => {
    try { window.BrainSAIT?.session?.logout(); } catch { /* ignore */ }
    try { localStorage.removeItem('brainsait_x_token'); } catch { /* ignore */ }
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(FORGE_TOKEN_KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(FORGE_PROFILE_KEY); } catch { /* ignore */ }
    setProfile(null);
    setMode('signin');
  };

  if (loading) {
    return <main className="page" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><p className="muted">…</p></main>;
  }

  // ── Signed out: sign-in / create profile ──
  if (!profile) {
    return (
      <main className="page" style={{ maxWidth: 520, margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{ar ? 'حسابي' : 'My Account'}</h1>
        <p className="lede" style={{ textAlign: 'center' }}>{ar ? 'سجّل دخولك أو أنشئ ملفًا بسيطًا للاستفادة من المتجر والبناء والتقدّم.' : 'Sign in or create a simple profile to use the store, build and track your progress.'}</p>

        <div className="account-card" style={{ marginTop: '1.5rem' }}>
          {mode === 'signin' ? (
            <>
              <h3>{ar ? 'تسجيل الدخول' : 'Sign in'}</h3>
              <div className="form-field">
                <label>{ar ? 'البريد الإلكتروني' : 'Email'}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="form-field">
                <label>{ar ? 'كلمة المرور' : 'Password'}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              {authError && <p className="promo-err" style={{ marginBottom: '0.75rem' }}>{authError}</p>}
              <button className="button primary" style={{ width: '100%' }} onClick={signIn} disabled={saving}>
                {saving ? '…' : (ar ? 'تسجيل الدخول' : 'Sign in')}
              </button>
              <p className="fineprint" style={{ textAlign: 'center', margin: '1rem 0 0.25rem' }}>
                {ar ? 'لا تملك حسابًا؟' : "Don't have an account?"}
              </p>
              <button className="button secondary" style={{ width: '100%' }} onClick={() => { setAuthError(''); setMode('create'); }}>
                <UserPlus size={15} /> {ar ? 'إنشاء ملف بسيط' : 'Create a simple profile'}
              </button>
            </>
          ) : (
            <>
              <h3>{ar ? 'إنشاء ملفك' : 'Create your profile'}</h3>
              <div className="form-field">
                <label>{ar ? 'الاسم الكامل' : 'Full name'} *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? 'اسمك' : 'Your name'} />
              </div>
              <div className="form-field">
                <label>{ar ? 'البريد الإلكتروني' : 'Email'}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <div className="form-field">
                <label>{ar ? 'رقم الجوال' : 'Phone'}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
              </div>
              <div className="form-field">
                <label>{ar ? 'الدولة' : 'Country'}</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder={ar ? 'الدولة' : 'Country'} />
              </div>
              {authError && <p className="promo-err" style={{ marginBottom: '0.75rem' }}>{authError}</p>}
              <button className="button primary" style={{ width: '100%' }} onClick={createLocal}>
                {ar ? 'حفظ الملف والمتابعة' : 'Save profile & continue'}
              </button>
              <button className="button secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => { setAuthError(''); setMode('signin'); }}>
                ← {ar ? 'رجوع لتسجيل الدخول' : 'Back to sign in'}
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Signed in: profile view ──
  return (
    <main className="page">
      <h1 style={{ textAlign: 'center' }}>{ar ? 'حسابي' : 'My Account'}</h1>
      <div className="account-card">
        <div className="account-head">
          <div className="account-avatar">{(profile.name || '?').charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0 }}>{ar ? profile.name_ar || profile.name : profile.name}</h2>
            <p className="muted" style={{ margin: '0.2rem 0 0' }}>{profile.email || profile.id}</p>
            {profile.oid && (
              <p className="account-oid"><BadgeCheck size={14} /> OID <code>{profile.oid}</code></p>
            )}
            {profile.local && <span className="badge">{ar ? 'ملف محلي' : 'Local profile'}</span>}
          </div>
          <button className="button secondary sm" onClick={signOut} title={ar ? 'تسجيل الخروج' : 'Sign out'}>
            <LogOut size={14} />
          </button>
        </div>

        {/* Contact details (editable for local profiles) */}
        <div className="account-row">
          <span className="account-label"><Mail size={16} /> {ar ? 'البريد' : 'Email'}</span>
          {profile.local
            ? <input className="acct-input" value={profile.email} onChange={(e) => updateLocalField({ email: e.target.value })} />
            : <span>{profile.email}</span>}
        </div>
        <div className="account-row">
          <span className="account-label"><Phone size={16} /> {ar ? 'الجوال' : 'Phone'}</span>
          {profile.local
            ? <input className="acct-input" value={profile.phone || ''} onChange={(e) => updateLocalField({ phone: e.target.value })} />
            : <span>{profile.phone || '—'}</span>}
        </div>
        <div className="account-row">
          <span className="account-label"><MapPin size={16} /> {ar ? 'الدولة' : 'Country'}</span>
          {profile.local
            ? <input className="acct-input" value={profile.country || ''} onChange={(e) => updateLocalField({ country: e.target.value })} />
            : <span>{profile.country || '—'}</span>}
        </div>

        {profile.roles?.length > 0 && (
          <div className="account-row">
            <span className="account-label"><ShieldCheck size={16} /> {ar ? 'الأدوار' : 'Roles'}</span>
            <div className="account-roles">
              {profile.roles.map((r) => (
                <span key={r} className="badge">{(ROLE_LABELS[r] || { ar: r, en: r })[ar ? 'ar' : 'en']}</span>
              ))}
            </div>
          </div>
        )}

        {/* Build progress */}
        {readBuildRef() && (
          <div className="account-row">
            <span className="account-label"><Building2 size={16} /> {ar ? 'برنامج البناء' : 'Build'}</span>
            <div style={{ flex: 1 }}>
              {progress ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                    <span>{ar ? 'تقدمك' : 'Your progress'} {progress.pct}%</span>
                    <span>{progress.done}/{progress.total} {ar ? 'مهمة' : 'tasks'}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress.pct}%`, background: 'linear-gradient(90deg, var(--gold), var(--cyan))', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
                    {progress.badges.length > 0 && <span>🏆 {progress.badges.join(' · ')} · </span>}
                    {ar ? `التالي: ${progress.next}` : `Next: ${progress.next}`}
                  </div>
                  <Link className="button secondary sm" to={`/track?ref=${readBuildRef()}`} style={{ marginTop: '0.5rem' }}>
                    <TrendingUp size={14} /> {ar ? 'لوحة التقدم' : 'Progress dashboard'}
                  </Link>
                </>
              ) : (
                <p className="muted">{ar ? 'جاري تحميل تقدمك…' : 'Loading your progress…'}</p>
              )}
            </div>
          </div>
        )}

        {/* Partner customer account */}
        {partner && (
          <div className="account-row">
            <span className="account-label"><Building2 size={16} /> {ar ? 'حساب الشريك' : 'Partner account'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span className={`badge ${partner.status === 'suspended' ? 'badge-danger' : ''}`}>
                  {partner.status === 'suspended'
                    ? (ar ? '⛔ معلَّق' : '⛔ Suspended')
                    : (ar ? '✅ شريك فعّال' : '✅ Active partner')}
                </span>
                {partner.tier && <span className="badge">{partner.tier}</span>}
              </div>
              {partner.status === 'suspended' && partner.suspended_reason && (
                <p style={{ color: '#e5484d', fontSize: '0.82rem', margin: '0 0 0.4rem' }}>
                  {ar ? `السبب: ${partner.suspended_reason}` : `Reason: ${partner.suspended_reason}`}
                </p>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {partner.application_id && <span>🪪 {ar ? 'طلب' : 'App'}: <code>{partner.application_id}</code></span>}
                {partner.fulfillment_id && <span>📦 {ar ? 'تنفيذ' : 'Fulfillment'}: ✅</span>}
                {partner.gift_card_id && <span>🎁 {ar ? 'بطاقة هدية' : 'Gift card'}: ✅</span>}
                {partner.company_id && <span>🏢 {ar ? 'شركة' : 'Company'}: ✅</span>}
                {partner.github_username && <span>🐙 GitHub: <code>{partner.github_username}</code></span>}
              </div>
              {partner.track_url && (
                <Link to={`/track?ref=${readBuildRef()}`} className="button secondary sm" style={{ marginTop: '0.5rem' }}>
                  <TrendingUp size={14} /> {ar ? 'لوحة التقدم' : 'Progress dashboard'}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Onboarding resources: Notion course + 2nd Brain + GitHub repo +
            Telegram bot + scheduling — the partner's mission-control links. */}
        {(progress?.repoUrl || progress?.notionUrl || readBuildRef()) && (
          <div className="account-row">
            <span className="account-label"><BookOpen size={16} /> {ar ? 'مواردك' : 'Your resources'}</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {progress?.notionUrl && (
                <a className="button secondary sm" href={progress.notionUrl} target="_blank" rel="noopener noreferrer">
                  <BookOpen size={14} /> {ar ? 'صفحتك في Notion (التقدم)' : 'Your Notion page (progress)'}
                </a>
              )}
              <a className="button secondary sm" href={FOUNDER_OS_URL} target="_blank" rel="noopener noreferrer">
                <Brain size={14} /> {ar ? 'دورة Founder OS — من الفكرة إلى الشركة' : 'Founder OS course — from idea to company'}
              </a>
              <a className="button secondary sm" href={ULTIMATE_BRAIN_BUILD_URL} target="_blank" rel="noopener noreferrer">
                <Brain size={14} /> {ar ? 'العقل الثاني (برنامج BUILD)' : 'Your 2nd Brain (BUILD)'}
              </a>
              {progress?.repoUrl && (
                <a className="button secondary sm" href={progress.repoUrl} target="_blank" rel="noopener noreferrer">
                  <Code2 size={14} /> {ar ? 'مستودع GitHub الخاص بك' : 'Your GitHub repository'}
                </a>
              )}
              <a className="button secondary sm" href={FORGE_BOT_URL} target="_blank" rel="noopener noreferrer">
                <Send size={14} /> {ar ? 'بوت تيليغرام — الدعم والتنبيهات' : 'Telegram bot — support & alerts'}
              </a>
              <a className="button secondary sm" href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
                <CalendarDays size={14} /> {ar ? 'حجز جلسة المتابعة' : 'Schedule your follow-up call'}
              </a>
            </div>
          </div>
        )}

        {/* Installment plan */}
        {installment?.ok && installment.plan && (
          <div className="account-row">
            <span className="account-label"><TrendingUp size={16} /> {ar ? 'خطة الدفع' : 'Payment plan'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span className={`badge ${installment.plan.status === 'SUSPENDED' ? 'badge-danger' : ''}`}>
                  {installment.plan.status === 'SUSPENDED'
                    ? (ar ? '⛔ معلَّقة' : '⛔ Suspended')
                    : installment.plan.status === 'COMPLETED'
                      ? (ar ? '✅ مكتملة' : '✅ Completed')
                      : (ar ? 'نشطة' : 'Active')}
                </span>
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {installment.plan.installments.length} {ar ? 'دفعات' : 'installments'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {installment.plan.installments.map((it) => {
                  const paid = it.status === 'PAID';
                  return (
                    <div key={it.no} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
                      {paid ? <CheckCircle2 size={15} color="var(--ok)" /> : <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>○</span>}
                      <span style={{ flex: 1 }}>{it.label}</span>
                      <span style={{ fontWeight: paid ? 600 : 500, color: paid ? 'var(--ok)' : 'var(--ink)' }}>
                        {it.amount.toLocaleString(ar ? 'ar-SA' : 'en-SA')} SAR
                      </span>
                      {!paid && it.payUrl && (
                        <a className="button secondary sm" href={it.payUrl} target="_blank" rel="noopener noreferrer">
                          {ar ? 'ادفع' : 'Pay'}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Language */}
        <div className="account-row">
          <span className="account-label"><Globe size={16} /> {ar ? 'اللغة' : 'Language'}</span>
          <div className="account-lang">
            <button className={`button secondary sm ${document.documentElement.lang === 'ar' ? 'active' : ''}`} onClick={() => setLangPref('ar')}>العربية</button>
            <button className={`button secondary sm ${document.documentElement.lang === 'en' ? 'active' : ''}`} onClick={() => setLangPref('en')}>English</button>
            {langMsg && <span className="promo-ok"><CheckCircle2 size={12} /> {langMsg}</span>}
          </div>
        </div>

        <div className="account-row">
          <span className="account-label"><Lock size={16} /> {ar ? 'الوصول الآمن' : 'Secure access'}</span>
          <p className="muted" style={{ margin: 0 }}>
            {ar
              ? 'مواردك محمية حسب دورك. ملفك المحلي محفوظ على جهازك فقط — سجّل الدخول عبر البوابة لمزامنة كل أجهزتك.'
              : 'Your resources are protected by your role. A local profile stays on this device only — sign in via the portal to sync across devices.'}
          </p>
        </div>

        <Link className="button secondary" to="/">← {ar ? 'العودة للمتجر' : 'Back to store'}</Link>
      </div>
    </main>
  );
}
