// On-device pre-check for NPHIES message bundles. It runs in the visitor's browser and sends nothing
// anywhere: the only inputs are the pasted bundle and the published spec tables. It is a pre-flight
// aid, not NPHIES validation. It covers a checked subset of the published profile requirements and
// business rules, and passing here does not mean a payer or the platform will accept the message.

export type Severity = 'error' | 'warn' | 'info';
export interface Finding {
  id: string;
  severity: Severity;
  where: string;
  en: string;
  ar: string;
  /** Validation rule identifier this check was written from, when one exists. */
  rule?: string;
  /** Rejection reason this problem tends to lead to, linked to the decoder. */
  reason?: string;
}
export interface ProfileSpec { sheet: string; elements: [string, string, string, string, string][] }
export interface Spec {
  profiles: Record<string, ProfileSpec>;
  systems: Record<string, Set<string> | null>;
  valueSets: Record<string, string[]>;
  practiceCodes: Set<string>;
}
export interface CheckResult {
  ok: boolean;
  event?: string;
  focus?: string;
  profile?: string;
  resources: number;
  checked: number;
  findings: Finding[];
}

type Json = Record<string, any>;
const NPHIES_PROFILE = /StructureDefinition\/([^|/]+)(?:\|(.+))?$/;
const EXT = 'http://nphies.sa/fhir/ksa/nphies-fs/StructureDefinition/';
const ICD_AM = 'http://hl7.org/fhir/sid/icd-10-am';
const PRACTITIONER_LICENSE = 'http://nphies.sa/license/practitioner-license';
const PRACTICE_CODES = 'http://nphies.sa/terminology/CodeSystem/practice-codes';
const CLAIM_INFO_CATEGORY = 'http://nphies.sa/terminology/CodeSystem/claim-information-category';
const MAX_BYTES = 10 * 1024 * 1024;
// Provider-side messages only. Response and task profiles are written by payers and the platform.
const CHECKED_PROFILES = new Set(['bundle', 'message-header', 'institutional-claim', 'professional-claim', 'pharmacy-claim', 'oral-claim', 'vision-claim',
  'institutional-priorauth', 'professional-priorauth', 'pharmacy-priorauth', 'oral-priorauth', 'vision-priorauth', 'prescriber-priorauth',
  'eligibility-request', 'patient', 'coverage', 'encounter', 'practitioner', 'provider-organization', 'insurer-organization', 'policyholder-organization', 'location', 'medicationRequest']);

const isDrg = (system: unknown) => typeof system === 'string' && /\/CodeSystem\/drg$/i.test(system);
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const money = (v: any): number | null => (typeof v?.value === 'number' ? v.value : null);
const near = (a: number, b: number) => Math.abs(a - b) < 0.011;
const day = (s: unknown) => (typeof s === 'string' ? s.slice(0, 10) : '');
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function extension(resource: Json | undefined, suffix: string) {
  return arr(resource?.extension).find((e) => typeof e?.url === 'string' && e.url.toLowerCase() === (EXT + suffix).toLowerCase());
}

function serviceDates(item: Json): string[] {
  const out: string[] = [];
  if (item.servicedDate) out.push(day(item.servicedDate));
  if (item.servicedPeriod?.start) out.push(day(item.servicedPeriod.start));
  if (item.servicedPeriod?.end) out.push(day(item.servicedPeriod.end));
  return out.filter(validDay);
}

/** True when the element exists on the node. `type[x]` style names are spelled out in the sheets. */
function present(node: any): boolean {
  if (node === undefined || node === null) return false;
  if (Array.isArray(node)) return node.length > 0;
  return true;
}

/**
 * Required-element walk for one resource. Extension paths are skipped because many are conditional
 * in practice (the sheets do not record the condition), and a false alarm costs more than a miss here.
 */
function cardinality(resource: Json, spec: ProfileSpec, add: (f: Finding) => void, count: () => void) {
  const known = new Set(spec.elements.map((e) => e[0]));
  for (const [path, min, max] of spec.elements) {
    if (path.includes('.extension') || path.includes('[x]') || path.includes(' ')) continue;
    const parts = path.split('.').slice(1);
    // value[x] choices are spelled out one per row in the sheets, so a single row cannot be required.
    if (parts.length === 0 || /^value[A-Z]/.test(parts[parts.length - 1])) continue;
    if (min !== '1' && max !== '1') continue;
    const walk = (node: any, i: number, trail: string) => {
      if (i === parts.length - 1) {
        const value = node?.[parts[i]];
        count();
        if (min === '1' && !present(value)) {
          add({ id: 'required', severity: 'error', where: `${trail}.${parts[i]}`,
            en: `Required element is missing (${spec.sheet}).`, ar: `عنصر إلزامي مفقود (${spec.sheet}).` });
        }
        if (max === '1' && Array.isArray(value) && value.length > 1) {
          add({ id: 'too-many', severity: 'warn', where: `${trail}.${parts[i]}`,
            en: `Only one is allowed here, found ${value.length} (${spec.sheet}).`, ar: `يُسمح هنا بعنصر واحد فقط، ووُجد ${value.length} (${spec.sheet}).` });
        }
        return;
      }
      const next = node?.[parts[i]];
      arr(next).forEach((child, n) => walk(child, i + 1, `${trail}.${parts[i]}${Array.isArray(next) ? `[${n}]` : ''}`));
    };
    // A nested requirement applies only when its parent is declared in the same sheet.
    if (parts.length > 1 && !known.has(path.split('.').slice(0, -1).join('.'))) continue;
    walk(resource, 0, resource.resourceType);
  }
}

/** Value-set check, only where every code system in the set is published in full. */
function bindings(resource: Json, profile: ProfileSpec, spec: Spec, add: (f: Finding) => void, count: () => void) {
  for (const [path, , , , binding] of profile.elements) {
    if (!binding || path.includes('.extension')) continue;
    const systems = spec.valueSets[binding];
    if (!systems?.length) continue;
    // HL7 systems such as v2-0203 are referenced in the workbook, not listed, so only NPHIES lists are checked.
    if (systems.some((u) => !u.startsWith('http://nphies.sa/'))) continue;
    const sets = systems.map((u) => spec.systems[u]);
    if (sets.some((s) => !s || s.size === 0)) continue;
    const parts = path.split('.').slice(1);
    const walk = (node: any, i: number, trail: string) => {
      if (node === undefined || node === null) return;
      if (i < parts.length) {
        const next = node[parts[i]];
        arr(next).forEach((child, n) => walk(child, i + 1, `${trail}.${parts[i]}${Array.isArray(next) ? `[${n}]` : ''}`));
        return;
      }
      const codings = typeof node === 'string' ? [{ code: node }] : arr(node.coding);
      for (const c of codings) {
        if (typeof c?.code !== 'string') continue;
        count();
        const hit = sets.some((s) => s!.has(c.code));
        if (!hit) {
          add({ id: 'binding', severity: 'warn', where: trail,
            en: `Code "${c.code}" is not in the published value set ${binding.split('/').pop()}.`,
            ar: `الرمز "${c.code}" غير موجود في مجموعة القيم المنشورة ${binding.split('/').pop()}.` });
        }
      }
    };
    walk(resource, 0, resource.resourceType);
  }
}

type Resolve = (ref: unknown) => Json | undefined;

function checkClaim(claim: Json, resolve: Resolve, spec: Spec, add: (f: Finding) => void, count: () => void) {
  const items: Json[] = arr(claim.item);
  const type = arr(claim.type?.coding)[0]?.code;
  const seqCheck = (list: Json[], name: string, rule?: string) => {
    const seen = new Set<number>();
    list.forEach((x, i) => {
      count();
      if (seen.has(x.sequence)) {
        add({ id: 'sequence-dup', severity: 'error', where: `Claim.${name}[${i}].sequence`, rule,
          en: `Sequence ${x.sequence} is used more than once in ${name}.`, ar: `يتكرر التسلسل ${x.sequence} في ${name}.` });
      }
      seen.add(x.sequence);
    });
    return seen;
  };
  const care = seqCheck(arr(claim.careTeam), 'careTeam', 'BV-00002');
  const dx = seqCheck(arr(claim.diagnosis), 'diagnosis');
  const info = seqCheck(arr(claim.supportingInfo), 'supportingInfo');

  // CR162 profile mapping: expected delivery date is a Claim.supportingInfo timingDate.
  arr(claim.supportingInfo).forEach((entry: Json, i: number) => {
    const isExpectedDeliveryDate = arr(entry.category?.coding).some((coding: Json) =>
      coding.system === CLAIM_INFO_CATEGORY && coding.code === 'expected-delivery-date');
    if (!isExpectedDeliveryDate) return;
    count();
    if (!validDay(entry.timingDate)) {
      add({ id: 'expected-delivery-date', severity: 'error', where: `Claim.supportingInfo[${i}].timingDate`,
        en: 'CR162 maps expected-delivery-date to timingDate. Provide a valid FHIR date here; this category does not use value[x].',
        ar: 'يربط CR162 فئة expected-delivery-date بالحقل timingDate. أدخل تاريخ FHIR صالحًا هنا؛ هذه الفئة لا تستخدم value[x].' });
    }
  });

  // Diagnosis: one principal, and the Saudi edition of ICD-10.
  const diagnoses: Json[] = arr(claim.diagnosis);
  const typeOf = (d: Json) => arr(d.type).flatMap((t) => arr(t.coding)).map((c) => c.code);
  const principal = diagnoses.filter((d) => typeOf(d).includes('principal')).length;
  count();
  if (diagnoses.length > 0 && principal !== 1) {
    add({ id: 'principal', severity: 'error', where: 'Claim.diagnosis', rule: 'BV-00054', reason: 'SE-1-7',
      en: `Exactly one principal diagnosis is required, found ${principal}.`, ar: `يلزم تشخيص رئيسي واحد بالضبط، ووُجد ${principal}.` });
  }
  diagnoses.forEach((d, i) => arr(d.diagnosisCodeableConcept?.coding).forEach((c: Json) => {
    count();
    const system = String(c.system || '');
    if (/icd-?10-?cm/i.test(system)) {
      add({ id: 'icd-edition', severity: 'error', where: `Claim.diagnosis[${i}]`, rule: 'BV-00941',
        en: `Diagnosis uses US ICD-10-CM (${c.code}). NPHIES expects ICD-10-AM.`, ar: `يستخدم التشخيص ICD-10-CM الأمريكي (${c.code}) بينما يعتمد نفيس ICD-10-AM.` });
    } else if (system === ICD_AM && typeof c.code === 'string' && /^[A-TV-Z]\d{2}\.?[0-9A-Z]{3,4}$/i.test(c.code) && /[A-Z]$/i.test(c.code)) {
      add({ id: 'icd-shape', severity: 'warn', where: `Claim.diagnosis[${i}]`, rule: 'BV-00941',
        en: `${c.code} is labelled ICD-10-AM but ends in a letter like a US ICD-10-CM extension. Check the edition your system emits.`,
        ar: `الرمز ${c.code} موسوم بـ ICD-10-AM لكنه ينتهي بحرف مثل امتداد ICD-10-CM الأمريكي. راجع الإصدار الذي يصدره نظامك.` });
    }
  }));

  // Care team: the practice code is what payers read as the clinician's specialty.
  arr(claim.careTeam).forEach((m: Json, i: number) => arr(m.qualification?.coding).forEach((c: Json) => {
    count();
    if (c.system === PRACTICE_CODES && !spec.practiceCodes.has(c.code)) {
      add({ id: 'practice-code', severity: 'error', where: `Claim.careTeam[${i}].qualification`, reason: 'AD-1-6',
        en: `Practice code "${c.code}" is not in the published list.`, ar: `رمز التخصص "${c.code}" غير موجود في القائمة المنشورة.` });
    }
  }));

  // Item cross-references, currency and arithmetic.
  let sum = 0;
  let sumOk = true;
  items.forEach((item, i) => {
    arr(item.careTeamSequence).forEach((s: number) => {
      count();
      if (!care.has(s)) add({ id: 'ref-careteam', severity: 'error', where: `Claim.item[${i}].careTeamSequence`, rule: 'BV-00442',
        en: `Item points to care team ${s}, which does not exist.`, ar: `يشير البند إلى فريق الرعاية ${s} وهو غير موجود.` });
    });
    arr(item.diagnosisSequence).forEach((s: number) => {
      count();
      if (!dx.has(s)) add({ id: 'ref-diagnosis', severity: 'error', where: `Claim.item[${i}].diagnosisSequence`,
        en: `Item points to diagnosis ${s}, which does not exist.`, ar: `يشير البند إلى التشخيص ${s} وهو غير موجود.` });
    });
    arr(item.informationSequence).forEach((s: number) => {
      count();
      if (!info.has(s)) add({ id: 'ref-info', severity: 'error', where: `Claim.item[${i}].informationSequence`,
        en: `Item points to supporting information ${s}, which does not exist.`, ar: `يشير البند إلى المعلومة الداعمة ${s} وهي غير موجودة.` });
    });
    const net = money(item.net);
    const unit = money(item.unitPrice);
    const qty = typeof item.quantity?.value === 'number' ? item.quantity.value : null;
    const factor = typeof item.factor === 'number' ? item.factor : 1;
    const tax = money(extension(item, 'extension-tax')?.valueMoney) ?? 0;
    if (net === null) sumOk = false;
    else sum += net;
    if (item.net?.currency && item.net.currency !== 'SAR') {
      add({ id: 'currency', severity: 'error', where: `Claim.item[${i}].net`, rule: 'BV-00093', en: 'Item net must be in SAR.', ar: 'يجب أن يكون صافي البند بالريال السعودي.' });
    }
    if (net !== null && unit !== null && qty !== null) {
      count();
      const expected = qty * unit * factor + tax;
      if (!near(expected, net)) {
        add({ id: 'item-net', severity: 'error', where: `Claim.item[${i}].net`, rule: 'BV-00251', reason: 'BE-1-6',
          en: `Item net is ${net}, but ((quantity × unit price) × factor) + tax gives ${+expected.toFixed(2)}.`,
          ar: `صافي البند ${net}، لكن ((الكمية × سعر الوحدة) × المعامل) + الضريبة تساوي ${+expected.toFixed(2)}.` });
      }
    }
  });
  const total = money(claim.total);
  if (total !== null && sumOk && items.length) {
    count();
    if (!near(sum, total)) {
      add({ id: 'total', severity: 'error', where: 'Claim.total', rule: 'BV-00059', reason: 'BE-1-6',
        en: `Claim total is ${total}, but item nets add up to ${+sum.toFixed(2)}.`, ar: `إجمالي المطالبة ${total}، لكن مجموع صافي البنود ${+sum.toFixed(2)}.` });
    }
  }

  // Dates, including the Hijri-in-a-Gregorian-field slip.
  const patient = resolve(claim.patient?.reference);
  const coverage = resolve(arr(claim.insurance)[0]?.coverage?.reference);
  const encRef = extension(claim, 'extension-encounter')?.valueReference?.reference;
  const encounter = resolve(encRef);
  const dates = items.flatMap(serviceDates).sort();
  const firstService = dates[0];
  const birth = day(patient?.birthDate);
  if (patient && patient.active !== true) {
    add({ id: 'patient-active', severity: 'warn', where: 'Patient.active', rule: 'BV-00339',
      en: 'The server validation workbook says Patient.active must be true (Jan_hotfix). Check the target environment’s activation date.',
      ar: 'ينص ملف قواعد التحقق على أن Patient.active يجب أن تكون true (Jan_hotfix). تحقّق من تاريخ التفعيل في بيئة الإرسال.' });
  }
  if (validDay(birth)) {
    count();
    if (Number(birth.slice(0, 4)) < 1500) {
      add({ id: 'hijri', severity: 'error', where: 'Patient.birthDate', reason: 'AD-2-1',
        en: `Date of birth ${birth} looks like a Hijri date in a Gregorian field.`, ar: `يبدو تاريخ الميلاد ${birth} هجريًا في حقل ميلادي.` });
    } else if (firstService && birth > firstService) {
      add({ id: 'birth-after-service', severity: 'error', where: 'Patient.birthDate', reason: 'AD-2-1',
        en: `Date of birth ${birth} is after the first service date ${firstService}.`, ar: `تاريخ الميلاد ${birth} بعد أول تاريخ خدمة ${firstService}.` });
    }
  }
  const death = day(patient?.deceasedDateTime);
  if (validDay(death) && firstService && death < firstService) {
    add({ id: 'death-before-service', severity: 'warn', where: 'Patient.deceasedDateTime', reason: 'AD-2-2',
      en: `Date of death ${death} is before the first service date ${firstService}.`, ar: `تاريخ الوفاة ${death} قبل أول تاريخ خدمة ${firstService}.` });
  }
  const covStart = day(coverage?.period?.start);
  if (validDay(covStart) && firstService && covStart > firstService) {
    add({ id: 'coverage-start', severity: 'warn', where: 'Coverage.period.start', reason: 'AD-2-3',
      en: `Coverage starts ${covStart}, after the first service date ${firstService}.`, ar: `تبدأ التغطية في ${covStart} بعد أول تاريخ خدمة ${firstService}.` });
  }
  const start = day(encounter?.period?.start);
  const end = day(encounter?.period?.end);
  if (validDay(start) && validDay(end) && end < start) {
    add({ id: 'encounter-order', severity: 'error', where: 'Encounter.period',
      en: `Encounter ends ${end}, before it starts ${start}.`, ar: `تنتهي الزيارة في ${end} قبل بدايتها في ${start}.` });
  }

  // Practitioner licence on each care team member.
  arr(claim.careTeam).forEach((m: Json, i: number) => {
    const person = resolve(m.provider?.reference);
    if (!person) return;
    count();
    if (!arr(person.identifier).some((x: Json) => x.system === PRACTITIONER_LICENSE && x.value)) {
      add({ id: 'practitioner-license', severity: 'error', where: `careTeam[${i}] → Practitioner.identifier`, rule: 'BV-00199', reason: 'AD-1-8',
        en: 'Practitioner has no licence identifier in the NPHIES practitioner-license system.', ar: 'لا يحمل الممارس معرّف ترخيص ضمن نظام practitioner-license في نفيس.' });
    }
  });

  // DRG (Provider Portal Manual 5.12 and the DRG validation rules).
  const klass = encounter?.class?.code;
  const admitted = type === 'institutional' && (klass === 'IMP' || klass === 'SS');
  const drgAt = items.flatMap((it, i) => (arr(it.productOrService?.coding).some((c: Json) => isDrg(c.system)) ? [i] : []));
  if (drgAt.length) {
    count();
    if (encounter && !admitted) {
      add({ id: 'drg-setting', severity: 'error', where: 'Claim.item.productOrService', rule: 'BV-01181',
        en: 'A DRG code is used outside an inpatient or day-case institutional encounter.', ar: 'استُخدم رمز DRG خارج زيارة تنويم أو يوم واحد مؤسسية.' });
    }
    if (drgAt.length > 1) {
      add({ id: 'drg-one', severity: 'error', where: 'Claim.item', rule: 'BV-01180', en: `Only one DRG code is allowed, found ${drgAt.length}.`, ar: `يُسمح برمز DRG واحد فقط، ووُجد ${drgAt.length}.` });
    }
    if (drgAt[0] !== 0) {
      add({ id: 'drg-first', severity: 'error', where: `Claim.item[${drgAt[0]}]`, rule: 'BV-01180', en: 'The DRG code must be on the first item.', ar: 'يجب أن يكون رمز DRG في البند الأول.' });
    }
    const drg = items[drgAt[0]];
    if (typeof drg.quantity?.value === 'number' && drg.quantity.value !== 1) {
      add({ id: 'drg-quantity', severity: 'error', where: `Claim.item[${drgAt[0]}].quantity`, rule: 'BV-01187', en: 'DRG quantity must be 1.', ar: 'يجب أن تكون كمية DRG مساوية لـ1.' });
    }
    if (arr(drg.detail).some((d: Json) => arr(d.subDetail).length)) {
      add({ id: 'drg-subdetail', severity: 'error', where: `Claim.item[${drgAt[0]}].detail`, rule: 'BV-01214', en: 'Sub-details are not allowed under a DRG item.', ar: 'لا يُسمح بالتفاصيل الفرعية تحت بند DRG.' });
    }
    if (extension(drg, 'extension-package')?.valueBoolean === true) {
      add({ id: 'drg-package', severity: 'error', where: `Claim.item[${drgAt[0]}]`, rule: 'BV-01198', en: 'The package flag must not be used with DRG.', ar: 'لا يُستخدم مؤشر الحزمة مع DRG.' });
    }
    const drgNet = money(drg.net);
    if (drgNet !== null && drgNet > 0 && arr(drg.detail).some((d: Json) => (money(d.net) ?? 0) !== 0)) {
      add({ id: 'drg-actual-detail', severity: 'error', where: `Claim.item[${drgAt[0]}].detail.net`, rule: 'BV-01190',
        en: 'In actual billing the DRG net is above zero, so add-on details must have zero net.', ar: 'في الفوترة الفعلية يكون صافي DRG أكبر من صفر، لذا يجب أن يكون صافي الخدمات الإضافية صفرًا.' });
    }
    if (drgNet === 0 && !items.some((it, i) => !drgAt.includes(i) && (money(it.net) ?? 0) > 0)) {
      add({ id: 'drg-shadow-extra', severity: 'error', where: 'Claim.item', rule: 'BV-01192',
        en: 'In shadow billing the DRG net is zero, so an extra non-DRG item with a net above zero is needed.', ar: 'في الفوترة الموازية يكون صافي DRG صفرًا، لذا يلزم بند إضافي غير DRG بصافي أكبر من صفر.' });
    }
  } else if (admitted) {
    add({ id: 'drg-absent', severity: 'info', where: 'Claim.item', rule: 'BV-01180',
      en: 'Admitted-care request with no DRG code. This fails if your facility is in actual billing or has shadow enforcement on.',
      ar: 'طلب تنويم بلا رمز DRG، ويفشل إذا كانت منشأتك في الفوترة الفعلية أو كان الإلزام مفعّلًا في الفوترة الموازية.' });
  }
}

export function checkBundle(input: string | Json, spec: Spec): CheckResult {
  const findings: Finding[] = [];
  let checked = 0;
  const add = (f: Finding) => { findings.push(f); };
  const count = () => { checked += 1; };
  const done = (extra: Partial<CheckResult> = {}): CheckResult => ({
    ok: !findings.some((f) => f.severity === 'error'), resources: 0, checked, findings, ...extra,
  });

  let bundle: Json;
  if (typeof input === 'string') {
    if (input.length > MAX_BYTES) {
      add({ id: 'size', severity: 'error', where: 'Message', rule: 'BV-00076', en: 'The message is larger than the 10 MB limit.', ar: 'حجم الرسالة أكبر من الحد البالغ 10 ميجابايت.' });
    }
    if (/\{\{[^}]+\}\}/.test(input)) {
      add({ id: 'placeholder', severity: 'error', where: 'Message', en: 'The message still contains a template placeholder such as {{name}}.', ar: 'ما زالت الرسالة تحتوي على عنصر قالب مثل {{name}}.' });
    }
    try {
      bundle = JSON.parse(input.replace(/^﻿/, ''));
    } catch {
      add({ id: 'json', severity: 'error', where: 'Message', en: 'This is not valid JSON.', ar: 'هذا النص ليس JSON صالحًا.' });
      return done();
    }
  } else bundle = input;

  if (bundle?.resourceType !== 'Bundle') {
    add({ id: 'bundle', severity: 'error', where: 'Bundle', en: 'NPHIES messages are FHIR Bundles, and this is not one.', ar: 'رسائل نفيس عبارة عن FHIR Bundle، وهذا النص ليس كذلك.' });
    return done();
  }
  count();
  if (bundle.type !== 'message') {
    add({ id: 'bundle-type', severity: 'error', where: 'Bundle.type', en: 'Bundle.type must be "message".', ar: 'يجب أن تكون قيمة Bundle.type هي "message".' });
  }
  const entries: Json[] = arr(bundle.entry);
  const byUrl = new Map<string, Json>();
  entries.forEach((e) => { if (e?.fullUrl && e.resource) byUrl.set(e.fullUrl, e.resource); });
  // A reference is an exact fullUrl match, or a relative Type/id that ends a fullUrl.
  const resolve: Resolve = (ref) => {
    if (typeof ref !== 'string' || !ref) return undefined;
    const exact = byUrl.get(ref);
    if (exact) return exact;
    for (const [url, r] of byUrl) if (url.endsWith('/' + ref)) return r;
    return undefined;
  };
  const header = entries[0]?.resource;
  count();
  if (header?.resourceType !== 'MessageHeader') {
    add({ id: 'header-first', severity: 'error', where: 'Bundle.entry[0]', en: 'The first entry must be the MessageHeader.', ar: 'يجب أن يكون العنصر الأول هو MessageHeader.' });
  }
  const event = header?.eventCoding?.code;
  const focusRef = arr(header?.focus)[0]?.reference;
  const focus = resolve(focusRef);
  if (focusRef) {
    count();
    if (!focus) add({ id: 'focus', severity: 'error', where: 'MessageHeader.focus', en: `Focus ${focusRef} does not match any entry in the bundle.`, ar: `المرجع ${focusRef} لا يطابق أي عنصر في الحزمة.` });
  }

  let focusProfile: string | undefined;
  const profileOf = (r: Json) => {
    const m = String(arr(r?.meta?.profile)[0] ?? '').match(NPHIES_PROFILE);
    return m ? m[1] : undefined;
  };
  // References from the focus resource must resolve inside the bundle.
  if (focus?.resourceType === 'Claim') {
    for (const [name, ref] of [['Claim.patient', focus.patient?.reference], ['Claim.provider', focus.provider?.reference], ['Claim.insurer', focus.insurer?.reference]] as const) {
      if (!ref) continue;
      count();
      if (!resolve(ref)) add({ id: 'reference', severity: 'error', where: name, en: `Reference ${ref} does not match any entry in the bundle.`, ar: `المرجع ${ref} لا يطابق أي عنصر في الحزمة.` });
    }
  }
  entries.forEach((e) => {
    const r = e?.resource;
    if (!r) return;
    const slug = profileOf(r);
    if (r === focus) focusProfile = slug;
    const profile = slug && CHECKED_PROFILES.has(slug) ? spec.profiles[slug] : undefined;
    if (!profile) return;
    cardinality(r, profile, add, count);
    bindings(r, profile, spec, add, count);
  });
  if (focus?.resourceType === 'Claim') checkClaim(focus, resolve, spec, add, count);

  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = `${f.id}|${f.where}|${f.en}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  findings.length = 0;
  findings.push(...unique);
  return done({ event, focus: focus?.resourceType, profile: focusProfile, resources: entries.length });
}

/** Turn the published JSON tables into the lookup structure the checker uses. */
export function makeSpec(profiles: { items: Record<string, ProfileSpec> }, systems: { valueSets: Record<string, string[]>; items: { url: string; codes: Record<string, string> | null }[] }, practice: { items: { code: string }[] }): Spec {
  const map: Record<string, Set<string> | null> = {};
  for (const s of systems.items) map[s.url] = s.codes ? new Set(Object.keys(s.codes)) : null;
  return { profiles: profiles.items, systems: map, valueSets: systems.valueSets, practiceCodes: new Set(practice.items.map((p) => p.code)) };
}
