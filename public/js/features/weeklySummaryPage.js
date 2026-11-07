// หน้า FR-09 แยกจาก Phone/realShell เดิม: เปิดสาธิตก่อนเสมอ ไม่เชื่อม Firebase จนกดเลือกข้อมูลจริง
import { connectFirebase } from '../core/firebase.js';
import { createClock } from '../core/clock.js';
import { createWeeklyHistory } from '../services/weeklyHistory.js';
import { createAiWeeklySummary, aiWeeklySummaryFromFirebase, summaryChoices } from '../services/aiWeeklySummary.js';
import { buildWeeklySummary, weekDateKeys, toWeeklyAiPayload } from '../logic/weeklySummary.js';
import { confirmStatus } from '../logic/confirm.js';
import { weeklySummaryView } from './weeklySummary.js';

export const localDateKey = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** ข้อมูลสมมติสร้างแยกจากข้อมูลของทีม ไม่เขียนลง repo หรือ Firebase */
export function exampleWeek(now, empty = false) {
  const anchorDateKey = localDateKey(now);
  const doses = {};
  if (!empty) weekDateKeys(anchorDateKey).forEach((dateKey, day) => {
    ['07:00', '12:00', '18:00'].forEach((time, meal) => {
      const scheduledTime = new Date(`${dateKey}T${time}:00`).getTime();
      const late = meal === 2 && day % 2 === 0;
      const confirmedAt = scheduledTime + (late ? 25 : 5) * 60000;
      doses[`${dateKey}_${time.replace(':', '')}`] = { scheduledTime, confirmedAt, status: confirmStatus(scheduledTime, confirmedAt) };
    });
  });
  return buildWeeklySummary({ doses, anchorDateKey, now });
}

const messageFor = (error) => {
  if (['not_caregiver', 'access_changed'].includes(error?.code)) return 'เปิดจากเครื่องผู้ดูแลที่จับคู่ไว้ก่อน หากยกเลิกจับคู่แล้วจะดูประวัตินี้ไม่ได้';
  if (error?.code === 'timeout') return 'AI ตอบช้าเกินไป ลองใหม่ภายหลังได้ ตารางบันทึกยังดูได้ตามปกติ';
  if (error?.code === 'no_data') return 'ไม่มีบันทึกยืนยันที่ใช้สรุปได้ จึงยังไม่ส่งข้อมูลให้ AI';
  if (error?.reason === 'offline') return 'ไม่มีอินเทอร์เน็ต จึงยังส่งข้อมูลให้ AI ไม่ได้';
  if (error?.reason === 'quota') return 'บริการ AI จำกัดจำนวนคำขอตอนนี้ โปรดลองใหม่ภายหลัง';
  if (error?.reason === 'unreadable') return 'ผลจาก AI ตรวจสอบไม่ผ่าน จึงยังไม่แสดงสรุป โปรดลองใหม่';
  return 'เชื่อมต่อข้อมูลหรือบริการ AI ไม่สำเร็จ โปรดตรวจอินเทอร์เน็ตแล้วลองใหม่';
};

/** dependencies แยกไว้ทดสอบสิทธิ์ การยกเลิก และการส่ง AI โดยไม่เรียกบริการจริง */
export function bootWeeklySummary({ draw = () => {}, clock = createClock(), connect = connectFirebase,
  makeHistory = createWeeklyHistory, makeAi = aiWeeklySummaryFromFirebase } = {}) {
  let epoch = 0;
  let connection = null;
  let history = null;
  let ai = null;
  let pairId = null;
  let stopWatching = null;
  let disposed = false;
  let anchorDateKey = localDateKey(clock.now());
  const state = { mode: 'demo', summary: exampleWeek(clock.now()), consent: false, reviewed: false,
    result: null, busy: false, error: '', notice: 'เริ่มจากข้อมูลตัวอย่าง ลองดูตารางก่อนสร้างสรุปได้' };
  const render = () => { if (!disposed) draw(weeklySummaryView(state)); };
  const stop = () => { stopWatching?.(); stopWatching = null; };
  const resetResult = () => { state.result = null; state.reviewed = false; state.consent = false; state.error = ''; };

  function showDemo(empty = false) {
    epoch += 1; stop(); pairId = null;
    resetResult();
    anchorDateKey = localDateKey(clock.now());
    Object.assign(state, { mode: 'demo', summary: exampleWeek(clock.now(), empty), busy: false,
      notice: empty ? 'ตัวอย่างกรณีไม่มีข้อมูล · ปุ่มสร้างสรุปจะยังใช้ไม่ได้' : 'ข้อมูลและผลสรุปในโหมดนี้เป็นตัวอย่าง ไม่เรียก AI จริง' });
    render();
  }

  async function loadLive() {
    const current = ++epoch;
    stop(); resetResult(); pairId = null;
    Object.assign(state, { mode: 'live', busy: true, summary: null, notice: 'กำลังตรวจสิทธิ์ผู้ดูแลและโหลดบันทึก…' }); render();
    try {
      // เริ่มเพียงครั้งเดียวต่อหน้า หลีกเลี่ยงเปิด persistent Firestore ซ้ำ
      connection ??= Promise.resolve().then(connect).catch((error) => { connection = null; throw error; });
      const fb = await connection;
      if (disposed || current !== epoch) return;
      history ??= makeHistory(fb);
      ai ??= makeAi(fb, { isOnline: () => globalThis.navigator?.onLine !== false });
      const now = clock.now();
      const requestedAnchor = localDateKey(now);
      const loaded = await history.load({ anchorDateKey: requestedAnchor, now });
      if (disposed || current !== epoch) return;
      anchorDateKey = requestedAnchor;
      pairId = loaded.pairId;
      state.summary = loaded.summary;
      state.notice = 'โหลดบันทึกแล้ว · กดโหลดใหม่เมื่อต้องการข้อมูลล่าสุด';
      stopWatching = history.watchAccess(pairId, () => {
        if (disposed || current !== epoch) return;
        epoch += 1; stop(); resetResult(); pairId = null;
        Object.assign(state, { summary: null, busy: false, notice: '', error: messageFor({ code: 'access_changed' }) }); render();
      });
    } catch (error) {
      if (disposed || current !== epoch) return;
      state.error = messageFor(error); state.notice = '';
    } finally {
      if (!disposed && current === epoch) { state.busy = false; render(); }
    }
  }

  async function summarise() {
    if (state.busy || !state.consent || !state.summary?.hasData) return;
    if (localDateKey(clock.now()) !== anchorDateKey) {
      if (state.mode === 'demo') showDemo(); else await loadLive();
      state.notice = 'วันเปลี่ยนแล้ว โหลดช่วงวันที่ใหม่ให้แล้ว โปรดตรวจข้อมูลอีกครั้ง'; render(); return;
    }
    const current = epoch;
    const live = state.mode === 'live';
    resetResult(); state.busy = true; state.notice = live ? 'กำลังสร้างร่างสรุป…' : 'กำลังสร้างผลสรุปจำลอง…'; render();
    try {
      if (live) await history.checkAccess(pairId);
      if (disposed || current !== epoch) return;
      const demoIds = live ? [] : summaryChoices(toWeeklyAiPayload(state.summary)).slice(0, 3).map((choice) => choice.id);
      const service = live ? ai : createAiWeeklySummary({ models: ['demo'],
        getModel: async () => ({ generateContent: async () => ({ response: { text: () => JSON.stringify({ selectedIds: demoIds }) } }) }) });
      const result = await service.summariseWeek(state.summary);
      if (live) await history.checkAccess(pairId);
      if (disposed || current !== epoch) return;
      // AI อาจตอบข้ามเที่ยงคืน ต้องไม่เผยผลของช่วงสัปดาห์เดิมเป็นช่วงปัจจุบัน
      if (localDateKey(clock.now()) !== anchorDateKey) {
        if (live) await loadLive(); else showDemo();
        state.notice = 'วันเปลี่ยนระหว่างรอสรุป โหลดช่วงวันที่ใหม่ให้แล้ว โปรดตรวจข้อมูลอีกครั้ง'; render(); return;
      }
      state.result = result;
      state.notice = live ? 'ได้ร่างสรุปแล้ว โปรดตรวจเทียบตาราง' : 'ผลจำลองพร้อมแล้ว · โหมดนี้ไม่ได้เรียก AI จริง';
    } catch (error) {
      if (disposed || current !== epoch) return;
      if (['not_caregiver', 'access_changed'].includes(error?.code)) { state.summary = null; stop(); pairId = null; }
      state.error = messageFor(error); state.notice = '';
    } finally {
      if (!disposed && current === epoch) { state.busy = false; render(); }
    }
  }

  async function act(action, checked) {
    if (disposed) return;
    if (action === 'demo') { showDemo(); return; }
    if (state.busy) return;
    if (action === 'live') return loadLive();
    if (action === 'refresh') { if (state.mode === 'demo') showDemo(); else return loadLive(); }
    if (action === 'empty') showDemo(true);
    if (action === 'consent') { state.consent = Boolean(checked) && Boolean(state.summary?.hasData); state.result = null; state.reviewed = false; render(); }
    if (action === 'summarise') return summarise();
    if (action === 'review' && state.result) { state.reviewed = true; render(); }
  }
  render();
  return { act, state, dispose() { disposed = true; epoch += 1; stop(); } };
}
