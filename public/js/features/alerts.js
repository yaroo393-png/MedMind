// กล่องแจ้งเตือนของผู้ดูแล (FR-05 · BR-13, BR-18) — เรียก alertFor ของ logic/status.js แล้วจดว่า "เห็นแล้ว" ผ่าน repo.markAlertSeen
// เจ้าของ: Suchitra (FR-05) · ไม่แตะ DOM / Date.now() · ทดสอบกับ localRepo ได้ (tests/alerts.test.js)
// หลัก: แจ้งชนิดละครั้งต่อมื้อ · ผู้ดูแลปิดหน้าอยู่ (ไม่เรียกฟังก์ชันนี้) → การแจ้งค้างไว้ แล้วโผล่ตอนเปิดหน้ากลับ (BR-18)
import { alertFor } from '../logic/status.js';

/**
 * ตรวจทุกมื้อ ณ เวลา snapshot.now แล้วเติมการแจ้งใหม่ลงกล่อง (inbox) — การแจ้งที่เคยจดแล้วจะไม่เกิดซ้ำ
 * @param {{ repo: object, snapshot: object, inbox: object[] }} args  snapshot จาก model.loadSnapshot (มุมมองผู้ดูแล = repo จริง)
 * @returns {Promise<object[]>} กล่องใหม่ (ไม่แก้ของเดิม) · รายการ = { key, kind, mealId, reminderTime, confirmedAt, reason, shownAt }
 */
export async function collectAlerts({ repo, snapshot, inbox }) {
  const next = [...inbox];
  for (const meal of snapshot.meals) {
    const alert = alertFor({ now: snapshot.now, meal, dose: meal.dose, notYet: meal.notYet, seen: meal.seen });
    if (!alert) continue;
    const { created } = await repo.markAlertSeen({ mealId: meal.id, kind: alert.kind });
    if (!created) continue; // เครื่องอื่น/รอบอื่นจดไปแล้ว
    next.push({
      key: `${meal.id}_${alert.kind}`, kind: alert.kind, mealId: meal.id, reminderTime: meal.reminderTime,
      confirmedAt: alert.confirmedAt ?? null, reason: alert.kind === 'not_confirmed' ? (meal.notYet !== null ? 'not_yet' : 'deadline') : null,
      shownAt: snapshot.now,
    });
  }
  return next;
}

/** ผู้ดูแลปิดการแจ้ง 1 รายการ (ซ่อนจากกล่อง — การจด "เห็นแล้ว" ทำไปแล้วตอนแสดง) */
export function dismissAlert(inbox, key) {
  return inbox.filter((a) => a.key !== key);
}

/**
 * การแจ้งที่ควรแสดงตอนนี้: "ยังไม่ยืนยัน" ของมื้อที่ยืนยันแล้วจะหายไป (เหลือข้อความ "ยืนยันแล้ว เวลา …" แทน — BR-13)
 * snapshot.meals ใช้ดูว่ามื้อนั้นมี dose แล้วหรือยัง
 */
export function visibleAlerts(inbox, snapshot) {
  const confirmed = new Set(snapshot.meals.filter((m) => m.dose).map((m) => m.id));
  return inbox.filter((a) => !(a.kind === 'not_confirmed' && confirmed.has(a.mealId)));
}

/** จำนวนการแจ้ง "ยังไม่ยืนยัน" ที่ยังเปิดอยู่ (ป้ายตัวเลขบนแถบล่าง) */
export function openNotConfirmedCount(inbox, snapshot) {
  return visibleAlerts(inbox, snapshot).filter((a) => a.kind === 'not_confirmed').length;
}
