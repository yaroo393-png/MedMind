// FR-04 ยืนยันมื้อยา: S-02 หน้าหลักวันนี้ + การกด "กินแล้ว" / "ยังไม่กิน" (หน้าเตือนของ FR-03 ก็เรียกการกดชุดเดียวกันนี้)
// เจ้าของ: Nichanan (FR-04) · BR-10, BR-11, BR-12, BR-14, BR-15, BR-20, BR-21 · NFR-07
// ตัดสินด้วย logic/mealTimeline.js (canConfirm, round) และ logic/confirm.js (ผ่าน repo.confirmMeal) — ไฟล์นี้ไม่คำนวณเวลาเอง
import { esc, btn, icon, logo, mascot, mealCard, medSummary, heroCard } from './ui.js';
import { fmtHM, thaiDate } from './format.js';
import { focusMeal } from './model.js';
import { MINUTE_MS, REMINDER_OFFSETS_MIN } from '../logic/time.js';
import { tr } from './i18n.js';

const LAST_ROUND = REMINDER_OFFSETS_MIN.length - 1; // รอบ T+10 = รอบสุดท้าย

export const screens = {
  // S-02
  'senior-home'(model) {
    const { meals, dateKey } = model.snap;
    const f = focusMeal(meals);
    const missed = meals.filter((m) => m.st.state === 'missed').length;
    let hero;
    if (!meals.length) hero = `<div class="card empty">${mascot('greeting', 96)}<h2 class="h-card">${tr('วันนี้ไม่มีมื้อยา', 'No medication meals today')}</h2></div>`;
    else if (f?.st.state === 'reminding') hero = heroCard('encourage', tr('ถึงเวลามื้อยาแล้ว', 'It is time for your medicine'), `${tr('มื้อ', 'Meal')} ${esc(f.reminderTime)}`, medSummary(f), btn('light', `${icon('pill')}${tr('ดูมื้อนี้', 'View this meal')}`, 'go', { to: 'senior-reminder' }));
    else if (f?.st.state === 'not_confirmed') hero = heroCard('concern', tr('มื้อนี้ยังไม่ยืนยัน', 'This meal is not yet confirmed'), `${tr('มื้อ', 'Meal')} ${esc(f.reminderTime)}`, tr('ถ้ากินแล้ว กดยืนยันย้อนหลังได้', 'If you have taken it, you can still confirm'), btn('taken', tr('กินแล้ว', 'Taken'), 'confirm', { meal: f.id }));
    else if (f) hero = heroCard('greeting', tr('มื้อถัดไป', 'Next meal'), `${tr('มื้อ', 'Meal')} ${esc(f.reminderTime)}`, medSummary(f), '');
    else if (missed) hero = heroCard('concern', tr('วันนี้', 'Today'), tr('มีมื้อที่พ้นเวลายืนยันแล้ว', 'Some confirmation windows have closed'), tr('สถานะยังเป็น "ยังไม่ยืนยัน"', 'The status remains “Not yet confirmed”'), '');
    else hero = heroCard('celebrate', tr('วันนี้', 'Today'), tr('ยืนยันครบทุกมื้อที่ถึงเวลาแล้ว', 'All meals due so far are confirmed'), '', '');

    let body = `<div class="greet">${logo('logo-sm')}<div><h1>${tr('สวัสดี', 'Hello')}</h1><p>${esc(thaiDate(dateKey))}</p></div></div>${hero}`;
    if (meals.length) body += `<div class="sec-head"><h2>${tr('ทุกมื้อวันนี้', 'Today’s meals')}</h2><span class="count">${tr(`${meals.length} มื้อ`, `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'}`)}</span></div>`;
    for (const m of meals) {
      let extra = '';
      if (m.st.state === 'not_confirmed') extra = `<p class="hint">${tr('ยังกดยืนยันย้อนหลังได้จนถึงเวลาเตือนของมื้อถัดไป', 'You can still confirm until the next meal’s reminder time')}</p>` + btn('taken', tr('กินแล้ว', 'Taken'), 'confirm', { meal: m.id });
      else if (m.st.state === 'reminding') extra = btn('primary', tr('ไปหน้าเตือน', 'View reminder'), 'go', { to: 'senior-reminder' });
      else if (m.st.state === 'missed') extra = `<p class="hint">${tr('พ้นเวลายืนยันแล้ว — สถานะยังเป็น "ยังไม่ยืนยัน"', 'The confirmation window has closed — status remains “Not yet confirmed”')}</p>`;
      body += mealCard(m, extra);
    }
    return { title: tr('หน้าหลัก', 'Home'), covers: 'FR-04, FR-03 · BR-14, BR-15, BR-09', body };
  },
};

export const actions = {
  /** "กินแล้ว" — กดครั้งเดียวยืนยันทั้งมื้อ · กดซ้ำไม่สร้างใหม่ (BR-10, BR-12) · พ้นหน้าต่างกดไม่ได้ (BR-15, BR-21) */
  async confirm(env, d) {
    const meal = env.snap.meals.find((m) => m.id === d.meal);
    if (!meal) return;
    if (!meal.st.canConfirm && !meal.dose) { env.toast(tr('พ้นเวลายืนยันแล้ว — กดไม่ได้ สถานะยังเป็น "ยังไม่ยืนยัน"', 'The confirmation window has closed — status remains “Not yet confirmed”')); return; }
    const result = await env.repo.confirmMeal({ meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, confirmedAt: env.clock.now() });
    const at = fmtHM(result.dose.confirmedAt);
    if (!result.created) env.toast(tr(`มีบันทึกอยู่แล้ว ไม่สร้างซ้ำ — เวลาเดิม ${at}`, `Already recorded — no duplicate created. Original time ${at}`));
    else env.toast(result.queued ? tr(`บันทึกแล้ว ${at} — จะส่งให้ผู้ดูแลเมื่อออนไลน์`, `Recorded at ${at} — will send to the caregiver when online`) : tr(`บันทึกแล้ว ${at}`, `Recorded at ${at}`));
  },

  /** "ยังไม่กิน" — รอบ T/T+5: เตือนอีกตามเวลา · รอบ T+10 (รอบสุดท้าย): แจ้งผู้ดูแลทันที ไม่รอ T+15 (BR-11) */
  async notyet(env, d) {
    const meal = env.snap.meals.find((m) => m.id === d.meal);
    if (!meal || meal.st.state !== 'reminding') return;
    const round = meal.st.round;
    if (round >= LAST_ROUND) {
      await env.repo.reportNotYet({ meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, at: env.clock.now() });
      env.toast(tr('รับทราบ — แจ้งผู้ดูแลแล้ว', 'Noted — the caregiver has been notified'));
    } else {
      const next = meal.T + REMINDER_OFFSETS_MIN[round + 1] * MINUTE_MS;
      env.toast(tr(`จะเตือนอีกครั้งตอน ${fmtHM(next)}`, `Next reminder at ${fmtHM(next)}`));
    }
  },
};
