// คิวออฟไลน์ของเครื่องผู้สูงอายุใน Demo mode (FR-04 ข้อ 7, 9 · BR-20 · NFR-07) — ห่อ repo เพื่อจำลองสิ่งที่ Firestore offline persistence ทำให้
// เจ้าของ: Nichanan · ไม่แตะ DOM / Firebase / Date.now() (รับ clock) · ใช้ได้กับ repo ใด ๆ ที่มีเมธอดตามสัญญา §6.3
// หลัก: ออฟไลน์ = จอผู้สูงอายุเปลี่ยนทันที แต่ที่เก็บกลาง (ที่ผู้ดูแลเห็น) ยังไม่มีข้อมูล · เมื่อกลับออนไลน์ส่งตามลำดับ
//       ใช้ "เวลาที่กด" (confirmedAt) เดิม ไม่ใช่เวลาที่ส่ง → ผลตัดสิน taken / taken_late ไม่เปลี่ยน (BR-20)
import { doseId, buildDose } from '../logic/confirm.js';

/**
 * @param {object} repo ที่เก็บข้อมูลจริง (ฝั่งผู้ดูแลอ่านจากตัวนี้)
 * @returns {{ repo: object, setOnline(online: boolean): Promise<void>, isOnline(): boolean, pendingCount(): number }}
 *   repo = ตัวห่อสำหรับเครื่องผู้สูงอายุ — ทุกเมธอดเหมือนเดิม ยกเว้น confirmMeal / reportNotYet / getDoses / getNotYet ที่รู้จักคิว
 */
export function createOfflineQueue(repo) {
  let online = true;
  const queue = [];                        // [{ type: 'confirm' | 'notYet', args }] ตามลำดับที่กด
  const pendingDoses = new Map();          // doseId → Dose ที่ยังไม่ถึงที่เก็บกลาง (แสดงบนจอผู้สูงอายุ)
  const pendingNotYet = new Map();         // doseId → เวลาที่กด "ยังไม่กิน"

  const wrapped = {
    ...repo,
    async confirmMeal({ meal, confirmedAt }) {
      if (online) return repo.confirmMeal({ meal, confirmedAt });
      const id = doseId(meal);
      if (pendingDoses.has(id)) return { doseId: id, dose: structuredClone(pendingDoses.get(id)), created: false, queued: true }; // กดซ้ำ ไม่สร้างใหม่ (BR-12)
      const dose = { ...buildDose({ meal, confirmedAt }), serverReceivedAt: null, pending: true };
      pendingDoses.set(id, dose);
      queue.push({ type: 'confirm', args: { meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, confirmedAt } });
      return { doseId: id, dose: structuredClone(dose), created: true, queued: true };
    },
    async reportNotYet({ meal, at }) {
      if (online) return repo.reportNotYet({ meal, at });
      const id = doseId(meal);
      if (pendingNotYet.has(id)) return { created: false, at: pendingNotYet.get(id) };
      pendingNotYet.set(id, at);
      queue.push({ type: 'notYet', args: { meal: { dateKey: meal.dateKey, reminderTime: meal.reminderTime }, at } });
      return { created: true, at, queued: true };
    },
    // จอผู้สูงอายุเห็นของที่ค้างด้วย (ของจริงในที่เก็บชนะ)
    async getDoses() {
      return { ...Object.fromEntries([...pendingDoses].map(([id, d]) => [id, structuredClone(d)])), ...(await repo.getDoses()) };
    },
    async getNotYet(meal) {
      const stored = await repo.getNotYet(meal);
      return stored ?? pendingNotYet.get(doseId(meal)) ?? null;
    },
  };

  return {
    repo: wrapped,
    isOnline: () => online,
    pendingCount: () => queue.length,
    /** สลับออนไลน์/ออฟไลน์ · กลับออนไลน์ = ส่งของที่ค้างตามลำดับ (ด้วยเวลาที่กดเดิม) */
    async setOnline(next) {
      if (online === next) return;
      online = next;
      if (!online) return;
      while (queue.length) {
        const item = queue.shift();
        if (item.type === 'confirm') await repo.confirmMeal(item.args);
        else await repo.reportNotYet(item.args);
        const id = doseId(item.args.meal);
        if (item.type === 'confirm') pendingDoses.delete(id); else pendingNotYet.delete(id);
      }
    },
  };
}
