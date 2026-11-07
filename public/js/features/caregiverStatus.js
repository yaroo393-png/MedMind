// FR-05 หน้าจอผู้ดูแลฝั่งติดตาม: C-07 สถานะรายวัน · C-08 การแจ้งเตือน
// เจ้าของ: Suchitra (FR-05) · BR-13, BR-14, BR-18, BR-21 · NFR-01 · ตัดสินด้วย logic/status.js (dailyStatus, alertFor ผ่าน features/alerts.js)
// ข้อความ: ผู้ดูแลเห็น "ยังไม่ยืนยัน" เท่านั้น ห้ามใช้คำว่า "ไม่ได้กิน" (BR-13, BR-14)
import { esc, btn, chip, icon, logo, mascot, medSummary, heroCard } from './ui.js';
import { statusLabel, fmtHM, thaiDate } from './format.js';
import { dailyStatus } from '../logic/status.js';
import { visibleAlerts } from './alerts.js';
import { dismissAlert } from './alerts.js';

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
    const ring = `<div class="ring" role="img" aria-label="ยืนยันแล้ว ${confirmed} จาก ${due} มื้อที่ถึงเวลา" style="--p:${pct}"><span><b>${confirmed}/${due}</b>ยืนยัน</span></div>`;
    const big = alerts.length ? `มี ${alerts.length} มื้อยังไม่ยืนยัน` : due ? `ยืนยันแล้ว ${confirmed} จาก ${due} มื้อ` : 'ยังไม่ถึงเวลามื้อแรก';

    let body = `<div class="greet">${logo('logo-sm')}<div><h1>สถานะยาวันนี้</h1><p>${esc(thaiDate(snap.dateKey))}</p></div></div>`;
    if (rows.length) body += heroCard('', 'ติดตามการยืนยันของผู้สูงอายุ', big, nextRow ? `<span class="hero-chip">${icon('clock')}มื้อถัดไป · ${esc(nextRow.reminderTime)}</span>` : '', '', ring);
    if (alerts.length) {
      body += `<div class="banner" role="alert"><strong>ยังไม่ยืนยันการกินยา</strong><p>${alerts.map((a) => `มื้อ ${esc(a.reminderTime)}`).join(', ')}</p>${btn('ghost', `${icon('bell')}ดูแจ้งเตือน`, 'go', { to: 'cg-alerts' })}</div>`;
    }
    if (!rows.length && !snap.mealTimes) body += `<div class="card st-none">${mascot('encourage', 84)}<h2 class="h-card">เริ่มตั้งค่ากันก่อน</h2><p>ขั้นที่ 1 ตั้งเวลามื้อ · ขั้นที่ 2 เพิ่มยาจากฉลาก</p>${btn('primary', 'ตั้งเวลามื้อ', 'go', { to: 'cg-meals' })}</div>`;
    else if (!rows.length) body += `<div class="card empty">${mascot('greeting', 96)}<h2 class="h-card">วันนี้ไม่มีมื้อยา</h2>${snap.medicines.length ? '' : btn('primary', 'เพิ่มยาจากฉลาก', 'start-add')}</div>`; // ข้อ 4
    else body += `<div class="sec-head"><h2>ทุกมื้อวันนี้</h2><span class="count">${rows.length} มื้อ</span></div>`;
    for (const r of rows) {
      const label = statusLabel(r.label, r.confirmedAt);
      body += `<section class="card st-${label.kind}"><div class="card-head"><h3 class="h-card">มื้อ ${esc(r.reminderTime)}</h3>${chip(label)}</div>` +
        `<p class="hint">${medSummary(byId.get(r.mealId))}</p></section>`;
    }
    body += '<p class="disclaimer">การกดยืนยันเป็นการรายงานด้วยตนเอง ไม่ใช่หลักฐานว่ากินยาจริง</p>';
    return { title: 'สถานะรายวัน', covers: 'FR-05, BR-13, BR-14, BR-18', body };
  },

  // C-08 — แจ้งเฉพาะมื้อที่ยังไม่ยืนยัน ครั้งเดียวต่อมื้อ (ข้อ 1, 2, 5, 6, 7, 9)
  'cg-alerts'(model) {
    const { snap } = model;
    const list = visibleAlerts(model.inbox, snap);
    const open = list.filter((a) => a.kind === 'not_confirmed').length;
    let body = `<div class="hero-row">${mascot(open ? 'concern' : 'greeting', 84)}<div><h1>การแจ้งเตือน</h1><p class="lead">แจ้งเฉพาะมื้อที่ยังไม่ยืนยัน และแจ้งครั้งเดียวต่อมื้อ</p></div></div>`;
    if (!list.length) body += '<div class="card empty"><h2 class="h-card">ไม่มีการแจ้งเตือน</h2><p class="hint">ระบบแจ้งเมื่อเลยเวลาเตือน 15 นาทีแล้วยังไม่มีการยืนยัน หรือเมื่อผู้สูงอายุกด "ยังไม่กิน" รอบสุดท้าย</p></div>';
    for (const a of list) {
      if (a.kind === 'not_confirmed') {
        const why = a.reason === 'not_yet' ? 'ผู้สูงอายุกด "ยังไม่กิน" ในรอบเตือนสุดท้าย' : 'เลยเวลาเตือน 15 นาทีแล้ว ยังไม่มีการยืนยัน';
        body += `<section class="alert-card" role="alert"><div class="alert-head"><span class="alert-ico">${icon('bell')}</span><div><h2 class="h-card">ยังไม่ยืนยันการกินยา</h2><p class="hint">มื้อ ${esc(a.reminderTime)} · ${why}</p></div></div>` +
          btn('ghost', `${icon('status')}ดูสถานะวันนี้`, 'go', { to: 'cg-status' }) + btn('ghost', 'ปิดการแจ้งนี้', 'dismiss', { key: a.key }) + '</section>';
      } else {
        body += `<section class="alert-card alert-ok" role="status"><div class="alert-head"><span class="alert-ico ok">${icon('check')}</span><div><h2 class="h-card">ยืนยันการกินยาแล้ว เวลา ${esc(fmtHM(a.confirmedAt))}</h2>` +
          `<p class="hint">มื้อ ${esc(a.reminderTime)}</p></div></div>${btn('ghost', 'ปิดการแจ้งนี้', 'dismiss', { key: a.key })}</section>`;
      }
    }
    return { title: 'แจ้งเตือน', covers: 'FR-05, BR-13, BR-15, BR-18', body };
  },
};

export const actions = {
  'dismiss'(env, d) { env.setInbox(dismissAlert(env.inbox, d.key)); },
};
