// ปิดชื่อ/HN/บาร์โค้ดบนรูปฉลากก่อนส่งให้ AI (FR-02 ข้อ 9 · BR-19 · NFR-09, NFR-14 · DL-21)
// เจ้าของ: Yar (FR-02) · วาดรูปใหม่ลง canvas พร้อมแถบดำ → ได้ JPEG ใหม่ที่ไม่มีข้อมูลไฟล์ (EXIF/GPS) และย่อด้านยาวไม่เกิน 1280 px
// รูปต้นฉบับไม่ถูกเก็บหรือส่งออก — หน้าจอทิ้ง URL ของรูปต้นฉบับทันทีหลังส่ง · ส่วนคำนวณ (planRedaction, rectFromPoints) เป็นฟังก์ชันล้วน ทดสอบด้วย node ได้

export const MAX_SIDE = 1280;     // ด้านยาวสุดของรูปที่ส่ง (พอให้อ่านตัวหนังสือ และไม่เปลืองโควตา)
export const MIN_RECT = 0.01;     // แถบที่เล็กกว่า 1% ของภาพ = แตะพลาด ไม่นับ
export const TOP_BAND = { x: 0, y: 0, w: 1, h: 0.3 };   // ปุ่มลัด "ปิดแถบบน" (DL-21) — ส่วนบนของฉลากมักมีชื่อ/HN

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** จุดเริ่ม–จุดปล่อยนิ้ว (สัดส่วน 0–1 ของภาพ) → แถบสี่เหลี่ยม หรือ null ถ้าเล็กเกินไป */
export function rectFromPoints(a, b) {
  const x1 = clamp01(Math.min(a.x, b.x)), y1 = clamp01(Math.min(a.y, b.y));
  const x2 = clamp01(Math.max(a.x, b.x)), y2 = clamp01(Math.max(a.y, b.y));
  const rect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  return rect.w < MIN_RECT || rect.h < MIN_RECT ? null : rect;
}

/**
 * ขนาดรูปที่จะส่ง + ตำแหน่งแถบดำเป็นพิกเซล (ปัดออกด้านนอก กันขอบตัวอักษรหลุด)
 * @param {{ width: number, height: number }} source  ขนาดรูปต้นฉบับ
 * @param {{ x: number, y: number, w: number, h: number }[]} rects  แถบแบบสัดส่วน 0–1
 */
export function planRedaction({ width, height }, rects, maxSide = MAX_SIDE) {
  if (!(width > 0 && height > 0)) throw new RangeError('ขนาดรูปไม่ถูกต้อง');
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const outW = Math.round(width * scale), outH = Math.round(height * scale);
  const boxes = rects.map((r) => {
    const x = Math.floor(clamp01(r.x) * outW), y = Math.floor(clamp01(r.y) * outH);
    const x2 = Math.ceil(clamp01(r.x + r.w) * outW), y2 = Math.ceil(clamp01(r.y + r.h) * outH);
    return { x, y, w: x2 - x, h: y2 - y };
  });
  return { outW, outH, boxes };
}

/**
 * วาดรูปใหม่พร้อมแถบดำ → Blob JPEG (เบราว์เซอร์เท่านั้น)
 * @param {ImageBitmap|HTMLImageElement} image รูปต้นฉบับ (มี width/height)
 */
export async function redactImage(image, rects, { maxSide = MAX_SIDE, quality = 0.85 } = {}) {
  const { outW, outH, boxes } = planRedaction({ width: image.width, height: image.height }, rects, maxSide);
  const canvas = new OffscreenCanvas(outW, outH);
  const g = canvas.getContext('2d');
  g.drawImage(image, 0, 0, outW, outH);
  g.fillStyle = 'black';
  for (const b of boxes) g.fillRect(b.x, b.y, b.w, b.h);
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

/** เปิดรูปจากไฟล์ที่ถ่าย/เลือก → { bitmap, width, height } (หมุนตาม EXIF แล้ว) */
export async function loadPhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return { bitmap, width: bitmap.width, height: bitmap.height };
}
