// FR-01 หน้าจอจับคู่: S-01 จับคู่+ยินยอม · S-04 ตั้งค่า/ยกเลิกจับคู่ (ผู้สูงอายุ) · C-01 จับคู่ · C-09 ตั้งค่า/ยกเลิกจับคู่ (ผู้ดูแล)
// เจ้าของ: Takkan (FR-01) · BR-01, BR-02, BR-17 · NFR-05 · ตัดสินด้วย logic/pairing.js ผ่าน repo (joinWithCode / recordConsent / cancelPairing)
// รูปแบบ (DL-26): screens = ฟังก์ชันล้วน model → { title, covers, body, overlay?, tabs? } ทดสอบด้วย node · actions = ฟังก์ชันที่เรียก repo
import { tr, localizeUiMessage, languageControls } from './i18n.js';
import { esc, btn, icon, hero, dialog, qrGrid, prefsCard } from './ui.js';
import { qrSvg } from './qr.js';
import { fmtCountdown, JOIN_TEXT } from './format.js';

const spaced = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;
const languageCard = () => `<section class="card settings-language"><h2>${tr('ภาษา', 'Language')}</h2>${languageControls()}</section>`;

function unpairDialog(model, who) {
  const text = who === 'senior' ? tr('ผู้ดูแลจะเห็นข้อมูลของคุณไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ', "Your caregiver will lose access immediately, and this pair's data will be deleted.") : tr('คุณจะเห็นข้อมูลของผู้สูงอายุไม่ได้ทันที และข้อมูลของคู่นี้จะถูกลบ', "You will lose access to the older adult's data immediately, and this pair's data will be deleted.");
  if (model.ui.dialog === 'unpair1') return dialog(`dlg-${who}-1`, tr('ยกเลิกจับคู่?', "Cancel pairing?"), text, tr('ต่อไป', "Continue"), 'unpair-next');
  if (model.ui.dialog === 'unpair2') return dialog(`dlg-${who}-2`, tr('ยืนยันอีกครั้ง', "Confirm again"), tr('ยาและประวัติการยืนยันจะถูกลบ ย้อนกลับไม่ได้', "Medicines and confirmation history will be deleted. This cannot be undone."), tr('ยืนยันยกเลิกจับคู่', "Confirm cancellation"), 'unpair-yes');
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
      body = tr('<h1>เชื่อมต่อแล้ว</h1><p class="lead">ผู้ดูแลเชื่อมต่อกับเครื่องนี้แล้ว</p>', "<h1>Connected</h1><p class=\"lead\">A caregiver is connected to this device.</p>") + btn('primary', tr('ไปหน้าหลัก', "Go to Home"), 'go', { to: 'senior-home' });
    } else if (!invite) {
      body = tr('<p class="hint">กำลังเตรียมรหัส…</p>', "<p class=\"hint\">Preparing a code…</p>");
    } else {
      const left = invite.expiresAt - snap.now;
      body = hero('link', tr('ให้ลูกหลานสแกน QR', "Ask your caregiver to scan the QR code"), tr('ไม่ต้องสมัคร ไม่ต้องพิมพ์', "No sign-up or typing needed")) +
        (model.real && model.ctx?.inviteLink
          ? tr(`<div class="card center">${qrSvg(model.ctx.inviteLink(invite.code))}<p class="hint">ผู้ดูแลสแกนด้วยแอปกล้องของมือถือ แล้วกด "เชื่อมต่อ"</p>`, `<div class="card center">${qrSvg(model.ctx.inviteLink(invite.code))}<p class="hint">The caregiver can scan with the phone camera, then tap "Connect".</p>`)
          : tr(`<div class="card center">${qrGrid(invite.code)}<p class="hint">QR ตัวอย่าง (ระบบจริง = ลิงก์ที่สแกนด้วยแอปกล้อง)</p>`, `<div class="card center">${qrGrid(invite.code)}<p class="hint">Sample QR (the live app provides a link to scan with a camera)</p>`)) +
        tr(`<p class="code" aria-label="รหัส 6 หลัก">${esc(spaced(invite.code))}</p>`, `<p class="code" aria-label="Six-digit code">${esc(spaced(invite.code))}</p>`) +
        (left < 0 ? tr('<p class="error">รหัสหมดอายุแล้ว (เกิน 10 นาที)</p>', "<p class=\"error\">Code expired (more than 10 minutes)</p>") : tr(`<p class="hint">ใช้ได้ครั้งเดียว · หมดอายุใน ${fmtCountdown(left)}</p>`, `<p class="hint">One use only · Expires in ${fmtCountdown(left)}</p>`)) +
        btn('ghost', tr('สร้างรหัสใหม่', "Create a new code"), 'new-code') + '</div>' +
        (consented ? tr('<div class="card ok-box"><strong>ยินยอมแล้ว</strong><p>รอผู้ดูแลเชื่อมต่อ</p></div>', "<div class=\"card ok-box\"><strong>Consent given</strong><p>Waiting for the caregiver to connect</p></div>")
          : tr('<div class="card"><h2>ก่อนยินยอม โปรดอ่าน</h2><ol class="consent"><li>ผู้ดูแลจะเห็น: <b>ยา เวลามื้อ และสถานะการยืนยัน</b></li>', "<div class=\"card\"><h2>Please read before consenting</h2><ol class=\"consent\"><li>Your caregiver can see: <b>medicines, meal times and confirmation status</b></li>") +
            tr('<li>เพื่ออะไร: <b>แจ้งผู้ดูแลเมื่อมื้อยังไม่ยืนยัน</b></li>', "<li>Purpose: <b>to alert the caregiver when a meal is not yet confirmed</b></li>") +
            tr('<li>ฝ่ายใดก็ยกเลิกจับคู่ได้ทุกเมื่อ และ <b>ข้อมูลของคู่นี้จะถูกลบ</b></li></ol>', "<li>Either person can cancel pairing at any time, and <b>this pair's data will be deleted</b></li></ol>") + btn('taken', tr('ยินยอม', "I consent"), 'consent') + '</div>');
    }
    return { title: tr('จับคู่ + ยินยอม', "Pairing and consent"), covers: 'FR-01, BR-01, BR-02 · NFR-05', tabs: snap.pairState === 'connected', body };
  },

  // S-04 — ตั้งค่าการแสดงผล + ยกเลิกจับคู่ 2 ขั้น (ข้อ 6, BR-17)
  'senior-settings'(model) {
    const { snap } = model;
    return { title: tr('ตั้งค่า', "Settings"), covers: tr('FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', "FR-01, BR-17 (two-step cancellation)"), tabs: snap.pairState === 'connected', overlay: unpairDialog(model, 'senior'), body:
      tr('<h1>ตั้งค่า</h1>', "<h1>Settings</h1>") + languageCard() + prefsCard(model.pref) +
      tr(`<div class="card"><p>เสียงเตือน: <b>${model.sound ? tr('เปิดแล้ว', "Enabled") : tr('ยังไม่เปิด (แตะหน้าจอ 1 ครั้ง)', "Not enabled (tap the screen once)")}</b></p></div>`, `<div class="card"><p>Reminder sound: <b>${model.sound ? tr('เปิดแล้ว', "Enabled") : tr('ยังไม่เปิด (แตะหน้าจอ 1 ครั้ง)', "Not enabled (tap the screen once)")}</b></p></div>`) +
      tr(`<div class="card"><h2>จับคู่</h2><p>${snap.pairState === 'connected' ? tr('เชื่อมต่อกับผู้ดูแลแล้ว', "Connected to the caregiver") : tr('ยังไม่ได้จับคู่', "Not paired")}</p>`, `<div class="card"><h2>Pairing</h2><p>${snap.pairState === 'connected' ? tr('เชื่อมต่อกับผู้ดูแลแล้ว', "Connected to the caregiver") : tr('ยังไม่ได้จับคู่', "Not paired")}</p>`) +
      (snap.pairState === 'connected' ? btn('notyet', tr('ยกเลิกจับคู่', "Cancel pairing"), 'unpair-ask') : '') + '</div>' };
  },

  // C-01 — เปิดจากลิงก์ QR (เติมรหัสให้) หรือกรอกรหัส 6 หลัก (ข้อ 2–5)
  'cg-pair'(model) {
    const { snap, ui } = model;
    let body;
    if (snap.pairState === 'connected') {
      body = tr('<h1>เชื่อมต่อแล้ว</h1><div class="card ok-box"><p>ได้รับข้อมูลหลังผู้สูงอายุยินยอมแล้ว</p></div>', "<h1>Connected</h1><div class=\"card ok-box\"><p>Data is shared after the older adult has consented.</p></div>") +
        (snap.mealTimes ? btn('primary', tr('ไปหน้าสถานะ', "View status"), 'go', { to: 'cg-status' }) : btn('primary', tr('ขั้นต่อไป: ตั้งเวลามื้อ', "Next: set meal times"), 'go', { to: 'cg-meals' }) + btn('ghost', tr('ไปหน้าสถานะ', "View status"), 'go', { to: 'cg-status' })) +
        (model.real ? '' : tr(`<div class="card"><p class="hint">ทดสอบ: ผู้ดูแลคนที่สองใช้รหัสเดิม (FR-01 ข้อ 5)</p>${btn('ghost', tr('ลองเชื่อมต่อด้วยรหัสเดิม', "Try connecting with the same code"), 'join-second')}</div>`, `<div class="card"><p class="hint">Test: a second caregiver tries the same code (FR-01 AC5)</p>${btn('ghost', tr('ลองเชื่อมต่อด้วยรหัสเดิม', "Try connecting with the same code"), 'join-second')}</div>`)) +
        (ui.error ? `<p class="error" role="alert">${esc(localizeUiMessage(ui.error))}</p>` : '');
    } else {
      body = hero('link', tr('เชื่อมต่อกับพ่อแม่', "Connect with the older adult"), model.real ? tr('สแกน QR บนเครื่องผู้สูงอายุ หรือกรอกรหัส 6 หลัก', "Scan the QR on the older adult's device, or enter the six-digit code") : tr('สแกน QR ด้วยแอปกล้องของมือถือ หรือกรอกรหัส 6 หลัก', "Scan with your phone camera, or enter the six-digit code")) +
        (model.real ? btn('primary', tr('สแกน QR ด้วยกล้อง', "Scan QR with camera"), 'scan-qr') : '') +
        tr(`<label class="field"><span>รหัส 6 หลัก</span><input type="text" inputmode="numeric" dir="ltr" maxlength="7" data-live="codeInput" value="${esc(ui.codeInput)}" autocomplete="off" spellcheck="false"></label>`, `<label class="field"><span>Six-digit code</span><input type="text" inputmode="numeric" dir="ltr" maxlength="7" data-live="codeInput" value="${esc(ui.codeInput)}" autocomplete="off" spellcheck="false"></label>`) +
        (ui.error ? `<p class="error" role="alert">${esc(localizeUiMessage(ui.error))}</p>` : '') +
        btn(model.real ? 'ghost' : 'primary', tr('เชื่อมต่อ', "Connect"), 'join') +
        (model.real ? tr('<p class="hint">กดสแกนแล้วอนุญาตกล้อง หรือใช้แอปกล้องของมือถือสแกนก็ได้ · ไม่สะดวกสแกน พิมพ์รหัส 6 หลักที่แสดงบนเครื่องผู้สูงอายุ</p>', "<p class=\"hint\">Tap Scan and allow camera access, or use your phone camera app. You can also enter the six-digit code shown on the older adult's device.</p>")
          : btn('ghost', tr('เปิดจากลิงก์ QR (เติมรหัสให้)', "Open QR link (fill in the code)"), 'fill-code') + tr('<p class="hint">ในโหมดสาธิต ปุ่ม "เปิดจากลิงก์ QR" จำลองการสแกน QR บนเครื่องผู้สูงอายุ</p>', "<p class=\"hint\">In Demo mode, \"Open QR link\" simulates scanning the older adult's QR code.</p>"));
    }
    return { title: tr('จับคู่', "Pairing"), covers: 'FR-01, BR-01, BR-02 · NFR-05', tabs: snap.pairState === 'connected', body };
  },

  // C-09 — ตั้งค่าการแสดงผล + ยกเลิกจับคู่ 2 ขั้น
  'cg-settings'(model) {
    const { snap } = model;
    return { title: tr('ตั้งค่า', "Settings"), covers: tr('FR-01, BR-17 (ยกเลิกจับคู่ 2 ขั้น)', "FR-01, BR-17 (two-step cancellation)"), tabs: snap.pairState === 'connected', overlay: unpairDialog(model, 'caregiver'), body: tr('<h1>ตั้งค่า</h1>', "<h1>Settings</h1>") + languageCard() +
      (snap.pairState === 'connected' ? tr(`<div class="card"><h2>เวลามื้อ</h2><p>${snap.mealTimes ? tr('ตั้งแล้ว — แก้ได้', "Set — you can change these times") : tr('ยังไม่ได้ตั้ง', "Not set")}</p>${btn('ghost', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' })}</div>`, `<div class="card"><h2>Meal times</h2><p>${snap.mealTimes ? tr('ตั้งแล้ว — แก้ได้', "Set — you can change these times") : tr('ยังไม่ได้ตั้ง', "Not set")}</p>${btn('ghost', tr('ตั้งเวลามื้อ', "Set meal times"), 'go', { to: 'cg-meals' })}</div>`) : '') + prefsCard(model.pref) +
      tr(`<div class="card"><h2>จับคู่</h2><p>${snap.pairState === 'connected' ? tr('เชื่อมต่อกับผู้สูงอายุแล้ว', "Connected to the older adult") : tr('ยังไม่ได้จับคู่', "Not paired")}</p>`, `<div class="card"><h2>Pairing</h2><p>${snap.pairState === 'connected' ? tr('เชื่อมต่อกับผู้สูงอายุแล้ว', "Connected to the older adult") : tr('ยังไม่ได้จับคู่', "Not paired")}</p>`) +
      (snap.pairState === 'connected' ? btn('notyet', tr('ยกเลิกจับคู่', "Cancel pairing"), 'unpair-ask') : '') + '</div>' };
  },
};

// ผู้ดูแลคนที่สอง (ทดสอบข้อ 5) — id สมมติ
const SECOND_CAREGIVER = 'demo-caregiver-2';

// env = { repo, ids, ui, snap, toast, go, rerender } (ประกอบโดย phone.js)
export const actions = {
  /** ผู้สูงอายุแตะ "ยินยอม" (BR-02) */
  async consent(env) { await env.repo.recordConsent(); },
  /** "สร้างรหัสใหม่" — รหัสเดิมใช้ไม่ได้อีก (BR-01) */
  async 'new-code'(env) { await env.repo.createInviteCode(); env.toast(tr('สร้างรหัสใหม่แล้ว — รหัสเดิมใช้ไม่ได้', "New code created — the previous code no longer works.")); },
  /** จำลองสแกน QR: เติมรหัสของเครื่องผู้สูงอายุลงช่อง */
  async 'fill-code'(env) {
    const info = await env.repo.getPairing();
    env.ui.codeInput = info?.invite?.code ?? '';
  },
  /** ผู้ดูแลกรอกรหัสแล้วกด "เชื่อมต่อ" — joinCheck ตัดสิน (ข้อ 2–5) */
  async join(env) {
    const result = await env.repo.joinWithCode({ code: env.ui.codeInput, caregiverId: env.ids.caregiverId });
    env.ui.error = result.ok ? null : JOIN_TEXT[result.reason];
    if (result.ok) { env.ui.codeInput = ''; env.toast(tr('เชื่อมต่อแล้ว', "Connected")); }
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
    env.toast(tr('ยกเลิกจับคู่แล้ว — ข้อมูลของคู่นี้ถูกลบ', "Pairing cancelled — this pair's data has been deleted."));
  },
};
