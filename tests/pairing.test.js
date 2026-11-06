// เทสต์ FR-01 logic/pairing.js — ชื่อเทสต์ขึ้นต้นด้วยรหัสใน docs/TRACEABILITY.md · สัญญา architecture §5.5 (DL-20)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INVITE_TTL_MIN, makeInvite, joinCheck, pairingState } from '../public/js/logic/pairing.js';

const T0 = new Date(2026, 10, 4, 9, 0).getTime();
const MIN = 60 * 1000;
const fixed = (n) => () => n; // ตัวสุ่มสำหรับเทสต์
const invite = (over = {}) => ({ code: '123456', expiresAt: T0 + 10 * MIN, usedAt: null, consented: true, hasCaregiver: false, ...over });
const check = (over = {}, enteredCode = '123456', now = T0 + MIN) => joinCheck({ now, invite: invite(over), enteredCode });

test('BR-01: รหัส 6 หลัก (มี 0 นำหน้าได้) อายุ 10 นาที ยังไม่ถูกใช้', () => {
  assert.equal(INVITE_TTL_MIN, 10);
  assert.deepEqual(makeInvite({ now: T0, randomInt: fixed(42) }), { code: '000042', expiresAt: T0 + 10 * MIN, usedAt: null });
  assert.equal(makeInvite({ now: T0, randomInt: fixed(999999) }).code, '999999');
});

test('DL-20: makeInvite ใช้ตัวสุ่มที่ส่งเข้ามา ขอช่วง 1,000,000 · ค่าที่ผิดถูกปฏิเสธ · ไฟล์ไม่เรียก Math.random', () => {
  let asked;
  makeInvite({ now: T0, randomInt: (n) => { asked = n; return 7; } });
  assert.equal(asked, 1000000);
  for (const bad of [-1, 1000000, 1.5, NaN]) assert.throws(() => makeInvite({ now: T0, randomInt: fixed(bad) }), RangeError);
  assert.throws(() => makeInvite({ now: 'now', randomInt: fixed(1) }), TypeError);
  const src = readFileSync(new URL('../public/js/logic/pairing.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''); // ตัดคอมเมนต์ทั้งสองแบบ
  assert.ok(!src.includes('Math.random') && !src.includes('Date.now'));
});

test('TC-01.3 (FR-01 ข้อ 3): ยินยอมแล้ว รหัสถูก ยังไม่หมดอายุ → จับคู่ได้ · พิมพ์มีช่องว่างได้', () => {
  assert.deepEqual(check(), { ok: true });
  assert.deepEqual(check({}, ' 123 456 '), { ok: true });
});

test('TC-01.2 (FR-01 ข้อ 2): ผู้สูงอายุยังไม่กดยินยอม → not_consented ("รอผู้สูงอายุยินยอม")', () => {
  assert.deepEqual(check({ consented: false }), { ok: false, reason: 'not_consented' });
});

test('TC-01.4 (FR-01 ข้อ 4): รหัสผิด / ไม่ใช่ 6 หลัก / ไม่มีรหัส → wrong_code', () => {
  // เรียก joinCheck ตรง ๆ (ไม่ผ่านตัวช่วย) — ส่ง undefined เข้าตัวช่วยจะได้ค่าเริ่มต้น '123456' แทน
  for (const code of ['654321', '12345', '1234567', 'abcdef', '', null, undefined]) {
    assert.deepEqual(joinCheck({ now: T0 + MIN, invite: invite(), enteredCode: code }), { ok: false, reason: 'wrong_code' }, String(code));
  }
  assert.deepEqual(joinCheck({ now: T0, invite: null, enteredCode: '123456' }), { ok: false, reason: 'wrong_code' });
});

test('TC-01.4 / BR-01 (DL-20): ขอบเวลา — อายุ 10:00.000 พอดียังใช้ได้ · 10:00.001 หมดอายุ', () => {
  assert.deepEqual(check({}, '123456', T0 + 10 * MIN), { ok: true });
  assert.deepEqual(check({}, '123456', T0 + 10 * MIN + 1), { ok: false, reason: 'expired' });
});

test('TC-01.4 (FR-01 ข้อ 4): รหัสที่ใช้แล้ว → already_used', () => {
  assert.deepEqual(check({ usedAt: T0 + 30 * 1000 }), { ok: false, reason: 'already_used' });
});

test('TC-01.5 (FR-01 ข้อ 5, DL-20): มีผู้ดูแลแล้ว → already_has_caregiver แม้รหัสหมดอายุหรือใช้แล้ว', () => {
  const paired = { hasCaregiver: true, usedAt: T0 + MIN };
  assert.deepEqual(check(paired), { ok: false, reason: 'already_has_caregiver' });
  assert.deepEqual(check(paired, '123456', T0 + 60 * MIN), { ok: false, reason: 'already_has_caregiver' }); // รหัสเก่าที่หมดอายุแล้ว
  assert.deepEqual(check(paired, '000000'), { ok: false, reason: 'wrong_code' });                         // รหัสผิดยังมาก่อน
});

test('ลำดับตรวจ (DL-20): หมดอายุมาก่อนใช้แล้ว · ใช้แล้วมาก่อนยังไม่ยินยอม', () => {
  assert.equal(check({ usedAt: T0, consented: false }, '123456', T0 + 11 * MIN).reason, 'expired');
  assert.equal(check({ usedAt: T0, consented: false }).reason, 'already_used');
});

test('pairingState (FR-01 ข้อ 1, 3): รอยินยอม → รอผู้ดูแล → เชื่อมต่อแล้ว', () => {
  assert.equal(pairingState(null), 'waiting_consent');
  assert.equal(pairingState({ seniorId: 's', caregiverId: null, consentAt: null }), 'waiting_consent');
  assert.equal(pairingState({ seniorId: 's', caregiverId: null, consentAt: T0 }), 'waiting_caregiver');
  assert.equal(pairingState({ seniorId: 's', caregiverId: 'c', consentAt: T0 }), 'connected');
});
