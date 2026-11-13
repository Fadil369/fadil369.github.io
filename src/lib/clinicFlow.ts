// Reception-to-doctor visit flow for the synthetic-data clinic pilot (/bpr/clinic).
//
// Pure logic only: no DOM, no network, no storage. The UI keeps visits in this browser's localStorage.
// Nothing here talks to OpenEMR, NPHIES or any model; the Encounter export is a FHIR-shaped, synthetic-tagged
// object meant for a future, separately approved bridge, not a clinical record.

export type VisitStatus = 'booked' | 'checked_in' | 'in_consult' | 'completed' | 'no_show' | 'cancelled';
export type Priority = 'routine' | 'urgent';

export interface Vitals {
  temperatureC?: number;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  spo2?: number;
}

export interface VisitNote {
  chiefComplaint: string;
  assessment: string;
  plan: string;
  icd10?: string;
}

export interface Visit {
  id: string;
  reference: string;
  patient: string;
  service: string;
  date: string; // YYYY-MM-DD, Asia/Riyadh
  time: string; // HH:mm, '' for walk-ins
  status: VisitStatus;
  priority: Priority;
  needsStaff?: boolean;
  createdAt: string;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  vitals?: Vitals;
  note?: VisitNote;
  history: { status: VisitStatus; at: string }[];
}

export const STATUSES: VisitStatus[] = ['booked', 'checked_in', 'in_consult', 'completed', 'no_show', 'cancelled'];

const NEXT: Record<VisitStatus, VisitStatus[]> = {
  booked: ['checked_in', 'no_show', 'cancelled'],
  checked_in: ['in_consult', 'cancelled'],
  in_consult: ['completed', 'checked_in'],
  completed: [],
  no_show: ['checked_in'],
  cancelled: [],
};

export class FlowError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}

export function canMove(from: VisitStatus, to: VisitStatus): boolean {
  return NEXT[from].includes(to);
}

// "Patient" or the Arabic word for patient (\u0645\u0631\u064a\u0636), then a space and three digits (Latin or Arabic-Indic).
const SYNTHETIC_LABEL = /^(?:Patient|\u0645\u0631\u064a\u0636) [0-9\u0660-\u0669]{3}$/;

/** The synthetic patient label the whole pilot enforces, e.g. "Patient 007" or "مريض ٠٠٧". */
export function isSyntheticLabel(value: string): boolean {
  return SYNTHETIC_LABEL.test(value);
}

function asciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Returns the kind of real-world identifier the text appears to contain, or '' if none.
 * This is a tripwire for a synthetic-data pilot, not a de-identification tool: it only catches obvious slips.
 */
export function identifierProblem(text: string): '' | 'national_id' | 'phone' | 'email' {
  const t = asciiDigits(text);
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(t)) return 'email';
  const compact = t.replace(/[\s\-().]/g, '');
  if (/(?:\+|00)?966\d{8,9}/.test(compact) || /(?<!\d)05\d{8}(?!\d)/.test(compact)) return 'phone';
  if (/(?<!\d)[12]\d{9}(?!\d)/.test(compact)) return 'national_id';
  return '';
}

const RANGES: Record<keyof Vitals, [number, number]> = {
  temperatureC: [30, 45],
  heartRate: [20, 250],
  systolic: [50, 260],
  diastolic: [30, 160],
  spo2: [50, 100],
};

/** Keys of vitals that are out of a plausible range, plus 'bp' when systolic does not exceed diastolic. */
export function vitalsProblems(v: Vitals): string[] {
  const bad: string[] = [];
  for (const key of Object.keys(RANGES) as (keyof Vitals)[]) {
    const value = v[key];
    if (value === undefined) continue;
    const [lo, hi] = RANGES[key];
    if (!Number.isFinite(value) || value < lo || value > hi) bad.push(key);
  }
  if (v.systolic !== undefined && v.diastolic !== undefined && v.systolic <= v.diastolic && !bad.includes('systolic') && !bad.includes('diastolic')) bad.push('bp');
  return bad;
}

export function icd10Valid(code: string): boolean {
  return /^[A-TV-Z][0-9][0-9AB](?:\.[0-9A-TV-Z]{1,4})?$/.test(code);
}

/** Problems that block signing a note; empty array means it can be completed. */
export function noteProblems(note: Partial<VisitNote> | undefined): string[] {
  const bad: string[] = [];
  if (!note?.chiefComplaint?.trim()) bad.push('chiefComplaint');
  if (!note?.assessment?.trim()) bad.push('assessment');
  if (note?.icd10 && !icd10Valid(note.icd10.trim().toUpperCase())) bad.push('icd10');
  for (const field of ['chiefComplaint', 'assessment', 'plan'] as const) {
    if (note?.[field] && identifierProblem(note[field] as string)) bad.push(`${field}:identifier`);
  }
  return bad;
}

export function newVisitId(now: Date, random: () => number = Math.random): string {
  return `DEMO-${now.getTime().toString(36).toUpperCase()}${Math.floor(random() * 1296).toString(36).toUpperCase().padStart(2, '0')}`;
}

export function createWalkIn(
  input: { patient: string; service: string; priority?: Priority },
  now: Date,
  today: string,
  random: () => number = Math.random,
): Visit {
  if (!isSyntheticLabel(input.patient)) throw new FlowError('patient_label', 'Use a synthetic label such as "Patient 007".');
  const at = now.toISOString();
  const id = newVisitId(now, random);
  return {
    id, reference: id, patient: input.patient, service: input.service, date: today, time: '',
    status: 'checked_in', priority: input.priority ?? 'routine', createdAt: at, checkedInAt: at,
    history: [{ status: 'checked_in', at }],
  };
}

export function createBooking(input: { reference: string; patient: string; service: string; date: string; time: string }, now: Date): Visit {
  if (!isSyntheticLabel(input.patient)) throw new FlowError('patient_label', 'Use a synthetic label such as "Patient 007".');
  const at = now.toISOString();
  return {
    id: input.reference, reference: input.reference, patient: input.patient, service: input.service, date: input.date, time: input.time,
    status: 'booked', priority: 'routine', createdAt: at, history: [{ status: 'booked', at }],
  };
}

/** Move a visit to a new status, enforcing the lifecycle and the sign-off rule. Returns a new object. */
export function advance(visit: Visit, to: VisitStatus, now: Date, today: string): Visit {
  if (!canMove(visit.status, to)) throw new FlowError('bad_transition', `A ${visit.status} visit cannot become ${to}.`);
  if (to === 'checked_in' && visit.status === 'booked' && visit.date > today) throw new FlowError('too_early', 'This booking is for a later day.');
  if (to === 'completed') {
    const bad = noteProblems(visit.note);
    if (bad.length) throw new FlowError('note_incomplete', `The note is not ready to sign: ${bad.join(', ')}.`);
  }
  const at = now.toISOString();
  const next: Visit = { ...visit, status: to, history: [...visit.history, { status: to, at }] };
  if (to === 'checked_in') { next.checkedInAt = visit.checkedInAt ?? at; delete next.startedAt; }
  if (to === 'in_consult') next.startedAt = at;
  if (to === 'completed') next.completedAt = at;
  return next;
}

export function setPriority(visit: Visit, priority: Priority): Visit {
  return { ...visit, priority };
}

export function saveEncounter(visit: Visit, vitals: Vitals, note: VisitNote): Visit {
  const bad = vitalsProblems(vitals);
  if (bad.length) throw new FlowError('vitals', `Check these vitals: ${bad.join(', ')}.`);
  for (const field of ['chiefComplaint', 'assessment', 'plan'] as const) {
    if (identifierProblem(note[field] ?? '')) throw new FlowError('identifier', 'The note looks like it contains a real identifier. Use synthetic text only.');
  }
  return { ...visit, vitals, note };
}

/** Waiting patients: urgent first, then longest-waiting first. */
export function queueOrder(visits: Visit[]): Visit[] {
  return visits
    .filter((v) => v.status === 'checked_in')
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'urgent' ? -1 : 1) || (a.checkedInAt ?? '').localeCompare(b.checkedInAt ?? ''));
}

export function waitMinutes(visit: Visit, now: Date): number {
  if (!visit.checkedInAt) return 0;
  const end = visit.startedAt && visit.status !== 'checked_in' ? new Date(visit.startedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(visit.checkedInAt).getTime()) / 60000));
}

export function summarize(visits: Visit[], today: string, now: Date) {
  const todays = visits.filter((v) => v.date === today);
  const waits = todays.filter((v) => v.startedAt && v.checkedInAt).map((v) => waitMinutes(v, now));
  return {
    bookedToday: todays.filter((v) => v.status === 'booked').length,
    waiting: visits.filter((v) => v.status === 'checked_in').length,
    inConsult: visits.filter((v) => v.status === 'in_consult').length,
    completedToday: todays.filter((v) => v.status === 'completed').length,
    averageWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
  };
}

/** Accepts both new visits and the older request shape ({status: pending | needs_staff | completed}). */
export function normalizeVisit(raw: unknown): Visit | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : typeof r.reference === 'string' ? r.reference : '';
  const patient = typeof r.patient === 'string' ? r.patient : '';
  if (!id || !patient) return null;
  const legacy: Record<string, VisitStatus> = { pending: 'booked', needs_staff: 'booked', completed: 'completed' };
  const status = (STATUSES as string[]).includes(String(r.status)) ? (r.status as VisitStatus) : legacy[String(r.status)] ?? 'booked';
  const createdAt = typeof r.createdAt === 'string' ? r.createdAt : new Date(0).toISOString();
  const history = Array.isArray(r.history) ? (r.history as Visit['history']) : [{ status, at: createdAt }];
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string) : undefined);
  return {
    id, reference: str('reference') ?? id, patient, service: str('service') ?? 'general', date: /^\d{4}-\d{2}-\d{2}$/.test(str('date') ?? '') ? (str('date') as string) : '', time: str('time') ?? '',
    status, priority: r.priority === 'urgent' ? 'urgent' : 'routine', needsStaff: r.status === 'needs_staff' || r.needsStaff === true || undefined,
    createdAt, checkedInAt: str('checkedInAt'), startedAt: str('startedAt'), completedAt: str('completedAt'),
    vitals: r.vitals && typeof r.vitals === 'object' ? (r.vitals as Vitals) : undefined,
    note: r.note && typeof r.note === 'object' ? (r.note as VisitNote) : undefined,
    history,
  };
}

export function parseVisits(raw: string | null): Visit[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.map(normalizeVisit).filter((v): v is Visit => v !== null) : [];
  } catch { return []; }
}

const ENCOUNTER_STATUS: Record<VisitStatus, string> = {
  booked: 'planned', checked_in: 'arrived', in_consult: 'in-progress', completed: 'finished', no_show: 'cancelled', cancelled: 'cancelled',
};

/** Minimal FHIR R4 Encounter, tagged synthetic. For a future approved bridge; not a clinical record. */
export function toFhirEncounter(v: Visit) {
  const start = v.startedAt ?? v.checkedInAt;
  return {
    resourceType: 'Encounter',
    id: v.id.toLowerCase(),
    meta: { tag: [{ system: 'https://brainsait.de/CodeSystem/data-origin', code: 'synthetic', display: 'Synthetic demo data' }] },
    status: ENCOUNTER_STATUS[v.status],
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    subject: { display: v.patient },
    ...(start ? { period: { start, ...(v.completedAt ? { end: v.completedAt } : {}) } } : {}),
    ...(v.note?.chiefComplaint ? { reasonCode: [{ text: v.note.chiefComplaint }] } : {}),
  };
}
