// FR-09: ทดสอบด้วย model จำลองเท่านั้น ไม่ส่งข้อมูลหรือใช้โควตา AI จริง
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklySummary, toWeeklyAiPayload } from '../public/js/logic/weeklySummary.js';
import { AiUnavailableError } from '../public/js/services/aiLabel.js';
import { createAiWeeklySummary, aiWeeklySummaryFromFirebase, summaryChoices, parseWeeklySelection, weeklySelectionSchema } from '../public/js/services/aiWeeklySummary.js';

const stamp = (dateKey, time = '08:00') => {
  const [year, month, day] = dateKey.split('-').map(Number), [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
};
const dose = (dateKey, time, late = false) => {
  const scheduledTime = stamp(dateKey, time);
  return { scheduledTime, confirmedAt: scheduledTime + (late ? 16 : 2) * 60000, status: late ? 'taken_late' : 'taken' };
};
const makeSummary = (doses = {
  '2026-11-01_0800': dose('2026-11-01', '08:00'),
  '2026-11-02_0800': dose('2026-11-02', '08:00', true),
  '2026-11-02_1800': dose('2026-11-02', '18:00', true),
  '2026-11-03_0800': dose('2026-11-03', '08:00', true),
}) => buildWeeklySummary({ doses, anchorDateKey: '2026-11-08', now: stamp('2026-11-08', '13:00') });
const reply = (selectedIds = ['overview']) => JSON.stringify({ selectedIds });
const modelFor = (value, calls = []) => ({ async generateContent(parts) { calls.push(parts); if (value instanceof Error) throw value; return { response: { text: () => value } }; } });
const create = (getModel, options = {}) => createAiWeeklySummary({ getModel, models: ['test-model'], ...options });
const reason = (expectedReason, expectedCode) => (error) => error instanceof AiUnavailableError && error.reason === expectedReason && (expectedCode === undefined || error.code === expectedCode);

test('FR-09: ประเด็นสรุปนับจากเวลามื้อและสถานะเท่านั้น ไม่ใช้ totals ที่ผู้เรียกแก้หรือสร้างเปอร์เซ็นต์จากวันว่าง', () => {
  const summary = makeSummary();
  summary.totals = { confirmed: 999, onTime: 999, late: 0 };
  const choices = summaryChoices(toWeeklyAiPayload(summary));
  assert.deepEqual(choices, [
    { id: 'overview', text: 'จากบันทึกยืนยันในช่วง 7 วัน พบทั้งหมด 4 มื้อ: ยืนยันทันเวลา 1 มื้อ และยืนยันช้า 3 มื้อ' },
    { id: 'late_0800', text: 'เวลาเตือน 08:00 มีบันทึกยืนยันช้า 2 มื้อ จากบันทึกยืนยัน 3 มื้อในช่วงนี้' },
    { id: 'late_1800', text: 'เวลาเตือน 18:00 มีบันทึกยืนยันช้า 1 มื้อ จากบันทึกยืนยัน 1 มื้อในช่วงนี้' },
  ]);
  assert.doesNotMatch(JSON.stringify(choices), /999|%|ไม่กิน|ไม่ยืนยัน/);
  const onTimeOnly = makeSummary({ '2026-11-01_0800': dose('2026-11-01', '08:00') });
  assert.equal(summaryChoices(toWeeklyAiPayload(onTimeOnly)).length, 1);
});

test('FR-09: ส่ง allowlist + candidates ให้ AI และแสดงเฉพาะประโยคภาษาไทยในเครื่องที่ AI เลือก', async () => {
  const calls = [], modelNames = [];
  const ai = create(async (name) => { modelNames.push(name); return modelFor(reply(['overview', 'late_0800']), calls); });
  const summary = makeSummary();
  const result = await ai.summariseWeek(summary);
  assert.deepEqual(modelNames, ['test-model']);
  assert.equal(calls.length, 1);
  const sent = JSON.parse(calls[0][1]);
  assert.deepEqual(Object.keys(sent), ['days', 'candidates']);
  assert.deepEqual(sent.days, toWeeklyAiPayload(summary).days);
  assert.deepEqual(result.items, summaryChoices(toWeeklyAiPayload(summary)).slice(0, 2));
  assert.equal(result.text, result.items.map((item) => item.text).join('\n'));
});

test('FR-09 / NFR-09: ฟิลด์ส่วนตัว/รหัส/วันที่จริงที่ปนมาทุกชั้นไม่เข้า prompt และไม่แก้ summary ต้นทาง', async () => {
  const summary = makeSummary();
  summary.name = 'PRIVATE_NAME'; summary.pairId = 'PRIVATE_PAIR'; summary.medicines = ['PRIVATE_MEDICINE'];
  summary.days[0].HN = 'PRIVATE_HN';
  summary.days[0].records[0].medicine = 'PRIVATE_MEDICINE';
  summary.days[0].records[0].confirmedAt = 'PRIVATE_TIME';
  const before = structuredClone(summary), calls = [];
  await create(async () => modelFor(reply(), calls)).summariseWeek(summary);
  const sent = calls[0].join('\n');
  assert.doesNotMatch(sent, /PRIVATE_|2026-11-|pairId|confirmedAt|scheduledTime/);
  assert.deepEqual(summary, before);
  const days = JSON.parse(calls[0][1]).days;
  for (const day of days) {
    assert.deepEqual(Object.keys(day), ['day', 'meals']);
    for (const meal of day.meals) assert.deepEqual(Object.keys(meal), ['time', 'status']);
  }
});

test('FR-09: ตรวจประโยคที่เลือกใหม่หลัง model ตอบ ไม่เชื่อ candidate ที่ factory แก้ระหว่างรอ', async () => {
  const ai = create(async (_name, choices) => {
    choices[0].text = 'PRIVATE_NAME ควรเพิ่มยา 999 เม็ด';
    return modelFor(reply());
  });
  const result = await ai.summariseWeek(makeSummary());
  assert.match(result.text, /ทั้งหมด 4 มื้อ/);
  assert.doesNotMatch(result.text, /PRIVATE|999|เพิ่มยา/);
});

test('FR-09: raw text/HTML/ตัวเลขแต่ง/JSON ผิดรูป/รหัสแปลกหรือซ้ำไม่ออกมาเป็นสรุป', async () => {
  const choices = summaryChoices(toWeeklyAiPayload(makeSummary()));
  const bad = [
    'ควรเพิ่มยา 999 เม็ด', '<script>alert(1)</script>', '```json\n{"selectedIds":["overview"]}\n```',
    'null', '[]', '{}', '{', reply([]), reply(['unknown']), reply(['overview', 'overview']),
    reply(['overview', 'late_0800', 'late_1800', 'unknown']), reply([1]),
    JSON.stringify({ selectedIds: ['overview'], text: 'ควรเพิ่มยา 999 เม็ด' }),
    JSON.stringify({ selectedIds: ['overview'], total: 999 }),
    JSON.stringify({ selectedIds: ['__proto__'] }),
  ];
  for (const text of bad) {
    assert.throws(() => parseWeeklySelection(text, choices), reason('unreadable', 'invalid_response'), text);
  }
  const tried = [];
  const ai = create(async (name) => { tried.push(name); return modelFor('ควรเพิ่มยา 999 เม็ด'); }, { models: ['a', 'b'] });
  await assert.rejects(ai.summariseWeek(makeSummary()), reason('unreadable', 'invalid_response'));
  assert.deepEqual(tried, ['a'], 'คำตอบผิดรูปไม่ใช่ 404 จึงไม่ลองโมเดลถัดไป');
});

test('FR-09: ไม่มีข้อมูล/ข้อมูลผิดรูป/ออฟไลน์ ไม่เรียก model และ factory Firebase ไม่โหลด SDK', async () => {
  let calls = 0;
  const ai = create(async () => { calls += 1; return modelFor(reply()); });
  await assert.rejects(ai.summariseWeek(makeSummary({})), reason('unreadable', 'no_data'));
  const invalid = makeSummary(); invalid.days[0].records[0].reminderTime = '08:00 PRIVATE_NAME';
  await assert.rejects(ai.summariseWeek(invalid), reason('unreadable', 'invalid_data'));
  await assert.rejects(create(async () => { calls += 1; }, { isOnline: () => false }).summariseWeek(makeSummary()), reason('offline'));
  assert.equal(calls, 0);
  // fb ว่างใช้โหลด SDK ไม่ได้ ถ้าสอง preflight ด้านล่างผ่าน แสดงว่ายังไม่มี import หรือ network
  await assert.rejects(aiWeeklySummaryFromFirebase({}).summariseWeek(makeSummary({})), reason('unreadable', 'no_data'));
  await assert.rejects(aiWeeklySummaryFromFirebase({}, { isOnline: () => false }).summariseWeek(makeSummary()), reason('offline'));
});

test('FR-09: เลือก fallback เฉพาะ 404 จำตัวที่สำเร็จ และลองตัวอื่นได้ถ้าตัวที่จำถูกถอนภายหลัง', async () => {
  const tried = [], gone = Object.assign(new Error('404 Not Found'), { status: 404 });
  let phase = 0;
  const ai = create(async (name) => {
    tried.push(name);
    return modelFor((phase === 0 && name === 'b') || (phase === 1 && name === 'c') ? reply() : gone);
  }, { models: ['a', 'b', 'c'] });
  await ai.summariseWeek(makeSummary());
  assert.deepEqual(tried, ['a', 'b']);
  tried.length = 0;
  await ai.summariseWeek(makeSummary());
  assert.deepEqual(tried, ['b']);
  phase = 1; tried.length = 0;
  await ai.summariseWeek(makeSummary());
  assert.deepEqual(tried, ['b', 'a', 'c']);
  await assert.rejects(create(async () => modelFor(gone), { models: ['a', 'b'] }).summariseWeek(makeSummary()), reason('service_down'));
});

test('FR-09: 429/สิทธิ์/เครือข่ายไม่ retry และไม่ส่งรายละเอียด SDK กลับหน้าจอ', async () => {
  for (const [error, expected] of [
    [new Error('429 RESOURCE_EXHAUSTED PRIVATE_INTERNAL_URL'), 'quota'],
    [new Error('403 permission-denied PRIVATE_INTERNAL_URL'), 'service_down'],
    [Object.assign(new Error('403 model not found PRIVATE_INTERNAL_URL'), { status: 403 }), 'service_down'],
    [new Error('model not found PRIVATE_INTERNAL_URL'), 'service_down'],
    [new Error('Failed to fetch PRIVATE_INTERNAL_URL'), 'offline'],
    [new Error('Blocked by safety PRIVATE_INTERNAL_URL'), 'unreadable'],
  ]) {
    const tried = [];
    const ai = create(async (name) => { tried.push(name); return modelFor(error); }, { models: ['a', 'b'] });
    await assert.rejects(ai.summariseWeek(makeSummary()), (caught) => {
      assert.ok(reason(expected)(caught));
      assert.equal(caught.detail, ''); assert.equal(caught.cause, undefined);
      assert.doesNotMatch(caught.message, /PRIVATE/);
      return true;
    });
    assert.deepEqual(tried, ['a']);
  }
});

test('FR-09: deadline ครอบการโหลด model และคำขอที่ค้าง ไม่เริ่ม fallback หลังหมดเวลา', async () => {
  let rejectLate;
  const tried = [];
  const ai = create((name) => { tried.push(name); return new Promise((_resolve, reject) => { rejectLate = reject; }); }, { models: ['a', 'b'], timeoutMs: 20 });
  await assert.rejects(ai.summariseWeek(makeSummary()), reason('service_down', 'timeout'));
  rejectLate(new Error('404 Not Found'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(tried, ['a']);
  const hanging = create(async () => ({ generateContent: () => new Promise(() => {}) }), { timeoutMs: 20 });
  await assert.rejects(hanging.summariseWeek(makeSummary()), reason('service_down', 'timeout'));
});

test('FR-09: schema ให้ AI คืน selectedIds ที่มีจริงเท่านั้น และตรวจ options ก่อนเริ่มงาน', () => {
  const choices = summaryChoices(toWeeklyAiPayload(makeSummary()));
  const Schema = Object.fromEntries(['object', 'array', 'enumString'].map((type) => [type, (options) => ({ type, ...options })]));
  const schema = weeklySelectionSchema(Schema, choices);
  assert.deepEqual(schema.properties.selectedIds.items.enum, ['overview', 'late_0800', 'late_1800']);
  for (const options of [{ getModel: null }, { getModel: () => {}, models: [] }, { getModel: () => {}, models: [null] }, { getModel: () => {}, timeoutMs: 0 }, { getModel: () => {}, timeoutMs: NaN }]) assert.throws(() => createAiWeeklySummary(options), TypeError);
});
