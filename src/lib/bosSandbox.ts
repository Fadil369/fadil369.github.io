/**
 * BOS — BrainSAIT & Doctor OS deterministic sandbox (PHI Firewall + Exact Clinical Calculators).
 *
 * Pure, deterministic client-side rules ported from ~/brainsait-doctor-os/plugin/lib/{phi,calc}.js.
 * No patient data or input is ever stored or transmitted over the network.
 */

const ARABIC_NAME = '[\\u0621-\\u064A]{2,}';
const COMMON_ARABIC_NAMES =
  'محمد|أحمد|احمد|عبدالله|عبد الله|عبدالرحمن|عبد الرحمن|عبدالعزيز|عبد العزيز|خالد|سعد|فهد|سلطان|تركي|ناصر|علي|عمر|سعود|فيصل|إبراهيم|ابراهيم|يوسف|حسن|حسين|صالح|سالم|ماجد|بندر|نايف|مشعل|فاطمة|نورة|نوره|سارة|ساره|مريم|عائشة|هند|منى|ريم|لطيفة|خديجة|أمل|هيا|شهد|جواهر|نوف';
const COMMON_LATIN_NAMES =
  'Mohammed|Mohamed|Muhammad|Ahmed|Ahmad|Abdullah|Abdulrahman|Abdulaziz|Khalid|Khaled|Saad|Fahad|Fahd|Sultan|Turki|Nasser|Ali|Omar|Saud|Faisal|Ibrahim|Yousef|Yusuf|Hassan|Hussein|Saleh|Salem|Majed|Bandar|Nayef|Fatimah|Fatima|Noura|Nora|Sarah|Sara|Maryam|Aisha|Hind|Mona|Reem|Latifa|Khadija|Amal|Haya';

const NOT_A_NAME = new Set([
  'safety', 'care', 'education', 'experience', 'portal', 'flow', 'satisfaction', 'centered',
  'centred', 'reported', 'outcomes', 'outcome', 'advocate', 'relations', 'services', 'affairs',
  'zero', 'data', 'access', 'records', 'record', 'admission', 'transfer', 'monitor', 'monitoring',
  'controlled', 'analgesia', 'is', 'has', 'was', 'with', 'on', 'in', 'a', 'an', 'the', 'presents',
  'denies', 'denied', 'reports', 'history', 'information', 'journey', 'rights', 'engagement', 'registry',
  'assessment', 'summary', 'handover', 'handoff', 'name', 'test', 'admitted', 'discharged',
  'examined', 'evaluated', 'assessed', 'treated', 'managed', 'followed', 'monitored', 'observed',
  'names', 'identifiers', 'identifier', 'identity', 'identification', 'privacy', 'confidentiality',
  'consent', 'details', 'demographics', 'numbers', 'ids', 'files', 'charts', 'notes', 'complaints',
]);

const normalizeDigits = (text: string) =>
  text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

const stripReferences = (text: string) =>
  text.replace(/\bhttps?:\/\/\S+/gi, ' ').replace(/\b10\.\d{4,9}\/\S+/g, ' ');

const squashSpaces = (text: string) => text.replace(/\s+/g, '');

export function luhnValid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

const hasLatinNameAfterPatient = (text: string) => {
  const pattern = /\b[Pp](?:atient|t\.?)\s+([A-Za-z][a-z'-]+)\s+((?:[Aa]l-?|[Ee]l-?|[Bb]in\s+|[Ii]bn\s+)?[A-Za-z][a-z'-]+)/g;
  for (const match of text.matchAll(pattern)) {
    const low1 = match[1].toLowerCase();
    const low2 = match[2].toLowerCase();
    if (!NOT_A_NAME.has(low1) && !NOT_A_NAME.has(low2)) return true;
  }
  return false;
};

const LEET: Record<string, string> = { a: '4@', e: '3', i: '1!', o: '0', t: '7' };
const spelled = (word: string) =>
  word.split('').map((c) => `[${c}${c.toUpperCase()}${LEET[c] ?? ''}]`).join('[\\s._-]*');
const VALUE = '[\\s._-]*(?:is|:|-|=)?\\s*[A-Z\\u0621-\\u064A]';
const SPELLED_PATIENT_NAME = new RegExp(`\\b${spelled('patient')}['’]?s?[\\s._-]+${spelled('name')}(?![A-Za-z])${VALUE}`);
const SPELLED_NAME_OF_PATIENT = new RegExp(`\\b${spelled('name')}[\\s._-]+of[\\s._-]+(?:the[\\s._-]+)?${spelled('patient')}(?![A-Za-z])${VALUE}`);

const NOT_A_PERSON = new Set(['excel', 'word', 'office', 'teams', 'access', 'powerpoint', 'project', 'outlook']);

const patientNameAfterTitle = (text: string) => {
  for (const m of text.matchAll(/\b(?:Mr|Mrs|Ms|Miss)\b\.?\s+([A-Z][a-z'-]+)/g)) {
    if (!NOT_A_PERSON.has(m[1].toLowerCase()) && !NOT_A_NAME.has(m[1].toLowerCase())) return true;
  }
  if (/\b(?:mr|mrs)\b\.?\s+[a-z][a-z'-]+/.test(text)) return true;
  const ciNames = COMMON_LATIN_NAMES.split('|').map((n) => n.toLowerCase()).join('|');
  if (new RegExp(`\\b[Pp](?:atient|t\\.?)\\s+(?:${ciNames})\\b`, 'i').test(text)) return true;
  return false;
};

export type PhiFindingType =
  | 'attachment'
  | 'email'
  | 'phone'
  | 'national_id'
  | 'record_number'
  | 'insurance_id'
  | 'date_of_birth'
  | 'patient_name';

const AR_NAT_ID_WORDS = ['هوية', 'الهوية', 'إقامة', 'اقامة', 'جواز'].join('|');
const AR_MRN_WORDS = ['ملف +رقم', 'الرقم +الطبي', 'رقم *الملف', 'ملف *رقم', 'رقم *طبي'].join('|');
const AR_INS_WORDS = ['التأمين', 'البوليصة', 'الوثيقة', 'المطالبة', 'المستفيد'].join('|');
const AR_DOB_WORDS = ['تاريخ *الميلاد', 'مواليد', 'تاريخ *ميلاد'].join('|');
const AR_PT_WORDS = ['المريض', 'المريضة'].join('|');
const AR_TITLE_WORDS = ['المريض', 'المريضة', 'السيد', 'السيدة', 'الأستاذ', 'الأستاذة'].join('|');
const AR_NAME_LABELS = ['اسمه', 'اسمها', 'يدعى', 'تدعى'].join('|');

const CHECKS: [PhiFindingType, (t: string) => boolean][] = [
  ['attachment', (t) => /\[media attached|<media:[a-z]+>|<file\b/i.test(t)],
  ['email', (t) => /\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i.test(t) || /\b[\w.+-]+\s*(?:\[at\]|\(at\))\s*[\w-]+\s*(?:\[dot\]|\(dot\))\s*[a-z]{2,}\b/i.test(t)],
  ['phone', (t) => /(?<![\d.])(?:\+?966|00966|0)[\s-]?5[\s-]?(?:\d[\s-]?){8}(?!\d)/.test(t)],
  ['national_id', (t) =>
    [...t.matchAll(/(?<![\d.-])([12]\d{9})(?![\d-])/g)].some((m) => luhnValid(m[1])) ||
    [...squashSpaces(t).matchAll(/(?<![\d.-])([12]\d{9})(?![\d-])/g)].some((m) => luhnValid(m[1])) ||
    new RegExp(`(?:national\\s*id|iqama|igama|passport|\\bnid\\b|${AR_NAT_ID_WORDS})[^\\d\\n]{0,20}\\d{6,}`, 'i').test(t)],
  ['record_number', (t) =>
    /\b(?:mrn|medical\s*record(?:\s*(?:no|number|#))?|hospital\s*(?:no|number)|file\s*(?:no|number|#))\b\.?[\s:#-]*[a-z0-9-]*\d[a-z0-9-]*/i.test(t) ||
    new RegExp(`(?:\\b(?:record\\s+number|file\\s+number)\\b|${AR_MRN_WORDS})[\\s:#-]*\\d+`, 'i').test(t)],
  ['insurance_id', (t) =>
    /\b(?:policy|member|insurance|beneficiary|claim|authorization|pre-?auth)\s*(?:id|no|number|#)\b\.?[\s:#-]*[a-z0-9-]*\d[a-z0-9-]*/i.test(t) ||
    new RegExp(`رقم *(?:${AR_INS_WORDS})[\\s:#-]*\\d+`).test(t)],
  ['date_of_birth', (t) =>
    /\b(?:dob|d\.o\.b\.?|date\s*of\s*birth|born\s*on|born)\b[\s:#-]*\d/i.test(t) ||
    new RegExp(`(?:${AR_DOB_WORDS})[\\s:#-]*\\d`).test(t)],
  ['patient_name', (t) =>
    /\b[Pp](?:atient(?:'s)?|t)\s+[Nn][a-z]*(?:\s+[a-z]){0,3}\s*(?:is|:|-|=)?\s*[A-Z\u0621-\u064A]/.test(t) ||
    /\b[Nn][a-z]*(?:\s+[a-z]){0,3}\s+of\s+(?:the\s+)?[Pp]atient\s*(?:is|:|-|=)?\s*[A-Z\u0621-\u064A]/.test(t) ||
    /\b[Pp]atient\s+(?:named|called)\s+\S/.test(t) ||
    patientNameAfterTitle(t) ||
    new RegExp(`\\b[Pp](?:atient|t\\.?)\\s+(?:${COMMON_LATIN_NAMES})\\b`, 'i').test(t) ||
    hasLatinNameAfterPatient(t) ||
    new RegExp(`اسم +(${AR_PT_WORDS}) *[:\\-]? *${ARABIC_NAME}`).test(t) ||
    new RegExp(`(?:${AR_PT_WORDS}) *(?:[:\\-]|${AR_NAME_LABELS}) *${ARABIC_NAME}`).test(t) ||
    new RegExp(`(?:${AR_TITLE_WORDS}) +(?:${COMMON_ARABIC_NAMES})(?![\\u0621-\\u064A])`).test(t) ||
    SPELLED_PATIENT_NAME.test(t) ||
    SPELLED_NAME_OF_PATIENT.test(t)],
];

export const PHI_LABELS: Record<PhiFindingType, [string, string]> = {
  attachment: ['Attachment tag', 'وسم مرفق'],
  email: ['Email address', 'بريد إلكتروني'],
  phone: ['Phone number (KSA)', 'رقم جوال سعودي'],
  national_id: ['National ID / Iqama (Luhn)', 'رقم هوية أو إقامة'],
  record_number: ['Medical record number (MRN)', 'رقم ملف طبي'],
  insurance_id: ['Insurance / Claim ID', 'رقم تأمين أو مطالبة'],
  date_of_birth: ['Date of birth', 'تاريخ ميلاد'],
  patient_name: ['Patient name', 'اسم مريض'],
};

export function scanForIdentifiers(input: string): PhiFindingType[] {
  const cleaned = String(input ?? '')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '');
  const text = stripReferences(normalizeDigits(cleaned));
  const found = new Set<PhiFindingType>();
  for (const [type, check] of CHECKS) {
    if (check(text)) found.add(type);
  }
  return [...found];
}

// ── Exact Clinical Calculators (Deterministic, Zero-LLM Math) ──────────────

const CREATININE_UMOL_PER_MGDL = 88.4;

export interface CalcOutput {
  result: string;
  unit: string;
  interpretationEn: string;
  interpretationAr: string;
  formula: string;
}

export function calcEgfrCkdEpi2021(params: {
  age: number;
  sex: 'male' | 'female';
  creatinine: number;
  unit: 'mg/dL' | 'umol/L';
}): CalcOutput {
  const age = Math.min(Math.max(Number(params.age) || 50, 18), 120);
  const raw = Math.max(Number(params.creatinine) || 1.0, 0.1);
  const scr = params.unit === 'umol/L' ? raw / CREATININE_UMOL_PER_MGDL : raw;
  const k = params.sex === 'female' ? 0.7 : 0.9;
  const alpha = params.sex === 'female' ? -0.241 : -0.302;
  const val =
    142 *
    Math.min(scr / k, 1) ** alpha *
    Math.max(scr / k, 1) ** -1.2 *
    0.9938 ** age *
    (params.sex === 'female' ? 1.012 : 1);
  const egfr = Math.round(val);
  const stage =
    egfr >= 90 ? 'G1' : egfr >= 60 ? 'G2' : egfr >= 45 ? 'G3a' : egfr >= 30 ? 'G3b' : egfr >= 15 ? 'G4' : 'G5';
  return {
    result: String(egfr),
    unit: 'mL/min/1.73m²',
    interpretationEn: `KDIGO GFR category ${stage} (requires ≥3 months chronicity for CKD diagnosis)`,
    interpretationAr: `فئة KDIGO ${stage} (يتطلب استمرارها 3 أشهر فأكثر لتشخيص المرض الكلوي المزمن)`,
    formula: 'CKD-EPI 2021 Creatinine (race-free)',
  };
}

export function calcCha2ds2Vasc(params: {
  age: number;
  sex: 'male' | 'female';
  chf: boolean;
  hypertension: boolean;
  diabetes: boolean;
  strokeTia: boolean;
  vascular: boolean;
}): CalcOutput {
  const age = Math.min(Math.max(Number(params.age) || 65, 18), 120);
  const score =
    (params.chf ? 1 : 0) +
    (params.hypertension ? 1 : 0) +
    (age >= 75 ? 2 : age >= 65 ? 1 : 0) +
    (params.diabetes ? 1 : 0) +
    (params.strokeTia ? 2 : 0) +
    (params.vascular ? 1 : 0) +
    (params.sex === 'female' ? 1 : 0);
  const threshold = params.sex === 'female' ? 3 : 2;
  return {
    result: String(score),
    unit: 'points (0–9)',
    interpretationEn:
      score >= threshold
        ? `Score ${score}: Oral anticoagulation recommended per ESC/ACC guidelines (unless contraindicated).`
        : `Score ${score}: Low to borderline stroke risk; individualize per guidelines.`,
    interpretationAr:
      score >= threshold
        ? `النتيجة ${score}: يُوصى بمضاد التخثر الفموي وفق الإرشادات (ما لم يوجد مانع).`
        : `النتيجة ${score}: خطر منخفض إلى حدي؛ يُقدّر حسب الحالة السريرية.`,
    formula: 'CHA₂DS₂-VASc',
  };
}

export function calcMeldNa(params: {
  creatinineMgDl: number;
  bilirubinMgDl: number;
  inr: number;
  sodiumMmolL: number;
  dialysisTwiceWeek: boolean;
}): CalcOutput {
  const scr = params.dialysisTwiceWeek ? 4 : Math.min(Math.max(Number(params.creatinineMgDl) || 1.0, 1), 4);
  const bili = Math.max(Number(params.bilirubinMgDl) || 1.0, 1);
  const inr = Math.max(Number(params.inr) || 1.0, 1);
  const meld = Math.round(10 * (0.957 * Math.log(scr) + 0.378 * Math.log(bili) + 1.12 * Math.log(inr) + 0.643));
  const na = Math.min(Math.max(Number(params.sodiumMmolL) || 135, 125), 137);
  const meldNa = meld > 11 ? Math.round(meld + 1.32 * (137 - na) - 0.033 * meld * (137 - na)) : meld;
  return {
    result: String(meldNa),
    unit: 'points (6–40)',
    interpretationEn: `MELD ${meld} · Na clamped at ${na} mmol/L (UNOS 2016 bounds applied)`,
    interpretationAr: `مؤشر MELD الأساسي ${meld} · الصوديوم المحتسب ${na} مليمول/لتر (حدود UNOS 2016)`,
    formula: 'MELD-Na (UNOS 2016)',
  };
}

export function calcWellsPe(params: {
  dvtSigns: boolean;
  peMostLikely: boolean;
  hrOver100: boolean;
  immobilisationOrSurgery: boolean;
  previousPeDvt: boolean;
  hemoptysis: boolean;
  malignancy: boolean;
}): CalcOutput {
  const score =
    (params.dvtSigns ? 3 : 0) +
    (params.peMostLikely ? 3 : 0) +
    (params.hrOver100 ? 1.5 : 0) +
    (params.immobilisationOrSurgery ? 1.5 : 0) +
    (params.previousPeDvt ? 1.5 : 0) +
    (params.hemoptysis ? 1 : 0) +
    (params.malignancy ? 1 : 0);
  const formatted = Number.isInteger(score) ? String(score) : score.toFixed(1);
  return {
    result: formatted,
    unit: 'points',
    interpretationEn:
      score > 4
        ? `PE likely (${formatted} > 4): CT pulmonary angiography indicated.`
        : `PE unlikely (${formatted} ≤ 4): Consider high-sensitivity D-dimer before imaging.`,
    interpretationAr:
      score > 4
        ? `احتمال الانصمام الرئوي مرتفع (${formatted} > 4): يُوصى بالتصوير المقطعي للأوعية الرئوية.`
        : `احتمال الانصمام الرئوي منخفض (${formatted} ≤ 4): يُنظر في فحص D-dimer قبل التصوير.`,
    formula: 'Wells Criteria for Pulmonary Embolism (Two-Level)',
  };
}
