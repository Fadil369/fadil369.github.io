import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Globe, KeyRound, Lock, CheckCircle2, LogOut, UserPlus, Building2, TrendingUp, Mail, Phone, MapPin } from 'lucide-react';
import { useI18n } from '../i18n';
import { BUILD_APPLY_BASE } from '../config/build';

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
  const [progress, setProgress] = useState<{ pct: number; done: number; total: number; next: string; badges: string[] } | null>(null);

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
            setProfile(p);
            setLoading(false);
            return;
          }
        } catch { /* fall through to local */ }
        const local = readLocalProfile();
        setProfile({ ...(local || {}), id: id.profile_id, name: local?.name || id.name || '', roles: id.roles || [], local: false });
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
      .then((d) => { if (d.ok) setProgress({ pct: Math.round(d.percent * 100), done: d.doneTasks, total: d.totalTasks, next: d.nextTask, badges: d.badges }); })
      .catch(() => { /* ignore */ });
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
    } catch {
      setLangMsg(ar ? 'تم الحفظ محليًا ✓' : 'Saved locally ✓');
    }
  };

  const signOut = () => {
    try { window.BrainSAIT?.session?.logout(); } catch { /* ignore */ }
    try { localStorage.removeItem('brainsait_x_token'); } catch { /* ignore */ }
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
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
