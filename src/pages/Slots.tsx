import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Clock3, RefreshCw, Send, Stethoscope } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useI18n } from '../i18n';
import { BprLayout, Failed, Loading, SourceBadge } from '../components/BprKit';

const REGISTRY = 'https://registry.brainsait.de';
const FEATURED_SPID = 'SA-PHY-000003';

interface Slot {
  id: string;
  org_spid: string;
  slot_type: string;
  specialty: string;
  title: string;
  price_integration_sar: number;
  price_monthly_sar: number;
  state: string;
  holder_spid: string | null;
  org_name?: string;
  org_trust_level?: string;
}

interface ProviderProfile {
  spid: string;
  name: string;
  headline?: string;
  services?: string[];
}

type Filter = 'all' | 'empty' | 'live';

export default function Slots() {
  const { ar } = useI18n();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [requestSlot, setRequestSlot] = useState<string | null>(null);
  const [spid, setSpid] = useState('');
  const [message, setMessage] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [requestId, setRequestId] = useState('');

  usePageMeta({
    title: ar ? 'شواغر المستشفيات المباشرة — BPR' : 'Live hospital slots — BPR',
    description: ar
      ? 'تصفّح الشواغر المنشورة مباشرة من سجل برينسايت واطلب الفترة المناسبة باستخدام معرّف BPR الخاص بك.'
      : 'Browse opportunities published live by the BrainSAIT Provider Registry and request a suitable slot with your BPR ID.',
    url: '/slots', type: 'website',
  });

  const load = async () => {
    setState('loading');
    try {
      const [slotResponse, profileResponse] = await Promise.all([
        fetch(`${REGISTRY}/slots`, { cache: 'no-store' }),
        fetch(`${REGISTRY}/api/profiles/${FEATURED_SPID}`, { cache: 'no-store' }),
      ]);
      if (!slotResponse.ok) throw new Error('slots unavailable');
      const slotData = await slotResponse.json();
      setSlots(Array.isArray(slotData.slots) ? slotData.slots : []);
      setProvider(profileResponse.ok ? await profileResponse.json() : null);
      setState('ready');
    } catch {
      setState('error');
    }
  };
  useEffect(() => { void load(); }, []);

  const submitRequest = async (slotId: string) => {
    if (!spid.trim()) return;
    setSubmitState('sending');
    try {
      const response = await fetch(`${REGISTRY}/slots/${encodeURIComponent(slotId)}/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spid: spid.trim().toUpperCase(), message: message.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('request failed');
      setRequestId(data.id ?? data.request_id ?? '');
      setSubmitState('done');
    } catch {
      setSubmitState('failed');
    }
  };

  const visible = slots.filter((slot) => filter === 'all' || slot.state === filter);
  const openCount = slots.filter((slot) => slot.state === 'empty').length;

  return (
    <BprLayout
      kicker={ar ? 'فرص العمل · مباشر من السجل' : 'Work opportunities · live from the registry'}
      title={ar ? 'شواغر المستشفيات، من النشر إلى الطلب.' : 'Hospital opportunities, from listing to request.'}
      lead={ar
        ? 'تنشر المؤسسات الفترات المتاحة، ويطلبها مقدمو الرعاية بمعرّف BPR. تُقرأ القوائم والأسعار والحالات مباشرة من السجل، ويستكمل الطلب عبر واجهته العامة.'
        : 'Organizations publish open slots and healthcare professionals request them with a BPR ID. Listings, prices and states come straight from the registry, and requests use its public API.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/providers">{ar ? 'ابحث عن مقدم رعاية' : 'Find a provider'}<ArrowRight size={16} /></Link>
        <Link className="profile-button secondary" to="/bpr/join">{ar ? 'احصل على معرّف BPR' : 'Get a BPR ID'}<ArrowRight size={16} /></Link>
      </>}
    >
      <section className="slots-summary" aria-label={ar ? 'ملخص الشواغر' : 'Slot summary'}>
        <div><span>{ar ? 'متاح الآن' : 'Open now'}</span><strong>{state === 'ready' ? openCount : '—'}</strong></div>
        <div><span>{ar ? 'كل الفترات المنشورة' : 'All published slots'}</span><strong>{state === 'ready' ? slots.length : '—'}</strong></div>
        <div className="slots-summary-source">{state === 'ready' && <SourceBadge source="live" />}<button className="profile-button secondary" onClick={() => void load()} disabled={state === 'loading'}><RefreshCw size={15} />{ar ? 'تحديث' : 'Refresh'}</button></div>
      </section>

      <div className="bpr-toolbar">
        <div className="bpr-chips" role="group" aria-label={ar ? 'تصفية الشواغر' : 'Filter slots'}>
          {(['all', 'empty', 'live'] as const).map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? (ar ? 'الكل' : 'All') : value === 'empty' ? (ar ? 'متاح' : 'Open') : (ar ? 'مُفعّل' : 'Filled')}
          </button>)}
        </div>
      </div>

      {state === 'loading' && <Loading label={ar ? 'جارٍ تحميل الشواغر من السجل…' : 'Loading slots from the registry…'} />}
      {state === 'error' && <Failed>{ar ? 'تعذّر الوصول إلى الشواغر. أعد المحاولة للتحقق من أحدث القوائم.' : 'Slots could not be reached. Retry to check the latest listings.'} <button className="profile-text-link" onClick={() => void load()}>{ar ? 'إعادة المحاولة' : 'Try again'}<RefreshCw size={13} /></button></Failed>}
      {state === 'ready' && visible.length === 0 && <div className="bpr-state"><Clock3 size={18} /><div><strong>{ar ? 'لا توجد فترات في هذا العرض.' : 'No slots in this view.'}</strong><p>{filter === 'all' ? (ar ? 'تحقق لاحقًا؛ تظهر القوائم الجديدة هنا فور نشرها.' : 'Check back later; new listings appear here as they are published.') : (ar ? 'جرّب «الكل» لرؤية بقية الفترات المنشورة.' : 'Choose “All” to see the other published slots.')}</p></div></div>}

      {state === 'ready' && visible.length > 0 && <div className="slots-grid">
        {visible.map((slot) => {
          const open = slot.state === 'empty';
          const requesting = requestSlot === slot.id;
          return <article key={slot.id} className="slot-card">
            <div className="slot-card-top"><span className={`ws-status ${open ? 'awaiting' : 'live'}`}>{open ? (ar ? 'متاح' : 'Open') : (ar ? 'مُفعّل' : 'Filled')}</span><code dir="ltr">{slot.id}</code></div>
            <h2>{slot.title}</h2>
            <p className="slot-org"><Building2 size={15} />{slot.org_name ?? slot.org_spid}{slot.org_trust_level && <small>· {slot.org_trust_level}</small>}</p>
            <p className="slot-specialty"><Stethoscope size={15} />{slot.specialty.replace(/_/g, ' ')} · {slot.slot_type.replace(/_/g, ' ')}</p>
            <dl className="slot-prices"><div><dt>{ar ? 'رسوم التكامل' : 'Integration fee'}</dt><dd>{slot.price_integration_sar.toLocaleString()} SAR</dd></div><div><dt>{ar ? 'شهريًا' : 'Monthly'}</dt><dd>{slot.price_monthly_sar.toLocaleString()} SAR</dd></div></dl>
            {!open && slot.holder_spid && <Link className="bpr-ext" to={`/bpr/p/${slot.holder_spid}`}>{ar ? 'مقدم الرعاية الحالي' : 'Current provider'} · <bdi dir="ltr">{slot.holder_spid}</bdi><ArrowRight size={13} /></Link>}
            {open && !requesting && <button className="profile-button primary slot-request" onClick={() => { setRequestSlot(slot.id); setSubmitState('idle'); setRequestId(''); }}><Send size={15} />{ar ? 'اطلب هذه الفترة' : 'Request this slot'}</button>}
            {open && requesting && <form className="slot-form" onSubmit={(event) => { event.preventDefault(); void submitRequest(slot.id); }}>
              {submitState === 'done' ? <div className="slot-success" role="status"><BadgeCheck size={19} /><div><strong>{ar ? 'استلم السجل طلبك.' : 'The registry received your request.'}</strong><p>{requestId ? `${ar ? 'رقم الطلب' : 'Request ID'}: ${requestId}. ` : ''}{ar ? 'تخضع الخطوات التالية لموافقة المستشفى.' : 'Next steps are subject to hospital approval.'}</p></div></div> : <>
                <label htmlFor={`spid-${slot.id}`}>{ar ? 'معرّف BPR الخاص بك' : 'Your BPR SPID'}</label>
                <input id={`spid-${slot.id}`} dir="ltr" autoComplete="off" value={spid} onChange={(event) => setSpid(event.target.value)} placeholder="SA-PHY-000003" required />
                <label htmlFor={`message-${slot.id}`}>{ar ? 'رسالة للمستشفى (اختياري)' : 'Message to the hospital (optional)'}</label>
                <textarea id={`message-${slot.id}`} rows={3} value={message} onChange={(event) => setMessage(event.target.value)} />
                <button className="profile-button primary" type="submit" disabled={submitState === 'sending' || !spid.trim()}><Send size={14} />{submitState === 'sending' ? (ar ? 'جارٍ الإرسال…' : 'Sending…') : (ar ? 'إرسال الطلب' : 'Submit request')}</button>
                {submitState === 'failed' && <p className="slot-error" role="alert">{ar ? 'لم يُرسل الطلب. راجع المعرّف وحاول مرة أخرى.' : 'The request was not sent. Check the ID and try again.'}</p>}
              </>}
            </form>}
          </article>;
        })}
      </div>}

      {provider && <section className="bpr-panel slot-provider">
        <div><span className="profile-section-label">{ar ? 'ملف مقدم رعاية على الشبكة' : 'Provider on the network'}</span><h2>{provider.name}</h2><p>{provider.headline}</p></div>
        <Link className="profile-button secondary" to={`/bpr/p/${provider.spid}`}>{ar ? 'افتح الملف العام' : 'Open public profile'}<ArrowRight size={15} /></Link>
      </section>}
    </BprLayout>
  );
}
