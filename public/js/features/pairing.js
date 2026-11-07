// FR-01 หน้าจอจับคู่: S-01 จับคู่+ยินยอม · S-04 ตั้งค่า/ยกเลิกจับคู่ (ผู้สูงอายุ) · C-01 จับคู่ · C-09 ตั้งค่า/ยกเลิกจับคู่ (ผู้ดูแล)
// เจ้าของ: Takkan (FR-01) · BR-01, BR-02, BR-17 · NFR-05 · ตัดสินด้วย logic/pairing.js ผ่าน repo (joinWithCode / recordConsent / cancelPairing)
// รูปแบบ (DL-26): screens = ฟังก์ชันล้วน model → { title, covers, body, overlay?, tabs? } ทดสอบด้วย node · actions = ฟังก์ชันที่เรียก repo
import { esc, btn, icon, hero, dialog, qrGrid, prefsCard } from './ui.js';
import { qrSvg } from './qr.js';
import { fmtCountdown, JOIN_TEXT } from './format.js';

const spaced = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;

function unpairDialog(model, who) {
  const text = who === 'senior' ? 'ผู้ดูแลจะเห็นข้อมูลของคุณไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ' : 'คุณจะเห็นข้อมูลของผู้สูงอายุไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ';
  if (model.ui.dialog === 'unpair1') return dialog(`dlg-${who}-1`, 'ยกเลิกจับคู่?', text, 'ต่อไป', 'unpair-next');
  if (model.ui.dialog === 'unpair2') return dialog(`dlg-${who}-2`, 'ยืนยันอีกครั้ง', 'ยาและประวัติการยืนยันจะถูกลบ ย้อนกลับไม่ได้', 'ยืนยันยกเลิกจับคู่', 'unpair-yes');
  return '';
}

export const screens = {
  // S-01 — QR + รหัสโดยไม่ต้องสมัคร/พิมพ์ · ข้อความ 3 ข้อก่อนยินยอม (ข้อ 1)
  'senior-pair'(model) {
    const { snap } = model;
    const invite = snap.pairing?.invite;
    const consented = Boolean(snap.pairing?.pair.consentAt);
    let body;
    if (snap.pairState === 'connected') {
      body = '<h1>เชื่อมต่อแล้ว</h1><p class="lead">ผู้ดูแลเชื่อมต่อกับเครื่องนี้แล้ว</p>' + btn('primary', 'ไปหน้าหลัก', 'go', { to: 'senior-home' });
    } else if (!invite) {
      body = '<p class="hint">กำลังเตรียมรหัส…</p>';
    } else {
      const left = invite.expiresAt - snap.now;
      body = hero('link', 'ให้ลูกหลานสแกน QR', 'ไม่ต้องสมัคร ไม่ต้องพิมพ์') +
        (model.real && model.ctx?.inviteLink
          ? `<div class="card center">${qrSvg(model.ctx.inviteLink(invite.code))}<p class="hint">ผู้ดูแลสแกนด้วยแอปกล้องของมือถือ แล้วกด "เชื่อมต่อ"</p>`
          : `<div class="card center">${qrGrid(invite.code)}<p class="hint">QR ตัวอย่าง (ระบบจริง = ลิงก์ที่สแกนด้วยแอปกล้อง)</p>`) +
        `<p class="code" aria-label="รหัส 6 หลัก">${esc(spaced(invite.code))}</p>` +
        (left < 0 ? '<p class="error">รหัสหมดอายุแล้ว (เกิน 10 นาที)</p>' : `<p class="hint">ใช้ได้ครั้งเดียว · หมดอายุใน ${fmtCountdown(left)}</p>`) +
        btn('ghost', 'สร้างรหัสใหม่', 'new-code') + '</div>' +
        (consented ? '<div class="card ok-box"><strong>ยินยอมแล้ว</strong><p>รอผู้ดูแลเชื่อมต่อ</p></div>'
          : '<div class="card"><h2>ก่อนยินยอม โปรดอ่าน</h2><ol class="consent"><li>ผู้ดูแลจะเห็น: <b>ยา เวลามื้อ และสถานะการยืนยัน</b></li>' +
            '<li>เพื่ออะไร: <b>แจ้งผู้ดูแลเมื่อมื้อยังไม่ยืนยัน</b></li>' +
            '<li>ฝ่ายใดก็ยกเลิกจับคู่ได้ทุกเมื่อ และ <b>ข้อมูลของคู่นี้จะถูกลบ</b></li></ol>' + btn('taken', 'ยินยอม', 'consent') + '</div>');
    }
    return { title: 'จับคู่ + ยินยอม', covers: 'FR-01, BR-01, BR-02 · NFR-05', tabs: snap.pairState === 'connected', body };
  },

  // S-04 — ตั้งค่าการแสดงผล + ยกเลิกจับคู่ 2 ขั้น (ข้อ 6, BR-17)
  'senior-settings'(model) {
    const { snap } = model;
    return { title: 'ตั้งค่า', covers: 'FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', overlay: unpairDialog(model, 'senior'), body:
      '<h1>ตั้งค่า</h1>' + prefsCard(model.pref) +
      `<div class="card"><p>เสียงเตือน: <b>${model.sound ? 'เปิดแล้ว' : 'ยังไม่เปิด (แตะหน้าจอ 1 ครั้ง)'}</b></p></div>` +
      `<div class="card"><h2>จับคู่</h2><p>${snap.pairState === 'connected' ? 'เชื่อมต่อกับผู้ดูแลแล้ว' : 'ยังไม่ได้จับคู่'}</p>` +
      (snap.pairState === 'connected' ? btn('notyet', 'ยกเลิกจับคู่', 'unpair-ask') : '') + '</div>' };
  },

  // C-01 — เปิดจากลิงก์ QR (เติมรหัสให้) หรือกรอกรหัส 6 หลัก (ข้อ 2–5)
  'cg-pair'(model) {
    const { snap, ui } = model;
    let body;
    if (snap.pairState === 'connected') {
      body = '<h1>เชื่อมต่อแล้ว</h1><div class="card ok-box"><p>ได้รับข้อมูลหลังผู้สูงอายุยินยอมแล้ว</p></div>' + btn('primary', 'ไปหน้าสถานะ', 'go', { to: 'cg-status' }) +
        (model.real ? '' : `<div class="card"><p class="hint">ทดสอบ: ผู้ดูแลคนที่สองใช้รหัสเดิม (FR-01 ข้อ 5)</p>${btn('ghost', 'ลองเชื่อมต่อด้วยรหัสเดิม', 'join-second')}</div>`) +
        (ui.error ? `<p class="error" role="alert">${esc(ui.error)}</p>` : '');
    } else {
      body = hero('link', 'เชื่อมต่อกับพ่อแม่', model.real ? 'สแกน QR บนเครื่องผู้สูงอายุ หรือกรอกรหัส 6 หลัก' : 'สแกน QR ด้วยแอปกล้องของมือถือ หรือกรอกรหัส 6 หลัก') +
        (model.real ? btn('primary', 'สแกน QR ด้วยกล้อง', 'scan-qr') : '') +
        `<label class="field"><span>รหัส 6 หลัก</span><input type="text" inputmode="numeric" maxlength="6" data-live="codeInput" value="${esc(ui.codeInput)}" autocomplete="off"></label>` +
        (ui.error ? `<p class="error" role="alert">${esc(ui.error)}</p>` : '') +
        btn(model.real ? 'ghost' : 'primary', 'เชื่อมต่อ', 'join') +
        (model.real ? '<p class="hint">กดสแกนแล้วอนุญาตกล้อง หรือใช้แอปกล้องของมือถือสแกนก็ได้ · ไม่สะดวกสแกน พิมพ์รหัส 6 หลักที่แสดงบนเครื่องผู้สูงอายุ</p>'
          : btn('ghost', 'เปิดจากลิงก์ QR (เติมรหัสให้)', 'fill-code') + '<p class="hint">ในโหมดสาธิต ปุ่ม "เปิดจากลิงก์ QR" จำลองการสแกน QR บนเครื่องผู้สูงอายุ</p>');
    }
    return { title: 'จับคู่', covers: 'FR-01, BR-01, BR-02 · NFR-05', tabs: snap.pairState === 'connected', body };
  },

  // C-09 — ตั้งค่าการแสดงผล + ยกเลิกจับคู่ 2 ขั้น
  'cg-settings'(model) {
    const { snap } = model;
    return { title: 'ตั้งค่า', covers: 'FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', overlay: unpairDialog(model, 'caregiver'), body: '<h1>ตั้งค่า</h1>' + prefsCard(model.pref) +
      `<div class="card"><h2>จับคู่</h2><p>${snap.pairState === 'connected' ? 'เชื่อมต่อกับผู้สูงอายุแล้ว' : 'ยังไม่ได้จับคู่'}</p>` +
      (snap.pairState === 'connected' ? btn('notyet', 'ยกเลิกจับคู่', 'unpair-ask') : '') + '</div>' };
  },
};

// ผู้ดูแลคนที่สอง (ทดสอบข้อ 5) — id สมมติ
const SECOND_CAREGIVER = 'demo-caregiver-2';

// env = { repo, ids, ui, snap, toast, go, rerender } (ประกอบโดย phone.js)
export const actions = {
  /** ผู้สูงอายุแตะ "ยินยอม" (BR-02) */
  async consent(env) { await env.repo.recordConsent(); },
  /** "สร้างรหัสใหม่" — รหัสเดิมใช้ไม่ได้อีก (BR-01) */
  async 'new-code'(env) { await env.repo.createInviteCode(); env.toast('สร้างรหัสใหม่แล้ว — รหัสเดิมใช้ไม่ได้'); },
  /** จำลองสแกน QR: เติมรหัสของเครื่องผู้สูงอายุลงช่อง */
  async 'fill-code'(env) {
    const info = await env.repo.getPairing();
    env.ui.codeInput = info?.invite?.code ?? '';
  },
  /** ผู้ดูแลกรอกรหัสแล้วกด "เชื่อมต่อ" — joinCheck ตัดสิน (ข้อ 2–5) */
  async join(env) {
    const result = await env.repo.joinWithCode({ code: env.ui.codeInput, caregiverId: env.ids.caregiverId });
    env.ui.error = result.ok ? null : JOIN_TEXT[result.reason];
    if (result.ok) { env.ui.codeInput = ''; env.toast('เชื่อมต่อแล้ว'); }
  },
  /** ผู้ดูแลคนที่สองใช้รหัสเดิม → ต้องถูกปฏิเสธ (ข้อ 5) */
  async 'join-second'(env) {
    const info = await env.repo.getPairing();
    const result = await env.repo.joinWithCode({ code: info?.invite?.code, caregiverId: SECOND_CAREGIVER });
    env.ui.error = result.ok ? null : JOIN_TEXT[result.reason];
  },
  'unpair-ask'(env) { env.ui.dialog = 'unpair1'; },
  'unpair-next'(env) { env.ui.dialog = 'unpair2'; },
  'unpair-no'(env) { env.ui.dialog = null; },
  /** ยืนยันขั้นที่ 2 → ลบข้อมูลของคู่ ผู้สูงอายุได้ QR ใหม่ (ข้อ 6, BR-17) */
  async 'unpair-yes'(env) {
    env.ui.dialog = null;
    await env.repo.cancelPairing();
    env.onUnpaired?.();
    env.toast('ยกเลิกจับคู่แล้ว — ข้อมูลของคู่นี้ถูกลบ');
  },
};
