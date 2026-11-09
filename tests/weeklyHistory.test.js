// FR-09 / NFR-04,05,09: อ่านเฉพาะคู่ผู้ดูแล ตรวจสิทธิ์ก่อน/หลังโหลด ไม่มีคำสั่งเขียน
import test from 'node:test';
import assert from 'node:assert/strict';
import { createWeeklyHistory } from '../public/js/services/weeklyHistory.js';

const now = new Date('2026-11-08T10:00:00').getTime();
const ts = (ms) => ({ toMillis: () => ms });
function fixture({ role = 'caregiver', consent = true, revoked = false, pairCount = 1 } = {}) {
  const calls = [];
  let changed;
  const data = { caregiverUid: role === 'caregiver' ? 'cg' : 'other', consentAt: consent ? ts(1) : null };
  const pairDoc = { id: 'pair-test', data: () => data };
  const scheduledTime = new Date('2026-11-02T07:00:00').getTime();
  const record = { scheduledTime: ts(scheduledTime), confirmedAt: ts(scheduledTime + 60000), status: 'taken', medicineName: 'DO NOT COPY' };
  const fs = {
    collection: (_db, ...path) => ({ path: path.join('/') }),
    doc: (_db, ...path) => ({ path: path.join('/') }),
    where: (...args) => args,
    query: (ref, ...clauses) => ({ ...ref, clauses }),
    Timestamp: { fromMillis: (ms) => ms },
    async getDocsFromServer(q) {
      calls.push(q);
      return q.path === 'pairs' ? { docs: Array(pairCount).fill(pairDoc) } : { docs: [{ id: '2026-11-02_0700', data: () => record, metadata: {} }] };
    },
    async getDocFromServer(ref) { calls.push(ref); return { exists: () => !revoked, data: () => data }; },
    onSnapshot(_ref, success, failure) { changed = { success, failure }; return () => { changed = null; }; },
  };
  return { history: createWeeklyHistory({ fs, db: {}, uid: 'cg' }), calls, notify: (snapshot) => changed.success(snapshot), fail: () => changed.failure() };
}

test('FR-09: query จำกัด caregiverUid และช่วงเวลามื้อ 7 วัน ไม่มีอ่านยา/เขียนใด ๆ', async () => {
  const f = fixture();
  const loaded = await f.history.load({ anchorDateKey: '2026-11-08', now });
  assert.equal(loaded.pairId, 'pair-test');
  assert.equal(loaded.summary.totals.confirmed, 1);
  assert.deepEqual(f.calls[0].clauses, [['caregiverUid', '==', 'cg']]);
  assert.equal(f.calls[1].path, 'pairs/pair-test/doses');
  assert.deepEqual(f.calls[1].clauses, [['scheduledTime', '>=', new Date('2026-11-01T00:00:00').getTime()], ['scheduledTime', '<', new Date('2026-11-08T00:00:00').getTime()]]);
  assert.equal(f.calls[2].path, 'pairs/pair-test');
  assert.ok(!JSON.stringify(loaded).includes('DO NOT COPY'));
});

test('NFR-04/05: senior, ไม่ยินยอม, ไม่มีคู่ หรือหลายคู่ → หยุดก่อนอ่าน Dose', async () => {
  for (const options of [{ role: 'senior' }, { consent: false }, { pairCount: 0 }, { pairCount: 2 }]) {
    const f = fixture(options);
    await assert.rejects(f.history.load({ anchorDateKey: '2026-11-08', now }), { code: 'not_caregiver' });
    assert.equal(f.calls.length, 1);
  }
});

test('NFR-10: ยกเลิกระหว่างโหลด → ไม่คืนประวัติ และ watch สิทธิ์เรียกปิดเมื่อคู่หาย/ผิดสิทธิ์/error', async () => {
  const f = fixture({ revoked: true });
  await assert.rejects(f.history.load({ anchorDateKey: '2026-11-08', now }), { code: 'access_changed' });
  let count = 0;
  const stop = f.history.watchAccess('pair-test', () => count++);
  f.notify({ exists: () => false });
  f.notify({ exists: () => true, data: () => ({ caregiverUid: 'someone', consentAt: ts(1) }) });
  f.fail();
  assert.equal(count, 3); stop();
});
