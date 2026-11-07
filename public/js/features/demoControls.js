// ตัวควบคุมของ Demo mode (ADR-8): สถานการณ์เริ่มต้น, นาฬิกาจำลอง (เดินหน้าอย่างเดียว ละเอียดถึงมิลลิวินาที), ข้ามไปเวลาเตือน/ขอบ T+15
// เจ้าของ: Nichanan (E-5) · ไม่แตะ DOM · ทดสอบด้วย node (tests/demoControls.test.js) · ใช้ createLocalRepo + createClock จาก core/ และ groupMeals จาก logic/
import { createClock } from '../core/clock.js';
import { createLocalRepo } from '../core/repo.js';
import { createOfflineQueue } from '../core/offlineQueue.js';
import { DEMO_DATE_KEY, DEMO_IDS, demoSeed } from '../core/demoData.js';
import { groupMeals } from '../logic/schedule.js';
import { scheduledTimeOf, MINUTE_MS, REMINDER_OFFSETS_MIN, ALERT_DEADLINE_MIN } from '../logic/time.js';
import { dayStartOf, parseClockInput } from './format.js';

const at = (h, m) => dayStartOf(DEMO_DATE_KEY) + (h * 60 + m) * MINUTE_MS;

// สถานการณ์เริ่มต้น: เวลาเริ่ม + มีข้อมูลตัวอย่าง/จับคู่แล้วหรือไม่ + ผู้สูงอายุออฟไลน์หรือไม่ (ครอบ FR-01…05 ทั้งทางถูกและทางผิด)
export const PRESETS = {
  fresh: { label: 'เริ่มใหม่ (ยังไม่จับคู่ ยังไม่มียา)', start: at(6, 40), seeded: false },
  sample: { label: 'ข้อมูลตัวอย่าง 06:40 (จับคู่แล้ว)', start: at(6, 40), seeded: true },
  reminding: { label: '07:00 — ถึงเวลาเตือน 2 มื้อพร้อมกัน', start: at(7, 0), seeded: true },
  round2: { label: '07:10 — เตือนรอบที่ 3 (T+10)', start: at(7, 10), seeded: true },
  notconfirmed: { label: '07:16 — เลย T+15 ยังไม่ยืนยัน', start: at(7, 16), seeded: true },
  late: { label: '07:40 — ยืนยันย้อนหลังได้', start: at(7, 40), seeded: true },
  offline: { label: '07:05 — ผู้สูงอายุออฟไลน์', start: at(7, 5), seeded: true, offline: true },
  syncdelay: { label: '06:59 — ออฟไลน์ กดทันเวลา แล้วข้อมูลมาถึงช้า (FR-04/05 ข้อ 8–9)', start: at(6, 59), seeded: true, offline: true },
};

/**
 * สร้างชุดข้อมูล Demo (นาฬิกาจำลอง + localRepo + คิวออฟไลน์) ตามสถานการณ์
 * @returns {Promise<object>} ctx = { name, clock, repo, seniorRepo, queue, dateKey, ids, flags, refresh, onUnpaired } — refresh/onUnpaired เติมโดยตัวประกอบหน้า
 */
export async function createDemoContext(name = 'sample') {
  const preset = PRESETS[name] ?? PRESETS.sample;
  const clock = createClock({ start: preset.start });
  const seed = preset.seeded ? { ...demoSeed(), pairing: { seniorId: DEMO_IDS.seniorId, caregiverId: DEMO_IDS.caregiverId, consentAt: preset.start - 60 * MINUTE_MS } } : {};
  const repo = createLocalRepo({ clock, seed });
  const queue = createOfflineQueue(repo);
  if (preset.offline) await queue.setOnline(false);
  return { name: PRESETS[name] ? name : 'sample', clock, repo, seniorRepo: queue.repo, queue, dateKey: DEMO_DATE_KEY, ids: { ...DEMO_IDS },
    flags: { aiProblem: '', seniorOpen: true, cgOpen: true }, refresh: () => {}, onUnpaired: () => {} };
}

// มื้อของวัน (ไม่ต้องรู้สถานะ) — ใช้หาเวลาเตือนและขอบ T+15
async function mealsOf(ctx) {
  const mealTimes = await ctx.repo.getMealTimes();
  if (!mealTimes) return [];
  return groupMeals(await ctx.repo.listMedicines(), mealTimes, ctx.dateKey).meals;
}

/** เลื่อนนาฬิกาไปข้างหน้า ms (ปุ่ม +1 นาที / +5 / +15 / +1 มิลลิวินาที) */
export function advance(ctx, ms) { ctx.clock.advance(ms); }

/** "ไปเวลาเตือนถัดไป": รอบเตือน T, T+5, T+10 ของทุกมื้อ ที่ใกล้ที่สุดหลังเวลานี้ → { ok, ms } */
export async function jumpNextReminder(ctx) {
  const now = ctx.clock.now();
  const times = (await mealsOf(ctx)).flatMap((m) => REMINDER_OFFSETS_MIN.map((o) => scheduledTimeOf(m) + o * MINUTE_MS)).filter((t) => t > now);
  if (!times.length) return { ok: false, reason: 'no_more' };
  const ms = Math.min(...times);
  ctx.clock.set(ms);
  return { ok: true, ms };
}

// เส้นตาย T+15 ที่ใกล้ที่สุดซึ่งยังไม่ถึงหรือเท่ากับเวลานี้
async function nextDeadline(ctx) {
  const now = ctx.clock.now();
  const list = (await mealsOf(ctx)).map((m) => scheduledTimeOf(m) + ALERT_DEADLINE_MIN * MINUTE_MS).filter((t) => t >= now);
  return list.length ? Math.min(...list) : null;
}

/** "ไป T+15 พอดี" — ทดสอบขอบ BR-21: ตรงนี้ยังไม่แจ้งผู้ดูแล และกด "กินแล้ว" ยังนับว่าทันเวลา */
export async function jumpAtDeadline(ctx) {
  const ms = await nextDeadline(ctx);
  if (ms === null) return { ok: false, reason: 'no_more' };
  ctx.clock.set(ms);
  return { ok: true, ms };
}

/** "ไปหลัง T+15 (1 มิลลิวินาที)" — เลยขอบแล้ว ผู้ดูแลถูกแจ้ง และกด "กินแล้ว" = ยืนยันย้อนหลัง */
export async function jumpPastDeadline(ctx) {
  const ms = await nextDeadline(ctx);
  if (ms === null) return { ok: false, reason: 'no_more' };
  ctx.clock.set(ms + 1);
  return { ok: true, ms: ms + 1 };
}

/** ช่อง "ตั้งเวลาจำลอง": พิมพ์ HH:MM · HH:MM:SS · HH:MM:SS.mmm — เดินหน้าอย่างเดียว → { ok, ms } หรือ { ok: false, reason: 'format' | 'back' } */
export function setClockTo(ctx, text) {
  const ms = parseClockInput(text, dayStartOf(ctx.dateKey));
  if (ms === null) return { ok: false, reason: 'format' };
  if (ms < ctx.clock.now()) return { ok: false, reason: 'back' };
  ctx.clock.set(ms);
  return { ok: true, ms };
}

/** ผู้สูงอายุออฟไลน์/กลับออนไลน์ (FR-04 ข้อ 7, 9) — กลับออนไลน์ = ส่งของที่ค้างด้วยเวลาที่กดเดิม */
export function setSeniorOnline(ctx, online) { return ctx.queue.setOnline(online); }
