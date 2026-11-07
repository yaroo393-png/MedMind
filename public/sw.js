// Service worker ของ MedMind (PWA) — ให้ติดตั้งลงหน้าจอหลักได้ และเปิดเปลือกแอปได้แม้ไม่มีเน็ต
// ไม่ใช่ server code: ทำงานในเครื่องผู้ใช้ · แคชเฉพาะไฟล์ของเว็บเอง (same-origin GET) · ข้อมูลยา/ผลยืนยันอยู่ที่ Firestore (มีแคชออฟไลน์ของมันเอง)
// กลยุทธ์ "เครือข่ายก่อน แคชสำรอง": ได้โค้ดใหม่เสมอเมื่อออนไลน์ ไม่ค้างเวอร์ชันเก่า
const CACHE = 'medmind-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // SDK ของ Firebase / API ภายนอก ไม่ยุ่ง
  event.respondWith(
    self.fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
