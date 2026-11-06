// เทสต์การจับคู่ใน core/repo.js (localRepo) — FR-01 ข้อ 1–6 · สัญญา architecture §5.5 (DL-20)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../public/js/core/clock.js';
import { createLocalRepo } from '../public/js/core/repo.js';
import { pairingState } from '../public/js/logic/pairing.js';
import { demoSeed } from '../public/js/core/demoData.js';

const T0 = new Date(2026, 10, 4, 9, 0).getTime();
const MIN = 60 * 1000;
const meal = { dateKey: '2026-11-04', reminderTime: '07:00', medicines: [] };
function setup({ seed, codes = [111111, 222222, 333333] } = {}) {
  const clock = createClock({ start: T0 });
  const queue = [...codes];
  return { clock, repo: createLocalRepo({ clock, seed, randomInt: () => queue.shift() }) };
}

test('TC-01.1 (FR-01 ข้อ 1): เปิดแอปครั้งแรก → ได้คู่และรหัส 6 หลักทันที ยังไม่ยินยอม ไม่ต้องสมัคร', async () => {
  const { repo } = setup();
  const { pair, invite } = await repo.createPairing({ seniorId: 'S' });
  assert.deepEqual(pair, { seniorId: 'S', caregiverId: null, consentAt: null });
  assert.equal(invite.code, '111111');
  assert.equal(invite.expiresAt, T0 + 10 * MIN);
  assert.equal(invite.consented, false);
  assert.equal(pairingState(pair), 'waiting_consent');
});

test('TC-01.2 → TC-01.3: จับคู่ก่อนยินยอมไม่ได้ · ยินยอมแล้วกดเชื่อมต่ออีกครั้งสำเร็จ ทั้งสองฝั่งเห็น "เชื่อมต่อแล้ว"', async () => {
  const { repo } = setup();
  await repo.createPairing({ seniorId: 'S' });
  assert.deepEqual(await repo.joinWithCode({ code: '111111', caregiverId: 'C' }), { ok: false, reason: 'not_consented' });
  await repo.recordConsent();
  assert.equal((await repo.getPairing()).invite.consented, true); // สำเนาในรหัสอัปเดตพร้อมกัน (DL-20)
  assert.deepEqual(await repo.joinWithCode({ code: '111111', caregiverId: 'C' }), { ok: true });
  const { pair, invite } = await repo.getPairing();
  assert.equal(pairingState(pair), 'connected');
  assert.equal(invite.usedBy, 'C');
  assert.equal(invite.hasCaregiver, true);
});

test('TC-01.4 (FR-01 ข้อ 4): รหัสผิด / หมดอายุ (เกิน 10 นาที) / รหัสเก่าหลังกด "สร้างรหัสใหม่" → ไม่เชื่อมต่อ', async () => {
  const { clock, repo } = setup();
  await repo.createPairing({ seniorId: 'S' });
  await repo.recordConsent();
  assert.equal((await repo.joinWithCode({ code: '999999', caregiverId: 'C' })).reason, 'wrong_code');
  const fresh = await repo.createInviteCode();                       // BR-01: รหัสเดิมใช้ไม่ได้อีก
  assert.equal(fresh.code, '222222');
  assert.equal(fresh.consented, true);                               // รหัสใหม่หลังยินยอมก็มีสำเนาถูกต้อง
  assert.equal((await repo.joinWithCode({ code: '111111', caregiverId: 'C' })).reason, 'wrong_code');
  clock.advance(10 * MIN + 1);
  assert.equal((await repo.joinWithCode({ code: '222222', caregiverId: 'C' })).reason, 'expired');
  assert.equal((await repo.getPairing()).pair.caregiverId, null);   // ไม่มีการเชื่อมต่อ
});

test('TC-01.5 (FR-01 ข้อ 5): ผู้ดูแลคนที่สองใช้รหัสเดิม → "มีผู้ดูแลแล้ว" ผู้ดูแลเดิมไม่ถูกแทนที่', async () => {
  const { clock, repo } = setup();
  await repo.createPairing({ seniorId: 'S' });
  await repo.recordConsent();
  await repo.joinWithCode({ code: '111111', caregiverId: 'C1' });
  clock.advance(30 * MIN); // รหัสเก่าหมดอายุแล้วด้วย
  assert.deepEqual(await repo.joinWithCode({ code: '111111', caregiverId: 'C2' }), { ok: false, reason: 'already_has_caregiver' });
  assert.equal((await repo.getPairing()).pair.caregiverId, 'C1');
});

test('TC-01.6 / R-8 (FR-01 ข้อ 6, BR-17, NFR-10): ยกเลิกจับคู่ → ข้อมูลของคู่ถูกลบหมด ผู้สูงอายุได้รหัสใหม่ ผู้ดูแลเดิมใช้รหัสเก่าไม่ได้', async () => {
  const { repo } = setup({ seed: demoSeed() });
  await repo.createPairing({ seniorId: 'S' });
  await repo.recordConsent();
  await repo.joinWithCode({ code: '111111', caregiverId: 'C' });
  await repo.confirmMeal({ meal, confirmedAt: T0 });
  await repo.reportNotYet({ meal, at: T0 });
  await repo.markAlertSeen({ mealId: '2026-11-04_0700', kind: 'not_confirmed' });

  const { pair, invite } = await repo.cancelPairing();
  assert.deepEqual(pair, { seniorId: 'S', caregiverId: null, consentAt: null });
  assert.equal(invite.code, '222222');
  assert.deepEqual(await repo.listMedicines(), []);                 // เอกสารเหลือ 0
  assert.deepEqual(await repo.getDoses(), {});
  assert.equal(await repo.getMealTimes(), null);
  assert.equal(await repo.getNotYet(meal), null);
  assert.deepEqual(await repo.getSeen('2026-11-04_0700'), []);
  assert.equal((await repo.joinWithCode({ code: '111111', caregiverId: 'C' })).reason, 'wrong_code');
});

test('ยังไม่มีคู่ → สร้างรหัส/ยินยอม/ยกเลิกไม่ได้ · จับคู่ได้ wrong_code · ต้องระบุผู้ใช้', async () => {
  const { repo } = setup();
  assert.equal(await repo.getPairing(), null);
  await assert.rejects(repo.createInviteCode());
  await assert.rejects(repo.recordConsent());
  await assert.rejects(repo.cancelPairing());
  assert.equal((await repo.joinWithCode({ code: '111111', caregiverId: 'C' })).reason, 'wrong_code');
  await assert.rejects(repo.createPairing({}), TypeError);
  await assert.rejects(repo.joinWithCode({ code: '111111' }), TypeError);
});

test('seed.pairing: เริ่ม Demo จากคู่ที่จับแล้ว (สถานการณ์ "จับคู่แล้ว") · ค่าเริ่มต้นสุ่มด้วย crypto ได้รหัส 6 หลัก', async () => {
  const clock = createClock({ start: T0 });
  const paired = createLocalRepo({ clock, seed: { ...demoSeed(), pairing: { seniorId: 'S', caregiverId: 'C', consentAt: T0 } } });
  assert.equal(pairingState((await paired.getPairing()).pair), 'connected');
  const real = createLocalRepo({ clock }); // ไม่ส่ง randomInt → ใช้ crypto
  const codes = new Set();
  for (let i = 0; i < 20; i++) { await real.createPairing({ seniorId: 'S' }); codes.add((await real.getPairing()).invite.code); }
  for (const c of codes) assert.match(c, /^\d{6}$/);
  assert.ok(codes.size > 1, 'รหัสต้องไม่ซ้ำเดิมทุกครั้ง');
});
