// services/aiLabel.js + services/redact.js — ส่วนที่ทดสอบด้วย node ได้ (ไม่เรียก AI จริง: ใช้ model ปลอม)
// FR-02 ข้อ 1, 5, 9 · BR-19 · NFR-09, NFR-14 · การเรียก Gemini จริงต้องทดสอบบนมือถือด้วยฉลากที่ปิดชื่อ/HN แล้ว (MT-09) — ห้ามใช้ฉลากที่ยังเห็นชื่อ/HN
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAiLabel, parseAiText, classifyError, AiUnavailableError, PROMPT, AI_MODEL } from '../public/js/services/aiLabel.js';
import { planRedaction, rectFromPoints, TOP_BAND, MAX_SIDE } from '../public/js/services/redact.js';
import { buildDraft } from '../public/js/logic/labelDraft.js';

const blob = (text = 'jpeg') => new Blob([text], { type: 'image/jpeg' });
const fakeModel = (reply) => ({ calls: [], async generateContent(parts) { this.calls.push(parts); if (reply instanceof Error) throw reply; return { response: { text: () => reply } }; } });

test('requestDraft: ส่งคำสั่ง + รูปที่ปิดแล้วเป็น base64 → JSON ที่ AI คืน แล้ว buildDraft แปลงเป็นร่างได้', async () => {
  const reply = JSON.stringify({ name: 'ยาตัวอย่าง', instructionText: 'ก่อนนอน 1 เม็ด', warnings: null, contraindications: null, asNeeded: false, slots: [{ meal: 'bedtime', timing: 'at_bedtime', minutesBefore: null, tabletsPerDose: 1 }] });
  const model = fakeModel(reply);
  const ai = createAiLabel({ getModel: async () => model });
  const json = await ai.requestDraft(blob('abc'));
  assert.equal(model.calls.length, 1);
  assert.equal(model.calls[0][0], PROMPT);
  assert.equal(model.calls[0][1].inlineData.data, btoa('abc'));
  assert.equal(model.calls[0][1].inlineData.mimeType, 'image/jpeg');
  const draft = buildDraft(json, { mealTimes: { breakfast: '07:00', lunch: '12:00', dinner: '18:00', bedtime: '21:00' } });
  assert.deepEqual(draft.checks, []);
});

test('FR-02 ข้อ 5: ออฟไลน์ → ไม่ส่งอะไรเลย และบอกเหตุผล offline', async () => {
  const model = fakeModel('{}');
  const ai = createAiLabel({ getModel: async () => model, isOnline: () => false });
  await assert.rejects(ai.requestDraft(blob()), (e) => e instanceof AiUnavailableError && e.reason === 'offline');
  assert.equal(model.calls.length, 0);
});

test('FR-02 ข้อ 5: โควตาหมด / บริการล่ม / ตอบไม่ใช่ JSON → AiUnavailableError พร้อมเหตุผล', async () => {
  const cases = [[Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 }), 'quota'], [new Error('500 internal'), 'service_down'], ['ไม่ใช่ json', 'unreadable'], ['[1,2]', 'unreadable']];
  for (const [reply, reason] of cases) {
    const ai = createAiLabel({ getModel: async () => fakeModel(reply) });
    await assert.rejects(ai.requestDraft(blob()), (e) => e.reason === reason, String(reply));
  }
});

test('parseAiText ตัด ```json ออก · classifyError จัดกลุ่มเหตุผล', () => {
  assert.deepEqual(parseAiText('```json\n{"name":"x"}\n```'), { name: 'x' });
  assert.equal(classifyError(new Error('Failed to fetch')), 'offline');
  assert.equal(classifyError(new Error('x'), { online: false }), 'offline');
  assert.equal(classifyError(new Error('quota exceeded')), 'quota');
  assert.equal(new AiUnavailableError('แปลก').reason, 'service_down');
});

test('classifyError: คำว่า generateContent ไม่ถูกจับเป็น "โควตาหมด" · ข้อผิดพลาด App Check/สิทธิ์ = service_down · 429 = quota · มี detail ให้ทีมอ่าน', async () => {
  const appCheck = new Error('AI/fetch-error: Error fetching from https://firebasevertexai.googleapis.com/v1beta/projects/p/models/gemini-2.5-flash:generateContent: [401 ] Firebase App Check token is invalid.');
  assert.equal(classifyError(appCheck), 'service_down');
  assert.equal(classifyError(new Error('[403] Permission denied on generateContent')), 'service_down');
  assert.equal(classifyError(new Error('[429] Resource has been exhausted (e.g. check quota).')), 'quota');
  assert.equal(classifyError(new Error('Too many requests, rate limit')), 'quota');
  const ai = createAiLabel({ getModel: async () => fakeModel(appCheck) });
  await assert.rejects(() => ai.requestDraft(blob()), (e) => e.reason === 'service_down' && /App Check/.test(e.detail) && !/โควตา/.test(e.message));
});

test('PROMPT: ห้ามเดา ห้ามคืนชื่อ/HN · ก่อนอาหารไม่บอกนาที = null · ไม่ใช่ยาเม็ด = null', () => {
  assert.match(PROMPT, /Never guess/);
  assert.match(PROMPT, /Never output patient name, HN/);
  assert.match(PROMPT, /minutesBefore = null/);
  assert.match(PROMPT, /not a tablet or capsule/);
  assert.match(AI_MODEL, /^gemini-/);
});

test('AI ใส่ชื่อผู้ป่วย/HN มาเอง → buildDraft ทิ้งช่องนั้น ไม่เข้าร่าง (NFR-09)', () => {
  const draft = buildDraft({ name: 'ยา', patientName: 'นามสมมติ', hn: '0000', asNeeded: false, slots: [] });
  assert.equal('patientName' in draft, false);
  assert.equal('hn' in draft, false);
});

test('redact: ย่อด้านยาวไม่เกิน 1280 px และแถบดำปัดออกด้านนอก (ไม่ให้ขอบตัวอักษรหลุด)', () => {
  const plan = planRedaction({ width: 4032, height: 3024 }, [{ x: 0.1, y: 0.2, w: 0.3, h: 0.1 }]);
  assert.equal(plan.outW, MAX_SIDE); assert.equal(plan.outH, 960);
  assert.deepEqual(plan.boxes[0], { x: 128, y: 192, w: 384, h: 97 });                     // 0.2+0.1 ปัดขึ้นเป็นพิกเซลถัดไป = ปิดเกินเล็กน้อย (ปลอดภัยกว่าขาด)
  assert.deepEqual(planRedaction({ width: 800, height: 600 }, []).outW, 800);            // รูปเล็กไม่ขยาย
  assert.throws(() => planRedaction({ width: 0, height: 10 }, []), /ขนาด/);
});

test('redact: ลากนิ้วกลับทิศได้ · แตะพลาด (เล็กกว่า 1%) ไม่นับ · ค่าเกินขอบถูกตัด · ปุ่มลัดปิดแถบบน', () => {
  assert.deepEqual(rectFromPoints({ x: 0.5, y: 0.6 }, { x: 0.1, y: 0.2 }), { x: 0.1, y: 0.2, w: 0.4, h: 0.39999999999999997 });
  assert.equal(rectFromPoints({ x: 0.5, y: 0.5 }, { x: 0.505, y: 0.6 }), null);
  assert.deepEqual(rectFromPoints({ x: -1, y: 0.5 }, { x: 2, y: 0.7 }).w, 1);
  assert.deepEqual(TOP_BAND, { x: 0, y: 0, w: 1, h: 0.3 });
});
