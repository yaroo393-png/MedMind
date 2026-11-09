// FR-09: ขอบเขตสัปดาห์ หลักฐานยืนยัน และข้อมูลที่อนุญาตให้ส่ง AI (NFR-09)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { weekDateKeys, buildWeeklySummary, toWeeklyAiPayload } from '../public/js/logic/weeklySummary.js';
import { confirmStatus } from '../public/js/logic/confirm.js';

const anchorDateKey = '2026-11-08';
const stamp = (dateKey, time = '08:00') => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};
const now = stamp(anchorDateKey, '13:00');
const dose = (dateKey, time = '08:00', delay = 3 * 60000, extra = {}) => {
  const scheduledTime = stamp(dateKey, time), confirmedAt = scheduledTime + delay;
  return { scheduledTime, confirmedAt, status: confirmStatus(scheduledTime, confirmedAt), ...extra };
};
const make = (doses = {}, options = {}) => buildWeeklySummary({ doses, anchorDateKey, now, ...options });

test('FR-09: 7 วันที่จบแล้วเรียงเก่าสุดก่อน ไม่รวมวันนี้ และข้ามเดือน/ปี/ปีอธิกสุรทินถูกต้อง', () => {
  assert.deepEqual(weekDateKeys(anchorDateKey), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']);
  assert.deepEqual(weekDateKeys('2027-01-03'), ['2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.equal(weekDateKeys('2024-03-01')[6], '2024-02-29');
  assert.equal(weekDateKeys('2026-03-01')[6], '2026-02-28');
});

test('FR-09: ปฏิเสธวันที่ไม่มีจริงและเวลาอ้างอิงผิดรูป ไม่ปล่อย Date เลื่อนไปเดือนอื่นเอง', () => {
  for (const dateKey of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-11-00', '2026-1-08', '', null]) assert.throws(() => weekDateKeys(dateKey), TypeError);
  for (const value of [null, undefined, NaN, Infinity, '2026-11-08', 1.5]) assert.throws(() => make({}, { now: value }), TypeError);
  for (const doses of [null, [], 'bad']) assert.throws(() => make(doses), TypeError);
  assert.throws(() => make({}, { anchorDateKey: '2026-11-09' }), RangeError);
});

test('FR-09: เขตเวลาที่เปลี่ยน DST ยังได้ 7 วันปฏิทินและเวลาเตือนตามเครื่อง', () => {
  const moduleUrl = new URL('../public/js/logic/weeklySummary.js', import.meta.url).href;
  const script = `const {weekDateKeys,buildWeeklySummary}=await import(${JSON.stringify(moduleUrl)});
    const scheduledTime=new Date(2026,2,8,8,0).getTime();
    const summary=buildWeeklySummary({anchorDateKey:'2026-03-10',now:new Date(2026,2,10,13).getTime(),doses:{'2026-03-08_0800':{scheduledTime,confirmedAt:scheduledTime+60000,status:'taken'}}});
    process.stdout.write(JSON.stringify({spring:weekDateKeys('2026-03-10'),fall:weekDateKeys('2026-11-03'),record:summary.days[5].records}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', script], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' }));
  assert.deepEqual(result.spring, ['2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09']);
  assert.deepEqual(result.fall, ['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(result.record, [{ reminderTime: '08:00', status: 'taken' }]);
});

test('FR-09 / BR-20,21: นับเฉพาะการยืนยันจริง เรียงมื้อ และใช้ขอบ T+15 เดิมโดยไม่เขียนกฎซ้ำ', () => {
  const result = make({
    '2026-11-02_1800': dose('2026-11-02', '18:00', 15 * 60000 + 1),
    '2026-11-02_0800': dose('2026-11-02', '08:00', 15 * 60000),
    '2026-11-07_2200': dose('2026-11-07', '22:00'),
  });
  assert.deepEqual(result.totals, { confirmed: 3, onTime: 2, late: 1 });
  assert.equal(result.hasData, true);
  assert.equal(result.excludedCount, 0);
  assert.deepEqual(result.days[1].records, [{ reminderTime: '08:00', status: 'taken' }, { reminderTime: '18:00', status: 'taken_late' }]);
  assert.deepEqual(result.days[0].records, []); // ไม่เติม not_confirmed จากข้อมูลที่ไม่มี
});

test('FR-09: ไม่รวมวันนี้ นอกสัปดาห์ รอส่ง ยืนยันอนาคต หรือบันทึกที่วัน/เวลา/สถานะไม่สอดคล้อง', () => {
  const valid = dose('2026-11-02');
  const result = make({
    '2026-11-02_0800': valid,
    '2026-10-31_0800': dose('2026-10-31'),
    '2026-11-08_0800': dose('2026-11-08'),
    '2026-11-09_0800': dose('2026-11-09'),
    '2026-11-03_0800': dose('2026-11-03', '08:00', 60000, { pending: true }),
    '2026-11-04_0800': dose('2026-11-04', '08:00', 60000, { confirmedAt: now + 1, status: 'taken_late' }),
    '2026-11-05_0800': dose('2026-11-05', '08:00', 60000, { status: 'taken_late' }),
    '2026-11-06_0800': dose('2026-11-05'), // ID ไม่ตรงวันจริง
    '2026-11-07_0900': dose('2026-11-07'), // ID ไม่ตรงเวลาจริง
    '2026-11-07_0800_duplicate': dose('2026-11-07'),
    '2026-11-07_2400': dose('2026-11-07'),
    '2026-11-01_0800': null,
    '2026-11-01_1200': { scheduledTime: NaN, confirmedAt: now, status: 'taken' },
    '2026-11-01_1800': dose('2026-11-01', '18:00', -1),
    '2026-11-01_2200': dose('2026-11-01', '22:00', 60000, { status: 'not_confirmed' }),
    '2026-11-02_1200': dose('2026-11-02', '12:00', 60000, { scheduledTime: stamp('2026-11-02', '12:00') + 1 }),
  });
  assert.deepEqual(result.totals, { confirmed: 1, onTime: 1, late: 0 });
  assert.equal(result.excludedCount, 15);
});

test('FR-09: สัปดาห์ไม่มีหลักฐานยังมีตาราง 7 วัน แต่ไม่สร้าง payload ให้ AI', () => {
  const result = make();
  assert.equal(result.days.length, 7);
  assert.equal(result.hasData, false);
  assert.deepEqual(result.totals, { confirmed: 0, onTime: 0, late: 0 });
  assert.ok(result.days.every((day) => day.records.length === 0));
  assert.throws(() => toWeeklyAiPayload(result), RangeError);
});

test('FR-09 / NFR-09: allowlist ทิ้งชื่อ HN ยา ID วันจริง และเวลาที่กด ทั้งต้นทางและฟิลด์ที่เติมทีหลัง', () => {
  const doses = { '2026-11-02_0800': dose('2026-11-02', '08:00', 60000, { name: 'PRIVATE_NAME', HN: 'PRIVATE_HN', medicine: 'PRIVATE_MEDICINE' }) };
  const before = structuredClone(doses);
  const summary = make(doses);
  summary.name = 'PRIVATE_NAME';
  summary.days[1].HN = 'PRIVATE_HN';
  summary.days[1].records[0].medicine = 'PRIVATE_MEDICINE';
  const payload = toWeeklyAiPayload(summary);
  assert.deepEqual(payload, { days: summary.days.map((day, index) => ({ day: index + 1, meals: day.records.map((record) => ({ time: record.reminderTime, status: record.status })) })) });
  assert.equal(/PRIVATE|2026|scheduledTime|confirmedAt|medicine|HN|name/.test(JSON.stringify(payload)), false);
  assert.deepEqual(doses, before);
  payload.days[1].meals[0].time = '00:00';
  assert.equal(summary.days[1].records[0].reminderTime, '08:00');
});

test('FR-09: payload ปฏิเสธเวลาหรือสถานะที่สอดข้อความมา วันไม่ต่อกัน และมื้อซ้ำ', () => {
  const makeSummary = () => make({ '2026-11-02_0800': dose('2026-11-02') });
  for (const time of ['8:00', '24:00', '08:00 PRIVATE_NAME']) {
    const summary = makeSummary(); summary.days[1].records[0].reminderTime = time;
    assert.throws(() => toWeeklyAiPayload(summary), TypeError);
  }
  const wrongStatus = makeSummary(); wrongStatus.days[1].records[0].status = 'taken PRIVATE_NAME';
  assert.throws(() => toWeeklyAiPayload(wrongStatus), TypeError);
  const duplicate = makeSummary(); duplicate.days[1].records.push({ ...duplicate.days[1].records[0] });
  assert.throws(() => toWeeklyAiPayload(duplicate), TypeError);
  const wrongDate = makeSummary(); wrongDate.days[0].dateKey = '2026-10-31';
  assert.throws(() => toWeeklyAiPayload(wrongDate), TypeError);
  assert.throws(() => toWeeklyAiPayload({ days: [] }), TypeError);
});
