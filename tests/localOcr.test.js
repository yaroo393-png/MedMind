// services/localOcr.js — OCR สำรองบนเครื่อง (FR-02 ข้อ 5 · BR-19 · NFR-09) · ใช้ Tesseract ปลอม ไม่โหลด CDN
// เจ้าของ: Yar · การอ่านจริงด้วย Tesseract ทดสอบในเบราว์เซอร์ด้วยฉลากสมมติ (บันทึกใน AI_USAGE_LOG) — ห้ามใช้ฉลากที่ยังเห็นชื่อ/HN
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalOcr, OCR_LANGS, OCR_PATHS } from '../public/js/services/localOcr.js';

const jpeg = (text = 'jpeg') => new Blob([text], { type: 'image/jpeg' });

// Tesseract ปลอม: จดว่าเรียกอะไร · reply = ผลที่ recognize คืน (Error = throw) · delayMs = หน่วงการสร้าง worker
function fakeTesseract({ reply = { text: 'ยาตัวอย่าง 500 mg', confidence: 88 }, delayMs = 0 } = {}) {
  const log = { created: [], recognized: [], terminated: 0 };
  const worker = {
    async setParameters() {},
    async recognize(image) { log.recognized.push(image); if (reply instanceof Error) throw reply; return { data: reply }; },
    async terminate() { log.terminated += 1; },
  };
  const lib = {
    async createWorker(langs, oem, options) {
      log.created.push({ langs, oem, options });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return worker;
    },
  };
  return { lib, log };
}

test('OCR: ไฟล์ ESM ของ Tesseract export แบบ default → ใช้ได้ (บั๊กเดิม: หา createWorker ไม่เจอทุกครั้ง)', async () => {
  const { lib, log } = fakeTesseract();
  const ocr = createLocalOcr({ loadModule: async () => ({ default: lib }) });
  const image = jpeg();
  assert.deepEqual(await ocr.recognize(image), { text: 'ยาตัวอย่าง 500 mg', confidence: 88 });
  assert.equal(log.recognized[0], image, 'อ่านภาพที่ได้รับ (ภาพที่ปิดแล้ว) ตัวเดียวกัน');
  assert.equal(log.terminated, 1, 'ปิด worker หลังอ่านเสร็จ');
});

test('OCR: ใช้ภาษาไทย+อังกฤษ และไฟล์ worker/core จากเวอร์ชันที่ตรึงไว้', async () => {
  const { lib, log } = fakeTesseract();
  await createLocalOcr({ loadModule: async () => lib }).recognize(jpeg());
  assert.equal(log.created[0].langs, OCR_LANGS);
  assert.equal(OCR_LANGS, 'tha+eng');
  assert.deepEqual(log.created[0].options, { workerPath: OCR_PATHS.worker, corePath: OCR_PATHS.core });
  for (const url of Object.values(OCR_PATHS)) assert.match(url, /^https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js(-core)?@5\.1\.1(\/|$)/);
});

test('OCR: รับเฉพาะ JPEG ที่ปิดข้อมูลแล้ว — อย่างอื่นปฏิเสธก่อนโหลดไลบรารี (BR-19)', async () => {
  let loaded = 0;
  const ocr = createLocalOcr({ loadModule: async () => { loaded += 1; return fakeTesseract().lib; } });
  await assert.rejects(ocr.recognize(new Blob(['x'], { type: 'image/png' })), TypeError);
  await assert.rejects(ocr.recognize({ type: 'image/jpeg', size: 3 }), TypeError, 'ไม่ใช่ Blob');
  await assert.rejects(ocr.recognize(new Blob([], { type: 'image/jpeg' })), RangeError, 'ภาพว่าง');
  assert.equal(loaded, 0);
});

test('OCR: อ่านไม่ได้ข้อความ / Tesseract ล้ม → throw และยังปิด worker', async () => {
  const empty = fakeTesseract({ reply: { text: '   ', confidence: 0 } });
  await assert.rejects(createLocalOcr({ loadModule: async () => empty.lib }).recognize(jpeg()), /อ่านข้อความจากภาพไม่ได้/);
  assert.equal(empty.log.terminated, 1);
  const broken = fakeTesseract({ reply: new Error('wasm crashed') });
  await assert.rejects(createLocalOcr({ loadModule: async () => broken.lib }).recognize(jpeg()), /wasm crashed/);
  assert.equal(broken.log.terminated, 1);
});

test('OCR: หมดเวลา → throw ทันที และปิด worker ที่สร้างเสร็จทีหลัง (ไม่ค้างกินแรม)', async () => {
  const slow = fakeTesseract({ delayMs: 60 });
  await assert.rejects(createLocalOcr({ loadModule: async () => slow.lib, timeoutMs: 10 }).recognize(jpeg()), /นานเกินไป/);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(slow.log.terminated, 1);
});

test('OCR: โหลดไลบรารีไม่ได้ (ออฟไลน์/CDN ล่ม) หรือไฟล์ผิด → throw ข้อความชัดเจน', async () => {
  await assert.rejects(createLocalOcr({ loadModule: async () => { throw new TypeError('Failed to fetch dynamically imported module'); } }).recognize(jpeg()), /Failed to fetch/);
  await assert.rejects(createLocalOcr({ loadModule: async () => ({ default: {} }) }).recognize(jpeg()), /ไม่พบ createWorker/);
});

test('OCR: ตัดข้อความยาวเกิน 5000 ตัวอักษร · confidence ไม่ใช่ตัวเลข = null', async () => {
  const long = fakeTesseract({ reply: { text: 'ก'.repeat(6000), confidence: undefined } });
  const r = await createLocalOcr({ loadModule: async () => long.lib }).recognize(jpeg());
  assert.equal(r.text.length, 5000);
  assert.equal(r.confidence, null);
});
