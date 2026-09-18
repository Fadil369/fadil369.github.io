import { useEffect, useState } from 'react';
import { Building2, Stethoscope, Clock, MapPin, BadgeCheck, Send, RefreshCw } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useI18n } from '../i18n';

/* Hospital Vacancy Slots — live marketplace fed by the BPR registry
   (registry.brainsait.org). CORS is open on the registry; all data on
   this page is fetched live in the browser, nothing is baked in. */

const REGISTRY = 'https://registry.brainsait.org';

interface Slot {
  id: string;
  org_spid: string;
  slot_type: string;
  specialty: string;
  title: string;
  price_integration_sar: number;
  price_monthly_sar: number;
  state: string; // empty | requested | paid | verified | live
  holder_spid: string | null;
  org_name?: string;
  org_trust_level?: string;
}

interface ProviderProfile {
  spid: string;
  name: string;
  headline?: string;
  services?: string[];
  trust_level?: string;
  slots_held?: { id: string; title: string; state: string }[];
}

const FEATURED_SPID = 'SA-PHY-000001';

const STATE_STYLE: Record<string, { bg: string; fg: string; en: string; ar: string }> = {
  live:  { bg: 'rgba(16,185,129,.15)', fg: '#10b981', en: 'LIVE',  ar: 'مُفعّل' },
  empty: { bg: 'rgba(245,158,11,.15)', fg: '#f59e0b', en: 'OPEN',  ar: 'متاح' },
};

function stateStyle(state: string) {
  return STATE_STYLE[state] ?? { bg: 'rgba(148,163,184,.15)', fg: '#94a3b8', en: state.toUpperCase(), ar: state };
}

export default function Slots() {
  const { ar } = useI18n();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [filter, setFilter] = useState<'all' | 'empty' | 'live'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestSlot, setRequestSlot] = useState<string | null>(null);
  const [spid, setSpid] = useState('');
  const [message, setMessage] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [requestId, setRequestId] = useState('');

  usePageMeta({
    title: ar ? 'شواغر المستشفيات — سوق BrainSAIT' : 'Hospital Vacancy Slots — BrainSAIT Marketplace',
    description: ar
      ? 'تصفّح الشواغر الطبية المباشرة من سجل مقدمي الخدمة. اطلب شاغراً، ادفع رسوم التكامل، وابدأ العمل بهويتك الموثقة.'
      : 'Browse live hospital vacancy slots from the BrainSAIT Provider Registry. Request a slot, pay the integration fee, and start operating with your verified identity.',
    url: '/slots',
    type: 'website',
  });

  const load = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch(`${REGISTRY}/slots`).then(r => r.json()),
      fetch(`${REGISTRY}/api/profiles/${FEATURED_SPID}`).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([slotsData, profileData]) => {
        setSlots(slotsData.slots ?? []);
        setProvider(profileData);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const submitRequest = async (slotId: string) => {
    if (!spid.trim()) return;
    setSubmitState('sending');
    try {
      const r = await fetch(`${REGISTRY}/slots/${slotId}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spid: spid.trim(), message: message.trim() || undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setRequestId(data.id ?? data.request_id ?? '');
        setSubmitState('done');
      } else {
        setSubmitState('failed');
      }
    } catch {
      setSubmitState('failed');
    }
  };

  const visible = slots.filter(s => filter === 'all' || s.state === filter);
  const openCount = slots.filter(s => s.state === 'empty').length;

  return (
    <main className="page" style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.25rem' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '999px', border: '1px solid var(--line)', background: 'var(--surface)', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', color: '#10b981' }}>
          <BadgeCheck size={14} /> {ar ? 'مباشر من السجل' : 'LIVE FROM THE REGISTRY'}
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 44px)', margin: '1rem 0 .5rem' }}>
          {ar ? 'شواغر المستشفيات' : 'Hospital Vacancy Slots'}
        </h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.7 }}>
          {ar
            ? 'المستشفيات تنشر شواغرها، الأطباء يطلبون بهويتهم الموثقة (SPID)، يدفعون رسوم التكامل، ويبدأون العمل — بمساعدة الوكلاء الأذكياء.'
            : 'Hospitals publish empty slots. Doctors request with their verified SPID, pay the integration fee, and start operating — assisted by agents.'}
        </p>
        <p style={{ marginTop: '.75rem', fontSize: '14px', color: 'var(--ink-soft)' }}>
          {ar ? `${openCount} شاغر متاح · ${slots.length} إجمالي` : `${openCount} open · ${slots.length} total`}
          <button onClick={load} className="icon-btn round" style={{ marginInlineStart: '8px', verticalAlign: 'middle' }} aria-label={ar ? 'تحديث' : 'Refresh'}>
            <RefreshCw size={14} />
          </button>
        </p>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['all', 'empty', 'live'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={filter === f ? 'button primary sm' : 'button secondary sm'}>
            {f === 'all' ? (ar ? 'الكل' : 'All') : f === 'empty' ? (ar ? 'متاح' : 'Open') : (ar ? 'مُفعّل' : 'Live')}
          </button>
        ))}
      </div>

      {loading && <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>{ar ? 'جارٍ التحميل…' : 'Loading live slots…'}</p>}
      {error && (
        <p style={{ textAlign: 'center', color: '#f87171' }}>
          {ar ? 'تعذر الوصول إلى السجل. حاول مجدداً.' : 'Could not reach the registry. Try refreshing.'}
        </p>
      )}

      {/* Slot cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {visible.map(slot => {
          const st = stateStyle(slot.state);
          const open = slot.state === 'empty';
          return (
            <article key={slot.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '.06em', padding: '3px 10px', borderRadius: '999px', background: st.bg, color: st.fg }}>
                  {ar ? st.ar : st.en}
                </span>
                <code style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>{slot.id}</code>
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', lineHeight: 1.4 }}>{slot.title}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <Building2 size={14} /> {slot.org_name ?? slot.org_spid}
                {slot.org_trust_level && <span style={{ fontSize: '11px', color: '#10b981' }}>· {slot.org_trust_level}</span>}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Stethoscope size={14} /> {slot.specialty.replace(/_/g, ' ')} · {slot.slot_type}
              </p>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>{slot.price_integration_sar.toLocaleString()} SAR</strong> {ar ? 'رسوم تكامل' : 'integration'}
                <span style={{ color: 'var(--ink-soft)' }}> · </span>
                <strong>{slot.price_monthly_sar.toLocaleString()} SAR</strong>/{ar ? 'شهر' : 'mo'}
              </p>
              {slot.state === 'live' && slot.holder_spid && (
                <a href={`${REGISTRY}/p/${slot.holder_spid}`} target="_blank" rel="noopener noreferrer"
                   style={{ fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={14} /> {ar ? 'المشغّل الحالي' : 'Current operator'}: {slot.holder_spid} ↗
                </a>
              )}
              {open && requestSlot !== slot.id && (
                <button className="button primary" style={{ marginTop: 'auto' }}
                  onClick={() => { setRequestSlot(slot.id); setSubmitState('idle'); }}>
                  <Send size={15} /> {ar ? 'اطلب هذا الشاغر' : 'Request this slot'}
                </button>
              )}
              {open && requestSlot === slot.id && (
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {submitState === 'done' ? (
                    <p style={{ margin: 0, fontSize: '13px', color: '#10b981', lineHeight: 1.6 }}>
                      {ar
                        ? `تم استلام طلبك ${requestId}. بعد موافقة المستشفى ستصلك رسوم التكامل للدفع، ثم يُفعّل الشاغر باسمك.`
                        : `Request ${requestId} received. After the hospital approves, you'll receive the integration-fee payment link, then the slot goes live under your name.`}
                    </p>
                  ) : (
                    <>
                      <input value={spid} onChange={e => setSpid(e.target.value)} placeholder={ar ? 'معرّفك SPID (مثال SA-PHY-000001)' : 'Your SPID (e.g. SA-PHY-000001)'}
                        style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px' }} />
                      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} placeholder={ar ? 'رسالة اختيارية للمستشفى' : 'Optional message to the hospital'}
                        style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', background: 'var(--bg)', color: 'inherit', fontSize: '13px', resize: 'vertical' }} />
                      <button className="button primary sm" disabled={submitState === 'sending' || !spid.trim()} onClick={() => submitRequest(slot.id)}>
                        {submitState === 'sending' ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : (ar ? 'إرسال الطلب' : 'Submit request')}
                      </button>
                      {submitState === 'failed' && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>
                          {ar ? 'فشل الإرسال — تحقق من SPID أو حاول لاحقاً.' : 'Submit failed — check your SPID or try later.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Featured provider */}
      {provider && (
        <section style={{ marginTop: '3.5rem', border: '1px solid var(--line)', borderRadius: 'var(--radius)', background: 'var(--surface)', padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, letterSpacing: '.08em', color: '#10b981', marginBottom: '.75rem' }}>
            <Clock size={14} /> {ar ? 'أول طبيب-مشغّل على الشبكة' : 'FIRST DOCTOR-OPERATOR ON THE GRID'}
          </div>
          <h2 style={{ margin: '0 0 .25rem', fontSize: '22px' }}>{provider.name}</h2>
          <p style={{ margin: '0 0 1rem', color: 'var(--ink-soft)' }}>{provider.headline}</p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(provider.services ?? []).map(s => (
              <span key={s} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '999px', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>{s}</span>
            ))}
          </div>
          <a href={`${REGISTRY}/p/${provider.spid}`} target="_blank" rel="noopener noreferrer" className="button secondary">
            {ar ? 'الملف الكامل: ماذا · كيف · أين · متى · مع من · التكلفة' : 'Full profile: what · how · where · when · who assists · cost'} ↗
          </a>
        </section>
      )}
    </main>
  );
}
