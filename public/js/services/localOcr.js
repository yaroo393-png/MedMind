// OCR สำรองบนเครื่อง (FR-02 ข้อ 5 · BR-19 · NFR-09, NFR-14) — ใช้เมื่อ Gemini ใช้ไม่ได้เท่านั้น
// เจ้าของ: Yar (FR-02) · สัญญา: recognize(redactedImage) → Promise<{ text, confidence }> · อ่านไม่ได้ → throw Error
// รับเฉพาะ JPEG ที่ผ่าน redactImage แล้ว · ภาพไม่ออกจากเครื่อง (CDN ให้แค่ไฟล์โปรแกรม/ภาษา ไม่ได้รับภาพ)
// ผลเป็น "ข้อความดิบให้ผู้ดูแลดูประกอบการกรอกเอง" เท่านั้น — ไม่แปลงเป็นชื่อยา จำนวนเม็ด หรือเวลาเตือน (BR-04)
// ส่วนที่ทดสอบด้วย node ได้: createLocalOcr (ใส่ loadModule ปลอมได้ ไม่โหลด CDN)

// ---------- ตั้งค่า (แก้ที่นี่ที่เดียว) ----------
const TESSERACT_VERSION = '5.1.1';                     // ตรึงเวอร์ชัน — ไฟล์ทั้งหมดต้องมาจากเวอร์ชันเดียวกัน
const CDN = 'https://cdn.jsdelivr.net/npm/';
export const OCR_PATHS = {
  module: `${CDN}tesseract.js@${TESSERACT_VERSION}/dist/tesseract.esm.min.js`,
  worker: `${CDN}tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
  core: `${CDN}tesseract.js-core@${TESSERACT_VERSION}`,   // โฟลเดอร์ — Tesseract เลือกไฟล์ wasm ที่เครื่องรองรับเอง
};
export const OCR_LANGS = 'tha+eng';                     // ฉลากไทยมีชื่อยาภาษาอังกฤษปน
export const OCR_TIMEOUT_MS = 90_000;                   // เวลารวมทั้งหมด (โหลดครั้งแรก ~8 MB บนมือถืออาจช้า)
export const MAX_TEXT_LENGTH = 5000;                    // กันข้อความยาวผิดปกติไปถ่วงหน้าจอ
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const PAGE_SEG_SPARSE = '11';                           // ฉลากมีหลายบรรทัด ตำแหน่งไม่สม่ำเสมอ → โหมดข้อความกระจาย

/** ตรวจว่าเป็นภาพที่ปิดข้อมูลแล้ว (JPEG จาก redactImage) ก่อนโหลดอะไรเลย */
function assertRedactedJpeg(image) {
  if (!(image instanceof Blob) || image.type !== 'image/jpeg') throw new TypeError('OCR รับเฉพาะภาพ JPEG ที่ปิดข้อมูลแล้ว');
  if (image.size <= 0 || image.size > MAX_IMAGE_BYTES) throw new RangeError('ภาพว่างหรือใหญ่เกิน 8 MB');
}

/** ไฟล์ ESM ของ Tesseract export แบบ default — รองรับทั้ง default และ named (ของปลอมในเทสต์) */
function pickTesseract(mod) {
  const lib = mod?.default ?? mod;
  if (typeof lib?.createWorker !== 'function') throw new Error('โหลด OCR ไม่สำเร็จ (ไม่พบ createWorker)');
  return lib;
}

/** รอ promise ไม่เกิน ms — เกินเวลา = throw (งานเดิมยังวิ่งต่อ ผู้เรียกต้องเก็บกวาดเอง) */
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('OCR ใช้เวลานานเกินไป')), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** ปิด worker เมื่อสร้างเสร็จ แม้จะหมดเวลาไปก่อนแล้ว (กัน worker ค้างกินแรมมือถือ) */
function terminateWhenReady(workerPromise) {
  workerPromise.then((w) => w.terminate()).catch(() => { /* สร้างไม่สำเร็จ = ไม่มีอะไรให้ปิด */ });
}

/**
 * @param {{ loadModule?: () => Promise<object>, timeoutMs?: number, paths?: typeof OCR_PATHS }} [options]
 *   loadModule = โหลดไลบรารี Tesseract (เทสต์ใส่ของปลอม) · timeoutMs = เวลารวมสูงสุด
 */
export function createLocalOcr({ loadModule = () => import(OCR_PATHS.module), timeoutMs = OCR_TIMEOUT_MS, paths = OCR_PATHS } = {}) {
  /** ขั้นตอนจริง: โหลดไลบรารี → สร้าง worker → อ่าน → ปิด worker */
  async function run(image) {
    const Tesseract = pickTesseract(await loadModule());
    const workerPromise = Tesseract.createWorker(OCR_LANGS, 1, { workerPath: paths.worker, corePath: paths.core });
    try {
      const worker = await workerPromise;
      await worker.setParameters({ tessedit_pageseg_mode: PAGE_SEG_SPARSE });
      const { data } = await worker.recognize(image);
      return data;
    } finally {
      terminateWhenReady(workerPromise);
    }
  }

  return {
    /** ภาพที่ปิดแล้ว (Blob JPEG) → { text, confidence } · ไม่มีข้อความ/หมดเวลา/โหลดไม่ได้ = throw */
    async recognize(redactedImage) {
      assertRedactedJpeg(redactedImage);
      const data = await withTimeout(run(redactedImage), timeoutMs);
      const text = String(data?.text ?? '').trim().slice(0, MAX_TEXT_LENGTH);
      if (!text) throw new Error('OCR อ่านข้อความจากภาพไม่ได้');
      return { text, confidence: Number.isFinite(data?.confidence) ? data.confidence : null };
    },
  };
}
