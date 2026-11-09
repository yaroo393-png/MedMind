// FR-09: อ่านประวัติของผู้ดูแลเท่านั้น ไม่มีเมธอดเขียน/ลบ และไม่อ่านรายการยา
import { weekDateKeys, buildWeeklySummary } from '../logic/weeklySummary.js';

export class WeeklyAccessError extends Error {
  constructor(code = 'not_caregiver') {
    super('เปิดสรุปจากเครื่องผู้ดูแลที่จับคู่และได้รับความยินยอมแล้ว');
    this.code = code;
  }
}

const ms = (value) => typeof value?.toMillis === 'function' ? value.toMillis() : null;
const startOf = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};
const permitted = (data, uid) => data?.caregiverUid === uid && Number.isFinite(ms(data?.consentAt));

/** ใช้การอ่านจากเซิร์ฟเวอร์เพื่อไม่ถือสำเนาออฟไลน์เป็นหลักฐานสิทธิ์ปัจจุบัน */
export function createWeeklyHistory({ fs, db, uid }) {
  const { collection, query, where, doc, getDocsFromServer, getDocFromServer, onSnapshot, Timestamp } = fs;
  const pairRef = (pairId) => doc(db, 'pairs', pairId);
  return {
    async load({ anchorDateKey, now }) {
      const dates = weekDateKeys(anchorDateKey);
      const pairs = await getDocsFromServer(query(collection(db, 'pairs'), where('caregiverUid', '==', uid)));
      // ไม่เลือกคู่หนึ่งเองเมื่อข้อมูลผิดสัญญา (MVP มีผู้ดูแลหนึ่งคู่)
      if (pairs.docs.length !== 1 || !permitted(pairs.docs[0].data(), uid)) throw new WeeklyAccessError();
      const pairId = pairs.docs[0].id;
      const records = await getDocsFromServer(query(collection(db, 'pairs', pairId, 'doses'),
        where('scheduledTime', '>=', Timestamp.fromMillis(startOf(dates[0]))),
        where('scheduledTime', '<', Timestamp.fromMillis(startOf(anchorDateKey)))));
      const doses = {};
      for (const snapshot of records.docs) {
        const d = snapshot.data();
        doses[snapshot.id] = { scheduledTime: ms(d.scheduledTime), confirmedAt: ms(d.confirmedAt), status: d.status,
          pending: Boolean(snapshot.metadata?.hasPendingWrites) };
      }
      // ตรวจสิทธิ์ซ้ำหลังรอข้อมูล ป้องกันการยกเลิกจับคู่ระหว่างโหลด
      await this.checkAccess(pairId);
      return { pairId, summary: buildWeeklySummary({ doses, anchorDateKey, now }) };
    },
    async checkAccess(pairId) {
      const snapshot = await getDocFromServer(pairRef(pairId));
      if (!snapshot.exists() || !permitted(snapshot.data(), uid)) throw new WeeklyAccessError('access_changed');
    },
    watchAccess(pairId, onRevoked) {
      return onSnapshot(pairRef(pairId), (snapshot) => {
        if (!snapshot.exists() || !permitted(snapshot.data(), uid)) onRevoked();
      }, () => onRevoked());
    },
  };
}
