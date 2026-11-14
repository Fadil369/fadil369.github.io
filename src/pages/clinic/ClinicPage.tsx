/**
 * BrainSAIT Clinic Reception — synthetic-data pilot with explicit integration status
 *
 * Bilingual synthetic-data reception pilot. FAQ answers and appointment simulation run
 * locally in this browser; only provider identity/status checks use public registry APIs.
 * No patient data, booking request, or chat prompt is sent to a model or backend.
 */
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CalendarClock, Check, CheckCircle2,
  CheckCheck, Clock3, Copy, FileText, Headphones, HeartPulse, LogOut, MapPin,
  MessageCircle, MessageSquare, Monitor, Plus, RefreshCw, RotateCcw, Search, Send, Volume2,
  Settings2, ShieldCheck, Stethoscope, Users, UsersRound, X, House,
} from 'lucide-react';
import { localized } from '../../lib/locale';
import { useI18n } from '../../i18n';
import { usePageMeta } from '../../hooks/usePageMeta';
import { BprLayout } from '../../components/BprKit';
import { REGISTRY, checkCredential, checkAiLedger, short } from '../../lib/bpr';
import { createBooking, STATUSES } from '../../lib/clinicFlow';
import { DoctorRoom, FrontDesk, loadSchedule, loadVisits, SCHEDULE_KEY, saveVisits, visitStatusLabel } from './VisitFlow';
import { DEFAULT_SCHEDULE, isSlotTaken, scheduleProblem, SLOT_LENGTHS, slotStates } from '../../lib/clinicSchedule';

const SPID = 'SA-PHY-000003';
const OID = '1.3.6.1.4.1.61026';

// ── Bilingual strings ──────────────────────────────────────────────────────
const STR: Record<'ar' | 'en', Record<string, string>> = {
  en: {
    product: 'Clinic Reception',
    overview: 'Overview',
    requests: 'Requests',
    setup: 'Clinic setup',
    reception: 'Patient reception',
    desk: 'Front desk',
    doctor: 'Doctor room',
    demo: 'Demo workspace',
    sample: 'Sample data',
    title: 'Reception overview',
    subtitle: 'A calmer front desk. Every request in one place.',
    open: 'Open reception',
    welcome: 'Your clinic, ready to welcome.',
    welcomeBody: 'Manage appointment requests and give patients clear, approved answers.',
    pending: 'Pending',
    needs_staff: 'Needs staff',
    completed: 'Completed',
    pendingLabel: 'Pending requests',
    queue: 'Appointment requests',
    search: 'Search requests…',
    all: 'All',
    request: 'Request',
    service: 'Service',
    date: 'Preferred date',
    time: 'Time · Riyadh',
    status: 'Status',
    action: 'Action',
    view: 'View',
    general: 'General consultation',
    dental: 'Dental consultation',
    dermatology: 'Skin consultation',
    checklist: 'Launch checklist',
    profile: 'Clinic profile',
    answers: 'Approved answers',
    patientTitle: 'Welcome. How can we help?',
    patientBody: 'Ask about clinic information or try an appointment request.',
    approvedOnly: 'Approved clinic information · Demo',
    questionPlaceholder: 'Ask an administrative question…',
    sendQuestion: 'Send question',
    hours: 'Opening hours',
    location: 'Location',
    insurance: 'Insurance',
    greeting: 'Hello! I can help with clinic hours, location and insurance information. Please use fictional questions only; this demonstration does not provide medical advice.',
    readAloud: 'Read answer aloud',
    approved: 'Clinic-approved answer',
    handoff: 'Staff assistance needed',
    urgent: 'Seek immediate help',
    staffHelp: 'Request staff help',
    requestTitle: 'Request a demo appointment',
    callbackTitle: 'Request a demo staff callback',
    requestBody: 'Choose a preferred date. Clinic staff would confirm availability through a connected scheduling system.',
    patientLabel: 'Demo patient label',
    patientHint: 'Use Patient 007 or مريض 007. No real names or contact details.',
    consent: 'I am using synthetic details only. This is not a real appointment.',
    submit: 'Submit demo request',
    submitting: 'Submitting…',
    requestReceived: 'Demo request saved on this device',
    reference: 'Your demo reference',
    successBody: 'This synthetic request is saved only in this browser. No staff receives it.',
    another: 'Create another request',
    clearChat: 'Clear conversation',
    profileTitle: 'Make reception feel like your clinic.',
    profileSubtitle: 'Edit the bilingual information used by the approved-answer assistant.',
    nameEn: 'Clinic name · English',
    nameAr: 'Clinic name · Arabic',
    hoursEn: 'Opening hours · English',
    hoursAr: 'Opening hours · Arabic',
    locationEn: 'Location · English',
    locationAr: 'Location · Arabic',
    insuranceEn: 'Insurance answer · English',
    insuranceAr: 'Insurance answer · Arabic',
    saveProfile: 'Save clinic profile',
    saved: 'Clinic profile saved.',
    savedStatus: 'Request status updated.',
    loading: 'Loading your workspace…',
    error: 'We could not complete that action. Please try again.',
    refresh: 'Refresh',
    logout: 'Leave demo',
    details: 'Request details',
    close: 'Close details',
    saveStatus: 'Save status',
    requestStatus: 'Request status',
    notBooking: 'This is a request, not a confirmed appointment.',
    received: 'Received',
    type: 'Request type',
    appointment: 'Appointment request',
    callback: 'Staff callback',
    activity: 'Recent activity',
    noActivity: 'Staff updates will appear here.',
    empty: 'No requests match your search.',
    bookTitle: 'Book a demo time',
    schedule: 'Demo schedule: Sunday–Thursday, {open}–{close}, {minutes}-minute visits. All times are in Riyadh (UTC+03:00).',
    slotTaken: 'taken', slotTakenNow: 'That time was just taken. Please choose another.',
    scheduleTitle: 'Booking schedule', scheduleHint: 'Sets the times offered in Patient reception. Existing bookings are not changed. Working days are Sunday to Thursday.',
    openTime: 'First visit starts', closeTime: 'Last visit ends', slotLength: 'Visit length', minutesUnit: 'minutes', saveSchedule: 'Save schedule', scheduleSaved: 'Schedule saved.',
    'sched.time': 'Enter the times as hours and minutes.', 'sched.order': 'Closing time must be after the opening time.',
    schedStorage: 'Could not save in this browser. Check that site storage is allowed.',
    'sched.length': 'Choose one of the listed visit lengths.', 'sched.count': 'The schedule must give between 1 and 64 visits a day.',
    slots: 'Available times',
    chooseDate: 'Choose a date to see available times.',
    noSlots: 'No times available for this date. Please choose another date.',
    loadingSlots: 'Preparing sample times…',
    review: 'Review demo booking',
    reviewTitle: 'Review your demo booking',
    reviewNotice: 'Local simulation only. No clinic schedule is queried and no appointment is created.',
    confirm: 'Confirm demo reservation',
    confirmConsent: 'I have reviewed these details and confirm this demo reservation.',
    edit: 'Change details',
    expires: 'Review expires',
    reserved: 'Demo time reserved',
    reservedNote: 'A fictional time has been reserved in this demo only. No live clinic appointment has been made.',
    waiting: 'Voice can prepare the details here. You always confirm the final summary yourself.',
    nphiesDesk: 'NPHIES Desk',
    managed: 'Managed by BrainSAIT.',
    demoNote: 'Synthetic demo only. Do not enter patient information.',
    voiceAvailable: 'Voice configured · access unverified',
    voiceUnavailable: 'Voice setup required',
    faqHint: 'These answers are displayed exactly as saved. A clinic must review its content before live use.',
    privacy: 'Questions are processed by local rules and are not stored. Avoid health or identifying information.',
    // BPR integration
    providerIdentity: 'Provider Identity',
    spid: 'SPID',
    oid: 'OID Namespace',
    credential: 'Signed Credential',
    verified: 'Verified',
    emr: 'OpenEMR Workspace',
    emrConnected: 'EMR Connected',
    emrDisconnected: 'EMR Not Connected',
    copilot: 'Clinical Copilot',
    copilotPoweredBy: 'Approved-answer demo · local rules · no model calls',
    nphies: 'NPHIES Integration',
    nphiesLive: 'NPHIES Connected',
    nphiesReference: 'NPHIES Reference Only',
    brev: 'Brev HQ Agents',
    brevConnected: 'Brev HQ Connected',
    brevDisconnected: 'Brev HQ Disconnected',
    clinicStatus: 'Clinic Status',
    clinicLive: 'Clinic Live',
    clinicPending: 'Clinic Pending',
    activelyRunning: 'Actively Running',
    yourClinic: 'Your Clinic',
    providerName: 'Dr. Mohamed El Fadil',
    providerNameAr: 'Provider Name · Arabic',
  },
  ar: {
    product: 'استقبال العيادات',
    overview: 'نظرة عامة',
    requests: 'الطلبات',
    setup: 'إعداد العيادة',
    reception: 'استقبال المرضى',
    desk: 'مكتب الاستقبال',
    doctor: 'غرفة الطبيب',
    demo: 'مساحة تجريبية',
    sample: 'بيانات تجريبية',
    title: 'نظرة عامة على الاستقبال',
    subtitle: 'استقبال أكثر هدوءًا. كل الطلبات في مكان واحد.',
    open: 'فتح الاستقبال',
    welcome: 'عيادتك جاهزة للترحيب.',
    welcomeBody: 'أدر طلبات المواعيد وقدّم للمرضى إجابات واضحة ومعتمدة.',
    pending: 'قيد الانتظار',
    needs_staff: 'بحاجة لموظف',
    completed: 'مكتمل',
    pendingLabel: 'طلبات قيد الانتظار',
    queue: 'طلبات المواعيد',
    search: 'ابحث في الطلبات…',
    all: 'الكل',
    request: 'الطلب',
    service: 'الخدمة',
    date: 'التاريخ المفضل',
    time: 'الوقت · الرياض',
    status: 'الحالة',
    action: 'الإجراء',
    view: 'عرض',
    general: 'استشارة طب عام',
    dental: 'استشارة أسنان',
    dermatology: 'استشارة جلدية',
    checklist: 'قائمة التجهيز',
    profile: 'ملف العيادة',
    answers: 'الإجابات المعتمدة',
    patientTitle: 'مرحبًا. كيف يمكننا مساعدتك؟',
    patientBody: 'اسأل عن معلومات العيادة أو جرّب طلب موعد.',
    approvedOnly: 'معلومات العيادة المعتمدة · تجريبي',
    questionPlaceholder: 'اطرح سؤالًا إداريًا…',
    sendQuestion: 'إرسال السؤال',
    hours: 'ساعات العمل',
    location: 'الموقع',
    insurance: 'التأمين',
    greeting: 'مرحبًا! يمكنني مساعدتك بمعلومات ساعات العمل والموقع والتأمين. استخدم أسئلة وهمية فقط؛ لا تقدم هذه التجربة نصائح طبية.',
    readAloud: 'استمع إلى الإجابة',
    approved: 'إجابة العيادة المعتمدة',
    handoff: 'يلزم التواصل مع موظف',
    urgent: 'اطلب المساعدة الفورية',
    staffHelp: 'طلب مساعدة موظف',
    requestTitle: 'طلب موعد تجريبي',
    callbackTitle: 'طلب تواصل تجريبي مع موظف',
    requestBody: 'اختر تاريخًا مفضلًا. يؤكد الموظفون التوفر عبر نظام مواعيد متصل عند تفعيله.',
    patientLabel: 'اسم المريض الوهمي',
    patientHint: 'استخدم Patient 007 أو مريض 007. دون أسماء فعلية أو معلومات تواصل.',
    consent: 'أستخدم بيانات وهمية فقط. هذا ليس موعدًا فعليًا.',
    submit: 'إرسال الطلب التجريبي',
    submitting: 'جارٍ الإرسال…',
    requestReceived: 'حُفظ الطلب التجريبي على هذا الجهاز',
    reference: 'مرجع طلبك التجريبي',
    successBody: 'حُفظ هذا الطلب الوهمي في هذا المتصفح فقط. لا يصل إلى أي موظف.',
    another: 'إنشاء طلب آخر',
    clearChat: 'مسح المحادثة',
    profileTitle: 'استقبال يعكس هوية عيادتك.',
    profileSubtitle: 'عدّل معلومات العيادة باللغتين لاستخدامها في الإجابات المعتمدة.',
    nameEn: 'اسم العيادة · الإنجليزية',
    nameAr: 'اسم العيادة · العربية',
    hoursEn: 'ساعات العمل · الإنجليزية',
    hoursAr: 'ساعات العمل · العربية',
    locationEn: 'الموقع · الإنجليزية',
    locationAr: 'الموقع · العربية',
    insuranceEn: 'إجابة التأمين · الإنجليزية',
    insuranceAr: 'إجابة التأمين · العربية',
    saveProfile: 'حفظ ملف العيادة',
    saved: 'تم حفظ ملف العيادة.',
    savedStatus: 'تم تحديث حالة الطلب.',
    loading: 'جارٍ تحميل مساحة العمل…',
    error: 'تعذّر إكمال الإجراء. يرجى المحاولة مرة أخرى.',
    refresh: 'تحديث',
    logout: 'مغادرة التجربة',
    details: 'تفاصيل الطلب',
    close: 'إغلاق التفاصيل',
    saveStatus: 'حفظ الحالة',
    requestStatus: 'حالة الطلب',
    notBooking: 'هذا طلب وليس موعدًا مؤكدًا.',
    received: 'تاريخ الاستلام',
    type: 'نوع الطلب',
    appointment: 'طلب موعد',
    callback: 'تواصل مع موظف',
    activity: 'آخر الإجراءات',
    noActivity: 'ستظهر تحديثات الموظفين هنا.',
    empty: 'لا توجد طلبات تطابق بحثك.',
    bookTitle: 'حجز وقت تجريبي',
    schedule: 'الجدول التجريبي: الأحد إلى الخميس، من {open} إلى {close}، زيارات مدتها {minutes} دقيقة. جميع الأوقات بتوقيت الرياض (UTC+03:00).',
    slotTaken: 'محجوز', slotTakenNow: 'تم حجز هذا الوقت للتو. اختر وقتًا آخر.',
    scheduleTitle: 'جدول الحجز', scheduleHint: 'يحدد الأوقات المعروضة في استقبال المرضى. لا تتغير الحجوزات القائمة. أيام العمل من الأحد إلى الخميس.',
    openTime: 'بداية أول زيارة', closeTime: 'نهاية آخر زيارة', slotLength: 'مدة الزيارة', minutesUnit: 'دقيقة', saveSchedule: 'حفظ الجدول', scheduleSaved: 'تم حفظ الجدول.',
    'sched.time': 'أدخل الأوقات بالساعات والدقائق.', 'sched.order': 'يجب أن يكون وقت الإغلاق بعد وقت الفتح.',
    schedStorage: 'تعذر الحفظ في هذا المتصفح. تأكد من السماح بتخزين الموقع.',
    'sched.length': 'اختر مدة زيارة من القائمة.', 'sched.count': 'يجب أن يعطي الجدول من ١ إلى ٦٤ زيارة في اليوم.',
    slots: 'الأوقات المتاحة',
    chooseDate: 'اختر تاريخًا لعرض الأوقات المتاحة.',
    noSlots: 'لا توجد أوقات متاحة في هذا التاريخ. اختر تاريخًا آخر.',
    loadingSlots: 'جارٍ تجهيز أوقات تجريبية…',
    review: 'مراجعة الحجز التجريبي',
    reviewTitle: 'راجع حجزك التجريبي',
    reviewNotice: 'محاكاة محلية فقط. لا يُستعلم عن جدول عيادة ولا يُنشأ موعد فعلي.',
    confirm: 'تأكيد الحجز التجريبي',
    confirmConsent: 'راجعت هذه التفاصيل وأؤكد هذا الحجز التجريبي.',
    edit: 'تعديل التفاصيل',
    expires: 'تنتهي المراجعة',
    reserved: 'تم حجز الوقت التجريبي',
    reservedNote: 'حُجز وقت وهمي في هذه النسخة التجريبية فقط. لم يُحجز موعد فعلي في عيادة.',
    waiting: 'يمكن للصوت تجهيز التفاصيل هنا. أنت من يؤكد الملخص النهائي دائمًا.',
    nphiesDesk: 'مكتب نفيس',
    managed: 'بإدارة BrainSAIT.',
    demoNote: 'نسخة تجريبية ببيانات وهمية فقط. لا تدخل معلومات المرضى.',
    voiceAvailable: 'الصوت مُعدّ · الوصول غير مُتحقّق منه',
    voiceUnavailable: 'يلزم إعداد الصوت',
    faqHint: 'تُعرض هذه الإجابات كما حُفظت. يجب أن تراجع العيادة المحتوى قبل الاستخدام الفعلي.',
    privacy: 'تُعالج الأسئلة بقواعد محلية ولا تُحفظ. تجنّب المعلومات الصحية أو التعريفية.',
    // BPR integration
    providerIdentity: 'هوية مقدم الرعاية',
    spid: 'المعرّف SPID',
    oid: 'مساحة المعرّف OID',
    credential: 'الشهادة الموقّعة',
    verified: 'مُتحقّق منه',
    emr: 'مساحة OpenEMR',
    emrConnected: 'المسجل الطبي متصل',
    emrDisconnected: 'المسجل الطبي غير متصل',
    copilot: 'المساعد السريري',
    copilotPoweredBy: 'إجابات معتمدة تجريبية · قواعد محلية · دون استدعاء نموذج',
    nphies: 'التكامل مع نفيس',
    nphiesLive: 'نفيس متصل',
    nphiesReference: 'نفيس مرجع فقط',
    brev: 'الوكلاء Brev HQ',
    brevConnected: 'Breve HQ متصل',
    brevDisconnected: 'Breve HQ غير متصل',
    clinicStatus: 'حالة العيادة',
    clinicLive: 'العيادة تعمل',
    clinicPending: 'العيادة قيد الانتظار',
    activelyRunning: 'تعمل بنشاط',
    yourClinic: 'عيادتك',
    providerName: 'د. محمد الفاضل',
    providerNameAr: 'اسم مقدم الرعاية · العربية',
  },
};

function getStr(lang: 'ar' | 'en') {
  return STR[lang];
}

// ── Clinic data (demo, synthetic only) ─────────────────────────────────────
const SERVICES = [
  { id: 'general' },
  { id: 'dental' },
  { id: 'dermatology' },
];

const DEFAULT_PROFILE = {
  nameAr: 'عيادات برين سايت التجريبية',
  nameEn: 'BrainSAIT Demo Clinic',
  hoursAr: 'الأحد إلى الخميس، من ٩ صباحًا إلى ٩ مساءً.',
  hoursEn: 'Sunday–Thursday, 9:00 AM–9:00 PM.',
  locationAr: 'عيادة تجريبية في الرياض.',
  locationEn: 'Demo clinic in Riyadh.',
  insuranceAr: 'تأكيد التغطية مع موظفي العيادة.',
  insuranceEn: 'Coverage must be confirmed with clinic staff.',
};

// ── Local storage helpers ──────────────────────────────────────────────────
const loadRequests = loadVisits;
const saveRequests = saveVisits;
function loadProfile() {
  try {
    const raw = localStorage.getItem('brainsait_clinic_profile');
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch { return DEFAULT_PROFILE; }
}
function persistProfile(profile: any) {
  try { localStorage.setItem('brainsait_clinic_profile', JSON.stringify(profile)); } catch {}
}

// ── Helpers ────────────────────────────────────────────────────────────────
function saudiToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
}
function formatDate(date: string, lang: 'ar' | 'en') {
  const d = new Date(date + 'T12:00:00+03:00');
  // A stored visit with a missing or damaged date must not take the whole page down.
  if (Number.isNaN(d.getTime())) return '\u2014';
  return new Intl.DateTimeFormat(
    lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh' },
  ).format(d);
}
// ── Components ─────────────────────────────────────────────────────────────

function ReceptionChat({ lang, t, profile }: { lang: 'ar' | 'en'; t: Record<string, string>; profile: any }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; kind?: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const conversation = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
  }, [messages, asking]);

  function replyTo(message: string, l: 'ar' | 'en', profile: any) {
    const ar = l === 'ar';
    if (new RegExp([
      "cannot breathe|can't breathe|chest pain|unconscious|severe bleeding|suicid",
      'لا أستطيع التنفس|صعوبة.*تنفس|ألم.*صدر|فاقد.*وعي|نزيف شديد|انتحار',
    ].join('|'), 'i').test(message)) {
      return { kind: 'urgent', answer: ar ? 'هذه الخدمة ليست للطوارئ ولا تقيّم حالتك. اطلب المساعدة الطبية الفورية من خدمات الطوارئ المحلية أو توجّه إلى أقرب قسم طوارئ. لا تنتظر رد العيادة هنا.' : 'This service is not for emergencies and cannot assess your condition. Seek immediate help from local emergency services or the nearest emergency department. Do not wait for a clinic reply here.' };
    }
    if (/medicat|diagnos|symptom|treatment|pain|dose|prescri|علاج|تشخيص|ألم|دواء|جرعة|أعراض/i.test(message)) {
      return { kind: 'handoff', answer: ar ? 'لا يمكنني تقديم تشخيص أو نصيحة علاجية. تواصل مع مختص صحي. يمكنك إنشاء طلب تواصل تجريبي ليظهر في قائمة الموظفين.' : 'I cannot diagnose or recommend treatment. Please contact a qualified healthcare professional. You can create a demo callback request for the staff queue.' };
    }
    const key = /hours|open|closing|ساعات|أوقات|العمل|متى/i.test(message) ? 'hours'
      : /location|address|where|موقع|عنوان|أين/i.test(message) ? 'location'
        : /insur|coverage|تأمين|تغطية/i.test(message) ? 'insurance' : null;
    if (key) return { kind: 'approved', answer: profile[key + (ar ? 'Ar' : 'En')], source: key };
    return { kind: 'handoff', answer: ar ? 'لا توجد إجابة معتمدة لهذا السؤال. يمكنك إنشاء طلب تواصل تجريبي ليجيبك فريق الاستقبال.' : 'There is no approved answer for this question. Create a demo callback request for the reception team.' };
  }

  function readAloud(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-SA';
    window.speechSynthesis.speak(utterance);
  }

  async function ask(msg: string) {
    if (!msg.trim() || asking) return;
    setQuestion('');
    setAsking(true);
    setError('');
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    try {
      const reply = replyTo(msg, lang, profile);
      setMessages((m) => [...m, { role: 'assistant', text: reply.answer, kind: reply.kind }]);
    } catch { setError(t.error); } finally { setAsking(false); }
  }

  return (
    <section className="clinic-panel">
      <div className="clinic-panel-head">
        <h2>{t.patientTitle}</h2>
        <button className="clinic-icon-button" aria-label={t.clearChat} onClick={() => setMessages([])}><RotateCcw size={18} /></button>
      </div>
      <p className="clinic-hint">{t.approvedOnly}</p>
      {error && <div className="clinic-notice clinic-notice-error">{error}</div>}
      <div className="clinic-conversation" ref={conversation} role="log" aria-live="polite">
        <div className="clinic-message assistant"><MessageCircle size={19} /><p>{t.greeting}</p></div>
        {messages.map((m, i) => (
          <div key={i} className={`clinic-message ${m.role} ${m.kind || ''}`}>
            <div>
              {m.kind && <strong className="clinic-answer-kind">{t[m.kind === 'approved' ? 'approved' : m.kind === 'urgent' ? 'urgent' : 'handoff']}</strong>}
              <p dir="auto">{m.text}</p>
              {m.role === 'assistant' && 'speechSynthesis' in window && (
                <button type="button" className="clinic-speak" onClick={() => readAloud(m.text)}><Volume2 size={14}/>{t.readAloud}</button>
              )}
              {m.kind === 'handoff' && <p className="clinic-hint">{lang === 'ar' ? 'هذه تجربة ولا يوجد موظف يتابع هذه المحادثة. تواصل مع عيادتك عبر قنواتها الرسمية.' : 'This is a pilot; no staff member monitors this chat. Contact your clinic through its official channels.'}</p>}
            </div>
          </div>
        ))}
        {asking && <p className="clinic-hint">{t.loading}</p>}
      </div>
      <div className="clinic-quick-questions">
        {['hours', 'location', 'insurance'].map((key) => (
          <button key={key} className="clinic-btn outline small" disabled={asking} onClick={() => ask(t[key])}>
            <MessageCircle size={15} /> {t[key]}
          </button>
        ))}
      </div>
      <form className="clinic-chat-compose" onSubmit={(e) => { e.preventDefault(); ask(question); }}>
        <input aria-label={t.questionPlaceholder} placeholder={t.questionPlaceholder} required maxLength="2000" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button className="clinic-btn primary icon-button" disabled={asking || !question.trim()} aria-label={t.sendQuestion}><Send size={19} /></button>
      </form>
      <p className="clinic-privacy">{t.privacy}</p>
    </section>
  );
}

function SlotBooking({ lang, t }: { lang: 'ar' | 'en'; t: Record<string, string> }) {
  const [form, setForm] = useState({ patient: '', service: 'general', date: '', time: '', consent: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [revision, setRevision] = useState(0);

  const update = (key: string, value: string) => {
    const extra = ['date', 'service'].includes(key) ? { time: '' } : {};
    setForm((f) => ({ ...f, [key]: value, ...extra, consent: false }));
    setDraft(null); setConsent(false); setError('');
  };

  // Slots come from the saved schedule and the visits in this browser. Another tab's booking and the passing time
  // (a time that has started is no longer offered) both refresh them.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener('storage', bump);
    const id = setInterval(bump, 30000);
    return () => { window.removeEventListener('storage', bump); clearInterval(id); };
  }, []);
  const schedule = loadSchedule();
  const slots = useMemo(
    () => slotStates({ date: form.date, service: form.service, visits: loadRequests(), schedule: loadSchedule(), now: new Date() }),
    [form.date, form.service, revision, tick],
  );
  useEffect(() => {
    setForm((f) => (f.time && !slots.some((x) => x.time === f.time && x.state === 'free') ? { ...f, time: '' } : f));
  }, [slots]);

  function createDraft() {
    if (!form.patient || !form.time || !form.date) return;
    setDraft({ ...form, reference: `DEMO-${Date.now().toString(36).toUpperCase()}` });
    setConsent(false);
  }

  function confirmBooking() {
    if (!consent || !draft) return;
    if (isSlotTaken(loadRequests(), draft.date, draft.service, draft.time)) {
      setDraft(null); setConsent(false); setForm((f) => ({ ...f, time: '' })); setError(t.slotTakenNow); setTick((n) => n + 1);
      return;
    }
    const reservation = createBooking({ reference: draft.reference, patient: draft.patient, service: draft.service, date: draft.date, time: draft.time }, new Date());
    const requests = [reservation, ...loadRequests()].slice(0, 100);
    saveRequests(requests);
    setDraft(null);
    setResult(reservation);
  }

  if (result) {
    return (
      <section className="clinic-panel clinic-success">
        <CheckCircle2 size={48} strokeWidth={1.5} />
        <h2>{t.requestReceived}</h2>
        <p>{t.reference}</p>
        <strong className="clinic-reference" dir="ltr">{result.reference}</strong>
        <p>{t[result.service]} · {formatDate(result.date, lang)} · <b dir="ltr">{result.time}</b></p>
        <p>{t.notBooking}</p>
        <button className="clinic-btn outline" onClick={() => { setResult(null); setForm({ patient: '', service: 'general', date: '', time: '', consent: false }); setRevision(r => r + 1); }}>{t.another}</button>
      </section>
    );
  }

  if (draft) {
    return (
      <section className="clinic-panel">
        <form onSubmit={(e) => { e.preventDefault(); confirmBooking(); }} className="clinic-booking-review">
          <h2>{t.reviewTitle}</h2>
          <dl>
            <div><dt>{t.patientLabel}</dt><dd dir="auto">{draft.patient}</dd></div>
            <div><dt>{t.service}</dt><dd>{t[draft.service]}</dd></div>
            <div><dt>{t.date}</dt><dd>{formatDate(draft.date, lang)}</dd></div>
            <div><dt>{t.time}</dt><dd dir="ltr">{draft.time} (UTC+03:00)</dd></div>
          </dl>
          <p className="clinic-hint">{t.reviewNotice}</p>
          <label className="clinic-checkbox-label"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>{t.confirmConsent}</span></label>
          <button className="clinic-btn primary full" disabled={busy || !consent}>{busy ? t.saving : t.confirm}<Check size={18} /></button>
          <button className="clinic-btn text-button" type="button" onClick={() => { setDraft(null); setConsent(false); }}>{t.edit}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="clinic-panel">
      {error && <div className="clinic-notice clinic-notice-error">{error}</div>}
      <form onSubmit={(e) => { e.preventDefault(); createDraft(); }} className="clinic-slot-form">
        <div className="clinic-panel-head"><h2>{t.bookTitle}</h2><CalendarDays size={22} /></div>
        <p className="clinic-hint">{t.schedule.replace('{open}', schedule.open).replace('{close}', schedule.close).replace('{minutes}', String(schedule.slotMinutes))}</p>
        <label>{t.patientLabel}<input required pattern={['(?:Patient', 'مريض) [0-9٠-٩]{3}'].join('|')} maxLength="40" dir="auto" placeholder="Patient 007" value={form.patient} onChange={(e) => update('patient', e.target.value)} /><small>{t.patientHint}</small></label>
        <label>{t.service}<select value={form.service} onChange={(e) => update('service', e.target.value)}>{SERVICES.map((s) => <option key={s.id} value={s.id}>{t[s.id]}</option>)}</select></label>
        <label>{t.date}<input required type="date" min={saudiToday()} max={new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })} value={form.date} onChange={(e) => update('date', e.target.value)} /></label>
        <fieldset className="clinic-time-slots"><legend>{t.slots}</legend>
          {!form.date ? <p className="clinic-hint">{t.chooseDate}</p> : !slots.length ? <p className="clinic-hint">{t.noSlots}</p> : (
            <div className="clinic-slot-grid">{slots.map(({ time, state }) => state === 'taken' ? (
              <button key={time} type="button" className="clinic-slot taken" disabled dir="ltr">{time}<span className="sr-only"> ({t.slotTaken})</span></button>
            ) : (
              <button key={time} type="button" className={form.time === time ? 'clinic-slot selected' : 'clinic-slot'} onClick={() => update('time', time)} aria-pressed={form.time === time} dir="ltr">{time}</button>
            ))}</div>
          )}
        </fieldset>
        <button className="clinic-btn primary full" disabled={busy || !form.time}>{busy ? t.saving : t.review}<ArrowRight size={18} /></button>
        <p className="clinic-privacy">{t.waiting}</p>
      </form>
    </section>
  );
}

function Dashboard({ lang, t }: { lang: 'ar' | 'en'; t: Record<string, string> }) {
  const [requests, setRequests] = useState<any[]>(loadRequests());
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const filtered = requests.filter((r) =>
    (filter === 'all' || r.status === filter) &&
    [r.reference, r.patient, t[r.service] || r.service].join(' ').toLowerCase().includes(search.toLowerCase())
  );
  const counts = Object.fromEntries(STATUSES.map((s) => [s, requests.filter((r) => r.status === s).length]));

  // The details dialog is native: it has to be opened and closed explicitly.
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (selected && !d.open) d.showModal();
    if (!selected && d.open) d.close();
  }, [selected]);

  return (
    <>
      <div className="clinic-metrics">
        {[['booked', Clock3], ['checked_in', Users], ['in_consult', Stethoscope], ['completed', CheckCheck]].map(([s, Icon]) => (
          <div key={s} className="clinic-metric"><div><span>{visitStatusLabel(lang, s)}</span><Icon size={19} /></div><strong>{counts[s]}</strong></div>
        ))}
      </div>

      <section className="clinic-panel">
        <div className="clinic-panel-head">
          <h2>{t.queue}</h2>
          <div className="clinic-search"><Search size={18} /><input aria-label={t.search} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
        <div className="clinic-filters">
          {['all', ...STATUSES].map((s) => (
            <button key={s} className={filter === s ? 'clinic-btn active' : 'clinic-btn outline'} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s === 'all' ? t.all : visitStatusLabel(lang, s)} <span>{s === 'all' ? requests.length : counts[s]}</span></button>
          ))}
        </div>
        <div className="clinic-table-scroll">
          <table>
            <thead><tr>{['request', 'service', 'date', 'status', 'action'].map((key) => <th key={key} scope="col">{t[key]}</th>)}</tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td><strong dir="ltr">{r.reference}</strong><small dir="auto">{r.patient}</small></td>
                  <td>{t[r.service] || r.service}</td>
                  <td>{formatDate(r.date, lang)}</td>
                  <td><span className={`clinic-status visit-${r.status}`}>{visitStatusLabel(lang, r.status)}</span></td>
                  <td><button className="clinic-btn outline small" onClick={() => setSelected(r)}>{t.view}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && <p className="clinic-empty">{t.empty}</p>}
      </section>

      <dialog ref={dialog} className="clinic-dialog" onClose={() => setSelected(null)} aria-labelledby="clinic-dialog-title">
        <div className="clinic-dialog-content">
          <div className="clinic-panel-head"><h2 id="clinic-dialog-title">{t.details}</h2><button className="clinic-icon-button" aria-label={t.close} onClick={() => setSelected(null)}><X size={20} /></button></div>
          {selected && (
            <>
              <p className="clinic-reference" dir="ltr">{selected.reference}</p>
              <dl>
                <div><dt>{t.request}</dt><dd dir="auto">{selected.patient}</dd></div>
                <div><dt>{t.service}</dt><dd>{t[selected.service] || selected.service}</dd></div>
                <div><dt>{t.date}</dt><dd>{formatDate(selected.date, lang)} {selected.time && <b dir="ltr"> · {selected.time}</b>}</dd></div>
                <div><dt>{t.requestStatus}</dt><dd><span className={`clinic-status visit-${selected.status}`}>{visitStatusLabel(lang, selected.status)}</span></dd></div>
              </dl>
              <ol className="visit-timeline" aria-label={lang === 'ar' ? 'السجل الزمني' : 'Timeline'}>
                {selected.history.map((h: any, i: number) => (
                  <li key={i}><span className={`clinic-status visit-${h.status}`}>{visitStatusLabel(lang, h.status)}</span> <time dir="ltr" dateTime={h.at}>{new Date(h.at).toLocaleString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-GB', { timeZone: 'Asia/Riyadh', dateStyle: 'short', timeStyle: 'short' })}</time></li>
                ))}
              </ol>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

function ScheduleSettings({ lang, t }: { lang: 'ar' | 'en'; t: Record<string, string> }) {
  const [saved, setSaved] = useState(loadSchedule());
  const [form, setForm] = useState({ open: saved.open, close: saved.close, slotMinutes: String(saved.slotMinutes) });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const dirty = form.open !== saved.open || form.close !== saved.close || Number(form.slotMinutes) !== saved.slotMinutes;
  function submit(e) {
    e.preventDefault();
    setOk('');
    const next = { open: form.open, close: form.close, slotMinutes: Number(form.slotMinutes) };
    const problem = scheduleProblem(next);
    if (problem) { setError(t[`sched.${problem}`]); return; }
    try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(next)); } catch { setError(t.schedStorage); return; }
    setSaved(next);
    setError('');
    setOk(t.scheduleSaved);
  }
  const change = (key: string, value: string) => { setForm({ ...form, [key]: value }); setError(''); setOk(''); };
  return (
    <section className="clinic-panel">
      <h2>{t.scheduleTitle}</h2>
      <p className="clinic-hint">{t.scheduleHint}</p>
      <form onSubmit={submit} className="clinic-profile-form">
        <div className="clinic-form-grid">
          <label>{t.openTime}<input type="time" required step="300" dir="ltr" value={form.open} onChange={(e) => change('open', e.target.value)} /></label>
          <label>{t.closeTime}<input type="time" required step="300" dir="ltr" value={form.close} onChange={(e) => change('close', e.target.value)} /></label>
          <label>{t.slotLength}
            <select value={form.slotMinutes} onChange={(e) => change('slotMinutes', e.target.value)}>
              {SLOT_LENGTHS.map((m) => <option key={m} value={m}>{m} {t.minutesUnit}</option>)}
            </select>
          </label>
        </div>
        <div role="status" aria-live="polite">
          {error && <div className="clinic-notice clinic-notice-error">{error}</div>}
          {ok && <div className="clinic-notice clinic-notice-ok">{ok}</div>}
        </div>
        <button type="submit" className="clinic-btn primary" disabled={!dirty}>{t.saveSchedule}</button>
      </form>
    </section>
  );
}

function Setup({ lang, t, onSaved }: { lang: 'ar' | 'en'; t: Record<string, string>; onSaved: (profile: any) => void }) {
  const [profile, setProfile] = useState(loadProfile());
  const [draft, setDraft] = useState(profile);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(profile); }, [profile, dirty]);

  async function saveProfile() {
    try { persistProfile(draft); setProfile(draft); setDirty(false); onSaved(draft); } catch {}
  }

  return (
    <>
    <section className="clinic-panel">
      <h2>{t.profileTitle}</h2>
      <p className="clinic-hint">{t.profileSubtitle}</p>
      <form onSubmit={(e) => { e.preventDefault(); saveProfile(); }} className="clinic-profile-form">
        <div className="clinic-form-grid">
          {['nameEn', 'nameAr', 'hoursEn', 'hoursAr', 'locationEn', 'locationAr', 'insuranceEn', 'insuranceAr'].map((key) => (
            <label key={key}>
              {t[key]}
              {key.startsWith('name') ? (
                <input required maxLength="100" dir={key.endsWith('Ar') ? 'rtl' : 'ltr'} value={draft[key]} onChange={(e) => { setDirty(true); setDraft({ ...draft, [key]: e.target.value }); }} />
              ) : (
                <textarea required maxLength="2000" rows="3" dir={key.endsWith('Ar') ? 'rtl' : 'ltr'} value={draft[key]} onChange={(e) => { setDirty(true); setDraft({ ...draft, [key]: e.target.value }); }} />
              )}
            </label>
          ))}
        </div>
        <p className="clinic-hint">{t.faqHint}</p>
        <button type="submit" className="clinic-btn primary" disabled={!dirty}>{t.saveProfile}</button>
      </form>
    </section>
    <ScheduleSettings lang={lang} t={t} />
    </>
  );
}

// ── Provider Identity Card (Live from BPR Registry) ──────────────────────

function ProviderIdentity({ lang, t }: { lang: 'ar' | 'en'; t: Record<string, string> }) {
  const [credential, setCredential] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let alive = true;
    async function loadCredential() {
      try {
        const result = await checkCredential(SPID);
        if (!alive) return;
        const subject = result.claims.credentialSubject;
        setCredential({ ...subject, issuer: result.claims.issuer.id });
        setVerified(result.signature.state === 'ok' && result.expiry.state === 'ok' && result.status.state === 'ok');
      } catch {
        if (!alive) return;
        setCredential(null);
        setVerified(false);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadCredential();
    return () => { alive = false; };
  }, []);

  return (
    <section className="clinic-panel clinic-identity-card">
      <div className="clinic-panel-head">
        <h2>{t.providerIdentity}</h2>
        {verified ? <span className="clinic-badge clinic-badge-verified">{t.verified}</span> : <span className="clinic-badge clinic-badge-pending">{t.pending}</span>}
      </div>
      {loading ? (
        <div className="clinic-loading">{t.loading}</div>
      ) : (
        <>
          <div className="clinic-identity-grid">
            <div className="clinic-identity-field">
              <label>{t.spid}</label>
              <div className="clinic-identity-value" dir="ltr">{credential?.spid || SPID}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.oid}</label>
              <div className="clinic-identity-value" dir="ltr">{credential?.oid || OID}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.credential}</label>
              <div className="clinic-identity-value" dir="ltr">{credential?.issuer || (lang === 'ar' ? 'لم يُتحقّق منه' : 'Not checked')}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.providerName}</label>
              <div className="clinic-identity-value">{credential?.name || credential?.name_en || t.providerName}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.providerNameAr}</label>
              <div className="clinic-identity-value" dir="rtl">{credential?.nameAr || credential?.name_ar || 'د. محمد الفاضل'}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.emr}</label>
              <div className="clinic-identity-value">{lang === 'ar' ? 'وصول خاص · لم يُتحقّق منه هنا' : 'Private access · not checked here'}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.copilot}</label>
              <div className="clinic-identity-value">{t.copilotPoweredBy}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.nphies}</label>
              <div className="clinic-identity-value">{t.nphiesReference}</div>
            </div>
            <div className="clinic-identity-field">
              <label>{t.brev}</label>
              <div className="clinic-identity-value">{t.brevDisconnected}</div>
            </div>
          </div>
          <div className="clinic-identity-actions">
            <a href={localized(`/bpr/verify/?spid=${SPID}`)} className="clinic-btn primary">{t.refresh}</a>
            <a href="https://demo.emr.brainsait.de/" target="_blank" rel="noreferrer" className="clinic-btn outline">{t.emr}</a>
          </div>
        </>
      )}
    </section>
  );
}

// ── Clinic Status Dashboard ──────────────────────────────────────────────

function ClinicStatus({ lang, t }: { lang: 'ar' | 'en'; t: Record<string, string> }) {
  const [status, setStatus] = useState<any>({
    registry: 'checking',
    nvidia: 'checking',
    emr: 'checking',
    copilot: 'checking',
    nphies: 'reference',
    brev: 'disconnected',
  });

  useEffect(() => {
    async function loadStatus() {
      try {
        const r = await fetch(`${REGISTRY}/api/health`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const data = await r.json();
          setStatus(prev => ({
            ...prev,
            registry: data.status === 'ok' ? 'live' : 'down',
            nvidia: data.ai === 'configured_unverified' ? 'configured' : 'unknown',
          }));
        }
      } catch {}

      try {
        const r = await fetch(`${REGISTRY}/api/status`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error('status unavailable');
        const report = await r.json();
        const site = report.sites?.['https://sa-phy-000003.emr.brainsait.de/'];
        const fresh = Date.now() - Date.parse(report.checked_at) < 900000;
        setStatus(prev => ({ ...prev, emr: fresh && site === 'ok' ? 'reported' : 'unknown' }));
      } catch {
        setStatus(prev => ({ ...prev, emr: 'down' }));
      }
    }
    loadStatus();
  }, []);

  return (
    <section className="clinic-panel">
      <h2>{t.clinicStatus}</h2>
      <div className="clinic-status-grid">
        <div className="clinic-status-item">
          <div className="clinic-status-label">Registry</div>
          <span className={`clinic-status-badge ${status.registry === 'live' ? 'clinic-status-live' : 'clinic-status-down'}`}>
            {status.registry === 'live' ? t.clinicLive : t.clinicPending}
          </span>
        </div>
        <div className="clinic-status-item">
          <div className="clinic-status-label">Model gateway</div>
          <span className={`clinic-status-badge ${status.nvidia === 'configured' ? 'clinic-status-reference' : 'clinic-status-down'}`}>
            {status.nvidia === 'configured' ? (lang === 'ar' ? 'مُعدّ · لم يُختبر الاستدلال' : 'Configured · inference not checked') : t.clinicPending}
          </span>
        </div>
        <div className="clinic-status-item">
          <div className="clinic-status-label">OpenEMR</div>
          <span className={`clinic-status-badge ${status.emr === 'reported' ? 'clinic-status-reference' : 'clinic-status-down'}`}>
            {status.emr === 'reported' ? (lang === 'ar' ? 'تقرير المراقبة: متاح' : 'Monitoring reports reachable') : t.clinicPending}
          </span>
        </div>
        <div className="clinic-status-item">
          <div className="clinic-status-label">NPHIES</div>
          <span className="clinic-status-badge clinic-status-reference">{t.nphiesReference}</span>
        </div>
        <div className="clinic-status-item">
          <div className="clinic-status-label">Reception AI</div>
          <span className="clinic-status-badge clinic-status-reference">{lang === 'ar' ? 'إجابات معتمدة محليًا' : 'Local approved answers'}</span>
        </div>
        <div className="clinic-status-item">
          <div className="clinic-status-label">Clinic</div>
          <span className="clinic-status-badge clinic-status-reference">{lang === 'ar' ? 'سير عمل تجريبي' : 'Pilot workflow'}</span>
        </div>
      </div>
      <div className="clinic-ops-grid">
        <article className="clinic-ops-card">
          <div className="clinic-ops-icon"><MessageCircle size={18}/></div>
          <h3>{lang === 'ar' ? 'استقبال آمن' : 'Reception, with guardrails'}</h3>
          <p>{lang === 'ar' ? 'إجابات إدارية معتمدة وتحويل للموظف عند الحاجة. لا تشخيص ولا استدعاء لنموذج.' : 'Approved administrative answers with staff handoff. No diagnosis and no model calls.'}</p>
          <span>{lang === 'ar' ? 'البيانات التجريبية تبقى في هذا المتصفح' : 'Demo entries stay in this browser'}</span>
        </article>
        <article className="clinic-ops-card">
          <div className="clinic-ops-icon"><Headphones size={18}/></div>
          <h3>{lang === 'ar' ? 'وكيل الاستقبال الصوتي' : 'Reception voice agent'}</h3>
          <p>{lang === 'ar' ? 'الإدخال الصوتي غير مفعّل. يمكن للجهاز قراءة الإجابات المعتمدة بصوت مسموع؛ لا نطلب الميكروفون ولا نرسل تسجيلات.' : 'Voice input is not enabled. Your device can read approved replies aloud; this page does not request microphone access or send recordings.'}</p>
          <span>{lang === 'ar' ? 'تعمل القراءة عند الضغط على زر الاستماع في الإجابة' : 'Use Read answer aloud on an assistant reply'}</span>
        </article>
        <article className="clinic-ops-card">
          <div className="clinic-ops-icon"><Monitor size={18}/></div>
          <h3>OpenEMR</h3>
          <p>{lang === 'ar' ? 'افتح نسخة العرض ببيانات مصطنعة. لا يوجد ربط أو حفظ مواعيد من هذه الصفحة.' : 'Open the synthetic-data demo. This page has no EMR connection or appointment write-back.'}</p>
          <a href="https://demo.emr.brainsait.de/" target="_blank" rel="noreferrer">{lang === 'ar' ? 'فتح عرض OpenEMR' : 'Open the OpenEMR demo'} <ArrowUpRight size={14}/></a>
        </article>
        <article className="clinic-ops-card">
          <div className="clinic-ops-icon"><HeartPulse size={18}/></div>
          <h3>{lang === 'ar' ? 'المساعد والنماذج' : 'Copilot and models'}</h3>
          <p>{lang === 'ar' ? 'فحوص الخدمة أو جرد النماذج لا يثبتان نجاح الاستدلال. الموقع العام لا يرسل بيانات سريرية للنماذج.' : 'Service checks and model inventory do not prove inference. This public site sends no clinical data to models.'}</p>
          <a href={localized('/bpr/ai/')}>{lang === 'ar' ? 'عرض حالة بوابة النماذج' : 'Review model gateway status'} <ArrowRight size={14}/></a>
        </article>
        <article className="clinic-ops-card">
          <div className="clinic-ops-icon"><FileText size={18}/></div>
          <h3>{lang === 'ar' ? 'مكتب نفيس' : 'NPHIES desk'}</h3>
          <p>{lang === 'ar' ? 'مرجع وفحص أولي محلي للرسائل؛ لا أهلية ولا موافقات ولا مطالبات تُرسل إلى نفيس.' : 'Reference material and an on-device message pre-check; no eligibility, authorisation, or claims are sent to NPHIES.'}</p>
          <a href={localized('/bpr/nphies/')}>{lang === 'ar' ? 'فتح مكتب نفيس' : 'Open NPHIES desk'} <ArrowRight size={14}/></a>
        </article>
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ClinicPage() {
  const { t: i18nT, ar } = useI18n();
  const lang: 'ar' | 'en' = ar ? 'ar' : 'en';
  const t = STR[lang];
  const [config, setConfig] = useState(loadProfile());
  const [activeRoute, setActiveRoute] = useState<'overview' | 'requests' | 'setup' | 'reception' | 'desk' | 'doctor'>('overview');
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: ar ? 'استقبال العيادات — BPR' : 'Clinic Reception — BPR',
    description: ar ? 'تجربة استقبال ببيانات اصطناعية، مع تحقق مستقل من هوية BPR وحالة التكامل.' : 'A synthetic-data reception pilot with separate BPR credential checks and integration status.',
    url: '/bpr/clinic', type: 'website',
  });

  useEffect(() => {
    async function init() {
      setLoading(false);
    }
    init();
  }, []);

  const navigation = [
    { key: 'overview', Icon: House, label: t.overview },
    { key: 'requests', Icon: MessageSquare, label: t.requests },
    { key: 'setup', Icon: Settings2, label: t.setup },
    { key: 'reception', Icon: Users, label: t.reception },
    { key: 'desk', Icon: CheckCheck, label: t.desk },
    { key: 'doctor', Icon: Stethoscope, label: t.doctor },
  ];

  return (
    <BprLayout
      kicker={ar ? 'استقبال العيادات' : 'Clinic Reception'}
      title={ar ? 'استقبال ذكي للعيادة التجريبية' : 'Smart clinic reception'}
      lead={ar ? 'جرّب الاستقبال ببيانات اصطناعية. تُعرض هوية BPR وحالة التكامل بفحوص مستقلة؛ إعداد الذكاء الاصطناعي لا يثبت جاهزية الصوت.' : 'Explore reception with synthetic data. BPR identity and integration status have separate checks; AI configuration does not establish voice readiness.'}
      actions={<>
        <button className="profile-button primary" onClick={() => setActiveRoute('reception')}>{t.open}<ArrowRight size={16} /></button>
        <a href={localized('/bpr/nphies/')} className="profile-button secondary">{t.nphiesDesk}</a>
      </>}
    >
      <div className="clinic-app-shell">
        <aside className="clinic-sidebar">
          <div className="clinic-brand">
            <span className="clinic-brand-name" dir="ltr">BrainSAIT<span className="clinic-brand-dot">.</span></span>
            <span>{t.product}</span>
          </div>
          <nav aria-label={ar ? 'التنقل في العيادة' : 'Clinic navigation'}>
            {navigation.map(({ key, Icon, label }) => (
              <button key={key} className={`clinic-nav-item ${activeRoute === key ? 'active' : ''}`} onClick={() => setActiveRoute(key)} aria-current={activeRoute === key ? 'page' : undefined}>
                <Icon size={21} /><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="clinic-sidebar-bottom">
            <div><Monitor size={20} /><span>{t.demo}</span></div>
            <a className="clinic-leave" href={localized('/bpr/')}>{t.logout}</a>
          </div>
        </aside>
        <div className="clinic-main-content" id="clinic-main-content" tabIndex={-1}>
          <header className="clinic-page-header">
            <div>
              <div className="clinic-title-line">
                <h2>{activeRoute === 'overview' ? t.title : t[activeRoute]}</h2>
                <span className="clinic-sample-label">{t.sample}</span>
              </div>
              <p>{activeRoute === 'overview' ? t.subtitle : config?.[lang === 'ar' ? 'nameAr' : 'nameEn'] || t.product}</p>
            </div>
            <div className="clinic-header-actions">
              <button className="clinic-btn primary" onClick={() => setActiveRoute('reception')}>
                <Plus size={19} /> {t.open}
              </button>
            </div>
          </header>
          {loading && <div className="clinic-loading">{t.loading}</div>}
          {!loading && (
            <>
              {/* Provider Identity Card — shown on all pages */}
              <ProviderIdentity lang={lang} t={t} />

              {activeRoute === 'reception' && (
                <>
                  <ReceptionChat lang={lang} t={t} profile={config} />
                  <SlotBooking lang={lang} t={t} />
                </>
              )}
              {activeRoute === 'desk' && <FrontDesk lang={lang} t={t} />}
              {activeRoute === 'doctor' && <DoctorRoom lang={lang} t={t} />}
              {activeRoute === 'setup' && <Setup lang={lang} t={t} onSaved={setConfig} />}
              {(activeRoute === 'overview' || activeRoute === 'requests') && (
                <>
                  <ClinicStatus lang={lang} t={t} />
                  <Dashboard lang={lang} t={t} />
                </>
              )}
            </>
          )}
          <footer>
            <span>{t.managed}</span>
            <span>{t.demoNote}</span>
          </footer>
        </div>
      </div>
    </BprLayout>
  );
}
