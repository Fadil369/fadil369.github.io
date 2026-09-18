import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Stethoscope, BadgeCheck, ShieldCheck, Calendar, Building2, Clock, Wallet, ExternalLink, RefreshCw } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useI18n } from '../i18n';

/* Doctor Business Stack — per-doctor storefront page (fadil369.github.io/doctors/:spid)
   Fed live by the registry partner aggregate + the provider-identity signed bundle.
   Mirrors the /slots page: nothing baked in, CORS open on both sources. */

const REGISTRY = 'https://registry.brainsait.org';
const IDENTITY = 'https://id.brainsait.org';

interface PartnerAggregate {
  spid: string;
  member?: { business_name?: string; email?: string; trust_level?: string; status?: string };
  canonical?: string;
  profile?: string;
  storefront?: string;
  slots_held?: { id: string; title: string; specialty: string; state: string }[];
  slots_published?: { id: string; title: string; state: string }[];
  ledger?: { balance_sar: number };
  provisioning?: { step: string; status: string }[];
}

interface IdentityBundle {
  schema?: string;
  buid?: string;
  name?: { en?: string; ar?: string };
  role?: string;
  title?: string;
  specialty?: string;
  subspecialty?: string | null;
  verification?: string;
  location?: { organization_name_en?: string; city?: string; region?: string };
  did?: string;
  oidUrn?: string;
}

interface Profile {
  headline?: string;
  bio?: string;
  services?: string[];
  modes?: string[];
  locations?: { org?: string; branch?: string; city?: string }[];
  availability?: Record<string, unknown>;
  trust_level?: string;
  pricing?: Record<string, unknown>;
}

export default function Doctor() {
  const { spid = '' } = useParams();
  const { ar } = useI18n();
  const [agg, setAgg] = useState<PartnerAggregate | null>(null);
  const [identity, setIdentity] = useState<IdentityBundle | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageMeta({
    title: ar ? `طبيب ${spid}` : `Doctor ${spid}`,
    description: ar
      ? `ملف ${spid} — هوية موثقة، خدمات، شواغر، ورصيد التسوية من سجل مقدمي الخدمة.`
      : `${spid} — verified identity, services, slots and ledger from the BrainSAIT Provider Registry.`,
    url: `/doctors/${spid}`,
    type: 'profile',
  });

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`${REGISTRY}/partner/${spid}`).then(r => (r.ok ? r.json() : null)),
      fetch(`${IDENTITY}/api/provider/${spid}`).then(r => (r.ok ? r.json() : null)),
      fetch(`${REGISTRY}/api/profiles/${spid}`).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([a, i, p]) => {
        if (!a && !i) { setError(true); setLoading(false); return; }
        setAgg(a);
        setIdentity(i);
        setProfile(p);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [spid]);

  if (loading) return <main className="page" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center', color: 'var(--ink-soft)' }}>{ar ? 'جارٍ التحميل…' : 'Loading doctor profile…'}</main>;
  if (error || !agg?.member)
    return (
      <main className="page" style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.25rem', textAlign: 'center' }}>
        <p style={{ color: '#f87171' }}>{ar ? 'تعذر العثور على هذا الطبيب في السجل.' : 'This doctor is not in the registry.'}</p>
        <Link to="/slots" className="button secondary sm" style={{ fontSize: '13px' }}>← {ar ? 'شواغر المستشفيات' : 'Hospital slots'}</Link>
      </main>
    );

  const name = identity?.name?.en || agg.member?.business_name || spid;
  const nameAr = identity?.name?.ar;
  const verified = identity?.verification === 'verified' || agg.member?.status === 'active';
  const consultedProduct = `https://store.brainsait.de/products/consult-${spid.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const prov = (agg.provisioning || []).filter(p => p.status === 'done').map(p => p.step);

  return (
    <main className="page" style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.25rem 5rem' }}>
      {/* Header card */}
      <section style={{ border: '1px solid var(--line)', borderRadius: '20px', background: 'var(--surface)', padding: '2rem', display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#0ea5e9)', display: 'grid', placeItems: 'center', fontSize: '28px', fontWeight: 800, color: '#022c22' }}>
            {isFinite(Number(spid.slice(-1))) ? spid.split('-')[1]?.[0] : 'D'}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 800, letterSpacing: '.06em', color: verified ? '#10b981' : '#f59e0b', padding: '3px 12px', borderRadius: 999, border: '1px solid var(--line)', background: verified ? 'rgba(16,185,129,.08)' : 'rgba(245,158,11,.08)' }}>
              <BadgeCheck size={14} /> {verified ? (ar ? 'موثّق ✓' : 'VERIFIED') : agg.member?.status}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,36px)', margin: '.5rem 0 .15rem' }}>
              {ar && nameAr ? nameAr : name}
            </h1>
            <div style={{ color: '#10b981', fontSize: '15px' }}>{profile?.headline || identity?.specialty || 'Healthcare provider'}</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '13px', color: 'var(--ink-soft)', marginTop: '.35rem' }}>
              {spid} {identity?.oidUrn ? `· ${identity.oidUrn}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
          <a className="button primary" href={consultedProduct} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} /> {ar ? 'احجز استشارة' : 'Book a consultation'} <ExternalLink size={14} />
          </a>
          <Link className="button secondary" to="/slots">{ar ? 'شواغر المستشفيات' : 'Hospital slots'}</Link>
          <button onClick={load} className="icon-btn round" aria-label={ar ? 'تحديث' : 'Refresh'}><RefreshCw size={14} /></button>
        </div>

        {profile?.bio && <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>}
      </section>

      {/* Trust / identity strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
        {[
          { icon: <ShieldCheck size={16} />, en: 'Registry ID', v: agg.spid },
          { icon: <Building2 size={16} />, en: 'Org', v: identity?.location?.organization_name_en || (identity?.location?.city ?? '—') },
          { icon: <BadgeCheck size={16} />, en: 'Trust', v: agg.member?.trust_level || '—' },
          { icon: <Wallet size={16} />, en: ar ? 'رصيد' : 'Ledger', v: `${(agg.ledger?.balance_sar ?? 0).toLocaleString()} SAR` },
        ].map((c, i) => (
          <div key={i} style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--surface)', padding: '.9rem 1rem', display: 'grid', gap: '.3rem' }}>
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 700 }}>{c.icon} {ar ? c.en : c.en}</div>
            <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '14px' }}>{c.v}</code>
          </div>
        ))}
      </section>

      {/* Services / modes */}
      {(profile?.services?.length || profile?.modes?.length) && (
        <section style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '1.4rem 1.6rem', marginTop: '1.25rem' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', margin: '0 0 .8rem' }}>
            <Stethoscope size={15} style={{ verticalAlign: -2, marginRight: 6 }} color="#10b981" /> {ar ? 'الخدمات' : 'What I provide'}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            {(profile?.services || []).map(s => <span key={s} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 12px', fontSize: '13px' }}>{s}</span>)}
            {(profile?.modes || []).map(m => <span key={m} style={{ borderRadius: 999, padding: '4px 12px', fontSize: '13px', background: 'rgba(16,185,129,.1)', color: '#10b981' }}>{String(m).replace(/_/g, ' ')}</span>)}
          </div>
        </section>
      )}

      {/* Held slots */}
      <section style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '1.4rem 1.6rem', marginTop: '1.25rem' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', margin: '0 0 .8rem' }}>
          <Clock size={15} style={{ verticalAlign: -2, marginRight: 6 }} color="#10b981" /> {ar ? 'الشواغر النشطة' : 'Active slots'}
        </h2>
        {(agg.slots_held || []).length === 0
          ? <p style={{ color: 'var(--ink-soft)', margin: 0 }}>{ar ? 'لا شواغر نشطة حالياً.' : 'No active slots.'}</p>
          : <div style={{ display: 'grid', gap: '.6rem' }}>
              {(agg.slots_held || []).map(s => (
                <div key={s.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '12px', padding: '.7rem 1rem' }}>
                  <code style={{ fontSize: '12px' }}>{s.id}</code>
                  <span style={{ flex: 1, fontSize: '14px' }}>{s.title}</span>
                  <span style={{ fontSize: '11px', color: s.state === 'live' ? '#10b981' : 'var(--ink-soft)', fontWeight: 800, letterSpacing: '.05em' }}>{s.state.toUpperCase()}</span>
                </div>
              ))}
            </div>}
      </section>

      {/* Provisioning status */}
      <section style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '1.4rem 1.6rem', marginTop: '1.25rem' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', margin: '0 0 .8rem' }}>
          <ExternalLink size={15} style={{ verticalAlign: -2, marginRight: 6 }} color="#10b981" /> {ar ? 'منظومة العمل' : 'Business stack'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
          {(agg.provisioning || []).map(p => (
            <span key={p.step} style={{ border: '1px solid var(--line)', borderRadius: 999, padding: '4px 12px', fontSize: '12px', color: 'var(--ink-soft)' }}>
              {p.step} <span style={{ color: p.status === 'done' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>✓</span>
            </span>
          ))}
          {prov.length === 0 && <span style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>{ar ? 'قيد التجهيز' : 'Pending provisioning'}</span>}
        </div>
      </section>

      {/* Credential links */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
        <a href={`${IDENTITY}/api/provider/${spid}`} target="_blank" rel="noopener noreferrer" className="button secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '13px' }}>
          <ShieldCheck size={15} /> {ar ? 'الهوية الموقّعة' : 'Signed identity'} <ExternalLink size={13} />
        </a>
        <a href={`${REGISTRY}/p/${spid}`} target="_blank" rel="noopener noreferrer" className="button secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '13px' }}>
          <BadgeCheck size={15} /> {ar ? 'ملف السجل' : 'Registry profile'} <ExternalLink size={13} />
        </a>
        <a href={`${REGISTRY}/partner/${spid}`} target="_blank" rel="noopener noreferrer" className="button secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '13px' }}>
          <Wallet size={15} /> {ar ? 'البيانات المركّبة' : 'Aggregate data'} <ExternalLink size={13} />
        </a>
      </section>

      <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '12px', color: 'var(--ink-soft)' }}>
        braid: {agg.canonical || '—'}
      </p>
    </main>
  );
}