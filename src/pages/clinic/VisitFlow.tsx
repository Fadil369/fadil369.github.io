/**
 * Front desk and doctor room for the synthetic-data clinic pilot.
 *
 * Visits live in this browser's localStorage (shared by the reception booking form, the front desk and the doctor room;
 * a second tab stays in sync through the storage event). Nothing is sent to a server, OpenEMR, NPHIES or a model.
 * The lifecycle rules live in src/lib/clinicFlow.ts and the schedule rules in src/lib/clinicSchedule.ts; both are unit tested.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Clock3, Copy, History, Plus, Printer, Stethoscope, UserPlus, Users, X } from 'lucide-react';
import {
  advance, createWalkIn, FlowError, followUpVisit, FOLLOW_UP_DAYS, identifierProblem, MAX_ORDER_TEXT, MAX_ORDERS, ORDER_KINDS, ordersProblems,
  parseVisits, patientHistory, queueOrder, saveEncounter, setPriority, summarize, toFhirBundle, toFhirEncounter, waitMinutes,
  type Order, type OrderKind, type Visit, type VisitStatus, type Vitals,
} from '../../lib/clinicFlow';
import { parseSchedule, planFollowUp, type Schedule } from '../../lib/clinicSchedule';

const KEY = 'brainsait_clinic_requests';
export const SCHEDULE_KEY = 'brainsait_clinic_schedule';
const DRAFT_PREFIX = 'brainsait_clinic_draft_';

export function loadVisits(): Visit[] {
  try { return parseVisits(localStorage.getItem(KEY)); } catch { return []; }
}
export function saveVisits(visits: Visit[]) {
  try { localStorage.setItem(KEY, JSON.stringify(visits.slice(0, 200))); } catch { /* storage may be blocked */ }
}
export function loadSchedule(): Schedule {
  try { return parseSchedule(localStorage.getItem(SCHEDULE_KEY)); } catch { return parseSchedule(null); }
}
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}

// An unsaved note survives a reload or a closed tab. It is a per-visit buffer, removed when the visit is saved, completed
// or no longer open. Text that looks like a real identifier is never written to it.
interface Draft { vit: Record<string, string>; note: { chiefComplaint: string; assessment: string; plan: string; icd10: string }; orders: Order[]; followUp: string }
function loadDraft(id: string): Draft | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_PREFIX + id) ?? 'null');
    if (!d || typeof d !== 'object' || typeof d.vit !== 'object' || typeof d.note !== 'object') return null;
    const str = (x: unknown) => (typeof x === 'string' ? x : '');
    return {
      vit: Object.fromEntries(['temperatureC', 'heartRate', 'systolic', 'diastolic', 'spo2'].map((k) => [k, str(d.vit?.[k])])),
      note: { chiefComplaint: str(d.note.chiefComplaint), assessment: str(d.note.assessment), plan: str(d.note.plan), icd10: str(d.note.icd10) },
      orders: Array.isArray(d.orders) ? d.orders.filter((o: Order) => o && (ORDER_KINDS as readonly string[]).includes(o.kind) && typeof o.text === 'string').slice(0, MAX_ORDERS) : [],
      followUp: str(d.followUp),
    };
  } catch { return null; }
}
function storeDraft(id: string, d: Draft) {
  const texts = [d.note.chiefComplaint, d.note.assessment, d.note.plan, ...d.orders.map((o) => o.text)];
  if (texts.some((t) => identifierProblem(t))) return;
  try { sessionStorage.setItem(DRAFT_PREFIX + id, JSON.stringify(d)); } catch { /* storage may be blocked */ }
}
function clearDraft(id: string) {
  try { sessionStorage.removeItem(DRAFT_PREFIX + id); } catch { /* ignore */ }
}
/** Drops buffers of visits that are gone or no longer being seen. */
function pruneDrafts(visits: Visit[]) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (!key?.startsWith(DRAFT_PREFIX)) continue;
      const visit = visits.find((x) => x.id === key.slice(DRAFT_PREFIX.length));
      if (!visit || (visit.status !== 'in_consult' && visit.status !== 'checked_in')) sessionStorage.removeItem(key);
    }
  } catch { /* ignore */ }
}

type Lang = 'ar' | 'en';

const VF: Record<Lang, Record<string, string>> = {
  en: {
    notice: 'Synthetic data only. Use labels like "Patient 007". Everything here stays in this browser and nothing is sent anywhere.',
    waiting: 'Waiting', inConsult: 'In consultation', bookedToday: 'Booked today', doneToday: 'Completed today', avgWait: 'Average wait', min: 'min', none: 'none yet',
    walkInTitle: 'Walk-in check-in', patient: 'Synthetic patient label', patientHint: 'Format: "Patient 007". Never enter a real name, ID or phone number.',
    service: 'Service', urgent: 'Urgent (seen first)', checkInWalkIn: 'Check in walk-in',
    waitingRoom: 'Waiting room', emptyWaiting: 'Nobody is waiting.', appointments: 'Open appointments',
    emptyAppts: 'No open appointments. Book one from Patient reception.', checkIn: 'Check in', noShow: 'No-show', cancel: 'Cancel',
    markUrgent: 'Mark urgent', clearUrgent: 'Clear urgent', waited: 'Waited', walkIn: 'Walk-in', patientCol: 'Patient', when: 'When', statusCol: 'Status', actions: 'Actions',
    booked: 'Booked', checked_in: 'Waiting', in_consult: 'In consultation', completed: 'Completed', no_show: 'No-show', cancelled: 'Cancelled',
    callNext: 'Call next patient', nowSeeing: 'Now seeing', noActive: 'No patient is in consultation.', vitals: 'Vitals (synthetic)',
    temperatureC: 'Temperature °C', heartRate: 'Heart rate /min', systolic: 'Systolic mmHg', diastolic: 'Diastolic mmHg', spo2: 'SpO₂ %',
    chief: 'Chief complaint', assessment: 'Assessment', plan: 'Plan', icd: 'ICD-10 code (optional)',
    saveDraft: 'Save draft', complete: 'Sign and complete visit', back: 'Return to queue',
    saved: 'Draft saved.', done: 'Visit completed.', completedList: 'Completed today', emptyDone: 'No completed visits today.',
    copyFhir: 'Copy FHIR Encounter (synthetic)', copied: 'Copied',
    doctorNotice: 'Draft documentation only. This pilot gives no diagnosis or treatment advice and is not connected to OpenEMR, NPHIES or any model.',
    'err.patient_label': 'Use a synthetic label such as "Patient 007".',
    'err.bad_transition': 'That step is not allowed from the current status.',
    'err.too_early': 'This booking is for a later day.',
    'err.note_incomplete': 'Add a chief complaint and assessment (and a valid ICD-10 code if you entered one) before completing.',
    'err.vitals': 'Some vitals are outside a plausible range.',
    'err.identifier': 'The text looks like a real ID, phone number or email. Use synthetic text only.',
    'err.unknown': 'Something went wrong. Reload the page and try again.',
    later: 'Check-in opens on the day of the appointment.',
    planLines: 'Plan lines (synthetic)', orderKind: 'Type', orderText: 'Plan line', addLine: 'Add line', remove: 'Remove', noLines: 'No plan lines yet.',
    'kind.lab': 'Lab test', 'kind.imaging': 'Imaging', 'kind.medication': 'Medication (draft)', 'kind.referral': 'Referral', 'kind.advice': 'Advice',
    followUp: 'Follow-up visit', followNone: 'No follow-up', 'days.7': 'In 1 week', 'days.14': 'In 2 weeks', 'days.28': 'In 4 weeks', 'days.90': 'In 3 months',
    followHint: 'The booking is made when you complete the visit, on the first working day with a free time.',
    history: 'Earlier visits of this patient', noHistory: 'No earlier completed visits.', draftRestored: 'Restored your unsaved draft.',
    copyBundle: 'Copy FHIR Bundle (synthetic)', printSummary: 'Print summary', followBooked: 'Follow-up booked',
    followMissing: 'No free follow-up time was found. Book one from Patient reception.', followOf: 'Follow-up',
    sumTitle: 'Synthetic visit summary', sumReference: 'Reference', sumDate: 'Date', sumService: 'Service', sumPatient: 'Patient (synthetic label)',
    sumDisclaimer: 'Synthetic demonstration data. Not a medical record, not a prescription, and not valid for any clinical, insurance or legal use.',
    'err.orders': 'Check the plan lines: each one needs a type and short text.',
    'err.follow_up': 'Choose one of the listed follow-up intervals.',
  },
  ar: {
    notice: 'بيانات اصطناعية فقط. استخدم تسميات مثل "مريض 007". كل ما هنا يبقى في هذا المتصفح ولا يُرسل إلى أي جهة.',
    waiting: 'في الانتظار', inConsult: 'في الكشف', bookedToday: 'محجوز اليوم', doneToday: 'مكتمل اليوم', avgWait: 'متوسط الانتظار', min: 'د', none: 'لا يوجد بعد',
    walkInTitle: 'تسجيل وصول بدون موعد', patient: 'تسمية المريض الاصطناعي', patientHint: 'الصيغة: "مريض 007". لا تُدخل اسمًا أو هوية أو رقم هاتف حقيقيًا.',
    service: 'الخدمة', urgent: 'عاجل (يُكشف عليه أولًا)', checkInWalkIn: 'تسجيل الوصول',
    waitingRoom: 'غرفة الانتظار', emptyWaiting: 'لا أحد في الانتظار.', appointments: 'المواعيد المفتوحة',
    emptyAppts: 'لا توجد مواعيد مفتوحة. احجز موعدًا من استقبال المرضى.', checkIn: 'تسجيل الوصول', noShow: 'لم يحضر', cancel: 'إلغاء',
    markUrgent: 'تعليم كعاجل', clearUrgent: 'إلغاء العاجل', waited: 'الانتظار', walkIn: 'بدون موعد', patientCol: 'المريض', when: 'الموعد', statusCol: 'الحالة', actions: 'الإجراءات',
    booked: 'محجوز', checked_in: 'في الانتظار', in_consult: 'في الكشف', completed: 'مكتمل', no_show: 'لم يحضر', cancelled: 'ملغى',
    callNext: 'استدعاء المريض التالي', nowSeeing: 'المريض الحالي', noActive: 'لا يوجد مريض في الكشف.', vitals: 'العلامات الحيوية (اصطناعية)',
    temperatureC: 'الحرارة °م', heartRate: 'النبض في الدقيقة', systolic: 'الانقباضي ملم زئبق', diastolic: 'الانبساطي ملم زئبق', spo2: 'تشبع الأكسجين ٪',
    chief: 'الشكوى الرئيسية', assessment: 'التقييم', plan: 'الخطة', icd: 'رمز ICD-10 (اختياري)',
    saveDraft: 'حفظ المسودة', complete: 'توقيع وإنهاء الزيارة', back: 'إعادة إلى الانتظار',
    saved: 'تم حفظ المسودة.', done: 'تم إنهاء الزيارة.', completedList: 'مكتمل اليوم', emptyDone: 'لا توجد زيارات مكتملة اليوم.',
    copyFhir: 'نسخ Encounter بصيغة FHIR (اصطناعي)', copied: 'تم النسخ',
    doctorNotice: 'توثيق مسودة فقط. لا تقدم هذه التجربة تشخيصًا أو نصيحة علاجية، وهي غير موصولة بنظام OpenEMR أو نفيس أو أي نموذج.',
    'err.patient_label': 'استخدم تسمية اصطناعية مثل "مريض 007".',
    'err.bad_transition': 'هذه الخطوة غير مسموحة من الحالة الحالية.',
    'err.too_early': 'هذا الموعد في يوم لاحق.',
    'err.note_incomplete': 'أضف الشكوى الرئيسية والتقييم (ورمز ICD-10 صحيحًا إن أدخلته) قبل الإنهاء.',
    'err.vitals': 'بعض العلامات الحيوية خارج النطاق المعقول.',
    'err.identifier': 'يبدو أن النص يحتوي هوية أو هاتفًا أو بريدًا حقيقيًا. استخدم نصًا اصطناعيًا فقط.',
    'err.unknown': 'حدث خطأ. أعد تحميل الصفحة وحاول مرة أخرى.',
    later: 'يُفتح تسجيل الوصول في يوم الموعد.',
    planLines: 'بنود الخطة (اصطناعية)', orderKind: 'النوع', orderText: 'بند الخطة', addLine: 'إضافة بند', remove: 'حذف', noLines: 'لا توجد بنود بعد.',
    'kind.lab': 'تحليل مخبري', 'kind.imaging': 'أشعة', 'kind.medication': 'دواء (مسودة)', 'kind.referral': 'إحالة', 'kind.advice': 'إرشادات',
    followUp: 'زيارة متابعة', followNone: 'بدون متابعة', 'days.7': 'بعد أسبوع', 'days.14': 'بعد أسبوعين', 'days.28': 'بعد ٤ أسابيع', 'days.90': 'بعد ٣ أشهر',
    followHint: 'يُنشأ الموعد عند إنهاء الزيارة، في أول يوم عمل فيه وقت متاح.',
    history: 'زيارات سابقة لهذا المريض', noHistory: 'لا توجد زيارات سابقة مكتملة.', draftRestored: 'تمت استعادة مسودتك غير المحفوظة.',
    copyBundle: 'نسخ حزمة FHIR (اصطناعية)', printSummary: 'طباعة الملخص', followBooked: 'تم حجز المتابعة',
    followMissing: 'لم يُعثر على وقت متابعة متاح. احجز من استقبال المرضى.', followOf: 'متابعة',
    sumTitle: 'ملخص زيارة اصطناعي', sumReference: 'المرجع', sumDate: 'التاريخ', sumService: 'الخدمة', sumPatient: 'المريض (تسمية اصطناعية)',
    sumDisclaimer: 'بيانات تجريبية اصطناعية. ليست سجلًا طبيًا ولا وصفة، ولا تصلح لأي استخدام سريري أو تأميني أو قانوني.',
    'err.orders': 'راجع بنود الخطة: لكل بند نوع ونص قصير.',
    'err.follow_up': 'اختر مدة متابعة من القائمة.',
  },
};

export function visitStatusLabel(lang: Lang, status: VisitStatus) {
  return VF[lang][status];
}

function useVisits() {
  const [visits, setVisits] = useState<Visit[]>(loadVisits);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) setVisits(loadVisits()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  // Always apply the change to what is in storage right now, so a second tab's edits are not overwritten.
  const commit = useCallback((change: (list: Visit[]) => Visit[]) => {
    const next = change(loadVisits());
    saveVisits(next);
    setVisits(next);
  }, []);
  return [visits, commit] as const;
}

function useNow(everyMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), everyMs); return () => clearInterval(id); }, [everyMs]);
  return now;
}

function errorText(v: Record<string, string>, error: unknown) {
  return error instanceof FlowError ? v[`err.${error.code}`] ?? v['err.unknown'] : v['err.unknown'];
}

function StatusPill({ lang, status }: { lang: Lang; status: VisitStatus }) {
  return <span className={`clinic-status visit-${status}`}>{VF[lang][status]}</span>;
}

function Notice({ text }: { text: string }) {
  return <div className="clinic-notice clinic-notice-info" role="note">{text}</div>;
}

function Metrics({ lang, visits, now }: { lang: Lang; visits: Visit[]; now: Date }) {
  const v = VF[lang];
  const s = summarize(visits, today(), now);
  const cells: [string, string | number][] = [
    [v.waiting, s.waiting], [v.inConsult, s.inConsult], [v.bookedToday, s.bookedToday], [v.doneToday, s.completedToday],
    [v.avgWait, s.averageWait === null ? v.none : `${s.averageWait} ${v.min}`],
  ];
  return (
    <div className="clinic-metrics visit-metrics">
      {cells.map(([label, value]) => <div key={label} className="clinic-metric"><div><span>{label}</span></div><strong>{value}</strong></div>)}
    </div>
  );
}

export function FrontDesk({ lang, t }: { lang: Lang; t: Record<string, string> }) {
  const v = VF[lang];
  const [visits, commit] = useVisits();
  const now = useNow();
  const [form, setForm] = useState({ patient: '', service: 'general', urgent: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const run = (change: () => void) => {
    setError(''); setMessage('');
    try { change(); } catch (e) { setError(errorText(v, e)); }
  };
  const move = (id: string, to: VisitStatus) => run(() => commit((list) => list.map((x) => (x.id === id ? advance(x, to, new Date(), today()) : x))));

  const waitingList = queueOrder(visits);
  const appointments = visits
    .filter((x) => x.status === 'booked' || x.status === 'no_show')
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  function submitWalkIn(e: FormEvent) {
    e.preventDefault();
    run(() => {
      const visit = createWalkIn({ patient: form.patient.trim(), service: form.service, priority: form.urgent ? 'urgent' : 'routine' }, new Date(), today());
      commit((list) => [visit, ...list]);
      setForm({ patient: '', service: 'general', urgent: false });
      setMessage(`${visit.reference} · ${v.checked_in}`);
    });
  }

  return (
    <>
      <Notice text={v.notice} />
      <Metrics lang={lang} visits={visits} now={now} />
      <div role="status" aria-live="polite">
        {error && <div className="clinic-notice clinic-notice-error">{error}</div>}
        {message && <div className="clinic-notice clinic-notice-ok">{message}</div>}
      </div>

      <section className="clinic-panel">
        <div className="clinic-panel-head"><h2>{v.walkInTitle}</h2><UserPlus size={22} /></div>
        <form onSubmit={submitWalkIn} className="visit-form-row">
          <label>{v.patient}
            <input required pattern={['(?:Patient', 'مريض) [0-9٠-٩]{3}'].join('|')} maxLength={12} dir="auto" placeholder="Patient 007" value={form.patient} onChange={(e) => setForm({ ...form, patient: e.target.value })} />
            <small>{v.patientHint}</small>
          </label>
          <label>{v.service}
            <select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
              {['general', 'dental', 'dermatology'].map((s) => <option key={s} value={s}>{t[s]}</option>)}
            </select>
          </label>
          <label className="clinic-checkbox-label"><input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} /><span>{v.urgent}</span></label>
          <button className="clinic-btn primary" type="submit">{v.checkInWalkIn}<CheckCircle2 size={18} /></button>
        </form>
      </section>

      <section className="clinic-panel">
        <div className="clinic-panel-head"><h2>{v.waitingRoom}</h2><Users size={22} /></div>
        {!waitingList.length ? <p className="clinic-empty">{v.emptyWaiting}</p> : (
          <ol className="visit-queue">
            {waitingList.map((x, i) => (
              <li key={x.id} className={x.priority === 'urgent' ? 'visit-queue-item urgent' : 'visit-queue-item'}>
                <span className="visit-queue-pos" aria-hidden="true">{i + 1}</span>
                <div>
                  <strong dir="auto">{x.patient}</strong>
                  <small>{t[x.service] ?? x.service} · {x.time ? <span dir="ltr">{x.time}</span> : v.walkIn} · <Clock3 size={12} aria-hidden="true" /> {v.waited} <span dir="ltr">{waitMinutes(x, now)}</span> {v.min}</small>
                </div>
                <div className="visit-actions">
                  <button className="clinic-btn outline small" onClick={() => run(() => commit((list) => list.map((y) => (y.id === x.id ? setPriority(y, x.priority === 'urgent' ? 'routine' : 'urgent') : y))))}>
                    {x.priority === 'urgent' ? v.clearUrgent : v.markUrgent}<span className="sr-only"> {x.patient}</span>
                  </button>
                  <button className="clinic-btn text-button" onClick={() => move(x.id, 'cancelled')}>{v.cancel}<span className="sr-only"> {x.patient}</span></button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="clinic-panel">
        <div className="clinic-panel-head"><h2>{v.appointments}</h2></div>
        {!appointments.length ? <p className="clinic-empty">{v.emptyAppts}</p> : (
          <div className="clinic-table-scroll">
            <table>
              <thead><tr>{['patientCol', 'when', 'statusCol', 'actions'].map((k) => <th key={k} scope="col">{v[k]}</th>)}</tr></thead>
              <tbody>
                {appointments.map((x) => (
                  <tr key={x.id}>
                    <td><strong dir="auto">{x.patient}</strong><small dir="ltr">{x.reference}</small></td>
                    <td><span dir="ltr">{x.date} {x.time}</span><small>{t[x.service] ?? x.service}</small></td>
                    <td><StatusPill lang={lang} status={x.status} /></td>
                    <td className="visit-actions">
                      <button className="clinic-btn outline small" disabled={x.date > today()} title={x.date > today() ? v.later : undefined} onClick={() => move(x.id, 'checked_in')}>{v.checkIn}<span className="sr-only"> {x.patient}</span></button>
                      {x.status === 'booked' && <button className="clinic-btn text-button" onClick={() => move(x.id, 'no_show')}>{v.noShow}<span className="sr-only"> {x.patient}</span></button>}
                      {x.status === 'booked' && <button className="clinic-btn text-button" onClick={() => move(x.id, 'cancelled')}>{v.cancel}<span className="sr-only"> {x.patient}</span></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

const numberOrUndefined = (value: string) => (value.trim() === '' ? undefined : Number(value));

type Extras = { orders: Order[]; followUpDays?: number };
type NoteValue = NonNullable<Visit['note']>;

function Encounter({ lang, visit, history, onSave, onComplete, onBack }: {
  lang: Lang; visit: Visit; history: Visit[];
  onSave: (vitals: Vitals, note: NoteValue, extras: Extras) => boolean;
  onComplete: (vitals: Vitals, note: NoteValue, extras: Extras) => boolean;
  onBack: () => void;
}) {
  const v = VF[lang];
  const [restored] = useState(() => loadDraft(visit.id));
  const [vit, setVit] = useState<Record<string, string>>(restored?.vit ?? {
    temperatureC: visit.vitals?.temperatureC?.toString() ?? '', heartRate: visit.vitals?.heartRate?.toString() ?? '',
    systolic: visit.vitals?.systolic?.toString() ?? '', diastolic: visit.vitals?.diastolic?.toString() ?? '', spo2: visit.vitals?.spo2?.toString() ?? '',
  });
  const [note, setNote] = useState(restored?.note ?? {
    chiefComplaint: visit.note?.chiefComplaint ?? '', assessment: visit.note?.assessment ?? '', plan: visit.note?.plan ?? '', icd10: visit.note?.icd10 ?? '',
  });
  const [orders, setOrders] = useState<Order[]>(restored?.orders ?? visit.orders ?? []);
  const [followUp, setFollowUp] = useState(restored?.followUp ?? (visit.followUpDays?.toString() ?? ''));
  const [line, setLine] = useState<{ kind: OrderKind; text: string }>({ kind: 'lab', text: '' });
  const [lineError, setLineError] = useState('');

  // Autosave: the buffer follows every edit (after a short pause) and is flushed when the tab is hidden or this form closes.
  const draft: Draft = { vit, note, orders, followUp };
  const latest = useRef(draft);
  latest.current = draft;
  const baseline = useRef(JSON.stringify(draft));
  useEffect(() => {
    if (JSON.stringify(draft) === baseline.current) return;
    const id = setTimeout(() => storeDraft(visit.id, draft), 500);
    return () => clearTimeout(id);
  }, [vit, note, orders, followUp]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const flush = () => { if (JSON.stringify(latest.current) !== baseline.current) storeDraft(visit.id, latest.current); };
    window.addEventListener('pagehide', flush);
    return () => { window.removeEventListener('pagehide', flush); flush(); };
  }, [visit.id]);

  const vitals = (): Vitals => ({
    temperatureC: numberOrUndefined(vit.temperatureC), heartRate: numberOrUndefined(vit.heartRate), systolic: numberOrUndefined(vit.systolic),
    diastolic: numberOrUndefined(vit.diastolic), spo2: numberOrUndefined(vit.spo2),
  });
  const noteValue = (): NoteValue => ({ ...note, icd10: note.icd10.trim().toUpperCase() || undefined });
  const extras = (): Extras => ({ orders, followUpDays: followUp ? Number(followUp) : undefined });
  const vitalFields: [string, string][] = [['temperatureC', '0.1'], ['heartRate', '1'], ['systolic', '1'], ['diastolic', '1'], ['spo2', '1']];

  function addLine() {
    const text = line.text.trim();
    if (!text) return;
    const bad = ordersProblems([{ kind: line.kind, text }]);
    if (bad.length) { setLineError(bad.includes('identifier') ? v['err.identifier'] : v['err.orders']); return; }
    setOrders([...orders, { kind: line.kind, text }]);
    setLine({ ...line, text: '' });
    setLineError('');
  }
  function saveDraft() {
    if (!onSave(vitals(), noteValue(), extras())) return;
    clearDraft(visit.id);
    baseline.current = JSON.stringify(latest.current);
  }

  return (
    <>
      {restored && <div className="clinic-notice clinic-notice-info" role="status">{v.draftRestored}</div>}
      <details className="visit-history">
        <summary><History size={15} aria-hidden="true" /> {v.history} <span dir="ltr">({history.length})</span></summary>
        {!history.length ? <p className="clinic-empty">{v.noHistory}</p> : (
          <ul>
            {history.slice(0, 5).map((x) => (
              <li key={x.id}>
                <strong dir="ltr">{x.date || '—'}</strong>
                <span dir="auto">{x.note?.chiefComplaint}</span>
                <small dir="auto">{x.note?.assessment}{x.note?.icd10 ? <> · <code dir="ltr">{x.note.icd10}</code></> : null}</small>
              </li>
            ))}
          </ul>
        )}
      </details>
      <form className="visit-encounter" onSubmit={(e) => { e.preventDefault(); onComplete(vitals(), noteValue(), extras()); }}>
        <fieldset>
          <legend>{v.vitals}</legend>
          <div className="visit-vitals">
            {vitalFields.map(([key, step]) => (
              <label key={key}>{v[key]}<input type="number" inputMode="decimal" step={step} dir="ltr" value={vit[key] ?? ''} onChange={(e) => setVit({ ...vit, [key]: e.target.value })} /></label>
            ))}
          </div>
        </fieldset>
        <label>{v.chief}<textarea required rows={2} maxLength={500} dir="auto" value={note.chiefComplaint} onChange={(e) => setNote({ ...note, chiefComplaint: e.target.value })} /></label>
        <label>{v.assessment}<textarea required rows={3} maxLength={1000} dir="auto" value={note.assessment} onChange={(e) => setNote({ ...note, assessment: e.target.value })} /></label>
        <label>{v.plan}<textarea rows={3} maxLength={1000} dir="auto" value={note.plan} onChange={(e) => setNote({ ...note, plan: e.target.value })} /></label>
        <label>{v.icd}<input maxLength={10} dir="ltr" placeholder="J06.9" value={note.icd10} onChange={(e) => setNote({ ...note, icd10: e.target.value })} /></label>

        <fieldset>
          <legend>{v.planLines}</legend>
          <div className="visit-order-add">
            <label>{v.orderKind}
              <select value={line.kind} onChange={(e) => setLine({ ...line, kind: e.target.value as OrderKind })}>
                {ORDER_KINDS.map((k) => <option key={k} value={k}>{v[`kind.${k}`]}</option>)}
              </select>
            </label>
            <label>{v.orderText}
              <input
                maxLength={MAX_ORDER_TEXT} dir="auto" value={line.text}
                onChange={(e) => { setLine({ ...line, text: e.target.value }); setLineError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLine(); } }}
              />
            </label>
            <button type="button" className="clinic-btn outline" disabled={!line.text.trim() || orders.length >= MAX_ORDERS} onClick={addLine}>{v.addLine}<Plus size={16} aria-hidden="true" /></button>
          </div>
          {lineError && <div className="clinic-notice clinic-notice-error" role="alert">{lineError}</div>}
          {!orders.length ? <p className="clinic-empty">{v.noLines}</p> : (
            <ul className="visit-orders">
              {orders.map((o, i) => (
                <li key={`${i}-${o.kind}-${o.text}`}>
                  <span className="clinic-status visit-order-kind">{v[`kind.${o.kind}`]}</span>
                  <span dir="auto">{o.text}</span>
                  <button type="button" className="clinic-btn text-button" onClick={() => setOrders(orders.filter((_, j) => j !== i))}>
                    <X size={14} aria-hidden="true" />{v.remove}<span className="sr-only"> {o.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <label>{v.followUp}
          <select value={followUp} onChange={(e) => setFollowUp(e.target.value)}>
            <option value="">{v.followNone}</option>
            {FOLLOW_UP_DAYS.map((d) => <option key={d} value={d}>{v[`days.${d}`]}</option>)}
          </select>
          <small>{v.followHint}</small>
        </label>

        <div className="visit-actions">
          <button type="button" className="clinic-btn outline" onClick={saveDraft}>{v.saveDraft}</button>
          <button type="submit" className="clinic-btn primary">{v.complete}<CheckCircle2 size={18} /></button>
          <button type="button" className="clinic-btn text-button" onClick={onBack}>{v.back}</button>
        </div>
      </form>
    </>
  );
}

function clinicName(lang: Lang) {
  try {
    const p = JSON.parse(localStorage.getItem('brainsait_clinic_profile') ?? 'null');
    const name = p?.[lang === 'ar' ? 'nameAr' : 'nameEn'];
    if (typeof name === 'string' && name.trim()) return name.slice(0, 100);
  } catch { /* use the default */ }
  return lang === 'ar' ? 'عيادات برين سايت التجريبية' : 'BrainSAIT Demo Clinic';
}

const riyadhDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }) : '');

// Rendered into <body> so the print stylesheet can hide the whole app and show only this page.
function PrintSummary({ lang, t, visit, followUp }: { lang: Lang; t: Record<string, string>; visit: Visit; followUp?: Visit }) {
  const v = VF[lang];
  const vit = visit.vitals ?? {};
  const vitalRows = (['temperatureC', 'heartRate', 'systolic', 'diastolic', 'spo2'] as const).filter((k) => vit[k] !== undefined);
  return createPortal(
    <div className="visit-print-root" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <p className="visit-print-stamp">{v.sumDisclaimer}</p>
      <h1>{v.sumTitle}</h1>
      <p dir="auto"><strong>{clinicName(lang)}</strong></p>
      <dl>
        <div><dt>{v.sumReference}</dt><dd dir="ltr">{visit.reference}</dd></div>
        <div><dt>{v.sumPatient}</dt><dd dir="auto">{visit.patient}</dd></div>
        <div><dt>{v.sumDate}</dt><dd dir="ltr">{riyadhDate(visit.completedAt) || visit.date}</dd></div>
        <div><dt>{v.sumService}</dt><dd>{t[visit.service] ?? visit.service}</dd></div>
      </dl>
      {vitalRows.length > 0 && <><h2>{v.vitals}</h2><ul>{vitalRows.map((k) => <li key={k}>{v[k]}: <span dir="ltr">{vit[k]}</span></li>)}</ul></>}
      {visit.note?.chiefComplaint && <><h2>{v.chief}</h2><p dir="auto">{visit.note.chiefComplaint}</p></>}
      {visit.note?.assessment && <><h2>{v.assessment}</h2><p dir="auto">{visit.note.assessment}{visit.note.icd10 ? <> · <code dir="ltr">{visit.note.icd10}</code></> : null}</p></>}
      {visit.note?.plan && <><h2>{v.plan}</h2><p dir="auto">{visit.note.plan}</p></>}
      {!!visit.orders?.length && <><h2>{v.planLines}</h2><ul>{visit.orders.map((o, i) => <li key={i}><strong>{v[`kind.${o.kind}`]}:</strong> <span dir="auto">{o.text}</span></li>)}</ul></>}
      {followUp && <p><strong>{v.followBooked}:</strong> <span dir="ltr">{followUp.date} {followUp.time}</span></p>}
      <p className="visit-print-stamp">{v.sumDisclaimer}</p>
    </div>,
    document.body,
  );
}

export function DoctorRoom({ lang, t }: { lang: Lang; t: Record<string, string> }) {
  const v = VF[lang];
  const [visits, commit] = useVisits();
  const now = useNow();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [printing, setPrinting] = useState<Visit | null>(null);

  // Returns true when the change went through. A change may return the confirmation text to show.
  const run = (change: () => string | void, ok = ''): boolean => {
    setError(''); setMessage('');
    try { const extra = change(); if (ok || extra) setMessage(extra || ok); return true; } catch (e) { setError(errorText(v, e)); return false; }
  };
  const waitingList = queueOrder(visits);
  const active = visits.find((x) => x.status === 'in_consult');
  const doneToday = visits.filter((x) => x.status === 'completed' && x.date === today());
  const update = (id: string, change: (x: Visit) => Visit) => commit((list) => list.map((x) => (x.id === id ? change(x) : x)));
  useEffect(() => { pruneDrafts(visits); }, [visits]);

  function complete(visit: Visit, vitals: Vitals, note: NoteValue, extras: Extras): boolean {
    return run(() => {
      const at = new Date();
      let booked: Visit | null = null;
      commit((list) => {
        const current = list.find((x) => x.id === visit.id);
        if (!current) throw new FlowError('bad_transition', 'The visit is no longer open.');
        const done = advance(saveEncounter(current, vitals, note, extras), 'completed', at, today());
        let next = list.map((x) => (x.id === visit.id ? done : x));
        if (extras.followUpDays) {
          const slot = planFollowUp(done, extras.followUpDays, next, loadSchedule(), at);
          const fu = slot ? followUpVisit(done, slot, at) : null;
          if (fu && !next.some((x) => x.id === fu.id)) { next = [fu, ...next]; booked = fu; }
        }
        return next;
      });
      clearDraft(visit.id);
      const fu = booked as Visit | null;
      if (!extras.followUpDays) return v.done;
      return fu ? `${v.done} ${v.followBooked}: ${fu.date} ${fu.time}.` : `${v.done} ${v.followMissing}`;
    });
  }

  async function copyJson(key: string, value: unknown) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch { setError(v['err.unknown']); }
  }

  // Print the summary: show it in <body>, let the print stylesheet hide the app, remove the marker afterwards.
  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('printing-visit');
    const finish = () => { document.body.classList.remove('printing-visit'); setPrinting(null); };
    window.addEventListener('afterprint', finish, { once: true });
    const start = setTimeout(() => window.print(), 50);
    const fallback = setTimeout(finish, 60000);
    return () => { clearTimeout(start); clearTimeout(fallback); window.removeEventListener('afterprint', finish); document.body.classList.remove('printing-visit'); };
  }, [printing]);

  return (
    <>
      <Notice text={v.doctorNotice} />
      <Metrics lang={lang} visits={visits} now={now} />
      <div role="status" aria-live="polite">
        {error && <div className="clinic-notice clinic-notice-error">{error}</div>}
        {message && <div className="clinic-notice clinic-notice-ok">{message}</div>}
      </div>

      <section className="clinic-panel">
        <div className="clinic-panel-head">
          <h2>{active ? v.nowSeeing : v.waitingRoom}</h2>
          <Stethoscope size={22} />
        </div>
        {active ? (
          <>
            <p className="visit-patient-line"><strong dir="auto">{active.patient}</strong> · {t[active.service] ?? active.service} · <StatusPill lang={lang} status={active.status} /> · {v.waited} <span dir="ltr">{waitMinutes(active, now)}</span> {v.min}</p>
            <Encounter
              key={active.id} lang={lang} visit={active} history={patientHistory(visits, active.patient, active.id)}
              onSave={(vitals, note, extras) => run(() => update(active.id, (x) => saveEncounter(x, vitals, note, extras)), v.saved)}
              onComplete={(vitals, note, extras) => complete(active, vitals, note, extras)}
              onBack={() => run(() => update(active.id, (x) => advance(x, 'checked_in', new Date(), today())))}
            />
          </>
        ) : (
          <>
            <p className="clinic-hint">{v.noActive}</p>
            <button className="clinic-btn primary" disabled={!waitingList.length} onClick={() => run(() => update(waitingList[0].id, (x) => advance(x, 'in_consult', new Date(), today())))}>{v.callNext}</button>
            {!waitingList.length ? <p className="clinic-empty">{v.emptyWaiting}</p> : (
              <ol className="visit-queue">
                {waitingList.map((x, i) => (
                  <li key={x.id} className={x.priority === 'urgent' ? 'visit-queue-item urgent' : 'visit-queue-item'}>
                    <span className="visit-queue-pos" aria-hidden="true">{i + 1}</span>
                    <div><strong dir="auto">{x.patient}</strong><small>{t[x.service] ?? x.service} · {v.waited} <span dir="ltr">{waitMinutes(x, now)}</span> {v.min}</small></div>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>

      <section className="clinic-panel">
        <div className="clinic-panel-head"><h2>{v.completedList}</h2></div>
        {!doneToday.length ? <p className="clinic-empty">{v.emptyDone}</p> : (
          <ul className="visit-done">
            {doneToday.map((x) => {
              const follow = visits.find((y) => y.followUpOf === x.id);
              return (
                <li key={x.id}>
                  <div>
                    <strong dir="auto">{x.patient}</strong><small dir="ltr">{x.reference}</small>
                    {follow && <small>{v.followBooked}: <span dir="ltr">{follow.date} {follow.time}</span></small>}
                  </div>
                  <div className="visit-actions">
                    <button className="clinic-btn outline small" onClick={() => copyJson(`e:${x.id}`, toFhirEncounter(x))}>
                      {copied === `e:${x.id}` ? v.copied : v.copyFhir}<Copy size={14} /><span className="sr-only"> {x.patient}</span>
                    </button>
                    <button className="clinic-btn outline small" onClick={() => copyJson(`b:${x.id}`, toFhirBundle(x))}>
                      {copied === `b:${x.id}` ? v.copied : v.copyBundle}<Copy size={14} /><span className="sr-only"> {x.patient}</span>
                    </button>
                    <button className="clinic-btn outline small" onClick={() => setPrinting(x)}>
                      {v.printSummary}<Printer size={14} /><span className="sr-only"> {x.patient}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {printing && <PrintSummary lang={lang} t={t} visit={printing} followUp={visits.find((y) => y.followUpOf === printing.id)} />}
    </>
  );
}
