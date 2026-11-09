// FR-03 เตือนกินยา: S-03 หน้าเตือน — ยาทั้งมื้อบนหน้าเดียว · ปุ่ม "กินแล้ว" / "ยังไม่กิน" · เสียงเตือนหลังแตะหน้าจอครั้งแรก (SRS §2.2)
// เจ้าของ: Rossatorn (FR-03) · BR-08, BR-09, BR-16, BR-18, BR-21 · ตัดสินรอบเตือนด้วย logic/mealTimeline.js (mealState) — ไฟล์นี้แค่วาด
// การกดปุ่มใช้ actions ของ FR-04 (features/home.js): confirm / notyet
import { esc, btn, chip, icon, mascot, medList } from './ui.js';
import { statusLabel } from './format.js';
import { tr } from './i18n.js';

export const screens = {
  // S-03 — หลายมื้อพร้อมกัน (BR-16) แยกหัวข้อ/ปุ่ม เสียงดังครั้งเดียว · เปิดหน้ากลับ (BR-18) เห็นรอบปัจจุบันทันที ไม่ย้อนเล่นรอบเก่า
  'senior-reminder'(model) {
    const { meals } = model.snap;
    const ring = meals.filter((m) => m.st.state === 'reminding');
    const done = meals.filter((m) => m.dose && (m.st.state === 'taken' || m.st.state === 'taken_late'));

    let body = '';
    for (const m of ring) {
      body += `<section class="remind" aria-label="${tr('มื้อ', 'Meal')} ${esc(m.reminderTime)}">` +
        `<p class="round-pill">${icon('bell')}${tr(`เตือนรอบที่ ${m.st.round + 1} จาก 3`, `Reminder ${m.st.round + 1} of 3`)}</p><h2>${tr('มื้อ', 'Meal')} ${esc(m.reminderTime)}</h2>` +
        `<div class="card card-alert"><p class="hint">${tr(`ยาทั้งมื้อ · ${m.medicines.length} รายการ`, `All medicine for this meal · ${m.medicines.length} ${m.medicines.length === 1 ? 'item' : 'items'}`)}</p>${medList(m)}</div>` +
        `<div class="choice">${btn('taken', `${icon('check')}${tr('กินแล้ว', 'Taken')}`, 'confirm', { meal: m.id })}${btn('notyet', tr('ยังไม่กิน', 'Not yet'), 'notyet', { meal: m.id })}</div>` +
        `<p class="hint center">${tr('กด "กินแล้ว" ครั้งเดียว ยืนยันยาทั้งมื้อนี้', 'Tap “Taken” once to confirm all medicine in this meal')}</p></section>`;
    }
    if (ring.length) {
      body = `<div class="hero-row">${mascot('encourage', 84)}<div><h1>${tr('ถึงเวลามื้อยาแล้ว', 'It is time for your medicine')}</h1>` +
        (ring.length > 1 ? `<p class="lead">${tr(`มี ${ring.length} มื้อพร้อมกัน — เรียงตามเวลา แต่ละมื้อมีปุ่มของตัวเอง เสียงดังครั้งเดียว (BR-16)`, `${ring.length} meals are due together — listed by time, each with its own buttons. The sound plays once (BR-16)`)}</p>` : '') + `</div></div>${body}`;
    } else {
      body = `<div class="card empty">${mascot(done.length ? 'celebrate' : 'greeting', 96)}<h1 class="h-section">${tr('ยังไม่มีมื้อที่ต้องกินตอนนี้', 'No medication meal is due right now')}</h1><p class="hint">${tr('กดปุ่มเวลาจำลองด้านบนเพื่อไปถึงเวลาเตือน', 'Use the demo clock above to move to a reminder time')}</p></div>`;
    }
    if (done.length) {
      body += `<div class="sec-head"><h2>${tr('ยืนยันแล้ววันนี้', 'Confirmed today')}</h2></div>`;
      for (const m of done) {
        body += `<section class="card"><div class="card-head"><h2 class="h-card">${tr('มื้อ', 'Meal')} ${esc(m.reminderTime)}</h2>${chip(statusLabel(m.st.state, m.dose.confirmedAt))}</div>` +
          (m.pending ? `<p class="hint">${tr('รอส่งให้ผู้ดูแล — จะส่งเมื่อกลับมาออนไลน์', 'Waiting to send to the caregiver — will send when back online')}</p>` : '') +
          btn('ghost', tr('กด "กินแล้ว" ซ้ำ (ทดสอบ BR-12)', 'Tap “Taken” again (test BR-12)'), 'confirm', { meal: m.id }) + '</section>';
      }
    }

    let bar = '', overlay = '';
    if (ring.length && !model.sound) { // ยังไม่ปลดล็อกเสียง: เตือนด้วยกล่อง + ปุ่ม (เบราว์เซอร์ต้องมีการแตะก่อนเล่นเสียง)
      bar = `<button type="button" class="sound-bar" data-act="unlock-sound">${icon('bell')}${tr('แตะหน้าจอเพื่อเปิดเสียง', 'Tap to enable sound')}</button>`;
      overlay = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="snd-${model.role}"><div class="modal-box">${mascot('encourage', 96)}` +
        `<h2 id="snd-${model.role}">${tr('ถึงเวลากินยา', 'Time for your medicine')}</h2><p>${tr(`มี ${ring.length} มื้อที่ต้องกิน`, `${ring.length} ${ring.length === 1 ? 'meal is' : 'meals are'} due`)}</p>${btn('primary', tr('เปิดเสียงและดูยา', 'Enable sound and view medicine'), 'unlock-sound')}</div></div>`;
    }
    return { title: tr('เตือนกินยา', 'Medicine reminders'), covers: 'FR-03, FR-04 · BR-08, BR-09, BR-10, BR-11, BR-12, BR-16', body: bar + body, overlay };
  },
};

export const actions = {
  'unlock-sound'(env) { env.unlockSound(); },
};
