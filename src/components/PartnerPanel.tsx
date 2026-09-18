import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, BadgeCheck, ExternalLink, RefreshCw, Wallet, Clock, Stethoscope } from 'lucide-react';
import { useI18n } from '../i18n';

/* §9 Partner portal panel — renders registry.partner/:spid aggregate inside /account.
   Renders only when an SPID is provided via ?partner=<spid>. Live data, registry-fed. */

const REGISTRY = 'https://registry.brainsait.org';

interface PartnerAgg {
  spid: string;
  member?: { business_name?: string; email?: string; trust_level?: string; status?: string };
  canonical?: string;
  storefront?: string;
  slots_held?: { id: string; title: string; state: string }[];
  slots_published?: { id: string; title: string; state: string }[];
  delegations?: { id: string; from_spid: string; to_spid: string; state: string }[];
  ledger?: { balance_sar: number };
  provisioning?: { step: string; status: string }[];
}

export default function PartnerPanel({ spid }: { spid: string }) {
  const { ar } = useI18n();
  const [data, setData] = useState<PartnerAgg | null>(null);
  const [loading, setLoading] = useState(Boolean(spid));
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!spid) { setData(null); setLoading(false); return; }
    setLoading(true); setError(false);
    fetch(`${REGISTRY}/partner/${spid}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [spid, tick]);

  if (!spid) return null;
  if (loading) return <div className="account-card"><p className="muted">{ar ? 'جارٍ تحميل بيانات الشريك…' : 'Loading partner data…'}</p></div>;
  if (error || !data?.member)
    return <div className="account-card"><p className="muted" style={{ color: '#f87171' }}>{ar ? 'الشريك غير موجود في السجل.' : 'Partner not found in registry.'}</p></div>;

  const done = (data.provisioning || []).filter((p) => p.status === 'done').map((p) => p.step);
  const liveSlots = (data.slots_held || []).filter((s) => s.state === 'live');

  return (
    <div className="account-card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={18} color="#10b981" /> {ar ? 'لوحة الشريك' : 'Partner Dashboard'}
          <BadgeCheck size={15} color="#10b981" />
        </h2>
        <code style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{data.spid}</code>
      </div>
      <p className="muted" style={{ margin: '.5rem 0' }}>
        {data.member.business_name} · {ar ? 'الثقة' : 'Trust'}: {data.member.trust_level} · {data.member.status}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: '.75rem', margin: '1rem 0' }}>
        <div><div className="account-label"><Wallet size={14} /> {ar ? 'رصيد التسوية' : 'Ledger'}</div><strong>{(data.ledger?.balance_sar ?? 0).toLocaleString()} SAR</strong></div>
        <div><div className="account-label"><Clock size={14} /> {ar ? 'شواغر نشطة' : 'Live slots'}</div><strong>{liveSlots.length}</strong></div>
        <div><div className="account-label"><Stethoscope size={14} /> {ar ? 'منشورة' : 'Published'}</div><strong>{(data.slots_published || []).length}</strong></div>
        <div><div className="account-label"><ShieldCheck size={14} /> {ar ? 'تفويضات' : 'Delegations'}</div><strong>{(data.delegations || []).filter(d => d.state === 'active').length}</strong></div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', alignItems: 'center' }}>
        {done.map((s) => <span key={s} className="badge">{s}</span>)}
        <a className="button secondary sm" href={data.storefront} target="_blank" rel="noopener noreferrer">
          {ar ? 'المتجر' : 'Storefront'} <ExternalLink size={13} style={{ verticalAlign: -2 }} />
        </a>
        <a className="button secondary sm" href={data.canonical} target="_blank" rel="noopener noreferrer">
          ID <ExternalLink size={13} style={{ verticalAlign: -2 }} />
        </a>
        <Link className="button secondary sm" to={`/doctors/${data.spid}`}>{ar ? 'ملف الطبيب' : 'Doctor page'}</Link>
        <button className="icon-btn round" onClick={() => setTick((t) => t + 1)} title={ar ? 'تحديث' : 'Refresh'}>
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}