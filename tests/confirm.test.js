// เทสต์ FR-04 logic/confirm.js — ชื่อเทสต์ขึ้นต้นด้วยรหัสใน docs/TRACEABILITY.md (TC-04.x, A5-Tx)
// มื้อตัวอย่าง: 2 พ.ย. 2569 เวลาเตือน 08:00 (T) · เวลาทั้งหมดเป็น ms ตามเวลาท้องถิ่น
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doseId, confirmStatus, buildDose } from '../public/js/logic/confirm.js';

const meal = { dateKey: '2026-11-02', reminderTime: '08:00', medicines: [] };
const at = (h, m, s = 0, ms = 0) => new Date(2026, 10, 2, h, m, s, ms).getTime();
const T = at(8, 0);

test('TC-04.1 (AC1): กด "กินแล้ว" 08:03 → บันทึกเวลา 08:03 สถานะ taken', () => {
  assert.deepEqual(buildDose({ meal, confirmedAt: at(8, 3) }), { scheduledTime: T, confirmedAt: at(8, 3), status: 'taken' });
});

test('TC-04.2 (AC2, BR-12, NFR-07): มื้อเดียวกันได้ id เดิมทุกครั้ง → กดซ้ำไม่เกิดรายการใหม่', () => {
  assert.equal(doseId(meal), '2026-11-02_0800');
  assert.equal(doseId({ ...meal }), doseId(meal));
  assert.notEqual(doseId({ ...meal, reminderTime: '12:00' }), doseId(meal)); // คนละมื้อ = คนละ id
  assert.notEqual(doseId({ ...meal, dateKey: '2026-11-03' }), doseId(meal)); // คนละวัน = คนละ id
});

test('A5-T01: กด 08:14:59 → taken', () => {
  assert.equal(confirmStatus(T, at(8, 14, 59)), 'taken');
});

test('A5-T02 / TC-04.8 (AC8, BR-21): กดที่ T+15 พอดี (08:15:00.000) → taken ไม่ใช่ย้อนหลัง', () => {
  assert.equal(confirmStatus(T, at(8, 15)), 'taken');
  assert.equal(buildDose({ meal, confirmedAt: at(8, 15) }).status, 'taken');
});

test('A5-T03: เลย T+15 แม้ 1 ms → taken_late (08:15:00.001, 08:15:01, 08:40)', () => {
  for (const t of [at(8, 15, 0, 1), at(8, 15, 1), at(8, 40)]) assert.equal(confirmStatus(T, t), 'taken_late');
});

test('TC-04.5 (AC5): ยืนยันย้อนหลัง 08:40 → taken_late พร้อมเวลา 08:40', () => {
  assert.deepEqual(buildDose({ meal, confirmedAt: at(8, 40) }), { scheduledTime: T, confirmedAt: at(8, 40), status: 'taken_late' });
});

test('A5-T06 / TC-04.9 (AC9, BR-20): ตัดสินจากเวลาที่กด ไม่ใช่เวลาที่ข้อมูลมาถึง', () => {
  const dose = { ...buildDose({ meal, confirmedAt: at(8, 14) }), serverReceivedAt: at(8, 30) }; // ออฟไลน์ ข้อมูลมาถึง 08:30
  assert.equal(confirmStatus(dose.scheduledTime, dose.confirmedAt), 'taken');
  assert.equal(dose.status, 'taken');
});

test('AC10 (BR-21): กดที่เวลามื้อถัดไปพอดี (12:00:00.000) → taken_late เวลา 12:00', () => {
  // กดได้หรือไม่ (12:00:00.001 กดไม่ได้) ตัดสินโดย mealState().canConfirm ของ FR-03 — เทสต์อยู่ใน mealTimeline.test.js
  assert.deepEqual(buildDose({ meal, confirmedAt: at(12, 0) }), { scheduledTime: T, confirmedAt: at(12, 0), status: 'taken_late' });
});

test('buildDose: ไม่ใส่ serverReceivedAt (ชั้นข้อมูลเติมเอง) และไม่รับเวลาที่ไม่ใช่ตัวเลข', () => {
  assert.equal('serverReceivedAt' in buildDose({ meal, confirmedAt: at(8, 3) }), false);
  for (const bad of [undefined, null, '08:03', NaN]) assert.throws(() => buildDose({ meal, confirmedAt: bad }), TypeError);
});

test('buildDose: มื้อที่รูปแบบเวลาผิด → แจ้งข้อผิดพลาด ไม่เดาเวลา', () => {
  assert.throws(() => buildDose({ meal: { dateKey: '2026-11-02', reminderTime: '8:00' }, confirmedAt: at(8, 3) }), TypeError);
  assert.throws(() => buildDose({ meal: { reminderTime: '08:00' }, confirmedAt: at(8, 3) }), TypeError);
});
