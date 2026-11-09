// FR-05 หน้าจอผู้ดูแลฝั่งติดตาม: C-07 สถานะรายวัน · C-08 การแจ้งเตือน
// เจ้าของ: Suchitra (FR-05) · BR-13, BR-14, BR-18, BR-21 · NFR-01 · ตัดสินด้วย logic/status.js (dailyStatus, alertFor ผ่าน features/alerts.js)
// ข้อความ: ผู้ดูแลเห็น "ยังไม่ยืนยัน" เท่านั้น ห้ามใช้คำว่า "ไม่ได้กิน" (BR-13, BR-14)
import { esc, btn, chip, icon, logo, mascot, medSummary, heroCard } from './ui.js';
import { statusLabel, fmtHM, thaiDate } from './format.js';
import { dailyStatus } from '../logic/status.js';
import { visibleAlerts } from './alerts.js';
import { dismissAlert } from './alerts.js';
import { tr } from './i18n.js';

export const screens = {
  // C-07 — ทุกมื้อของวัน: กินแล้ว + เวลา / กินแล้ว (ยืนยันย้อนหลัง) + เวลา / ยังไม่ยืนยัน / ยังไม่ถึงเวลา (ข้อ 3, 4, 10)
  'cg-status'(model) {
    const { snap } = model;
    const rows = dailyStatus({ now: snap.now, meals: snap.meals, doses: snap.doses });
    const byId = new Map(snap.meals.map((m) => [m.id, m]));
    const alerts = visibleAlerts(model.inbox, snap).filter((a) => a.kind === 'not_confirmed');
    const due = rows.filter((r) => r.label !== 'not_due').length;
    const confirmed = rows.filter((r) => r.label === 'taken' || r.label === 'taken_late').length;
    const nextRow = rows.find((r) => r.label === 'not_due');
    const pct = due ? Math.round((confirmed / due) * 100) : 0;
    const ring = `<div class="ring" role="img" aria-label="${tr(`ยืนยันแล้ว ${confirmed} จาก ${due} มื้อที่ถึงเวลา`, `${confirmed} of ${due} due meals confirmed`)}" style="--p:${pct}"><span><b>${confirmed}/${due}</b>${tr('ยืนยัน', 'confirmed')}</span></div>`;
    const big = alerts.length ? tr(`มี ${alerts.length} มื้อยังไม่ยืนยัน`, `${alerts.length} ${alerts.length === 1 ? 'meal is' : 'meals are'} not yet confirmed`) : due ? tr(`ยืนยันแล้ว ${confirmed} จาก ${due} มื้อ`, `${confirmed} of ${due} meals confirmed`) : tr('ยังไม่ถึงเวลามื้อแรก', 'The first meal is not due yet');

    let body = `<div class="greet">${logo('logo-sm')}<div><h1>${tr('สถานะยาวันนี้', 'Today’s medication status')}</h1><p>${esc(thaiDate(snap.dateKey))}</p></div></div>`;
    if (rows.length) body += heroCard('', tr('ติดตามการยืนยันของผู้สูงอายุ', 'Track the older adult’s confirmations'), big, nextRow ? `<span class="hero-chip">${icon('clock')}${tr('มื้อถัดไป', 'Next meal')} · ${esc(nextRow.reminderTime)}</span>` : '', '', ring);
    body += btn('ghost', `${icon('status')}${tr('ดูสรุปรายสัปดาห์', 'View weekly summary')}`, 'go', { to: 'cg-weekly' });
    if (alerts.length) {
      body += `<div class="banner" role="alert"><strong>${tr('ยังไม่ยืนยันการกินยา', 'Medicine not yet confirmed')}</strong><p>${alerts.map((a) => `${tr('มื้อ', 'Meal')} ${esc(a.reminderTime)}`).join(', ')}</p>${btn('ghost', `${icon('bell')}${tr('ดูแจ้งเตือน', 'View alerts')}`, 'go', { to: 'cg-alerts' })}</div>`;
    }
    if (!rows.length && !snap.mealTimes) body += `<div class="card st-none">${mascot('encourage', 84)}<h2 class="h-card">${tr('เริ่มตั้งค่ากันก่อน', 'Let’s set things up')}</h2><p>${tr('ขั้นที่ 1 ตั้งเวลามื้อ · ขั้นที่ 2 เพิ่มยาจากฉลาก', 'Step 1: set meal times · Step 2: add medicine from a label')}</p>${btn('primary', tr('ตั้งเวลามื้อ', 'Set meal times'), 'go', { to: 'cg-meals' })}</div>`;
    else if (!rows.length) body += `<div class="card empty">${mascot('greeting', 96)}<h2 class="h-card">${tr('วันนี้ไม่มีมื้อยา', 'No medication meals today')}</h2>${snap.medicines.length ? '' : btn('primary', tr('เพิ่มยาจากฉลาก', 'Add medicine from a label'), 'start-add')}</div>`; // ข้อ 4
    else body += `<div class="sec-head"><h2>${tr('ทุกมื้อวันนี้', 'Today’s meals')}</h2><span class="count">${tr(`${rows.length} มื้อ`, `${rows.length} ${rows.length === 1 ? 'meal' : 'meals'}`)}</span></div>`;
    for (const r of rows) {
      const label = statusLabel(r.label, r.confirmedAt);
      body += `<section class="card st-${label.kind}"><div class="card-head"><h3 class="h-card">${tr('มื้อ', 'Meal')} ${esc(r.reminderTime)}</h3>${chip(label)}</div>` +
        `<p class="hint">${medSummary(byId.get(r.mealId))}</p></section>`;
    }
    body += `<p class="disclaimer">${tr('การกดยืนยันเป็นการรายงานด้วยตนเอง ไม่ใช่หลักฐานว่ากินยาจริง', 'Confirmation is self-reported and is not proof that medicine was taken')}</p>`;
    return { title: tr('สถานะรายวัน', 'Daily status'), covers: 'FR-05, BR-13, BR-14, BR-18', body };
  },

  // C-08 — แจ้งเฉพาะมื้อที่ยังไม่ยืนยัน ครั้งเดียวต่อมื้อ (ข้อ 1, 2, 5, 6, 7, 9)
  'cg-alerts'(model) {
    const { snap } = model;
    const list = visibleAlerts(model.inbox, snap);
    const open = list.filter((a) => a.kind === 'not_confirmed').length;
    let body = `<div class="hero-row">${mascot(open ? 'concern' : 'greeting', 84)}<div><h1>${tr('การแจ้งเตือน', 'Alerts')}</h1><p class="lead">${tr('แจ้งเฉพาะมื้อที่ยังไม่ยืนยัน และแจ้งครั้งเดียวต่อมื้อ', 'Alerts are shown once per unconfirmed meal')}</p></div></div>`;
    if (!list.length) body += `<div class="card empty"><h2 class="h-card">${tr('ไม่มีการแจ้งเตือน', 'No alerts')}</h2><p class="hint">${tr('ระบบแจ้งเมื่อเลยเวลาเตือน 15 นาทีแล้วยังไม่มีการยืนยัน หรือเมื่อผู้สูงอายุกด "ยังไม่กิน" รอบสุดท้าย', 'An alert appears when a meal remains unconfirmed after 15 minutes, or when the older adult taps “Not yet” in the final reminder')}</p></div>`;
    for (const a of list) {
      if (a.kind === 'not_confirmed') {
        const why = a.reason === 'not_yet' ? tr('ผู้สูงอายุกด "ยังไม่กิน" ในรอบเตือนสุดท้าย', 'The older adult tapped “Not yet” in the final reminder') : tr('เลยเวลาเตือน 15 นาทีแล้ว ยังไม่มีการยืนยัน', 'More than 15 minutes after the reminder, with no confirmation');
        body += `<section class="alert-card" role="alert"><div class="alert-head"><span class="alert-ico">${icon('bell')}</span><div><h2 class="h-card">${tr('ยังไม่ยืนยันการกินยา', 'Medicine not yet confirmed')}</h2><p class="hint">${tr('มื้อ', 'Meal')} ${esc(a.reminderTime)} · ${why}</p></div></div>` +
          btn('ghost', `${icon('status')}${tr('ดูสถานะวันนี้', 'View today’s status')}`, 'go', { to: 'cg-status' }) + btn('ghost', tr('ปิดการแจ้งนี้', 'Dismiss this alert'), 'dismiss', { key: a.key }) + '</section>';
      } else {
        body += `<section class="alert-card alert-ok" role="status"><div class="alert-head"><span class="alert-ico ok">${icon('check')}</span><div><h2 class="h-card">${tr('ยืนยันการกินยาแล้ว เวลา', 'Medicine confirmed at')} ${esc(fmtHM(a.confirmedAt))}</h2>` +
          `<p class="hint">${tr('มื้อ', 'Meal')} ${esc(a.reminderTime)}</p></div></div>${btn('ghost', tr('ปิดการแจ้งนี้', 'Dismiss this alert'), 'dismiss', { key: a.key })}</section>`;
      }
    }
    return { title: tr('แจ้งเตือน', 'Alerts'), covers: 'FR-05, BR-13, BR-15, BR-18', body };
  },
};

export const actions = {
  'dismiss'(env, d) { env.setInbox(dismissAlert(env.inbox, d.key)); },
};
