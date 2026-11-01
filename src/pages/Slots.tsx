import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarClock, Clock3, Megaphone, RefreshCw, Send, ShieldCheck, Stethoscope } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useI18n } from '../i18n';
import { BprLayout, Failed, Loading, SourceBadge } from '../components/BprKit';
import { Provider, REGISTRY, timeoutSignal, useLoad } from '../lib/bpr';

const FEATURED_SPID = 'SA-PHY-000003';
const BOOKING = 'https://calendar.app.google/rAqiE6pNumtECdnd7';
// The registry has not published a slots route yet. The page asks for it on every visit and
// switches to the live marketplace by itself the moment one of these answers with JSON.
const SLOT_ROUTES = ['/api/slots', '/slots'];

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

type Filter = 'all' | 'empty' | 'live';
type LoadState = 'loading' | 'ready' | 'soon' | 'error';

const isSlot = (s: unknown): s is Slot => !!s && typeof (s as Slot).id === 'string' && typeof (s as Slot).title === 'string';
const sar = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toLocaleString('en-US')} SAR` : '—');
const words = (s: unknown) => (typeof s === 'string' ? s.replace(/_/g, ' ') : '');

const STEPS = [
  { icon: Megaphone, en: 'A hospital publishes a slot', ar: 'تنشر المستشفى فترة متاحة',
    enText: 'Shift, clinic, locum or telehealth — with the integration fee and monthly fee shown up front.', arText: 'مناوبة أو عيادة أو تغطية مؤقتة أو طب عن بُعد — مع رسوم التكامل والاشتراك الشهري معلنة من البداية.' },
  { icon: ShieldCheck, en: 'A provider requests it with a BPR ID', ar: 'يطلبها مقدم الرعاية بمعرّف BPR',
    enText: 'The request carries the provider’s SPID, so the hospital sees a signed, checkable identity — not a CV attachment.', arText: 'يحمل الطلب معرّف SPID، فترى المستشفى هوية موقّعة يمكن فحصها — لا مجرد سيرة ذاتية مرفقة.' },
  { icon: BadgeCheck, en: 'The hospital approves the match', ar: 'توافق المستشفى على الإسناد',
    enText: 'The assignment is recorded against the provider’s BPR identity, ready for the next opportunity.', arText: 'يُسجَّل الإسناد على هوية BPR لمقدم الرعاية، جاهزًا للفرصة التالية.' },
];

export default function Slots() {
  const { ar } = useI18n();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [route, setRoute] = useState(SLOT_ROUTES[0]);
  const featured = useLoad<Provider>(`/api/providers/${FEATURED_SPID}`, `providers/${FEATURED_SPID}.json`);
  const [filter, setFilter] = useState<Filter>('all');
  const [state, setState] = useState<LoadState>('loading');
  const [requestSlot, setRequestSlot] = useState<string | null>(null);
  const [spid, setSpid] = useState('');
  const [message, setMessage] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [requestId, setRequestId] = useState('');

  usePageMeta({
    title: ar ? 'شواغر المستشفيات — BPR' : 'Hospital slots — BPR',
    description: ar
      ? 'سوق شواغر المستشفيات في BPR: تنشر المستشفيات فتراتها، ويطلبها مقدمو الرعاية الموثّقون بمعرّف BPR. ينطلق قريبًا.'
      : 'The BPR hospital slots marketplace: hospitals publish openings and verified providers request them with a BPR ID. Launching soon.',
    url: '/slots', type: 'website',
  });

  const load = async () => {
    setState('loading');
    let reached = false;
    for (const path of SLOT_ROUTES) {
      try {
        const r = await fetch(REGISTRY + path, { cache: 'no-store', signal: timeoutSignal(8000) });
        reached = true;
        if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) continue;
        const body = await r.json();
        const list: unknown[] = Array.isArray(body) ? body : Array.isArray(body?.slots) ? body.slots : [];
        setSlots(list.filter(isSlot));
        setRoute(path);
        setState('ready');
        return;
      } catch { /* try the next route */ }
    }
    // Reached the registry but no route serves slots yet: the marketplace has not opened.
    setState(reached ? 'soon' : 'error');
  };
  useEffect(() => { void load(); }, []);

  const submitRequest = async (slotId: string) => {
    if (!spid.trim()) return;
    setSubmitState('sending');
    try {
      const response = await fetch(`${REGISTRY}${route}/${encodeURIComponent(slotId)}/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spid: spid.trim().toUpperCase(), message: message.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('request failed');
      setRequestId(String(data.id ?? data.request_id ?? ''));
      setSubmitState('done');
    } catch {
      setSubmitState('failed');
    }
  };

  const visible = slots.filter((slot) => filter === 'all' || slot.state === filter);
  const openCount = slots.filter((slot) => slot.state === 'empty').length;
  const live = state === 'ready';
  const fp = featured.state === 'ready' ? featured.data : null;

  return (
    <BprLayout
      kicker={live ? (ar ? 'فرص العمل · مباشر من السجل' : 'Work opportunities · live from the registry') : (ar ? 'شواغر المستشفيات · قريبًا' : 'Hospital slots · launching soon')}
      title={ar ? 'فرص المستشفيات، من النشر إلى الطلب.' : 'Hospital opportunities, from listing to request.'}
      lead={ar
        ? 'تنشر المستشفيات والعيادات فتراتها المتاحة — مناوبات وعيادات وتغطية مؤقتة وطب عن بُعد — ويطلبها مقدمو الرعاية الموثّقون بمعرّف BPR، مع وضوح الأسعار والشروط من البداية.'
        : 'Hospitals and clinics publish open slots — shifts, clinics, locums, telehealth — and verified providers request them with a BPR ID, with prices and terms visible up front.'}
      actions={<>
        <Link className="profile-button primary" to="/bpr/join">{ar ? 'احصل على معرّف BPR' : 'Get a BPR ID'}<ArrowRight size={16} /></Link>
        <a className="profile-button secondary" href={BOOKING} target="_blank" rel="noreferrer">{ar ? 'للمستشفيات: احجز مكالمة' : 'Hospitals: book a call'}<ArrowUpRight size={16} /></a>
      </>}
    >
      {state === 'loading' && <Loading label={ar ? 'جارٍ تحميل الشواغر من السجل…' : 'Loading slots from the registry…'} />}

      {state === 'soon' && <section className="bpr-panel slots-soon" aria-labelledby="slots-soon-title">
        <div className="slots-soon-head">
          <CalendarClock size={26} aria-hidden="true" />
          <div>
            <span className="bpr-chip planned">{ar ? 'قريبًا' : 'Coming next'}</span>
            <h2 id="slots-soon-title">{ar ? 'سوق الشواغر ينطلق قريبًا.' : 'The slots marketplace is launching soon.'}</h2>
          </div>
        </div>
        <p>{ar
          ? 'ستظهر القوائم هنا تلقائيًا فور نشرها في السجل. وحتى ذلك الحين: مقدمو الرعاية — احصلوا على معرّف BPR ليكون ملفكم جاهزًا من اليوم الأول؛ والمستشفيات — احجزوا مكالمة لإدراج أولى فرصكم.'
          : 'Listings appear here automatically the moment the registry publishes them. Until then: providers — get a BPR ID so your profile is ready on day one; hospitals — book a call to list your first openings.'}</p>
        <div className="profile-actions">
          <Link className="profile-button primary" to="/bpr/join">{ar ? 'جهّز ملفك الآن' : 'Get your profile ready'}<ArrowRight size={16} /></Link>
          <a className="profile-button secondary" href={BOOKING} target="_blank" rel="noreferrer">{ar ? 'أدرج فرص مستشفاك' : 'List your hospital’s openings'}<ArrowUpRight size={16} /></a>
          <button className="profile-button text-button" onClick={() => void load()}><RefreshCw size={15} />{ar ? 'تحقق مجددًا' : 'Check again'}</button>
        </div>
      </section>}

      {state === 'error' && <Failed>{ar ? 'تعذّر الوصول إلى السجل من هذا المتصفح.' : 'The registry could not be reached from this browser.'} <button className="profile-text-link" onClick={() => void load()}>{ar ? 'إعادة المحاولة' : 'Try again'}<RefreshCw size={13} /></button></Failed>}

      {live && <>
        <section className="slots-summary" aria-label={ar ? 'ملخص الشواغر' : 'Slot summary'}>
          <div><span>{ar ? 'متاح الآن' : 'Open now'}</span><strong>{openCount}</strong></div>
          <div><span>{ar ? 'كل الفترات المنشورة' : 'All published slots'}</span><strong>{slots.length}</strong></div>
          <div className="slots-summary-source"><SourceBadge source="live" /><button className="profile-button secondary" onClick={() => void load()}><RefreshCw size={15} />{ar ? 'تحديث' : 'Refresh'}</button></div>
        </section>

        <div className="bpr-toolbar">
          <div className="bpr-chips" role="group" aria-label={ar ? 'تصفية الشواغر' : 'Filter slots'}>
            {(['all', 'empty', 'live'] as const).map((value) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === 'all' ? (ar ? 'الكل' : 'All') : value === 'empty' ? (ar ? 'متاح' : 'Open') : (ar ? 'مشغول' : 'Filled')}
            </button>)}
          </div>
        </div>

        {visible.length === 0 && <div className="bpr-state"><Clock3 size={18} /><div><strong>{ar ? 'لا توجد فترات في هذا العرض.' : 'No slots in this view.'}</strong><p>{filter === 'all' ? (ar ? 'تظهر القوائم الجديدة هنا فور نشرها.' : 'New listings appear here as they are published.') : (ar ? 'اختر «الكل» لرؤية بقية الفترات المنشورة.' : 'Choose “All” to see the other published slots.')}</p></div></div>}

        {visible.length > 0 && <div className="slots-grid">
          {visible.map((slot) => {
            const open = slot.state === 'empty';
            const requesting = requestSlot === slot.id;
            return <article key={slot.id} className="slot-card">
              <div className="slot-card-top"><span className={`ws-status ${open ? 'awaiting' : 'live'}`}>{open ? (ar ? 'متاح' : 'Open') : (ar ? 'مشغول' : 'Filled')}</span><code dir="ltr">{slot.id}</code></div>
              <h2>{slot.title}</h2>
              <p className="slot-org"><Building2 size={15} />{slot.org_name ?? slot.org_spid}{slot.org_trust_level && <small>· {slot.org_trust_level}</small>}</p>
              <p className="slot-specialty"><Stethoscope size={15} />{[words(slot.specialty), words(slot.slot_type)].filter(Boolean).join(' · ')}</p>
              <dl className="slot-prices"><div><dt>{ar ? 'رسوم التكامل' : 'Integration fee'}</dt><dd dir="ltr">{sar(slot.price_integration_sar)}</dd></div><div><dt>{ar ? 'شهريًا' : 'Monthly'}</dt><dd dir="ltr">{sar(slot.price_monthly_sar)}</dd></div></dl>
              {!open && slot.holder_spid && <Link className="bpr-ext" to={`/bpr/p/${encodeURIComponent(slot.holder_spid)}`}>{ar ? 'مقدم الرعاية الحالي' : 'Current provider'} · <bdi dir="ltr">{slot.holder_spid}</bdi><ArrowRight size={13} /></Link>}
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
      </>}

      {state !== 'loading' && <section className="bpr-section">
        <div className="profile-section-label">{live ? (ar ? 'كيف يعمل' : 'How it works') : (ar ? 'كيف سيعمل' : 'How it will work')}</div>
        <ol className="bpr-steps">
          {STEPS.map(({ icon: Icon, ...s }, i) => (
            <li key={s.en}><span>{String(i + 1).padStart(2, '0')}</span><Icon size={22} /><div><h3>{ar ? s.ar : s.en}</h3><p>{ar ? s.arText : s.enText}</p></div></li>
          ))}
        </ol>
      </section>}

      {fp && <section className="bpr-panel slot-provider">
        <div><span className="profile-section-label">{ar ? 'ملف مقدم رعاية على الشبكة' : 'Provider on the network'}</span><h2>{ar ? fp.name_ar || fp.name_en : fp.name_en}</h2>{fp.specialty && <p>{fp.specialty}</p>}</div>
        <Link className="profile-button secondary" to={`/bpr/p/${fp.spid}`}>{ar ? 'افتح الملف العام' : 'Open public profile'}<ArrowRight size={15} /></Link>
      </section>}
    </BprLayout>
  );
}
