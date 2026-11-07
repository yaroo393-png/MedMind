// features/format.js — รูปแบบเวลาและข้อความที่หน้าจอใช้ร่วมกัน (BR-14: ไม่ใช้คำว่า "ไม่ได้กิน")
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtHM, fmtHMSms, fmtCountdown, parseClockInput, dayStartOf, thaiDate, statusLabel, JOIN_TEXT, REASON_TEXT, MEAL_NAMES } from '../public/js/features/format.js';

const day = dayStartOf('2026-11-04');
const at = (h, m, s = 0, ms = 0) => new Date(2026, 10, 4, h, m, s, ms).getTime();

test('fmtHM / fmtHMSms แสดงเวลาท้องถิ่น และมิลลิวินาที 3 หลักเสมอ', () => {
  assert.equal(fmtHM(at(7, 5)), '07:05');
  assert.equal(fmtHMSms(at(12, 0, 0, 1)), '12:00:00.001');
  assert.equal(fmtHMSms(at(23, 59, 59, 999)), '23:59:59.999');
});

test('fmtCountdown: นับถอยหลังเป็น MM:SS ไม่ติดลบ', () => {
  assert.equal(fmtCountdown(10 * 60 * 1000), '10:00');
  assert.equal(fmtCountdown(61 * 1000), '01:01');
  assert.equal(fmtCountdown(-5), '00:00');
});

test('parseClockInput รับ H:MM · HH:MM · HH:MM:SS · HH:MM:SS.mmm และปฏิเสธรูปแบบผิดโดยไม่เดา', () => {
  assert.equal(parseClockInput('7:05', day), at(7, 5));
  assert.equal(parseClockInput('12:00', day), at(12, 0));
  assert.equal(parseClockInput('12:00:30', day), at(12, 0, 30));
  assert.equal(parseClockInput(' 12:00:00.001 ', day), at(12, 0, 0, 1));
  assert.equal(parseClockInput('12:00:00.5', day), at(12, 0, 0, 500));      // .5 = 500 ms
  for (const bad of ['', 'abc', '24:00', '12:60', '12:00:60', '12', '12:0', null, undefined]) assert.equal(parseClockInput(bad, day), null, String(bad));
});

test('thaiDate เป็น พ.ศ.', () => assert.equal(thaiDate('2026-11-04'), '4 พ.ย. 2569'));

test('statusLabel: ผู้ใช้เห็น "ยังไม่ยืนยัน" ทุกสถานะที่ยังไม่ยืนยัน ไม่ใช้ "ไม่ได้กิน" (BR-14)', () => {
  for (const s of ['reminding', 'not_confirmed', 'missed']) assert.deepEqual(statusLabel(s), { text: 'ยังไม่ยืนยัน', kind: 'notyet' });
  assert.deepEqual(statusLabel('not_due'), { text: 'ยังไม่ถึงเวลา', kind: 'none' });
  assert.equal(statusLabel('taken', at(7, 3)).text, 'กินแล้ว 07:03');
  assert.equal(statusLabel('taken_late', at(7, 40)).text, 'กินแล้ว (ยืนยันย้อนหลัง) 07:40');
});

test('ไม่มีข้อความใดในไฟล์ข้อความใช้คำว่า "ไม่ได้กิน"', () => {
  const all = JSON.stringify([JOIN_TEXT, REASON_TEXT, MEAL_NAMES]);
  assert.doesNotMatch(all, /ไม่ได้กิน/);
});

test('JOIN_TEXT ครอบทุกเหตุผลที่ joinCheck คืนมา (FR-01 ข้อ 2, 4, 5)', () => {
  for (const reason of ['wrong_code', 'already_has_caregiver', 'expired', 'already_used', 'not_consented']) assert.ok(JOIN_TEXT[reason], reason);
});
