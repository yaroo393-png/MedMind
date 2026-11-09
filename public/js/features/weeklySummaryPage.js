// หน้าเข้า FR-09 ที่ใช้บริการจริง: Demo import controller ล้วนโดยไม่ดึง wrapper นี้
import { connectFirebase } from '../core/firebase.js';
import { createWeeklyHistory } from '../services/weeklyHistory.js';
import { aiWeeklySummaryFromFirebase } from '../services/aiWeeklySummary.js';
import { AI_MODELS } from '../services/aiLabel.js';
import { bootWeeklySummaryController } from './weeklySummaryController.js';

export { exampleWeek, localDateKey } from './weeklySummaryController.js';

/** คง API หน้าแยกเดิม และยอมให้หน้าผู้ดูแลใช้ Firebase context ที่เชื่อมไว้แล้ว */
export function bootWeeklySummary({ connect = connectFirebase, makeHistory = createWeeklyHistory,
  makeAi = aiWeeklySummaryFromFirebase, configuredModelName = AI_MODELS[0],
  isOnline = () => globalThis.navigator?.onLine !== false, ...options } = {}) {
  return bootWeeklySummaryController({ ...options, connect, makeHistory, makeAi, configuredModelName, isOnline });
}
