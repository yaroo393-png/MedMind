// เปลือกของหน้าที่ใช้งานจริง (senior.html / caregiver.html): 1 เครื่อง = 1 บทบาท (ADR-9) ใช้ Firestore จริงผ่าน createFirestoreRepo
// เจ้าของ: Nichanan (E-5, ร่วมกับ Takkan) · หน้าจอชุดเดียวกับ Demo mode (phone.js) — ต่างแค่ repo และนาฬิกาจริง
// ไฟล์นี้แตะ DOM · ทดสอบจริงบนมือถือ 2 เครื่อง (MT-01, MT-05, MT-06, MT-11) และด้วย Emulator ผ่าน ?emulator=1 (เฉพาะ localhost)
import { Phone } from './phone.js';
import { connectFirebase } from '../core/firebase.js';
import { createFirestoreRepo } from '../core/firestoreRepo.js';
import { createClock } from '../core/clock.js';
import { esc } from './ui.js';
import { aiLabelFromFirebase } from '../services/aiLabel.js';
import { loadPhoto, redactImage } from '../services/redact.js';

const pad = (n) => String(n).padStart(2, '0');
const dateKeyOf = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/**
 * เริ่มหน้าใช้งานจริง
 * @param {{ role: 'senior'|'caregiver', root: HTMLElement, search?: string, hostname?: string }} options
 */
export async function bootReal({ role, root, search = '', hostname = '', href = '' }) {
  try { globalThis.localStorage?.setItem('mm-role', role); } catch { /* จำบทบาทไม่ได้ก็ไม่เป็นไร */ }   // ลิงก์เดียว: เปิดครั้งหน้าเข้าบทบาทนี้เลย (index.html)
  try { globalThis.navigator?.serviceWorker?.register('sw.js'); } catch { /* ติดตั้งลงหน้าจอหลักไม่ได้ก็ใช้งานได้ปกติ */ }   // PWA: เปลือกแอปเปิดได้แม้ไม่มีเน็ต
  root.innerHTML = '<p class="hint" role="status">กำลังเชื่อมต่อ…</p>';
  // ตัวเลือกสำหรับนักพัฒนา: ใช้ได้เฉพาะ localhost (ทดสอบกับ Emulator) — บนเว็บจริงถูกเมินเสมอ
  const params = new URLSearchParams(search);
  const dev = hostname === 'localhost' || hostname === '127.0.0.1';
  const sdkBase = dev && params.get('sdk') ? params.get('sdk') : undefined;
  const emulator = dev && params.get('emulator') === '1';
  let phone = null;
  try {
    const fb = await connectFirebase({ sdkBase, emulator });
    const clock = createClock();                                       // นาฬิกาจริง
    const errors = [];
    const repo = createFirestoreRepo({ fs: fb.fs, db: fb.db, uid: fb.uid, clock, onError: (e) => { errors.push(e); phone?.toast(`ส่งข้อมูลไม่สำเร็จ: ${e.code ?? e.message}`); } });
    root.innerHTML = '';
    const ctx = {
      name: 'real', clock, repo, seniorRepo: repo, queue: null,
      get dateKey() { return dateKeyOf(clock.now()); },
      ids: { seniorId: fb.uid, caregiverId: fb.uid },
      flags: { aiProblem: '', seniorOpen: true, cgOpen: true },
      refresh: () => phone?.render(), onUnpaired: () => phone?.bind(ctx, role === 'senior' ? 'senior-pair' : 'cg-pair'),
      firebase: fb,
      ai: aiLabelFromFirebase(fb, { isOnline: () => globalThis.navigator?.onLine !== false }),   // FR-02: Gemini ผ่าน Firebase AI Logic
      photo: {                                                                                   // FR-02 ข้อ 9: รูปอยู่ในเครื่อง ปิดแถบดำก่อนส่ง
        async load(file) { const p = await loadPhoto(file); return { ...p, url: URL.createObjectURL(file) }; },
        release(p) { try { URL.revokeObjectURL(p.url); p.bitmap?.close?.(); } catch { /* ไม่สำคัญ */ } },
        redact: (p, rects) => redactImage(p.bitmap, rects),
      },
      // ลิงก์ใน QR: เปิดหน้าเครื่องผู้ดูแลพร้อมเติมรหัสให้ (FR-01 ข้อ 1, 3)
      inviteLink: (code) => (href ? new URL(`index.html?code=${code}`, href).href : `index.html?code=${code}`),
    };
    phone = new Phone(root, { role, ctx, route: role === 'senior' ? 'senior-home' : 'cg-status' });
    phone.bind(ctx, role === 'senior' ? 'senior-home' : 'cg-status');
    const code = params.get('code');
    if (role === 'caregiver' && /^\d{6}$/.test(code ?? '')) phone.ui.codeInput = code;   // เปิดจากลิงก์ QR → เติมรหัสให้
    await repo.ready();
    repo.watch(() => ctx.refresh());
    globalThis.setInterval(() => ctx.refresh(), 1000);                 // เวลาผ่านไป → รอบเตือน/ขอบ T+15 เปลี่ยน (อ่านจากสำเนาในเครื่อง ไม่เสียโควตา)
    ctx.refresh();
    return { phone, ctx, repo };
  } catch (error) {
    root.innerHTML = `<div class="card warn" role="alert"><h1>เชื่อมต่อไม่ได้</h1><p>${esc(error?.message ?? error)}</p><p class="hint">ตรวจอินเทอร์เน็ต แล้วเปิดหน้านี้ใหม่ · หรือ <a href="index.html?choose=1">เลือกบทบาทใหม่</a> · <a href="demo.html">โหมดสาธิต</a></p></div>`;
    throw error;
  }
}
