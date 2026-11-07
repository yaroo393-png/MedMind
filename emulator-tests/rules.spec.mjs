// Security Rules (firestore.rules) กับ Firebase Emulator — R-1…R-14 ตาม docs/02-design/firestore-rules-draft.md
// ใช้ SDK จริงของผู้ใช้นิรนามหลายคน (ไม่ผ่าน firestoreRepo) เพื่อพิสูจน์ว่า "ด่านที่เซิร์ฟเวอร์" ปฏิเสธเองแม้แอปถูกแก้
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { fs, newUser, clearAll, countDocs, outcome } from './helpers.mjs';

const { doc, collection, writeBatch, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp } = fs;
const MIN = 60 * 1000;
const DENIED = 'permission-denied';

beforeEach(clearAll);
after(() => process.exit(0)); // ปิดการเชื่อมต่อค้างของ SDK

// สร้างคู่ + รหัสเหมือน firestoreRepo (batch เดียว)
async function makePair(senior, { code = '123456', expiresIn = 10 * MIN } = {}) {
  const pairRef = doc(collection(senior.db, 'pairs'));
  const batch = writeBatch(senior.db);
  batch.set(pairRef, { seniorUid: senior.uid, caregiverUid: null, consentAt: null, inviteCode: code });
  batch.set(doc(senior.db, 'invites', code), { pairId: pairRef.id, seniorUid: senior.uid, expiresAt: Timestamp.fromMillis(Date.now() + expiresIn), usedAt: null, usedBy: null, consented: false, hasCaregiver: false });
  await batch.commit();
  return { id: pairRef.id, code };
}
async function consent(senior, pair) {
  const batch = writeBatch(senior.db);
  batch.update(doc(senior.db, 'pairs', pair.id), { consentAt: serverTimestamp() });
  batch.update(doc(senior.db, 'invites', pair.code), { consented: true });
  await batch.commit();
}
function join(user, pair, code = pair.code) {
  const batch = writeBatch(user.db);
  batch.update(doc(user.db, 'invites', code), { usedAt: serverTimestamp(), usedBy: user.uid, hasCaregiver: true });
  batch.update(doc(user.db, 'pairs', pair.id), { caregiverUid: user.uid });
  return batch.commit();
}
async function pairedSet() {
  const [senior, caregiver] = [await newUser('senior'), await newUser('caregiver')];
  const pair = await makePair(senior);
  await consent(senior, pair);
  await join(caregiver, pair);
  return { senior, caregiver, pair };
}
const medicine = { name: 'ยาตัวอย่าง', instructionText: null, warnings: null, contraindications: null, slots: [{ meal: 'breakfast', timing: 'after_meal', minutesBefore: null, tabletsPerDose: 1 }] };
const doseData = (confirmedAt, status, scheduledTime) => ({ scheduledTime: Timestamp.fromMillis(scheduledTime), confirmedAt: Timestamp.fromMillis(confirmedAt), serverReceivedAt: serverTimestamp(), status });

test('R-1 (NFR-04): ผู้ใช้อ่าน/ค้น pairs ของคู่อื่นไม่ได้', async () => {
  const [senior, other] = [await newUser('senior'), await newUser('other')];
  const pair = await makePair(senior);
  assert.equal(await outcome(getDoc(doc(other.db, 'pairs', pair.id))), DENIED);
  assert.equal(await outcome(getDocs(query(collection(other.db, 'pairs'), where('seniorUid', '==', senior.uid)))), DENIED);
  assert.equal(await outcome(getDocs(collection(other.db, 'pairs'))), DENIED);                     // ไล่ดูทั้งหมดไม่ได้
  assert.equal(await outcome(getDoc(doc(senior.db, 'pairs', pair.id))), 'ok');
  assert.equal(await outcome(getDocs(query(collection(senior.db, 'pairs'), where('seniorUid', '==', senior.uid)))), 'ok');
});

test('R-2 (NFR-05, FR-01 ข้อ 2): ผู้ดูแลจับคู่ก่อนผู้สูงอายุกดยินยอม → ปฏิเสธ', async () => {
  const [senior, caregiver] = [await newUser('senior'), await newUser('caregiver')];
  const pair = await makePair(senior);
  assert.equal(await outcome(join(caregiver, pair)), DENIED);
});

test('R-3 (FR-01 ข้อ 4): รหัสผิด / หมดอายุ / ใช้แล้ว → ปฏิเสธ', async () => {
  const [senior, caregiver, other] = [await newUser('senior'), await newUser('caregiver'), await newUser('other')];
  // หมดอายุ: สร้างรหัสที่หมดไปแล้ว (Rules อนุญาตให้สร้างได้ แต่ใช้ไม่ได้)
  const expired = await makePair(senior, { code: '111111', expiresIn: -1000 });
  await consent(senior, expired);
  assert.equal(await outcome(join(caregiver, expired)), DENIED);
  // รหัสผิด: เอกสารไม่มีอยู่
  const live = await makePair(await newUser('senior2'), { code: '222222' });
  assert.notEqual(await outcome(join(caregiver, live, '999999')), 'ok');
  // ใช้แล้ว: ผู้ดูแลคนแรกสำเร็จ แล้วใช้ซ้ำไม่ได้
  const s3 = await newUser('senior3'); const used = await makePair(s3, { code: '333333' });
  await consent(s3, used);
  assert.equal(await outcome(join(caregiver, used)), 'ok');
  assert.equal(await outcome(join(other, used)), DENIED);
});

test('R-4 (FR-01 ข้อ 5): ผู้ดูแลคนที่สองกับคู่ที่มีผู้ดูแลแล้ว → ปฏิเสธ แม้มีรหัสใหม่', async () => {
  const { senior, pair } = await pairedSet();
  const second = await newUser('second');
  assert.equal(await outcome(join(second, pair)), DENIED);
  assert.equal((await getDoc(doc(senior.db, 'pairs', pair.id))).data().caregiverUid !== second.uid, true);
});

test('R-5 (FR-01 ข้อ 3): จับคู่ถูกต้อง (batch ครบ) สำเร็จ และผู้ดูแลอ่านคู่ได้หลังจับคู่', async () => {
  const { caregiver, pair } = await pairedSet();
  assert.equal(await outcome(getDoc(doc(caregiver.db, 'pairs', pair.id))), 'ok');
  assert.equal(await outcome(getDocs(query(collection(caregiver.db, 'pairs'), where('caregiverUid', '==', caregiver.uid)))), 'ok');
});

test('R-5b: ผู้ดูแลแก้เฉพาะ caregiverUid ของ pair โดยไม่ใช้รหัสในข้อมูลเดียวกัน → ปฏิเสธ', async () => {
  const [senior, caregiver] = [await newUser('senior'), await newUser('caregiver')];
  const pair = await makePair(senior); await consent(senior, pair);
  assert.equal(await outcome(updateDoc(doc(caregiver.db, 'pairs', pair.id), { caregiverUid: caregiver.uid })), DENIED);
});

test('R-5c: เครื่องผู้สูงอายุจับคู่กับตัวเองเป็นผู้ดูแลไม่ได้', async () => {
  const senior = await newUser('senior');
  const pair = await makePair(senior); await consent(senior, pair);
  assert.equal(await outcome(join(senior, pair)), DENIED);
});

test('R-6 (BR-03): ผู้สูงอายุเขียนยาไม่ได้ · ผู้ดูแลเขียนได้ · ทั้งสองฝั่งอ่านได้', async () => {
  const { senior, caregiver, pair } = await pairedSet();
  assert.equal(await outcome(setDoc(doc(senior.db, 'pairs', pair.id, 'medicines', 'm1'), medicine)), DENIED);
  assert.equal(await outcome(setDoc(doc(caregiver.db, 'pairs', pair.id, 'medicines', 'm1'), medicine)), 'ok');
  assert.equal(await outcome(getDoc(doc(senior.db, 'pairs', pair.id, 'medicines', 'm1'))), 'ok');
});

test('R-7 (NFR-07, BR-12): เขียน doses/{id} ซ้ำและแก้ confirmedAt เดิมไม่ได้', async () => {
  const { senior, pair } = await pairedSet();
  const T = Date.now();
  const ref = doc(senior.db, 'pairs', pair.id, 'doses', '2026-11-04_0700');
  assert.equal(await outcome(setDoc(ref, doseData(T + MIN, 'taken', T))), 'ok');
  assert.equal(await outcome(setDoc(ref, doseData(T + 2 * MIN, 'taken', T))), DENIED);             // เขียนซ้ำ = update → ปฏิเสธ
  assert.equal(await outcome(updateDoc(ref, { confirmedAt: Timestamp.fromMillis(T) })), DENIED);
});

test('R-8 (NFR-10, FR-01 ข้อ 6): ยกเลิกจับคู่ → ผู้ดูแลเดิมอ่านไม่ได้ และเอกสารของคู่เหลือ 0', async () => {
  const { senior, caregiver, pair } = await pairedSet();
  await setDoc(doc(caregiver.db, 'pairs', pair.id, 'medicines', 'm1'), medicine);
  await setDoc(doc(senior.db, 'pairs', pair.id, 'doses', 'd1'), doseData(Date.now(), 'taken', Date.now()));
  await setDoc(doc(senior.db, 'pairs', pair.id, 'events', 'd1'), { kind: 'not_yet_last_round', at: Timestamp.now() });
  await setDoc(doc(caregiver.db, 'pairs', pair.id, 'alertSeen', 'd1_not_confirmed'), { seenAt: serverTimestamp() });
  const batch = writeBatch(caregiver.db);
  for (const [sub, id] of [['medicines', 'm1'], ['doses', 'd1'], ['events', 'd1'], ['alertSeen', 'd1_not_confirmed']]) batch.delete(doc(caregiver.db, 'pairs', pair.id, sub, id));
  batch.delete(doc(caregiver.db, 'pairs', pair.id));
  assert.equal(await outcome(batch.commit()), 'ok');
  assert.equal(await outcome(getDoc(doc(caregiver.db, 'pairs', pair.id, 'medicines', 'm1'))), DENIED);
  for (const sub of ['medicines', 'doses', 'events', 'alertSeen']) assert.equal(await countDocs(`pairs/${pair.id}/${sub}`), 0, sub);
  assert.equal(await countDocs('pairs'), 0);
});

test('R-9 (BR-20): serverReceivedAt ต้องเป็นเวลาของเซิร์ฟเวอร์ — เครื่องใส่เองหรือมีช่องเกิน → ปฏิเสธ', async () => {
  const { senior, pair } = await pairedSet();
  const T = Date.now();
  const forged = { ...doseData(T, 'taken', T), serverReceivedAt: Timestamp.fromMillis(T - 3600 * 1000) };
  assert.equal(await outcome(setDoc(doc(senior.db, 'pairs', pair.id, 'doses', 'd1'), forged)), DENIED);
  assert.equal(await outcome(setDoc(doc(senior.db, 'pairs', pair.id, 'doses', 'd2'), { ...doseData(T, 'taken', T), extra: 1 })), DENIED);
  assert.equal(await outcome(setDoc(doc(senior.db, 'pairs', pair.id, 'doses', 'd3'), doseData(T, 'taken', T))), 'ok');
});

test('R-10 (BR-20, BR-21): status ต้องตรงเวลาที่กด — ตรง T+15 = taken · เกิน 1 ms = taken_late', async () => {
  const { senior, pair } = await pairedSet();
  const T = Date.now();
  const put = (id, confirmedAt, status) => outcome(setDoc(doc(senior.db, 'pairs', pair.id, 'doses', id), doseData(confirmedAt, status, T)));
  assert.equal(await put('a', T + 15 * MIN, 'taken_late'), DENIED);          // ตรง T+15 พอดี ต้องเป็น taken
  assert.equal(await put('b', T + 15 * MIN, 'taken'), 'ok');
  assert.equal(await put('c', T + 15 * MIN + 1, 'taken'), DENIED);           // เกิน 1 ms ต้องเป็น taken_late
  assert.equal(await put('d', T + 15 * MIN + 1, 'taken_late'), 'ok');
  assert.equal(await put('e', T + MIN, 'taken_late'), DENIED);
  assert.equal(await put('f', T + MIN, 'whatever'), DENIED);
});

test('R-11 (A1): บันทึกยาที่ไม่มี slots หรือ slots ว่าง/ไม่มีชื่อ → ปฏิเสธ', async () => {
  const { caregiver, pair } = await pairedSet();
  const put = (id, data) => outcome(setDoc(doc(caregiver.db, 'pairs', pair.id, 'medicines', id), data));
  assert.equal(await put('a', { name: 'x' }), DENIED);
  assert.equal(await put('b', { ...medicine, slots: [] }), DENIED);
  assert.equal(await put('c', { ...medicine, name: '' }), DENIED);
  assert.equal(await put('d', medicine), 'ok');
});

test('R-12 (DL-20): รู้รหัสแล้ว get เอกสารรหัสได้ · list รหัสทั้งหมดไม่ได้', async () => {
  const [senior, stranger] = [await newUser('senior'), await newUser('stranger')];
  const pair = await makePair(senior);
  assert.equal(await outcome(getDoc(doc(stranger.db, 'invites', pair.code))), 'ok');
  assert.equal(await outcome(getDocs(collection(stranger.db, 'invites'))), DENIED);
});

test('R-13 (BR-01): ใช้รหัสที่ยังไม่หมดอายุสำเร็จ · เกินอายุ 10 นาที (+60 วินาทีเผื่อนาฬิกา) สร้างรหัสไม่ได้', async () => {
  const [senior, caregiver] = [await newUser('senior'), await newUser('caregiver')];
  const ok = await makePair(senior, { code: '444444', expiresIn: 10 * MIN });
  await consent(senior, ok);
  assert.equal(await outcome(join(caregiver, ok)), 'ok');
  const s2 = await newUser('senior2');
  const ref = doc(collection(s2.db, 'pairs'));
  const batch = writeBatch(s2.db);
  batch.set(ref, { seniorUid: s2.uid, caregiverUid: null, consentAt: null, inviteCode: '555555' });
  batch.set(doc(s2.db, 'invites', '555555'), { pairId: ref.id, seniorUid: s2.uid, expiresAt: Timestamp.fromMillis(Date.now() + 12 * MIN), usedAt: null, usedBy: null, consented: false, hasCaregiver: false });
  assert.equal(await outcome(batch.commit()), DENIED);                      // รหัสอายุ 12 นาที ผิดกติกา
});

test('R-14 (DL-20): ผู้ดูแลแก้ consented เอง / ผู้สูงอายุตั้ง consented=true ทั้งที่ยังไม่ยินยอม → ปฏิเสธ', async () => {
  const [senior, caregiver] = [await newUser('senior'), await newUser('caregiver')];
  const pair = await makePair(senior);
  assert.equal(await outcome(updateDoc(doc(caregiver.db, 'invites', pair.code), { consented: true })), DENIED);
  assert.equal(await outcome(updateDoc(doc(senior.db, 'invites', pair.code), { consented: true })), DENIED);   // consentAt ยังว่าง
  await consent(senior, pair);
  assert.equal((await getDoc(doc(senior.db, 'invites', pair.code))).data().consented, true);
});

test('BR-06: ผู้ดูแลตั้งเวลามื้อรูป HH:MM ครบ 4 ช่องได้ · รูปผิด/ขาด/ผู้สูงอายุตั้ง → ปฏิเสธ', async () => {
  const { senior, caregiver, pair } = await pairedSet();
  const ref = (u) => doc(u.db, 'pairs', pair.id);
  const good = { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' };
  assert.equal(await outcome(updateDoc(ref(caregiver), { mealTimes: good })), 'ok');
  assert.equal(await outcome(updateDoc(ref(caregiver), { mealTimes: { ...good, lunch: '25:00' } })), DENIED);
  assert.equal(await outcome(updateDoc(ref(caregiver), { mealTimes: { breakfast: '07:00' } })), DENIED);
  assert.equal(await outcome(updateDoc(ref(senior), { mealTimes: { ...good, lunch: '13:00' } })), DENIED);   // ผู้สูงอายุเปลี่ยนค่าไม่ได้ (ค่าเดิมเขียนซ้ำ = ไม่เปลี่ยนอะไร)
});

test('BR-13/BR-11: alertSeen เขียนได้เฉพาะผู้ดูแล ครั้งเดียว · events เขียนได้เฉพาะผู้สูงอายุ ครั้งเดียว', async () => {
  const { senior, caregiver, pair } = await pairedSet();
  const seen = (u) => doc(u.db, 'pairs', pair.id, 'alertSeen', '2026-11-04_0700_not_confirmed');
  assert.equal(await outcome(setDoc(seen(senior), { seenAt: serverTimestamp() })), DENIED);
  assert.equal(await outcome(setDoc(seen(caregiver), { seenAt: serverTimestamp() })), 'ok');
  assert.equal(await outcome(setDoc(seen(caregiver), { seenAt: serverTimestamp() })), DENIED);       // ซ้ำ
  assert.equal(await outcome(setDoc(doc(caregiver.db, 'pairs', pair.id, 'alertSeen', 'x_other'), { seenAt: serverTimestamp() })), DENIED);   // ชนิดแปลก
  const ev = (u) => doc(u.db, 'pairs', pair.id, 'events', 'd1');
  assert.equal(await outcome(setDoc(ev(caregiver), { kind: 'not_yet_last_round', at: Timestamp.now() })), DENIED);
  assert.equal(await outcome(setDoc(ev(senior), { kind: 'not_yet_last_round', at: Timestamp.now() })), 'ok');
  assert.equal(await outcome(setDoc(ev(senior), { kind: 'not_yet_last_round', at: Timestamp.now() })), DENIED);
});

test('ไม่ล็อกอิน (ไม่มี auth) อ่าน/เขียนอะไรไม่ได้', async () => {
  const senior = await newUser('senior');
  const pair = await makePair(senior);
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/demo-medmind/databases/(default)/documents/pairs/${pair.id}`);
  assert.equal(res.status, 403);
});
