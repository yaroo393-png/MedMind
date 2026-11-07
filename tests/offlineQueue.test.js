// core/offlineQueue.js — คิวออฟไลน์ของเครื่องผู้สูงอายุใน Demo mode (FR-04 ข้อ 7, 9 · BR-20 · NFR-07)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../public/js/core/clock.js';
import { createLocalRepo } from '../public/js/core/repo.js';
import { createOfflineQueue } from '../public/js/core/offlineQueue.js';
import { demoSeed } from '../public/js/core/demoData.js';

const day = new Date(2026, 10, 4).getTime();
const at = (h, m, s = 0, ms = 0) => day + ((h * 60 + m) * 60 + s) * 1000 + ms;
const meal = { dateKey: '2026-11-04', reminderTime: '07:00' };

function setup() {
  const clock = createClock({ start: at(7, 0) });
  const repo = createLocalRepo({ clock, seed: demoSeed() });
  return { clock, repo, q: createOfflineQueue(repo) };
}

test('ออนไลน์: ผ่านไปที่ repo ตรง ๆ', async () => {
  const { repo, q } = setup();
  const r = await q.repo.confirmMeal({ meal, confirmedAt: at(7, 3) });
  assert.equal(r.created, true);
  assert.equal(r.queued, undefined);
  assert.equal(Object.keys(await repo.getDoses()).length, 1);
});

test('ออฟไลน์: จอผู้สูงอายุเห็นทันที (pending) แต่ที่เก็บกลางยังว่าง', async () => {
  const { repo, q } = setup();
  await q.setOnline(false);
  const r = await q.repo.confirmMeal({ meal, confirmedAt: at(7, 3) });
  assert.equal(r.queued, true);
  assert.equal(q.pendingCount(), 1);
  assert.equal(Object.keys(await repo.getDoses()).length, 0);
  const own = await q.repo.getDoses();
  assert.equal(own['2026-11-04_0700'].pending, true);
  assert.equal(own['2026-11-04_0700'].status, 'taken');
});

test('ออฟไลน์: กดซ้ำไม่สร้างใหม่ (BR-12 / NFR-07)', async () => {
  const { q } = setup();
  await q.setOnline(false);
  await q.repo.confirmMeal({ meal, confirmedAt: at(7, 3) });
  const again = await q.repo.confirmMeal({ meal, confirmedAt: at(7, 4) });
  assert.equal(again.created, false);
  assert.equal(again.dose.confirmedAt, at(7, 3));
  assert.equal(q.pendingCount(), 1);
});

test('กลับออนไลน์: ส่งด้วยเวลาที่กดเดิม ไม่ใช่เวลาที่ส่ง → status ตัดสินจากเวลากด (BR-20)', async () => {
  const { clock, repo, q } = setup();
  await q.setOnline(false);
  await q.repo.confirmMeal({ meal, confirmedAt: at(7, 14) });          // ทันเวลา (≤ T+15)
  clock.set(at(7, 20));                                                   // ข้อมูลมาถึงตอน 07:20 = หลัง T+15
  await q.setOnline(true);
  const dose = (await repo.getDoses())['2026-11-04_0700'];
  assert.equal(dose.confirmedAt, at(7, 14));
  assert.equal(dose.status, 'taken');
  assert.equal(dose.serverReceivedAt, at(7, 20));
  assert.equal(q.pendingCount(), 0);
  assert.equal(Object.keys(await q.repo.getDoses()).length, 1);
});

test('ข้อมูลจริงในที่เก็บชนะของที่ค้าง และไม่ค้าง pending หลังส่งแล้ว', async () => {
  const { clock, repo, q } = setup();
  await q.setOnline(false);
  await q.repo.confirmMeal({ meal, confirmedAt: at(7, 3) });
  clock.set(at(7, 5));
  await q.setOnline(true);
  const own = await q.repo.getDoses();
  assert.equal(own['2026-11-04_0700'].pending, undefined);
  assert.equal(own['2026-11-04_0700'].serverReceivedAt, at(7, 5));
  assert.deepEqual(Object.keys(await repo.getDoses()), ['2026-11-04_0700']);
});

test('"ยังไม่กิน" ออฟไลน์: จอผู้สูงอายุเห็นเวลาที่กด ที่เก็บกลางได้เมื่อกลับออนไลน์ (BR-11 เก็บครั้งแรกเท่านั้น)', async () => {
  const { repo, q } = setup();
  await q.setOnline(false);
  await q.repo.reportNotYet({ meal, at: at(7, 10) });
  const again = await q.repo.reportNotYet({ meal, at: at(7, 11) });
  assert.equal(again.created, false);
  assert.equal(await q.repo.getNotYet(meal), at(7, 10));
  assert.equal(await repo.getNotYet(meal), null);
  await q.setOnline(true);
  assert.equal(await repo.getNotYet(meal), at(7, 10));
});

test('ส่งตามลำดับที่กด · เมธอดอื่นของ repo ใช้ได้ตามเดิมตอนออฟไลน์', async () => {
  const { repo, q } = setup();
  await q.setOnline(false);
  await q.repo.reportNotYet({ meal, at: at(7, 10) });
  await q.repo.confirmMeal({ meal, confirmedAt: at(7, 12) });
  assert.equal((await q.repo.listMedicines()).length, 4);                // อ่านจากที่เก็บได้
  await q.setOnline(true);
  assert.equal(await repo.getNotYet(meal), at(7, 10));
  assert.ok((await repo.getDoses())['2026-11-04_0700']);
  assert.equal(q.isOnline(), true);
});
