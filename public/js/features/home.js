// FR-04 ยืนยันมื้อยา: S-02 หน้าหลักวันนี้ + การกด "กินแล้ว" / "ยังไม่กิน" (หน้าเตือนของ FR-03 ก็เรียกการกดชุดเดียวกันนี้)
// เจ้าของ: Nichanan (FR-04) · BR-10, BR-11, BR-12, BR-14, BR-15, BR-20, BR-21 · NFR-07
// ตัดสินด้วย logic/mealTimeline.js (canConfirm, round) และ logic/confirm.js (ผ่าน repo.confirmMeal) — ไฟล์นี้ไม่คำนวณเวลาเอง
import { esc, btn, icon, logo, mascot, mealCard, medSummary, heroCard } from './ui.js';
import { fmtHM, thaiDate } from './format.js';
import { focusMeal } from './model.js';
import { MINUTE_MS, REMINDER_OFFSETS_MIN } from '../logic/time.js';

const LAST_ROUND = REMINDER_OFFSETS_MIN.length - 1; // รอบ T+10 = รอบสุดท้าย

export const screens = {
  // S-02
  'senior-home'(model) {
    const { meals, dateKey } = model.snap;
    const f = focusMeal(meals);
    const missed = meals.filter((m) => m.st.state === 'missed').length;
    let hero;
    if (!meals.length) hero = `<div class="card empty">${mascot('greeting', 96)}<h2 class="h-card">วันนี้ไม่มีมื้อยา</h2></div>`;
    else if (f?.st.state === 'reminding') hero = heroCard('encourage', 'ถึงเวลามื้อยาแล้ว', `มื้อ ${esc(f.reminderTime)}`, medSummary(f), btn('light', `${icon('pill')}ดูมื้อนี้`, 'go', { to: 'senior-reminder' }));
    else if (f?.st.state === 'not_confirmed') hero = heroCard('concern', 'มื้อนี้ยังไม่ยืนยัน', `มื้อ ${esc(f.reminderTime)}`, 'ถ้ากินแล้ว กดยืนยันย้อนหลังได้', btn('taken', 'กินแล้ว', 'confirm', { meal: f.id }));
    else if (f) hero = heroCard('greeting', 'มื้อถัดไป', `มื้อ ${esc(f.reminderTime)}`, medSummary(f), '');
    else if (missed) hero = heroCard('concern', 'วันนี้', 'มีมื้อที่พ้นเวลายืนยันแล้ว', 'สถานะยังเป็น "ยังไม่ยืนยัน"', '');
    else hero = heroCard('celebrate', 'วันนี้', 'ยืนยันครบทุกมื้อที่ถึงเวลาแล้ว', '', '');

    let body = `<div class="greet">${logo('logo-sm')}<div><h1>สวัสดี</h1><p>${esc(thaiDate(dateKey))}</p></div></div>${hero}`;
    if (meals.length) body += `<div class="sec-head"><h2>ทุกมื้อวันนี้</h2><span class="count">${meals.length} มื้อ</span></div>`;
    for (const m of meals) {
      let extra = '';
      if (m.st.state === 'not_confirmed') extra = '<p class="hint">ยังกดยืนยันย้อนหลังได้จนถึงเวลาเตือนของมื้อถัดไป</p>' + btn('taken', 'กินแล้ว', 'confirm', { meal: m.id });
      else if (m.st.state === 'reminding') extra = btn('primary', 'ไปหน้าเตือน', 'go', { to: 'senior-reminder' });
      else if (m.st.state === 'missed') extra = '<p class="hint">พ้นเวลายืนยันแล้ว — สถานะยังเป็น "ยังไม่ยืนยัน"</p>';
      body += mealCard(m, extra);
    }
    return { title: 'หน้าหลัก', covers: 'FR-04, FR-03 · BR-14, BR-15, BR-09', body };
  },
};

export const actions = {
  /** "กินแล้ว" — กดครั้งเดียวยืนยันทั้งมื้อ · กดซ้ำไม่สร้างใหม่ (BR-10, BR-12) · พ้นหน้าต่างกดไม่ได้ (BR-15, BR-21) */
  async confirm(env, d) {
    const meal = env.snap.meals.find((m) => m.id === d.meal);
    if (!meal) return;
    if (!meal.st.canConfirm && !meal.dose) { env.toast('พ้นเวลายืนยันแล้ว — กดไม่ได้ สถานะยังเป็น "ยังไม่ยืนยัน"'); return; }
    const result = await env.repo.confirmMeal({ meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, confirmedAt: env.clock.now() });
    const at = fmtHM(result.dose.confirmedAt);
    if (!result.created) env.toast(`มีบันทึกอยู่แล้ว ไม่สร้างซ้ำ — เวลาเดิม ${at}`);
    else env.toast(result.queued ? `บันทึกแล้ว ${at} — จะส่งให้ผู้ดูแลเมื่อออนไลน์` : `บันทึกแล้ว ${at}`);
  },

  /** "ยังไม่กิน" — รอบ T/T+5: เตือนอีกตามเวลา · รอบ T+10 (รอบสุดท้าย): แจ้งผู้ดูแลทันที ไม่รอ T+15 (BR-11) */
  async notyet(env, d) {
    const meal = env.snap.meals.find((m) => m.id === d.meal);
    if (!meal || meal.st.state !== 'reminding') return;
    const round = meal.st.round;
    if (round >= LAST_ROUND) {
      await env.repo.reportNotYet({ meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, at: env.clock.now() });
      env.toast('รับทราบ — แจ้งผู้ดูแลแล้ว');
    } else {
      const next = meal.T + REMINDER_OFFSETS_MIN[round + 1] * MINUTE_MS;
      env.toast(`จะเตือนอีกครั้งตอน ${fmtHM(next)}`);
    }
  },
};
