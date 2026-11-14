// Reception schedule rules for the synthetic-data clinic pilot (/bpr/clinic).
//
// Pure logic only: no DOM, no network, no storage. Dates are YYYY-MM-DD and times HH:mm in Riyadh time (UTC+03:00,
// no daylight saving). The working week is Sunday to Thursday; Friday and Saturday are the weekend.
// The UI keeps the schedule settings in this browser's localStorage next to the visits.
import type { Visit, VisitStatus } from './clinicFlow.ts';

export interface Schedule {
  open: string; // HH:mm, first slot starts here
  close: string; // HH:mm, the last slot must end by here
  slotMinutes: number;
}

export const SLOT_LENGTHS = [15, 20, 30, 45, 60];
export const DEFAULT_SCHEDULE: Schedule = { open: '09:00', close: '21:00', slotMinutes: 30 };
const MAX_SLOTS = 64;
const DAY_MS = 86400000;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toMinutes(time: string): number {
  const m = HHMM.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
function fromMinutes(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Why a schedule cannot be used, or '' when it can. */
export function scheduleProblem(s: Schedule): '' | 'time' | 'order' | 'length' | 'count' {
  const open = toMinutes(s.open);
  const close = toMinutes(s.close);
  if (Number.isNaN(open) || Number.isNaN(close)) return 'time';
  if (close <= open) return 'order';
  if (!SLOT_LENGTHS.includes(s.slotMinutes)) return 'length';
  const count = slotTimes(s).length;
  return count < 1 || count > MAX_SLOTS ? 'count' : '';
}

/** Whatever was stored, as a usable schedule: anything damaged or implausible falls back to the default. */
export function normalizeSchedule(raw: unknown): Schedule {
  if (!raw || typeof raw !== 'object') return DEFAULT_SCHEDULE;
  const r = raw as Record<string, unknown>;
  const candidate: Schedule = {
    open: typeof r.open === 'string' ? r.open : '',
    close: typeof r.close === 'string' ? r.close : '',
    slotMinutes: typeof r.slotMinutes === 'number' ? r.slotMinutes : NaN,
  };
  return scheduleProblem(candidate) === '' ? candidate : DEFAULT_SCHEDULE;
}

export function parseSchedule(text: string | null): Schedule {
  if (!text) return DEFAULT_SCHEDULE;
  try { return normalizeSchedule(JSON.parse(text)); } catch { return DEFAULT_SCHEDULE; }
}

/** Slot start times for one working day: from open while a whole slot still fits before close. */
export function slotTimes(s: Schedule): string[] {
  const open = toMinutes(s.open);
  const close = toMinutes(s.close);
  if (Number.isNaN(open) || Number.isNaN(close) || !(s.slotMinutes > 0)) return [];
  const out: string[] = [];
  for (let m = open; m + s.slotMinutes <= close && out.length <= MAX_SLOTS; m += s.slotMinutes) out.push(fromMinutes(m));
  return out;
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export function isIsoDate(date: string): boolean {
  if (!ISO_DATE.test(date)) return false;
  const t = Date.parse(`${date}T12:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === date;
}

export function addDays(date: string, days: number): string {
  if (!isIsoDate(date)) return '';
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Sunday to Thursday. Computed from the calendar date alone, so the browser's own time zone cannot change the answer. */
export function isWorkday(date: string): boolean {
  if (!isIsoDate(date)) return false;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 Sunday … 6 Saturday
  return weekday !== 5 && weekday !== 6;
}

/** The first working day on or after `date` plus `offsetDays`. */
export function nextWorkday(date: string, offsetDays = 0): string {
  let d = addDays(date, offsetDays);
  for (let i = 0; i < 8 && d; i++) {
    if (isWorkday(d)) return d;
    d = addDays(d, 1);
  }
  return d;
}

/** Today's date and the time of day in Riyadh. */
export function riyadhNow(now: Date): { date: string; time: string } {
  const iso = new Date(now.getTime() + 3 * 3600000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

// A slot stays occupied by a visit that is still open or was completed in it; no-shows and cancellations free it.
const OCCUPYING: VisitStatus[] = ['booked', 'checked_in', 'in_consult', 'completed'];

/** True when another visit already holds this service's slot. Walk-ins have no time and never hold one. */
export function isSlotTaken(visits: Visit[], date: string, service: string, time: string): boolean {
  return visits.some((v) => v.date === date && v.service === service && v.time === time && OCCUPYING.includes(v.status));
}

export type SlotState = 'free' | 'taken';

/**
 * The slots to show for one day and service. Empty on a weekend, on an invalid or past date, and for times that
 * have already started today. Taken slots are kept so the front desk can see the day is busy rather than empty.
 */
export function slotStates(input: { date: string; service: string; visits: Visit[]; schedule: Schedule; now: Date }): { time: string; state: SlotState }[] {
  const { date, service, visits, schedule, now } = input;
  if (!isWorkday(date)) return [];
  const today = riyadhNow(now);
  if (date < today.date) return [];
  return slotTimes(schedule)
    .filter((time) => date > today.date || time > today.time)
    .map((time) => ({ time, state: isSlotTaken(visits, date, service, time) ? 'taken' : 'free' }));
}

/**
 * Where to put a follow-up visit: the first working day on or after today + `days` with a free slot,
 * keeping the original time of day when it is free. Looks at most ten working days ahead.
 */
export function planFollowUp(from: Pick<Visit, 'service' | 'time'>, days: number, visits: Visit[], schedule: Schedule, now: Date): { date: string; time: string } | null {
  let date = nextWorkday(riyadhNow(now).date, days);
  for (let i = 0; i < 10 && date; i++) {
    const free = slotStates({ date, service: from.service, visits, schedule, now }).filter((s) => s.state === 'free');
    if (free.length) return { date, time: free.some((s) => s.time === from.time) ? from.time : free[0].time };
    date = nextWorkday(date, 1);
  }
  return null;
}
