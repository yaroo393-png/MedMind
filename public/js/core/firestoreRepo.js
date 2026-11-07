// ที่เก็บข้อมูลจริงบน Cloud Firestore — ชื่อเมธอดและรูปรับ/คืนเหมือน localRepo (core/repo.js) ทุกตัว (architecture §6.3)
// เจ้าของ: Takkan (core/) · Issue #9 ขั้น B · โมเดลข้อมูลตาม architecture §6.2 · กฎอยู่ที่ firestore.rules (ทดสอบด้วย emulator-tests/)
// รับ SDK ผ่านพารามิเตอร์ (fs = ฟังก์ชันของ firebase/firestore) เพื่อไม่ผูกกับ URL ของ CDN — เทสต์ใน Node ส่ง SDK จาก npm, เบราว์เซอร์ส่งจาก CDN (core/firebase.js)
// หลักการ:
//  1) อ่านจาก "สำเนาในหน่วยความจำ" ที่ onSnapshot ป้อนให้ — วาดหน้าทุกวินาทีก็ไม่เสียโควตาอ่านของ Firestore (แพ็ก Spark จำกัดต่อวัน)
//  2) การเขียนที่ต้องใช้ได้ตอนออฟไลน์ (confirmMeal, reportNotYet, markAlertSeen) ไม่ await การยืนยันจากเซิร์ฟเวอร์ — Firestore เก็บคิวและส่งเมื่อกลับมาออนไลน์
//     ใช้ "เวลาที่กด" (confirmedAt) เดิม (BR-20) · serverReceivedAt เป็นเวลาของเซิร์ฟเวอร์ (R-9)
//  3) การจับคู่/ยกเลิกต้องออนไลน์ (ใช้ batch) — ตัดสินเหตุผลที่ปฏิเสธด้วย logic/pairing.js (joinCheck) เหมือน localRepo แล้ว Rules ตัดสินซ้ำเป็นด่านจริง
import { doseId, buildDose } from '../logic/confirm.js';
import { makeInvite, joinCheck } from '../logic/pairing.js';

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'bedtime'];
const ALERT_KINDS = ['not_confirmed', 'confirmed_late'];
const copy = (value) => structuredClone(value);

// สุ่มจำนวนเต็ม 0…n−1 ด้วย crypto (ห้าม Math.random — รหัสเป็นกุญแจเข้าถึงข้อมูลสุขภาพ DL-20)
function cryptoRandomInt(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % n;
}

function assertMealTimes(mealTimes) {
  for (const key of MEAL_KEYS) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTimes?.[key] ?? '')) throw new TypeError(`เวลามื้อ ${key} ต้องเป็น "HH:MM"`);
  }
}

// Firestore ไม่รับ undefined — แปลงเป็น null และคัดลอกลึก
const clean = (value) => JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)));
const ms = (ts) => (ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null);

/**
 * @param {{ fs: object, db: object, uid: string, clock: { now(): number }, randomInt?: (n: number) => number, onError?: (error: Error) => void }} options
 *   fs = { doc, collection, query, where, onSnapshot, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp, Timestamp }
 *   uid = uid จาก Anonymous Auth · onError = เรียกเมื่อการเขียนแบบไม่รอผล (ออฟไลน์) ถูกปฏิเสธภายหลัง
 */
export function createFirestoreRepo({ fs, db, uid, clock, randomInt = cryptoRandomInt, onError = () => {} }) {
  if (typeof uid !== 'string' || !uid) throw new TypeError('ต้องมี uid จาก Anonymous Auth');
  if (typeof clock?.now !== 'function') throw new TypeError('ต้องส่ง clock ที่มี now()');
  const { doc, collection, query, where, onSnapshot, getDoc, setDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } = fs;

  const state = { pair: null, invite: null, mealTimes: null, medicines: new Map(), doses: new Map(), notYet: new Map(), seen: new Map() };
  const listeners = new Set();
  let pairId = null;
  let lastInviteCode = null;            // จำไว้ลบรหัสค้างเมื่อคู่ถูกลบโดยอีกฝ่าย (NFR-10)
  let unsubPair = [];                   // ตัวฟังของ pairs ที่ค้นด้วย uid (ผู้สูงอายุ/ผู้ดูแล)
  let unsubChildren = [];               // ตัวฟังของเอกสารย่อยของคู่ปัจจุบัน
  const seenLocal = new Set();          // alertSeen ที่จดทันที (ก่อนเซิร์ฟเวอร์ตอบ) กันแจ้งซ้ำ
  const notify = () => listeners.forEach((fn) => fn());
  const fail = (error) => { try { onError(error); } catch { /* ผู้เรียกจัดการเอง */ } };

  // ---------- ตัวฟังข้อมูล ----------
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });
  const first = { senior: false, caregiver: false };
  const checkReady = () => { if (first.senior && first.caregiver && childrenReady === childrenWanted) resolveReady(); };
  let childrenWanted = 0, childrenReady = 0;

  function pairData(snap) {
    const d = snap.data({ serverTimestamps: 'estimate' });
    return { id: snap.id, seniorUid: d.seniorUid, caregiverUid: d.caregiverUid ?? null, consentAt: ms(d.consentAt), inviteCode: d.inviteCode ?? null, mealTimes: d.mealTimes ?? null };
  }

  function detachChildren() {
    unsubChildren.forEach((u) => u());
    unsubChildren = [];
    state.invite = null; state.medicines.clear(); state.doses.clear(); state.notYet.clear(); state.seen.clear();
    childrenWanted = 0; childrenReady = 0;
  }

  // อีกฝ่ายลบคู่ → Firestore ปฏิเสธตัวฟังเอกสารคู่ (Rules ต้องใช้ resource ที่หายไปแล้ว) ไม่ได้ส่งเหตุการณ์ "ถูกลบ" — จึงตีความ permission-denied ว่า "คู่หาย"
  // แล้วเริ่มฟังคำค้น pairs ใหม่ เพื่อเห็นคู่ใหม่ที่จะเกิดตามมา
  let restarting = false;
  function onPairLost(id) {
    if (restarting || pairId !== id) return;
    restarting = true;
    setPair(null);
    startQueries();
    restarting = false;
  }

  function attachChildren(id, inviteCode) {
    const base = (name) => collection(db, 'pairs', id, name);
    const watch = (ref, onData, { isPairDoc = false } = {}) => {
      let got = false;
      childrenWanted += 1;
      unsubChildren.push(onSnapshot(ref, (snap) => {
        onData(snap);
        if (!got) { got = true; childrenReady += 1; checkReady(); }
        notify();
      }, (error) => {
        if (!got) { got = true; childrenReady += 1; checkReady(); }
        if (error?.code === 'permission-denied') { if (isPairDoc) onPairLost(id); return; }   // เอกสารย่อยถูกปฏิเสธเพราะคู่หาย — ไม่ใช่ข้อผิดพลาด
        fail(error);
      }));
    };
    watch(doc(db, 'pairs', id), () => {}, { isPairDoc: true });
    watch(base('medicines'), (snap) => { state.medicines.clear(); snap.forEach((d) => state.medicines.set(d.id, { ...d.data(), id: d.id })); });
    watch(base('doses'), (snap) => {
      state.doses.clear();
      snap.forEach((d) => {
        const x = d.data({ serverTimestamps: 'estimate' });
        state.doses.set(d.id, { scheduledTime: ms(x.scheduledTime), confirmedAt: ms(x.confirmedAt), serverReceivedAt: d.metadata.hasPendingWrites ? null : ms(x.serverReceivedAt), status: x.status, ...(d.metadata.hasPendingWrites ? { pending: true } : {}) });
      });
    });
    watch(base('events'), (snap) => { state.notYet.clear(); snap.forEach((d) => state.notYet.set(d.id, ms(d.data({ serverTimestamps: 'estimate' }).at))); });
    watch(base('alertSeen'), (snap) => {
      state.seen.clear();
      snap.forEach((d) => state.seen.set(d.id, true));
      seenLocal.forEach((key) => state.seen.set(key, true));
    });
    if (inviteCode) {
      watch(doc(db, 'invites', inviteCode), (snap) => {
        if (!snap.exists()) { state.invite = null; return; }
        const d = snap.data({ serverTimestamps: 'estimate' });
        state.invite = { code: snap.id, expiresAt: ms(d.expiresAt), usedAt: ms(d.usedAt), usedBy: d.usedBy ?? null, consented: Boolean(d.consented), hasCaregiver: Boolean(d.hasCaregiver) };
      });
    }
  }

  // เอกสารย่อยอ่านได้ต่อเมื่อเอกสารคู่ "อยู่บนเซิร์ฟเวอร์แล้ว" (Rules ใช้ get(pair)) — ถ้าเริ่มฟังตอนที่คู่ยังเป็นการเขียนในเครื่อง ตัวฟังจะถูกปฏิเสธและหยุดถาวร
  // จึงรอจน snapshot ของคู่ไม่มี pending writes ก่อน (ฟังด้วย includeMetadataChanges)
  let attachedKey = null;
  function setPair(snap) {
    const next = snap ? pairData(snap) : null;
    if (!next) {
      if (pairId !== null) {
        const wasSenior = state.pair?.seniorUid === uid;
        const oldCode = lastInviteCode;
        detachChildren(); attachedKey = null;
        if (wasSenior && oldCode) deleteStaleInvite(oldCode);        // อีกฝ่ายยกเลิกจับคู่ → เก็บกวาดรหัสค้างของเรา
      }
      pairId = null; state.pair = null; state.mealTimes = null;
      notify();
      return;
    }
    const settled = !snap.metadata.hasPendingWrites;
    pairId = next.id; state.pair = next; state.mealTimes = next.mealTimes; lastInviteCode = next.inviteCode;
    const key = `${next.id}|${next.inviteCode}`;
    if (settled && key !== attachedKey) { detachChildren(); attachChildren(next.id, next.inviteCode); attachedKey = key; }
    notify();
  }

  // ฟัง pairs ที่ค้นด้วย uid ของเรา (Rules อนุญาต list เฉพาะคำค้นที่ระบุ uid ของตัวเอง)
  function startQueries() {
    unsubPair.forEach((u) => u());
    unsubPair = [];
    for (const role of ['senior', 'caregiver']) {
      const field = role === 'senior' ? 'seniorUid' : 'caregiverUid';
      unsubPair.push(onSnapshot(query(collection(db, 'pairs'), where(field, '==', uid)), { includeMetadataChanges: true }, (snap) => {
        first[role] = true;
        const found = snap.docs[0] ?? null;
        if (found) setPair(found);
        else if (state.pair && state.pair[field] === uid) setPair(null);   // คู่ของเราหายไป (อีกฝ่ายยกเลิก)
        checkReady();
      }, (error) => { first[role] = true; checkReady(); fail(error); }));
    }
  }
  startQueries();

  async function deleteStaleInvite(code) {
    try { await fs.deleteDoc(doc(db, 'invites', code)); } catch { /* ลบไม่ได้ก็ปล่อย — ไม่มีข้อมูลส่วนบุคคลในรหัส */ }
  }

  const requirePair = () => { if (!state.pair) throw new Error('ยังไม่มีคู่ — เรียก createPairing ก่อน'); };
  const inviteView = () => (state.invite ? copy(state.invite) : null);

  // สร้างเอกสาร pair + invite ในครั้งเดียว · ชนรหัสซ้ำ (หายากมาก) = สร้างรหัสใหม่แล้วลองอีก
  async function writeNewPair() {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const invite = makeInvite({ now: clock.now(), randomInt });
      const newId = doc(collection(db, 'pairs')).id;
      const batch = writeBatch(db);
      batch.set(doc(db, 'pairs', newId), { seniorUid: uid, caregiverUid: null, consentAt: null, inviteCode: invite.code });
      batch.set(doc(db, 'invites', invite.code), { pairId: newId, seniorUid: uid, expiresAt: Timestamp.fromMillis(invite.expiresAt), usedAt: null, usedBy: null, consented: false, hasCaregiver: false });
      try { await batch.commit(); return { pairId: newId, invite }; } catch (error) { if (attempt === 3) throw error; }
    }
    return null;
  }

  async function currentPairing() {
    // รอให้ตัวฟังเห็นเอกสารที่เพิ่งเขียน (local snapshot มาแทบทันที)
    for (let i = 0; i < 50 && !(state.pair && (state.pair.inviteCode ? state.invite : true)); i += 1) await new Promise((r) => setTimeout(r, 20));
    return state.pair ? { pair: pairView(), invite: inviteView() } : null;
  }
  const pairView = () => ({ seniorId: state.pair.seniorUid, caregiverId: state.pair.caregiverUid, consentAt: state.pair.consentAt });

  return {
    /** รอข้อมูลชุดแรกจาก Firestore (ใช้ก่อนวาดหน้าแรก) */
    ready: () => ready,
    /** เลิกฟังทั้งหมด */
    dispose() { unsubPair.forEach((u) => u()); detachChildren(); listeners.clear(); },
    /** uid ของเครื่องนี้ (Anonymous Auth) */
    uid,

    // ---------- FR-01 ----------
    async createPairing({ seniorId }) {
      await ready;
      if (typeof seniorId !== 'string' || !seniorId) throw new TypeError('ต้องมี seniorId');
      if (seniorId !== uid) throw new Error('seniorId ต้องเป็น uid ของเครื่องนี้');
      if (state.pair?.seniorUid === uid) return currentPairing();      // มีคู่อยู่แล้ว ไม่สร้างซ้ำ
      await writeNewPair();
      return currentPairing();
    },
    async createInviteCode() {
      await ready; requirePair();
      const old = state.pair.inviteCode;
      const invite = makeInvite({ now: clock.now(), randomInt });
      const batch = writeBatch(db);
      batch.set(doc(db, 'invites', invite.code), { pairId: state.pair.id, seniorUid: uid, expiresAt: Timestamp.fromMillis(invite.expiresAt), usedAt: null, usedBy: null, consented: Boolean(state.pair.consentAt), hasCaregiver: Boolean(state.pair.caregiverUid) });
      batch.update(doc(db, 'pairs', state.pair.id), { inviteCode: invite.code });
      if (old) batch.delete(doc(db, 'invites', old));                 // รหัสเดิมใช้ไม่ได้อีก (BR-01)
      await batch.commit();
      return (await currentPairing())?.invite ?? null;
    },
    async recordConsent() {
      await ready; requirePair();
      if (state.pair.consentAt) return;
      const batch = writeBatch(db);
      batch.update(doc(db, 'pairs', state.pair.id), { consentAt: serverTimestamp() });
      if (state.pair.inviteCode) batch.update(doc(db, 'invites', state.pair.inviteCode), { consented: true });
      await batch.commit();
    },
    async joinWithCode({ code, caregiverId }) {
      await ready;
      if (typeof caregiverId !== 'string' || !caregiverId) throw new TypeError('ต้องมี caregiverId');
      if (caregiverId !== uid) throw new Error('caregiverId ต้องเป็น uid ของเครื่องนี้');
      const normalized = String(code ?? '').replace(/\s+/g, '');
      let invite = null;
      let pairOfInvite = null;
      let inviteOwner = null;
      if (/^\d{6}$/.test(normalized)) {
        const snap = await getDoc(doc(db, 'invites', normalized));
        if (snap.exists()) {
          const d = snap.data();
          pairOfInvite = d.pairId;
          inviteOwner = d.seniorUid;
          invite = { code: snap.id, expiresAt: ms(d.expiresAt), usedAt: ms(d.usedAt), usedBy: d.usedBy ?? null, consented: Boolean(d.consented), hasCaregiver: Boolean(d.hasCaregiver) };
        }
      }
      const result = joinCheck({ now: clock.now(), invite, enteredCode: code });
      if (!result.ok) return result;
      if (inviteOwner === uid) return { ok: false, reason: 'self_pairing' };   // เครื่องนี้คือเครื่องผู้สูงอายุของคู่นี้เอง
      const batch = writeBatch(db);
      batch.update(doc(db, 'invites', invite.code), { usedAt: serverTimestamp(), usedBy: uid, hasCaregiver: true });
      batch.update(doc(db, 'pairs', pairOfInvite), { caregiverUid: uid });
      try { await batch.commit(); } catch (error) {
        // Rules เป็นด่านจริง: ถูกปฏิเสธ (เช่น นาฬิกาเครื่องคลาด) → ถือว่ารหัสใช้ไม่ได้
        if (error?.code === 'permission-denied') return { ok: false, reason: 'expired' };
        throw error;
      }
      return result;
    },
    async getPairing() {
      await ready;
      return state.pair ? { pair: pairView(), invite: inviteView() } : null;
    },
    /** ยกเลิกจับคู่ (BR-17, NFR-10): ลบเอกสารย่อยทุกชนิด + คู่ + รหัส แล้วผู้สูงอายุได้คู่ใหม่พร้อมรหัสใหม่ */
    async cancelPairing() {
      await ready; requirePair();
      const id = state.pair.id;
      const wasSenior = state.pair.seniorUid === uid;
      const batch = writeBatch(db);
      for (const name of state.medicines.keys()) batch.delete(doc(db, 'pairs', id, 'medicines', name));
      for (const name of state.doses.keys()) batch.delete(doc(db, 'pairs', id, 'doses', name));
      for (const name of state.notYet.keys()) batch.delete(doc(db, 'pairs', id, 'events', name));
      for (const name of state.seen.keys()) batch.delete(doc(db, 'pairs', id, 'alertSeen', name));
      if (wasSenior && state.pair.inviteCode) batch.delete(doc(db, 'invites', state.pair.inviteCode));
      batch.delete(doc(db, 'pairs', id));
      await batch.commit();
      seenLocal.clear();
      for (let i = 0; i < 100 && state.pair?.id === id; i += 1) await new Promise((r) => setTimeout(r, 20));   // รอตัวฟังเห็นว่าคู่หาย
      if (!wasSenior) return null;                                   // ผู้ดูแลไม่สร้างคู่ — ผู้สูงอายุเห็น QR ใหม่ด้วยตัวเอง
      await writeNewPair();                                          // ผู้สูงอายุเห็น QR ใหม่ทันที (FR-01 ข้อ 6)
      return currentPairing();
    },

    // ---------- FR-02 ----------
    async setMealTimes(mealTimes) {
      await ready; requirePair();
      assertMealTimes(mealTimes);
      await updateDoc(doc(db, 'pairs', state.pair.id), { mealTimes: { breakfast: mealTimes.breakfast, lunch: mealTimes.lunch, dinner: mealTimes.dinner, bedtime: mealTimes.bedtime } });
    },
    async getMealTimes() { await ready; return state.mealTimes ? copy(state.mealTimes) : null; },
    async saveMedicine(medicine) {
      await ready; requirePair();
      if (typeof medicine?.name !== 'string' || !medicine.name.trim()) throw new TypeError('ยาต้องมีชื่อ');
      if (!Array.isArray(medicine.slots) || medicine.slots.length === 0) throw new TypeError('ยาต้องมี slot อย่างน้อย 1 ช่อง');
      const id = medicine.id ?? doc(collection(db, 'pairs', state.pair.id, 'medicines')).id;
      const { id: _drop, ...data } = clean(medicine);
      await setDoc(doc(db, 'pairs', state.pair.id, 'medicines', id), data);
      return id;
    },
    async listMedicines() { await ready; return [...state.medicines.values()].sort((a, b) => a.id.localeCompare(b.id)).map(copy); },
    async deleteMedicine(id) {
      await ready; requirePair();
      if (!state.medicines.has(id)) return false;
      await fs.deleteDoc(doc(db, 'pairs', state.pair.id, 'medicines', id));
      return true;
    },

    // ---------- FR-04 ----------
    /** ไม่ await เซิร์ฟเวอร์: ออฟไลน์ก็บันทึกในเครื่องทันที แล้วส่งเมื่อกลับออนไลน์ด้วยเวลาที่กดเดิม (FR-04 ข้อ 7, 9) */
    async confirmMeal({ meal, confirmedAt }) {
      await ready; requirePair();
      const id = doseId(meal);
      if (state.doses.has(id)) return { doseId: id, dose: copy(state.doses.get(id)), created: false };   // กดซ้ำ ไม่สร้างใหม่ (BR-12, NFR-07)
      const built = buildDose({ meal, confirmedAt });
      const dose = { ...built, serverReceivedAt: null, pending: true };
      state.doses.set(id, dose);                                    // จอเปลี่ยนทันที
      notify();
      setDoc(doc(db, 'pairs', state.pair.id, 'doses', id), { scheduledTime: Timestamp.fromMillis(built.scheduledTime), confirmedAt: Timestamp.fromMillis(built.confirmedAt), serverReceivedAt: serverTimestamp(), status: built.status })
        .catch((error) => { state.doses.delete(id); notify(); fail(error); });
      return { doseId: id, dose: copy(dose), created: true };
    },
    async getDoses() { await ready; return Object.fromEntries([...state.doses].map(([id, d]) => [id, copy(d)])); },
    async reportNotYet({ meal, at }) {
      await ready; requirePair();
      if (!Number.isFinite(at)) throw new TypeError('at ต้องเป็นเวลา ms');
      const id = doseId(meal);
      if (state.notYet.has(id)) return { created: false, at: state.notYet.get(id) };
      state.notYet.set(id, at);
      notify();
      setDoc(doc(db, 'pairs', state.pair.id, 'events', id), { kind: 'not_yet_last_round', at: Timestamp.fromMillis(at) })
        .catch((error) => { state.notYet.delete(id); notify(); fail(error); });
      return { created: true, at };
    },
    async getNotYet(meal) { await ready; return state.notYet.get(doseId(meal)) ?? null; },

    // ---------- FR-05 ----------
    async markAlertSeen({ mealId, kind }) {
      await ready; requirePair();
      if (!ALERT_KINDS.includes(kind)) throw new TypeError(`ชนิดการแจ้งต้องเป็น ${ALERT_KINDS.join(' / ')}`);
      const key = `${mealId}_${kind}`;
      if (state.seen.has(key) || seenLocal.has(key)) return { created: false };
      seenLocal.add(key); state.seen.set(key, true);                 // จดทันที กันแจ้งซ้ำระหว่างรอเซิร์ฟเวอร์ (BR-13)
      setDoc(doc(db, 'pairs', state.pair.id, 'alertSeen', key), { seenAt: serverTimestamp() })
        .catch((error) => { seenLocal.delete(key); state.seen.delete(key); notify(); fail(error); });
      return { created: true };
    },
    async getSeen(mealId) {
      await ready;
      return ALERT_KINDS.filter((kind) => state.seen.has(`${mealId}_${kind}`)).sort();
    },

    watch(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
