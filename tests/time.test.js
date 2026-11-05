// เทสต์ logic/time.js — ค่าคงที่และ scheduledTimeOf ที่ FR-03/04/05 ใช้ร่วมกัน (สัญญา architecture §5.3, DL-18)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MINUTE_MS, REMINDER_OFFSETS_MIN, ALERT_DEADLINE_MIN, ALERT_TOLERANCE_S, scheduledTimeOf } from '../public/js/logic/time.js';

test('ค่าคงที่ตรง SRS: รอบเตือน T, T+5, T+10 (BR-08) · เส้นตาย T+15 (BR-20/21) · แจ้งภายใน 5 วินาที (NFR-01)', () => {
  assert.equal(MINUTE_MS, 60000);
  assert.deepEqual(REMINDER_OFFSETS_MIN, [0, 5, 10]);
  assert.equal(ALERT_DEADLINE_MIN, 15);
  assert.equal(ALERT_TOLERANCE_S, 5);
});

test('scheduledTimeOf: แปลง dateKey + reminderTime เป็นเวลาท้องถิ่น (ms)', () => {
  assert.equal(scheduledTimeOf({ dateKey: '2026-11-02', reminderTime: '08:00' }), new Date(2026, 10, 2, 8, 0).getTime());
  assert.equal(scheduledTimeOf({ dateKey: '2026-11-02', reminderTime: '00:00' }), new Date(2026, 10, 2, 0, 0).getTime());
  assert.equal(scheduledTimeOf({ dateKey: '2026-11-02', reminderTime: '23:59' }), new Date(2026, 10, 2, 23, 59).getTime());
  assert.equal(scheduledTimeOf({ dateKey: '2026-12-31', reminderTime: '21:00' }), new Date(2026, 11, 31, 21, 0).getTime()); // เดือน 12 ไม่เลื่อนปี
});

test('scheduledTimeOf: รูปแบบผิด → แจ้งข้อผิดพลาด ไม่เดาเวลา', () => {
  for (const meal of [{}, null, undefined, { dateKey: '2026-11-02' }, { dateKey: '2026-11-02', reminderTime: '8:00' }, { dateKey: '2/11/2026', reminderTime: '08:00' }]) {
    assert.throws(() => scheduledTimeOf(meal), TypeError);
  }
});
