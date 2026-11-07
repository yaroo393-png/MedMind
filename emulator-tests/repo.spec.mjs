// firestoreRepo (public/js/core/firestoreRepo.js) กับ Firebase Emulator — สัญญาเดียวกับ localRepo (architecture §6.3)
// ผู้สูงอายุกับผู้ดูแลเป็นผู้ใช้นิรนามคนละคน ใช้ Rules จริง (firestore.rules) — ทดสอบการจับคู่ ยา ยืนยัน ออฟไลน์ แจ้งเตือน ยกเลิกจับคู่
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { fs, newUser, clearAll, countDocs, firstPairId, until } from './helpers.mjs';
import { createFirestoreRepo } from '../public/js/core/firestoreRepo.js';
import { createClock } from '../public/js/core/clock.js';

const MIN = 60 * 1000;
beforeEach(clearAll);
after(() => process.exit(0));

const realClock = createClock();
const mealOf = (dateKey, reminderTime) => ({ dateKey, reminderTime });
const medicine = (name = 'ยาตัวอย่าง') => ({ name, instructionText: null, warnings: 'ง่วง', contraindications: null, slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] });
const times = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };

async function repoFor(user, clock = realClock) {
  const errors = [];
  const repo = createFirestoreRepo({ fs, db: user.db, uid: user.uid, clock, onError: (e) => errors.push(e) });
  await repo.ready();
  repo.errors = errors;
  return repo;
}

async function pair() {
  const [su, cu] = [await newUser('senior'), await newUser('caregiver')];
  const [senior, caregiver] = [await repoFor(su), await repoFor(cu)];
  await senior.createPairing({ seniorId: su.uid });
  await senior.recordConsent();
  const code = (await senior.getPairing()).invite.code;
  const joined = await caregiver.joinWithCode({ code, caregiverId: cu.uid });
  assert.equal(joined.ok, true);
  await until(async () => (await caregiver.getPairing())?.pair.consentAt, 'ผู้ดูแลเห็นคู่');
  return { senior, caregiver, su, cu, code };
}

test('FR-01 ข้อ 1: createPairing → ได้คู่ (ยังไม่ยินยอม ยังไม่มีผู้ดูแล) และรหัส 6 หลักอายุ 10 นาที · เรียกซ้ำไม่สร้างคู่ใหม่', async () => {
  const user = await newUser('senior');
  const repo = await repoFor(user);
  assert.equal(await repo.getPairing(), null);
  const r = await repo.createPairing({ seniorId: user.uid });
  assert.deepEqual(r.pair, { seniorId: user.uid, caregiverId: null, consentAt: null });
  assert.match(r.invite.code, /^\d{6}$/);
  assert.ok(Math.abs(r.invite.expiresAt - (Date.now() + 10 * MIN)) < 5000);
  assert.equal(r.invite.usedAt, null);
  const again = await repo.createPairing({ seniorId: user.uid });
  assert.equal(again.invite.code, r.invite.code);
  assert.equal(await countDocs('pairs'), 1);
});

test('FR-01 ข้อ 2–5: ก่อนยินยอม / รหัสผิด / จับคู่สำเร็จ / ผู้ดูแลคนที่สอง', async () => {
  const [su, cu, third] = [await newUser('senior'), await newUser('caregiver'), await newUser('third')];
  const [senior, caregiver, other] = [await repoFor(su), await repoFor(cu), await repoFor(third)];
  const { invite } = await senior.createPairing({ seniorId: su.uid });
  assert.deepEqual(await caregiver.joinWithCode({ code: invite.code, caregiverId: cu.uid }), { ok: false, reason: 'not_consented' });
  await senior.recordConsent();
  const wrong = invite.code === '000000' ? '000001' : '000000';
  assert.deepEqual(await caregiver.joinWithCode({ code: wrong, caregiverId: cu.uid }), { ok: false, reason: 'wrong_code' });
  assert.deepEqual(await caregiver.joinWithCode({ code: 'abc', caregiverId: cu.uid }), { ok: false, reason: 'wrong_code' });
  assert.deepEqual(await caregiver.joinWithCode({ code: `${invite.code.slice(0, 3)} ${invite.code.slice(3)}`, caregiverId: cu.uid }), { ok: true });   // ช่องว่างในรหัสไม่เป็นไร
  assert.deepEqual(await other.joinWithCode({ code: invite.code, caregiverId: third.uid }), { ok: false, reason: 'already_has_caregiver' });
  await until(async () => (await senior.getPairing()).pair.caregiverId === cu.uid, 'ผู้สูงอายุเห็นผู้ดูแล');
  const p = await caregiver.getPairing();
  assert.equal(p.pair.seniorId, su.uid);
  assert.ok(p.pair.consentAt > 0);
});

test('FR-01: เครื่องผู้สูงอายุกรอกรหัสของตัวเองเป็นผู้ดูแล → self_pairing (ไม่จับคู่กับตัวเอง)', async () => {
  const su = await newUser('senior');
  const senior = await repoFor(su);
  const { invite } = await senior.createPairing({ seniorId: su.uid });
  await senior.recordConsent();
  assert.deepEqual(await senior.joinWithCode({ code: invite.code, caregiverId: su.uid }), { ok: false, reason: 'self_pairing' });
  assert.equal((await senior.getPairing()).pair.caregiverId, null);
});

test('FR-01 ข้อ 4: รหัสหมดอายุ (นาฬิกาจำลองเลย 10 นาที) → expired · ตรง 10:00.000 ยังใช้ได้', async () => {
  const su = await newUser('senior'), cu = await newUser('caregiver');
  const senior = await repoFor(su);
  const { invite } = await senior.createPairing({ seniorId: su.uid });
  await senior.recordConsent();
  const clockAt = (t) => ({ now: () => t });
  const late = await repoFor(cu, clockAt(invite.expiresAt + 1));
  assert.deepEqual(await late.joinWithCode({ code: invite.code, caregiverId: cu.uid }), { ok: false, reason: 'expired' });
  const edge = await repoFor(cu, clockAt(invite.expiresAt));
  assert.deepEqual(await edge.joinWithCode({ code: invite.code, caregiverId: cu.uid }), { ok: true });
});

test('FR-01 ข้อ 4: สร้างรหัสใหม่ → รหัสเดิมใช้ไม่ได้ และเอกสารรหัสเดิมถูกลบ', async () => {
  const su = await newUser('senior'), cu = await newUser('caregiver');
  const [senior, caregiver] = [await repoFor(su), await repoFor(cu)];
  const first = (await senior.createPairing({ seniorId: su.uid })).invite.code;
  await senior.recordConsent();
  const next = await senior.createInviteCode();
  assert.notEqual(next.code, first);
  assert.deepEqual(await caregiver.joinWithCode({ code: first, caregiverId: cu.uid }), { ok: false, reason: 'wrong_code' });
  assert.equal(await countDocs('invites'), 1);
  assert.deepEqual(await caregiver.joinWithCode({ code: next.code, caregiverId: cu.uid }), { ok: true });
});

test('FR-02: ผู้ดูแลตั้งเวลามื้อและบันทึกยา — ผู้สูงอายุเห็นผ่านตัวฟัง · ลบยาได้ · รูปเวลาผิดโยน error', async () => {
  const { senior, caregiver } = await pair();
  await assert.rejects(caregiver.setMealTimes({ ...times, lunch: '25:00' }), /HH:MM/);
  await caregiver.setMealTimes(times);
  const id = await caregiver.saveMedicine(medicine('ยา A'));
  await caregiver.saveMedicine(medicine('ยา B'));
  await until(async () => (await senior.getMealTimes())?.lunch === '12:00' && (await senior.listMedicines()).length === 2, 'ผู้สูงอายุเห็นยา');
  assert.deepEqual((await senior.listMedicines()).map((m) => m.name).sort(), ['ยา A', 'ยา B']);
  await assert.rejects(caregiver.saveMedicine({ name: 'x', slots: [] }), /slot/);
  assert.equal(await caregiver.deleteMedicine(id), true);
  assert.equal(await caregiver.deleteMedicine('ไม่มี'), false);
  await until(async () => (await senior.listMedicines()).length === 1, 'ลบยา');
});

test('FR-04: confirmMeal — ได้ taken/taken_late ตามเวลาที่กด · กดซ้ำไม่สร้างใหม่ · ผู้ดูแลเห็นพร้อม serverReceivedAt', async () => {
  const { senior, caregiver } = await pair();
  const meal = mealOf('2026-11-04', '07:00');
  const T = new Date(2026, 10, 4, 7, 0).getTime();
  const a = await senior.confirmMeal({ meal, confirmedAt: T + 15 * MIN });                 // ตรง T+15 = taken
  assert.equal(a.created, true); assert.equal(a.dose.status, 'taken');
  assert.equal(a.doseId, '2026-11-04_0700');
  const again = await senior.confirmMeal({ meal, confirmedAt: T + 20 * MIN });
  assert.equal(again.created, false);
  const late = await senior.confirmMeal({ meal: mealOf('2026-11-04', '12:00'), confirmedAt: new Date(2026, 10, 4, 12, 15).getTime() + 1 });
  assert.equal(late.dose.status, 'taken_late');
  const doses = await until(async () => { const d = await caregiver.getDoses(); return Object.keys(d).length === 2 && !d['2026-11-04_0700'].pending ? d : null; }, 'ผู้ดูแลเห็นการยืนยัน');
  assert.equal(doses['2026-11-04_0700'].confirmedAt, T + 15 * MIN);                        // เวลาที่กดเดิม ไม่ใช่เวลาตอนข้อมูลมาถึง
  assert.ok(doses['2026-11-04_0700'].serverReceivedAt > 0);
  assert.equal(doses['2026-11-04_1200'].status, 'taken_late');
  assert.equal(await countDocs(`pairs/${await firstPairId()}/doses`), 2);
});

test('FR-04 ข้อ 7, 9 (BR-20): ออฟไลน์กด → จอเปลี่ยนทันที (pending) · กลับออนไลน์ส่งด้วยเวลาที่กดเดิม ไม่เปลี่ยนเป็นย้อนหลัง', async () => {
  const su = await newUser('senior'), cu = await newUser('caregiver');
  const [senior, caregiver] = [await repoFor(su), await repoFor(cu)];
  await senior.createPairing({ seniorId: su.uid }); await senior.recordConsent();
  const code = (await senior.getPairing()).invite.code;
  await caregiver.joinWithCode({ code, caregiverId: cu.uid });
  await until(async () => (await caregiver.getPairing())?.pair.consentAt, 'จับคู่');
  const meal = mealOf('2026-11-04', '07:00');
  const T = new Date(2026, 10, 4, 7, 0).getTime();
  await fs.disableNetwork(su.db);
  const r = await senior.confirmMeal({ meal, confirmedAt: T + 14 * MIN });
  assert.equal(r.created, true);
  assert.equal((await senior.getDoses())['2026-11-04_0700'].pending, true);                // จอผู้สูงอายุเห็นทันที
  assert.equal(Object.keys(await caregiver.getDoses()).length, 0);                         // ผู้ดูแลยังไม่เห็น
  assert.equal((await senior.confirmMeal({ meal, confirmedAt: T + 18 * MIN })).created, false);   // กดซ้ำตอนออฟไลน์ไม่สร้างใหม่
  await fs.enableNetwork(su.db);
  const dose = await until(async () => (await caregiver.getDoses())['2026-11-04_0700'], 'ส่งเมื่อกลับออนไลน์');
  assert.equal(dose.confirmedAt, T + 14 * MIN);
  assert.equal(dose.status, 'taken');
  assert.ok(dose.serverReceivedAt >= dose.confirmedAt || dose.serverReceivedAt > 0);
  assert.deepEqual(senior.errors, []);
});

test('FR-04 BR-11: reportNotYet เก็บครั้งแรกเท่านั้น และผู้ดูแลเห็น', async () => {
  const { senior, caregiver } = await pair();
  const meal = mealOf('2026-11-04', '07:00');
  assert.equal(await senior.getNotYet(meal), null);
  assert.deepEqual(await senior.reportNotYet({ meal, at: 1000 }), { created: true, at: 1000 });
  assert.deepEqual(await senior.reportNotYet({ meal, at: 2000 }), { created: false, at: 1000 });
  assert.equal(await until(async () => await caregiver.getNotYet(meal), 'ผู้ดูแลเห็น'), 1000);
  await assert.rejects(senior.reportNotYet({ meal, at: NaN }), /ms/);
});

test('FR-05 BR-13: markAlertSeen ครั้งเดียวต่อชนิด · ผู้ดูแลเท่านั้น · ชนิดผิดโยน error', async () => {
  const { senior, caregiver } = await pair();
  assert.deepEqual(await caregiver.getSeen('m1'), []);
  assert.deepEqual(await caregiver.markAlertSeen({ mealId: 'm1', kind: 'not_confirmed' }), { created: true });
  assert.deepEqual(await caregiver.markAlertSeen({ mealId: 'm1', kind: 'not_confirmed' }), { created: false });
  assert.deepEqual(await caregiver.markAlertSeen({ mealId: 'm1', kind: 'confirmed_late' }), { created: true });
  assert.deepEqual(await caregiver.getSeen('m1'), ['confirmed_late', 'not_confirmed']);
  await until(async () => (await senior.getSeen('m1')).length === 2, 'ผู้สูงอายุอ่านได้');
  await assert.rejects(caregiver.markAlertSeen({ mealId: 'm1', kind: 'ไม่ใช่ชนิด' }), /ชนิด/);
  const bad = await senior.markAlertSeen({ mealId: 'm2', kind: 'not_confirmed' });         // ผู้สูงอายุเขียนไม่ได้ → Rules ปฏิเสธภายหลัง และถอยกลับ
  assert.equal(bad.created, true);
  await until(async () => senior.errors.length > 0 && (await senior.getSeen('m2')).length === 0, 'Rules ปฏิเสธและถอยกลับ');
});

test('FR-01 ข้อ 6 (BR-17, NFR-10): ผู้ดูแลยกเลิกจับคู่ → เอกสารของคู่เหลือ 0 · ผู้สูงอายุได้คู่ใหม่ พร้อมรหัสใหม่ ไม่มียา/ประวัติ', async () => {
  const { senior, caregiver, su, code } = await pair();
  await caregiver.setMealTimes(times);
  await caregiver.saveMedicine(medicine());
  await senior.confirmMeal({ meal: mealOf('2026-11-04', '07:00'), confirmedAt: Date.now() });
  await senior.reportNotYet({ meal: mealOf('2026-11-04', '12:00'), at: Date.now() });
  await caregiver.markAlertSeen({ mealId: 'x', kind: 'not_confirmed' });
  await until(async () => (await senior.listMedicines()).length === 1 && Object.keys(await senior.getDoses()).length === 1, 'ข้อมูลครบ');
  await caregiver.cancelPairing();
  assert.equal(await caregiver.getPairing(), null);
  await until(async () => (await senior.getPairing()) === null, 'ผู้สูงอายุเห็นว่าคู่หาย');
  const fresh = await senior.createPairing({ seniorId: su.uid });                          // หน้าจอผู้สูงอายุสร้างคู่ใหม่เองเมื่อไม่มีคู่ (phone.js)
  assert.notEqual(fresh.invite.code, code);
  assert.equal(fresh.pair.consentAt, null);
  assert.deepEqual(await senior.listMedicines(), []);
  assert.deepEqual(await senior.getDoses(), {});
  assert.equal(await senior.getMealTimes(), null);
  await until(async () => (await countDocs('pairs')) === 1, 'เหลือคู่เดียว');
  assert.equal(await countDocs('invites'), 1);                                              // รหัสเก่าถูกเก็บกวาด เหลือเฉพาะรหัสใหม่
});

test('FR-01 ข้อ 6: ผู้สูงอายุยกเลิกเอง → ผู้ดูแลเห็นว่าไม่มีคู่ · ได้ QR ใหม่ทันที', async () => {
  const { senior, caregiver } = await pair();
  await caregiver.saveMedicine(medicine());
  const r = await senior.cancelPairing();
  assert.equal(r.pair.caregiverId, null);
  assert.match(r.invite.code, /^\d{6}$/);
  await until(async () => (await caregiver.getPairing()) === null, 'ผู้ดูแลเห็นว่าคู่หาย');
  assert.equal(await countDocs('pairs'), 1);
});

test('watch: แจ้งเมื่อข้อมูลเปลี่ยน (จากอีกเครื่อง) และเลิกฟังได้', async () => {
  const { senior, caregiver } = await pair();
  let calls = 0;
  const stop = senior.watch(() => { calls += 1; });
  await caregiver.saveMedicine(medicine());
  await until(() => calls > 0, 'ได้รับการแจ้ง');
  stop();
  const after = calls;
  await caregiver.saveMedicine(medicine('อีกตัว'));
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(calls, after);
});

test('ต้องมี uid และ clock', () => {
  assert.throws(() => createFirestoreRepo({ fs, db: {}, uid: '', clock: realClock }), /uid/);
  assert.throws(() => createFirestoreRepo({ fs, db: {}, uid: 'u', clock: {} }), /clock/);
});
