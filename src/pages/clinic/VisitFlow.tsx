/**
 * Front desk and doctor room for the synthetic-data clinic pilot.
 *
 * Visits live in this browser's localStorage (shared by the reception booking form, the front desk and the doctor room;
 * a second tab stays in sync through the storage event). Nothing is sent to a server, OpenEMR, NPHIES or a model.
 * The lifecycle rules live in src/lib/clinicFlow.ts and are unit tested.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, Copy, Stethoscope, UserPlus, Users } from 'lucide-react';
import {
  advance, createWalkIn, FlowError, parseVisits, queueOrder, saveEncounter, setPriority, summarize, toFhirEncounter, waitMinutes,
  type Visit, type VisitStatus, type Vitals,
} from '../../lib/clinicFlow';

const KEY = 'brainsait_clinic_requests';

export function loadVisits(): Visit[] {
  try { return parseVisits(localStorage.getItem(KEY)); } catch { return []; }
}
export function saveVisits(visits: Visit[]) {
  try { localStorage.setItem(KEY, JSON.stringify(visits.slice(0, 200))); } catch { /* storage may be blocked */ }
}
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
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

function Encounter({ lang, visit, onSave, onComplete, onBack }: {
  lang: Lang; visit: Visit;
  onSave: (vitals: Vitals, note: NonNullable<Visit['note']>) => void;
  onComplete: (vitals: Vitals, note: NonNullable<Visit['note']>) => void;
  onBack: () => void;
}) {
  const v = VF[lang];
  const [vit, setVit] = useState({
    temperatureC: visit.vitals?.temperatureC?.toString() ?? '', heartRate: visit.vitals?.heartRate?.toString() ?? '',
    systolic: visit.vitals?.systolic?.toString() ?? '', diastolic: visit.vitals?.diastolic?.toString() ?? '', spo2: visit.vitals?.spo2?.toString() ?? '',
  });
  const [note, setNote] = useState({
    chiefComplaint: visit.note?.chiefComplaint ?? '', assessment: visit.note?.assessment ?? '', plan: visit.note?.plan ?? '', icd10: visit.note?.icd10 ?? '',
  });
  const vitals = (): Vitals => ({
    temperatureC: numberOrUndefined(vit.temperatureC), heartRate: numberOrUndefined(vit.heartRate), systolic: numberOrUndefined(vit.systolic),
    diastolic: numberOrUndefined(vit.diastolic), spo2: numberOrUndefined(vit.spo2),
  });
  const noteValue = () => ({ ...note, icd10: note.icd10.trim().toUpperCase() || undefined });
  const vitalFields: [keyof typeof vit, string][] = [['temperatureC', '0.1'], ['heartRate', '1'], ['systolic', '1'], ['diastolic', '1'], ['spo2', '1']];

  return (
    <form className="visit-encounter" onSubmit={(e) => { e.preventDefault(); onComplete(vitals(), noteValue()); }}>
      <fieldset>
        <legend>{v.vitals}</legend>
        <div className="visit-vitals">
          {vitalFields.map(([key, step]) => (
            <label key={key}>{v[key]}<input type="number" inputMode="decimal" step={step} dir="ltr" value={vit[key]} onChange={(e) => setVit({ ...vit, [key]: e.target.value })} /></label>
          ))}
        </div>
      </fieldset>
      <label>{v.chief}<textarea required rows={2} maxLength={500} dir="auto" value={note.chiefComplaint} onChange={(e) => setNote({ ...note, chiefComplaint: e.target.value })} /></label>
      <label>{v.assessment}<textarea required rows={3} maxLength={1000} dir="auto" value={note.assessment} onChange={(e) => setNote({ ...note, assessment: e.target.value })} /></label>
      <label>{v.plan}<textarea rows={3} maxLength={1000} dir="auto" value={note.plan} onChange={(e) => setNote({ ...note, plan: e.target.value })} /></label>
      <label>{v.icd}<input maxLength={10} dir="ltr" placeholder="J06.9" value={note.icd10} onChange={(e) => setNote({ ...note, icd10: e.target.value })} /></label>
      <div className="visit-actions">
        <button type="button" className="clinic-btn outline" onClick={() => onSave(vitals(), noteValue())}>{v.saveDraft}</button>
        <button type="submit" className="clinic-btn primary">{v.complete}<CheckCircle2 size={18} /></button>
        <button type="button" className="clinic-btn text-button" onClick={onBack}>{v.back}</button>
      </div>
    </form>
  );
}

export function DoctorRoom({ lang, t }: { lang: Lang; t: Record<string, string> }) {
  const v = VF[lang];
  const [visits, commit] = useVisits();
  const now = useNow();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const run = (change: () => void, ok = '') => {
    setError(''); setMessage('');
    try { change(); if (ok) setMessage(ok); } catch (e) { setError(errorText(v, e)); }
  };
  const waitingList = queueOrder(visits);
  const active = visits.find((x) => x.status === 'in_consult');
  const doneToday = visits.filter((x) => x.status === 'completed' && x.date === today());
  const update = (id: string, change: (x: Visit) => Visit) => commit((list) => list.map((x) => (x.id === id ? change(x) : x)));

  async function copyFhir(x: Visit) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toFhirEncounter(x), null, 2));
      setCopied(x.id);
      setTimeout(() => setCopied(''), 2000);
    } catch { setError(v['err.unknown']); }
  }

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
              key={active.id} lang={lang} visit={active}
              onSave={(vitals, note) => run(() => update(active.id, (x) => saveEncounter(x, vitals, note)), v.saved)}
              onComplete={(vitals, note) => run(() => update(active.id, (x) => advance(saveEncounter(x, vitals, note), 'completed', new Date(), today())), v.done)}
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
            {doneToday.map((x) => (
              <li key={x.id}>
                <div><strong dir="auto">{x.patient}</strong><small dir="ltr">{x.reference}</small></div>
                <button className="clinic-btn outline small" onClick={() => copyFhir(x)}>
                  {copied === x.id ? v.copied : v.copyFhir}<Copy size={14} /><span className="sr-only"> {x.patient}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
