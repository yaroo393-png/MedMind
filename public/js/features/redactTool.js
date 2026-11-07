// เครื่องมือลากนิ้ววาดแถบดำบนรูปฉลาก (C-04 · BR-19 · DL-21) — ส่วนที่แตะ DOM ของหน้าปิดชื่อ/HN · เรียกจาก phone.js หลังวาดหน้า
// เจ้าของ: Yar (FR-02) · คำนวณแถบด้วย services/redact.js (rectFromPoints) · ผลส่งกลับเป็นสัดส่วน 0–1 ของรูป ผ่าน onRect
import { rectFromPoints } from '../services/redact.js';

/** ผูกการลากบน element ที่มี data-redact (รูป + svg ซ้อน) · onRect({ x, y, w, h }) เมื่อปล่อยนิ้ว */
export function attachRedact(stage, onRect) {
  if (!stage || stage.dataset.bound) return;
  stage.dataset.bound = '1';
  let start = null, preview = null;
  const point = (e) => {
    const box = stage.getBoundingClientRect();
    return { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height };
  };
  stage.addEventListener('pointerdown', (e) => {
    start = point(e);
    stage.setPointerCapture(e.pointerId);
    preview = globalThis.document.createElement('div');
    preview.className = 'redact-preview';
    stage.appendChild(preview);
    e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!start || !preview) return;
    const r = rectFromPoints(start, point(e)) ?? { x: start.x, y: start.y, w: 0, h: 0 };
    Object.assign(preview.style, { left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
  });
  const finish = (e) => {
    if (!start) return;
    const r = rectFromPoints(start, point(e));
    start = null; preview?.remove(); preview = null;
    if (r) onRect(r);
  };
  stage.addEventListener('pointerup', finish);
  stage.addEventListener('pointercancel', () => { start = null; preview?.remove(); preview = null; });
}
