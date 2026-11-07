// ตัวช่วยของเทสต์ Emulator — ผู้ใช้นิรนามหลายคน (หลายแอป) บน Firestore Emulator เครื่องเดียว
// หมายเหตุ: ไม่ใช่เทสต์เอง (ชื่อไม่ลงท้าย .spec.mjs) · โปรเจกต์ demo-medmind ไม่แตะโปรเจกต์จริง
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import * as fs from 'firebase/firestore';

export const PROJECT = 'demo-medmind';
export { fs };
let counter = 0;

/** สร้างผู้ใช้นิรนาม 1 คน = แอป Firebase 1 ตัว (uid ของตัวเอง) */
export async function newUser(label = 'user') {
  const app = initializeApp({ apiKey: 'fake-key', projectId: PROJECT, authDomain: 'localhost' }, `${label}-${++counter}-${Date.now()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const cred = await signInAnonymously(auth);
  const db = fs.initializeFirestore(app, { experimentalForceLongPolling: false });
  fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { uid: cred.user.uid, db, app, label };
}

/** ล้างข้อมูล Firestore ทั้งหมดใน Emulator (ระหว่างเทสต์) */
export async function clearAll() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const res = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
    if (res.ok) return;
    await new Promise((r) => setTimeout(r, 250));   // เทสต์ก่อนหน้ายังมีการเขียนค้างอยู่ — รอแล้วลองใหม่
  }
  throw new Error('ล้าง Emulator ไม่สำเร็จ');
}

/** นับเอกสารใต้ path (เส้นทางของคอลเลกชัน) ด้วยสิทธิ์ผู้ดูแลระบบของ Emulator (ข้าม Rules) */
export async function countDocs(path) {
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers: { Authorization: 'Bearer owner' } });
  const body = await res.json();
  return (body.documents ?? []).length;
}

/** รอจนเงื่อนไขเป็นจริง (ตัวฟังของ Firestore ส่งข้อมูลแบบ async) */
export async function until(check, label = 'เงื่อนไข', timeoutMs = 8000) {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error(`หมดเวลารอ: ${label}`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

/** ผลของคำสั่ง: 'ok' หรือรหัส error (เช่น 'permission-denied') — ใช้ตรวจว่า Rules อนุญาต/ปฏิเสธ */
export async function outcome(promise) {
  try { await promise; return 'ok'; } catch (error) { return error?.code ?? String(error); }
}

/** id ของ pairs เอกสารแรก (ด้วยสิทธิ์ผู้ดูแลระบบของ Emulator) */
export async function firstPairId() {
  const res = await fetch(`http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents/pairs`, { headers: { Authorization: 'Bearer owner' } });
  const body = await res.json();
  return body.documents?.[0]?.name.split('/').pop() ?? null;
}
