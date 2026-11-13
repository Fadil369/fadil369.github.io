import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  advance, canMove, createBooking, createWalkIn, FlowError, icd10Valid, identifierProblem, isSyntheticLabel, normalizeVisit, noteProblems,
  parseVisits, queueOrder, saveEncounter, setPriority, summarize, toFhirEncounter, vitalsProblems, waitMinutes, type Visit,
} from './clinicFlow.ts';

const T0 = new Date('2026-11-13T09:00:00Z');
const min = (n: number) => new Date(T0.getTime() + n * 60000);
const TODAY = '2026-11-13';
const booked = (over: Partial<Visit> = {}): Visit => ({
  id: 'DEMO-1', reference: 'DEMO-1', patient: 'Patient 001', service: 'general', date: TODAY, time: '10:00', status: 'booked',
  priority: 'routine', createdAt: T0.toISOString(), history: [{ status: 'booked', at: T0.toISOString() }], ...over,
});
const note = { chiefComplaint: 'Synthetic cough', assessment: 'Synthetic URTI', plan: 'Fluids', icd10: 'J06.9' };
const throwsCode = (fn: () => unknown, code: string) => assert.throws(fn, (e: unknown) => e instanceof FlowError && e.code === code);

test('synthetic labels: only "Patient 007" / "مريض ٠٠٧" style', () => {
  for (const ok of ['Patient 007', 'مريض 007', 'مريض ٠٠٧']) assert.equal(isSyntheticLabel(ok), true, ok);
  for (const bad of ['Ahmed Ali', 'Patient 7', 'Patient 0007', 'patient 007', '']) assert.equal(isSyntheticLabel(bad), false, bad);
});

test('identifier tripwire catches national IDs, phones and emails, in Arabic digits too', () => {
  assert.equal(identifierProblem('ID 1023456789 seen'), 'national_id');
  assert.equal(identifierProblem('هوية ١٠٢٣٤٥٦٧٨٩'), 'national_id');
  assert.equal(identifierProblem('call 0551234567'), 'phone');
  assert.equal(identifierProblem('+966 55 123 4567'), 'phone');
  assert.equal(identifierProblem('a.b@example.com'), 'email');
  assert.equal(identifierProblem('BP 120/80, HR 72, temp 37.2, 3 days of cough'), '');
  assert.equal(identifierProblem('Patient 007 reports 12 episodes'), '');
});

test('vitals ranges and blood-pressure ordering', () => {
  assert.deepEqual(vitalsProblems({ temperatureC: 37, heartRate: 70, systolic: 120, diastolic: 80, spo2: 98 }), []);
  assert.deepEqual(vitalsProblems({ temperatureC: 12, spo2: 101 }).sort(), ['spo2', 'temperatureC']);
  assert.deepEqual(vitalsProblems({ systolic: 80, diastolic: 90 }), ['bp']);
  assert.deepEqual(vitalsProblems({ heartRate: NaN }), ['heartRate']);
});

test('ICD-10 format', () => {
  for (const ok of ['J06.9', 'E11.65', 'A00', 'S72.001A']) assert.equal(icd10Valid(ok), true, ok);
  for (const bad of ['U07.1x', '123', 'j06.9', 'J6.9', '']) assert.equal(icd10Valid(bad), false, bad);
});

test('lifecycle: booked -> checked_in -> in_consult -> completed, with timestamps and history', () => {
  let v = booked();
  v = advance(v, 'checked_in', min(5), TODAY);
  assert.equal(v.checkedInAt, min(5).toISOString());
  v = advance(v, 'in_consult', min(20), TODAY);
  assert.equal(v.startedAt, min(20).toISOString());
  assert.equal(waitMinutes(v, min(99)), 15);
  v = saveEncounter(v, { heartRate: 72 }, note);
  v = advance(v, 'completed', min(40), TODAY);
  assert.equal(v.completedAt, min(40).toISOString());
  assert.deepEqual(v.history.map((h) => h.status), ['booked', 'checked_in', 'in_consult', 'completed']);
});

test('invalid transitions are refused and do not mutate', () => {
  const v = booked();
  throwsCode(() => advance(v, 'completed', T0, TODAY), 'bad_transition');
  throwsCode(() => advance(v, 'in_consult', T0, TODAY), 'bad_transition');
  assert.equal(v.status, 'booked');
  assert.equal(canMove('completed', 'checked_in'), false);
  assert.equal(canMove('no_show', 'checked_in'), true);
});

test('a future booking cannot be checked in early', () => {
  throwsCode(() => advance(booked({ date: '2026-11-20' }), 'checked_in', T0, TODAY), 'too_early');
});

test('completing needs a signed-off note without real identifiers', () => {
  const inConsult = booked({ status: 'in_consult' });
  throwsCode(() => advance(inConsult, 'completed', T0, TODAY), 'note_incomplete');
  throwsCode(() => advance({ ...inConsult, note: { ...note, icd10: 'nope' } }, 'completed', T0, TODAY), 'note_incomplete');
  assert.deepEqual(noteProblems({ ...note, plan: 'call 0551234567' }), ['plan:identifier']);
  throwsCode(() => saveEncounter(inConsult, {}, { ...note, assessment: 'patient 1023456789' }), 'identifier');
  throwsCode(() => saveEncounter(inConsult, { spo2: 140 }, note), 'vitals');
});

test('returning an in-consult patient to the queue clears the start time but keeps the original check-in', () => {
  let v = advance(booked(), 'checked_in', min(1), TODAY);
  v = advance(v, 'in_consult', min(10), TODAY);
  v = advance(v, 'checked_in', min(12), TODAY);
  assert.equal(v.startedAt, undefined);
  assert.equal(v.checkedInAt, min(1).toISOString());
});

test('queue: urgent first, then longest wait; only checked-in patients', () => {
  const a = booked({ id: 'A', status: 'checked_in', checkedInAt: min(1).toISOString() });
  const b = booked({ id: 'B', status: 'checked_in', checkedInAt: min(2).toISOString() });
  const c = setPriority(booked({ id: 'C', status: 'checked_in', checkedInAt: min(9).toISOString() }), 'urgent');
  const d = booked({ id: 'D' });
  assert.deepEqual(queueOrder([b, d, c, a]).map((v) => v.id), ['C', 'A', 'B']);
});

test('walk-in requires a synthetic label and starts checked in', () => {
  throwsCode(() => createWalkIn({ patient: 'Ahmed Ali', service: 'general' }, T0, TODAY), 'patient_label');
  const w = createWalkIn({ patient: 'Patient 042', service: 'dental', priority: 'urgent' }, T0, TODAY, () => 0.5);
  assert.equal(w.status, 'checked_in');
  assert.equal(w.priority, 'urgent');
  assert.match(w.id, /^DEMO-[0-9A-Z]+$/);
});

test('summary counts and average wait', () => {
  const done = booked({ id: 'X', status: 'completed', checkedInAt: min(0).toISOString(), startedAt: min(10).toISOString() });
  const done2 = booked({ id: 'Y', status: 'completed', checkedInAt: min(0).toISOString(), startedAt: min(20).toISOString() });
  const s = summarize([booked(), done, done2, booked({ id: 'W', status: 'checked_in' }), booked({ id: 'Z', date: '2026-11-14' })], TODAY, min(60));
  assert.deepEqual(s, { bookedToday: 1, waiting: 1, inConsult: 0, completedToday: 2, averageWait: 15 });
  assert.equal(summarize([], TODAY, T0).averageWait, null);
});

test('legacy requests migrate and junk is dropped', () => {
  const v = normalizeVisit({ id: 'DEMO-9', reference: 'DEMO-9', patient: 'Patient 009', service: 'dental', date: TODAY, time: '09:30', status: 'needs_staff', type: 'appointment', createdAt: T0.toISOString() });
  assert.equal(v?.status, 'booked');
  assert.equal(v?.needsStaff, true);
  assert.equal(normalizeVisit({ id: 'x' }), null);
  assert.equal(normalizeVisit(null), null);
  assert.equal(normalizeVisit({ id: 'a', patient: 'p', status: 'weird' })?.status, 'booked');
  assert.deepEqual(parseVisits('not json'), []);
  assert.deepEqual(parseVisits('{"a":1}'), []);
  assert.equal(parseVisits(JSON.stringify([{ id: 'a', patient: 'p', status: 'completed' }, 7])).length, 1);
});

test('FHIR Encounter export is R4-shaped and tagged synthetic', () => {
  let v = advance(booked(), 'checked_in', min(1), TODAY);
  v = advance(v, 'in_consult', min(2), TODAY);
  v = saveEncounter(v, {}, note);
  v = advance(v, 'completed', min(30), TODAY);
  const e = toFhirEncounter(v);
  assert.equal(e.resourceType, 'Encounter');
  assert.equal(e.status, 'finished');
  assert.equal(e.class.code, 'AMB');
  assert.equal(e.id, 'demo-1');
  assert.equal(e.period?.start, min(2).toISOString());
  assert.equal(e.period?.end, min(30).toISOString());
  assert.equal(e.meta.tag[0].code, 'synthetic');
  assert.equal(toFhirEncounter(booked()).status, 'planned');
  assert.equal(toFhirEncounter(booked({ status: 'no_show' })).status, 'cancelled');
  assert.equal('period' in toFhirEncounter(booked()), false);
});

test('booking creates a booked visit and enforces the synthetic label', () => {
  const b = createBooking({ reference: 'DEMO-77', patient: 'Patient 077', service: 'general', date: TODAY, time: '10:30' }, T0);
  assert.equal(b.status, 'booked');
  assert.equal(b.id, 'DEMO-77');
  throwsCode(() => createBooking({ reference: 'R', patient: 'Real Name', service: 'general', date: TODAY, time: '10:30' }, T0), 'patient_label');
});
