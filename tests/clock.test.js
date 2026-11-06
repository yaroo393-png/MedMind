// เทสต์ core/clock.js — นาฬิกาจริง/จำลอง (Issue #9 · NFR-01 · ADR-8)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../public/js/core/clock.js';

const T = new Date(2026, 10, 2, 8, 0).getTime();

test('นาฬิกาจำลอง: หยุดที่ start จนกว่าจะสั่งเลื่อน', () => {
  const clock = createClock({ start: T });
  assert.equal(clock.simulated, true);
  assert.equal(clock.now(), T);
  assert.equal(clock.now(), T);
});

test('NFR-01: เลื่อนได้ละเอียดถึงมิลลิวินาที (ขอบ T+15 / +1 ms)', () => {
  const clock = createClock({ start: T });
  assert.equal(clock.advance(15 * 60 * 1000), T + 900000);
  assert.equal(clock.advance(1), T + 900001);
  assert.equal(clock.set(T + 960000), T + 960000);
});

test('นาฬิกาจำลองย้อนเวลาไม่ได้ และไม่รับค่าที่ไม่ใช่ตัวเลข', () => {
  const clock = createClock({ start: T });
  assert.throws(() => clock.advance(-1), RangeError);
  assert.throws(() => clock.set(T - 1), RangeError);
  assert.throws(() => clock.advance(NaN), RangeError);
  assert.throws(() => clock.set('08:00'), TypeError);
  assert.equal(clock.now(), T); // ค่าผิดไม่ทำให้เวลาเปลี่ยน
  assert.throws(() => createClock({ start: 'today' }), TypeError);
});

test('subscribe: แจ้งผู้ฟังทุกครั้งที่เวลาเปลี่ยน และเลิกฟังได้', () => {
  const clock = createClock({ start: T });
  const seen = [];
  const stop = clock.subscribe((t) => seen.push(t));
  clock.advance(1000);
  stop();
  clock.advance(1000);
  assert.deepEqual(seen, [T + 1000]);
});

test('นาฬิกาจริง: ใช้เวลาของเครื่อง และเลื่อนเวลาไม่ได้', () => {
  const clock = createClock();
  const before = Date.now(), t = clock.now(), after = Date.now();
  assert.equal(clock.simulated, false);
  assert.ok(t >= before && t <= after);
  assert.throws(() => clock.advance(1000));
  assert.throws(() => clock.set(T));
});
