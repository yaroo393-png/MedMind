// ผู้ดูแลสแกน QR ด้วยกล้องในแอป (FR-01 ข้อ 1, 3) — ส่วนที่แตะ DOM/กล้อง · เรียกจาก phone.js เมื่อกด "สแกน QR ด้วยกล้อง"
// ภาพจากกล้องอยู่ในเครื่อง ไม่ถูกส่งหรือบันทึกที่ไหน · อ่านด้วย jsQR (vendor/jsqr.js โหลดตอนกดสแกนเท่านั้น) · ไม่อนุญาตกล้อง → พิมพ์รหัส 6 หลักแทน (SRS §3)
import { tr, subscribeLanguage } from './i18n.js';
const FRAME_MS = 150;     // อ่านทุก ~0.15 วินาที พอสำหรับ QR และไม่กินแบต
const MAX_SIDE = 640;     // ย่อภาพก่อนอ่านให้เร็ว

const REASONS = {
  denied: 'ไม่ได้รับอนุญาตให้ใช้กล้อง — พิมพ์รหัส 6 หลักแทนได้',
  unsupported: 'เครื่องนี้เปิดกล้องในหน้านี้ไม่ได้ — ใช้แอปกล้องสแกน หรือพิมพ์รหัส 6 หลักแทน',
  nocamera: 'ไม่พบกล้อง — พิมพ์รหัส 6 หลักแทนได้',
};
const REASONS_EN = {
  denied: 'Camera permission was not granted — enter the six-digit code instead.',
  unsupported: 'This device cannot open the camera here — scan with your camera app or enter the six-digit code.',
  nocamera: 'No camera found — enter the six-digit code instead.',
};
const reasonText = (reason) => tr(REASONS[reason], REASONS_EN[reason]);

/**
 * เปิดหน้ากล้องสแกน · onText(text) คืน true เมื่อใช้ข้อความนั้นได้ (แล้วปิดกล้อง) · false = สแกนต่อ · onFail(message) เมื่อเปิดกล้องไม่ได้
 * @returns {() => void} ฟังก์ชันปิดกล้อง
 */
export function openScanner({ onText, onFail }) {
  const doc = globalThis.document, nav = globalThis.navigator;
  if (!nav?.mediaDevices?.getUserMedia) { onFail(reasonText('unsupported')); return () => {}; }
  const box = doc.createElement('div');
  box.className = 'scan-overlay';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', tr('สแกน QR ด้วยกล้อง', 'Scan QR with camera'));
  box.innerHTML = '<video class="scan-video" playsinline muted></video><div class="scan-frame" aria-hidden="true"></div>' +
    `<p class="scan-hint" role="status">${tr('เล็งกล้องไปที่ QR บนเครื่องผู้สูงอายุ', 'Point the camera at the QR code on the older adult’s device')}</p><button type="button" class="btn btn-primary scan-close">${tr('ยกเลิก', 'Cancel')}</button>`;
  doc.body.appendChild(box);
  const video = box.querySelector('video');
  let stream = null, timer = 0, closed = false;
  const stopLanguage = subscribeLanguage(() => {
    if (closed) return;
    box.setAttribute('aria-label', tr('สแกน QR ด้วยกล้อง', 'Scan QR with camera'));
    box.querySelector('.scan-hint').textContent = tr('เล็งกล้องไปที่ QR บนเครื่องผู้สูงอายุ', 'Point the camera at the QR code on the older adult’s device');
    box.querySelector('.scan-close').textContent = tr('ยกเลิก', 'Cancel');
  });
  const stop = () => {
    if (closed) return;
    closed = true; globalThis.clearTimeout(timer); stopLanguage();
    stream?.getTracks().forEach((t) => t.stop());
    box.remove();
  };
  box.querySelector('.scan-close').addEventListener('click', stop);
  (async () => {
    let jsQR;
    try {
      stream = await nav.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    } catch (e) {
      stop(); onFail(reasonText(e?.name === 'NotFoundError' ? 'nocamera' : 'denied')); return;
    }
    if (closed) { stream.getTracks().forEach((t) => t.stop()); return; }
    video.srcObject = stream;
    await video.play().catch(() => {});
    ({ default: jsQR } = await import('../vendor/jsqr.js'));
    const canvas = doc.createElement('canvas'), g = canvas.getContext('2d', { willReadFrequently: true });
    const tick = () => {
      if (closed) return;
      if (video.videoWidth) {
        const k = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * k); canvas.height = Math.round(video.videoHeight * k);
        g.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = g.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
        if (hit?.data && onText(hit.data)) { stop(); return; }
      }
      timer = globalThis.setTimeout(tick, FRAME_MS);
    };
    tick();
  })();
  return stop;
}
