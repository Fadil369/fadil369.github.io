import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, Globe, KeyRound, Lock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n';

interface ProfileView {
  id: string;
  oid?: string;
  name: string;
  name_ar?: string;
  email: string;
  phone?: string;
  roles: string[];
  lang?: string;
  capabilities?: string[];
}

declare global {
  interface Window {
    BrainSAIT?: {
      session: { resolve: () => Promise<{ profile_id: string; name?: string; roles?: string[] } | null> };
    };
  }
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

export default function Account() {
  const { ar } = useI18n();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [langMsg, setLangMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const bs = window.BrainSAIT;
        if (!bs?.session) { setError(ar ? 'الرجاء تسجيل الدخول عبر تيليغرام أو البوابة' : 'Please sign in via Telegram or the portal'); setLoading(false); return; }
        const id = await bs.session.resolve();
        if (!id) { setError(ar ? 'الرجاء تسجيل الدخول' : 'Please sign in'); setLoading(false); return; }
        // resolve the full profile via the portal
        const r = await fetch('https://brainsait.de/api/profile/me', {
          headers: { 'X-Token': localStorage.getItem('brainsait_x_token') || '' },
        });
        if (r.ok) {
          const d = await r.json();
          setProfile(d.profile);
        } else {
          // fall back to the SSO identity
          setProfile({ id: id.profile_id, name: id.name || '', email: '', roles: id.roles || [], lang: ar ? 'ar' : 'en' });
        }
      } catch {
        setError(ar ? 'تعذر تحميل الحساب' : 'Could not load account');
      } finally { setLoading(false); }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLang = async (lang: 'ar' | 'en') => {
    try {
      const r = await fetch('https://brainsait.de/api/profile/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Token': localStorage.getItem('brainsait_x_token') || '' },
        body: JSON.stringify({ lang }),
      });
      if (r.ok) { setLangMsg(ar ? 'تم حفظ تفضيل اللغة ✓' : 'Language preference saved ✓'); }
    } catch { /* ignore */ }
  };

  if (loading) return <main className="page"><p style={{ textAlign: 'center' }}>…</p></main>;

  if (error || !profile) {
    return (
      <main className="page">
        <h1>{ar ? 'حسابي' : 'My Account'}</h1>
        <p className="lede" style={{ textAlign: 'center' }}>{error || (ar ? 'لا يوجد حساب' : 'No account')}</p>
        <div style={{ textAlign: 'center' }}>
          <Link className="button primary" to="/">{ar ? 'العودة للرئيسية' : 'Back to home'}</Link>
        </div>
      </main>
    );
  }

  const capLabels: Record<string, { ar: string; en: string }> = {
    'profile': { ar: 'الملف الشخصي', en: 'Profile' },
    'catalog:read': { ar: 'تصفح الكتالوج', en: 'Browse catalog' },
    'licenses:own': { ar: 'تراخيصي', en: 'My licenses' },
    'documents:own': { ar: 'مستنداتي', en: 'My documents' },
    'payments:read': { ar: 'قراءة المدفوعات', en: 'Read payments' },
    'catalog:write': { ar: 'تحرير الكتالوج', en: 'Edit catalog' },
    'licenses:all': { ar: 'كل التراخيص', en: 'All licenses' },
    'documents:all': { ar: 'كل المستندات', en: 'All documents' },
    'payments:all': { ar: 'كل المدفوعات', en: 'All payments' },
    'people': { ar: 'إدارة الأشخاص', en: 'Manage people' },
    'shopify:sync': { ar: 'مزامنة شوبيفاي', en: 'Shopify sync' },
  };

  return (
    <main className="page">
      <h1>{ar ? 'حسابي' : 'My Account'}</h1>
      <div className="account-card">
        <div className="account-head">
          <div className="account-avatar">{(profile.name || '?').charAt(0)}</div>
          <div>
            <h2>{ar ? profile.name_ar || profile.name : profile.name}</h2>
            <p className="muted">{profile.email || profile.id}</p>
            {profile.oid && (
              <p className="account-oid"><BadgeCheck size={14} /> OID <code>{profile.oid}</code></p>
            )}
          </div>
        </div>

        <div className="account-row">
          <span className="account-label"><ShieldCheck size={16} /> {ar ? 'الأدوار' : 'Roles'}</span>
          <div className="account-roles">
            {profile.roles.map((r) => (
              <span key={r} className="badge">{(ROLE_LABELS[r] || { ar: r, en: r })[ar ? 'ar' : 'en']}</span>
            ))}
          </div>
        </div>

        <div className="account-row">
          <span className="account-label"><KeyRound size={16} /> {ar ? 'الصلاحيات' : 'Capabilities'}</span>
          <div className="account-caps">
            {(profile.capabilities || []).map((c) => (
              <span key={c} className="cap"><CheckCircle2 size={12} /> {(capLabels[c] || { ar: c, en: c })[ar ? 'ar' : 'en']}</span>
            ))}
            {!profile.capabilities?.length && <span className="muted">{ar ? '—' : '—'}</span>}
          </div>
        </div>

        <div className="account-row">
          <span className="account-label"><Globe size={16} /> {ar ? 'اللغة' : 'Language'}</span>
          <div className="account-lang">
            <button className={`button secondary sm ${profile.lang === 'ar' ? 'active' : ''}`} onClick={() => setLang('ar')}>العربية</button>
            <button className={`button secondary sm ${profile.lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
            {langMsg && <span className="promo-ok"><CheckCircle2 size={12} /> {langMsg}</span>}
          </div>
        </div>

        <div className="account-row">
          <span className="account-label"><Lock size={16} /> {ar ? 'الوصول الآمن' : 'Secure access'}</span>
          <p className="muted">
            {ar
              ? 'الوصول عبر تسجيل دخول آمن (كلمة مرور مشفّرة أو رمز عبر تيليغرام/البريد). مواردك محمية حسب دورك.'
              : 'Access via secure sign-in (hashed password or Telegram/email code). Your resources are protected by your role.'}
          </p>
        </div>

        <Link className="button secondary" to="/">← {ar ? 'العودة للمتجر' : 'Back to store'}</Link>
      </div>
    </main>
  );
}
