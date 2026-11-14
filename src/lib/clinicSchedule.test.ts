import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, DEFAULT_SCHEDULE, isIsoDate, isSlotTaken, isWorkday, nextWorkday, normalizeSchedule, parseSchedule, planFollowUp, riyadhNow,
  scheduleProblem, slotStates, slotTimes,
} from './clinicSchedule.ts';
import type { Visit } from './clinicFlow.ts';

// 2026-11-13 is a Friday, 2026-11-14 a Saturday, 2026-11-15 a Sunday, 2026-11-19 a Thursday.
const SUN = '2026-11-15';
const visit = (over: Partial<Visit> = {}): Visit => ({
  id: 'DEMO-1', reference: 'DEMO-1', patient: 'Patient 001', service: 'general', date: SUN, time: '10:00', status: 'booked',
  priority: 'routine', createdAt: '2026-11-10T08:00:00Z', history: [], ...over,
});
// Saturday morning in Riyadh, so every working day in these tests is still ahead.
const NOW = new Date('2026-11-14T06:00:00Z');

test('slot times follow open, close and slot length', () => {
  const d = slotTimes(DEFAULT_SCHEDULE);
  assert.equal(d.length, 24);
  assert.equal(d[0], '09:00');
  assert.equal(d[d.length - 1], '20:30');
  assert.deepEqual(slotTimes({ open: '09:00', close: '10:00', slotMinutes: 20 }), ['09:00', '09:20', '09:40']);
  assert.equal(slotTimes({ open: '09:00', close: '21:00', slotMinutes: 45 }).slice(-1)[0], '20:15');
  assert.equal(slotTimes({ open: '08:00', close: '20:00', slotMinutes: 60 }).length, 12);
});

test('a slot that would run past closing time is not offered', () => {
  assert.deepEqual(slotTimes({ open: '09:00', close: '10:15', slotMinutes: 30 }), ['09:00', '09:30']);
});

test('schedule problems are named', () => {
  assert.equal(scheduleProblem(DEFAULT_SCHEDULE), '');
  assert.equal(scheduleProblem({ open: '9:00', close: '21:00', slotMinutes: 30 }), 'time');
  assert.equal(scheduleProblem({ open: '25:00', close: '26:00', slotMinutes: 30 }), 'time');
  assert.equal(scheduleProblem({ open: '21:00', close: '09:00', slotMinutes: 30 }), 'order');
  assert.equal(scheduleProblem({ open: '09:00', close: '09:00', slotMinutes: 30 }), 'order');
  assert.equal(scheduleProblem({ open: '09:00', close: '21:00', slotMinutes: 25 }), 'length');
  assert.equal(scheduleProblem({ open: '09:00', close: '09:10', slotMinutes: 15 }), 'count');
  assert.equal(scheduleProblem({ open: '00:00', close: '23:59', slotMinutes: 15 }), 'count');
});

test('damaged stored schedules fall back to the default', () => {
  for (const bad of [null, undefined, 5, 'x', [], {}, { open: '09:00' }, { open: 9, close: 21, slotMinutes: 30 }, { open: '21:00', close: '09:00', slotMinutes: 30 }]) {
    assert.deepEqual(normalizeSchedule(bad), DEFAULT_SCHEDULE);
  }
  assert.deepEqual(normalizeSchedule({ open: '08:00', close: '16:00', slotMinutes: 20 }), { open: '08:00', close: '16:00', slotMinutes: 20 });
  assert.deepEqual(parseSchedule('not json'), DEFAULT_SCHEDULE);
  assert.deepEqual(parseSchedule(null), DEFAULT_SCHEDULE);
  assert.deepEqual(parseSchedule('{"open":"08:00","close":"12:00","slotMinutes":30}'), { open: '08:00', close: '12:00', slotMinutes: 30 });
});

test('calendar dates', () => {
  assert.equal(isIsoDate('2026-11-15'), true);
  for (const bad of ['2026-02-31', '2026-13-01', '2026-1-5', '15/11/2026', '', '2026-11-15T10:00']) assert.equal(isIsoDate(bad), false, bad);
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('nonsense', 1), '');
});

test('working week is Sunday to Thursday', () => {
  assert.deepEqual(['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(isWorkday), [true, true, true, true, true]);
  assert.equal(isWorkday('2026-11-13'), false); // Friday
  assert.equal(isWorkday('2026-11-14'), false); // Saturday
  assert.equal(isWorkday('garbage'), false);
});

test('next working day skips the weekend', () => {
  assert.equal(nextWorkday('2026-11-13'), '2026-11-15');
  assert.equal(nextWorkday('2026-11-14'), '2026-11-15');
  assert.equal(nextWorkday('2026-11-15'), '2026-11-15');
  assert.equal(nextWorkday('2026-11-13', 7), '2026-11-22'); // Friday + 7 = Friday, so Sunday
  assert.equal(nextWorkday('2026-11-15', 7), '2026-11-22');
  assert.equal(nextWorkday('bad'), '');
});

test('Riyadh date and time from an instant', () => {
  assert.deepEqual(riyadhNow(new Date('2026-11-13T22:30:00Z')), { date: '2026-11-14', time: '01:30' });
  assert.deepEqual(riyadhNow(new Date('2026-11-14T06:00:00Z')), { date: '2026-11-14', time: '09:00' });
});

test('a slot is taken by an open or completed visit of the same service, and freed by no-show or cancellation', () => {
  for (const status of ['booked', 'checked_in', 'in_consult', 'completed'] as const) {
    assert.equal(isSlotTaken([visit({ status })], SUN, 'general', '10:00'), true, status);
  }
  for (const status of ['no_show', 'cancelled'] as const) assert.equal(isSlotTaken([visit({ status })], SUN, 'general', '10:00'), false, status);
  assert.equal(isSlotTaken([visit()], SUN, 'dental', '10:00'), false, 'other service');
  assert.equal(isSlotTaken([visit()], SUN, 'general', '10:30'), false, 'other time');
  assert.equal(isSlotTaken([visit()], '2026-11-16', 'general', '10:00'), false, 'other day');
});

test('slot states: weekend and past dates are empty, started times are hidden, taken slots are marked', () => {
  const base = { service: 'general', visits: [visit()], schedule: DEFAULT_SCHEDULE };
  assert.deepEqual(slotStates({ ...base, date: '2026-11-13', now: NOW }), []);
  assert.deepEqual(slotStates({ ...base, date: '2026-11-14', now: NOW }), []);
  assert.deepEqual(slotStates({ ...base, date: '2026-11-12', now: NOW }), [], 'past date');
  assert.deepEqual(slotStates({ ...base, date: 'bad', now: NOW }), []);
  const sunday = slotStates({ ...base, date: SUN, now: NOW });
  assert.equal(sunday.length, 24);
  assert.deepEqual(sunday.find((s) => s.time === '10:00'), { time: '10:00', state: 'taken' });
  assert.deepEqual(sunday.find((s) => s.time === '10:30'), { time: '10:30', state: 'free' });
  // Sunday 15 Nov, 12:10 in Riyadh: 09:00 to 12:00 have started, 12:30 is the first one left.
  const today = slotStates({ ...base, visits: [], date: SUN, now: new Date('2026-11-15T09:10:00Z') });
  assert.equal(today[0].time, '12:30');
  assert.equal(today.length, 17);
  assert.deepEqual(slotStates({ ...base, visits: [], date: SUN, now: new Date('2026-11-15T18:00:00Z') }), [], 'after closing');
});

test('follow-up keeps the time of day when it is free, otherwise takes the first free slot', () => {
  const from = { service: 'general', time: '10:00' };
  assert.deepEqual(planFollowUp(from, 7, [], DEFAULT_SCHEDULE, NOW), { date: '2026-11-22', time: '10:00' });
  assert.deepEqual(planFollowUp(from, 7, [visit({ date: '2026-11-22', time: '10:00' })], DEFAULT_SCHEDULE, NOW), { date: '2026-11-22', time: '09:00' });
  assert.deepEqual(planFollowUp({ service: 'general', time: '' }, 14, [], DEFAULT_SCHEDULE, NOW), { date: '2026-11-29', time: '09:00' });
});

test('follow-up moves to the next working day when a day is full', () => {
  const full = slotTimes(DEFAULT_SCHEDULE).map((time, i) => visit({ id: `F${i}`, date: '2026-11-22', time }));
  assert.deepEqual(planFollowUp({ service: 'general', time: '10:00' }, 7, full, DEFAULT_SCHEDULE, NOW), { date: '2026-11-23', time: '10:00' });
  const other = slotTimes(DEFAULT_SCHEDULE).map((time, i) => visit({ id: `O${i}`, service: 'dental', date: '2026-11-22', time }));
  assert.deepEqual(planFollowUp({ service: 'general', time: '10:00' }, 7, other, DEFAULT_SCHEDULE, NOW), { date: '2026-11-22', time: '10:00' }, 'another service does not block');
});

test('follow-up gives up rather than loop when nothing is free for ten working days', () => {
  const tiny = { open: '09:00', close: '09:30', slotMinutes: 30 };
  const blocked: Visit[] = [];
  for (let d = '2026-11-22', n = 0; n < 40; d = addDays(d, 1), n++) blocked.push(visit({ id: `B${n}`, date: d, time: '09:00' }));
  assert.equal(planFollowUp({ service: 'general', time: '09:00' }, 7, blocked, tiny, NOW), null);
});
