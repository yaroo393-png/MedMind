// เชื่อม Firebase (Anonymous Auth + Firestore) — ใช้เฉพาะหน้าที่ใช้งานจริง (senior.html / caregiver.html) · Demo mode ไม่เรียกไฟล์นี้
// เจ้าของ: Takkan (core/) · Issue #8, #9 · ADR-2 (แพ็ก Spark ฟรี ไม่ผูกบัตร) · ADR-5 (Anonymous Auth ไม่มีบัญชี/รหัสผ่าน)
// SDK โหลดจาก CDN ของ Google แบบ ES module (ไม่มี build step) — ตรึงเวอร์ชันที่ทดสอบกับ Emulator แล้ว (emulator-tests/)
// ค่า config ด้านล่างเป็นค่าสาธารณะของเว็บแอป commit ได้ (RULES §3) — ความปลอดภัยมาจาก firestore.rules ไม่ใช่การซ่อนค่านี้
export const SDK_VERSION = '12.19.0';
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDumfvNUedfZEf7TR4QBRBa4RzZYOv26sE',
  authDomain: 'medmind-12eb2.firebaseapp.com',
  projectId: 'medmind-12eb2',
  storageBucket: 'medmind-12eb2.firebasestorage.app',
  messagingSenderId: '745006849125',
  appId: '1:745006849125:web:c16ba6935782847528fa8c',
};

/**
 * เริ่ม Firebase แล้วล็อกอินแบบนิรนาม (uid เดิมเมื่อเปิดซ้ำบนเครื่องเดิม)
 * @param {{ sdkBase?: string, emulator?: boolean, config?: object }} [options]
 *   sdkBase = ที่ตั้งไฟล์ SDK (ค่าเริ่มต้น = CDN ของ Google) · emulator = ต่อ Firebase Emulator บนเครื่อง (ทดสอบเท่านั้น)
 * @returns {Promise<{ app: object, auth: object, db: object, fs: object, uid: string, sdk: { app: object, auth: object, firestore: object } }>}
 */
export async function connectFirebase({ sdkBase = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/`, emulator = false, config = FIREBASE_CONFIG } = {}) {
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${sdkBase}firebase-app.js`), import(`${sdkBase}firebase-auth.js`), import(`${sdkBase}firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(config);
  const auth = authMod.getAuth(app);
  if (emulator) authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await auth.authStateReady();
  if (!auth.currentUser) await authMod.signInAnonymously(auth);
  // เก็บสำเนาในเครื่องแบบถาวร: ออฟไลน์กด "กินแล้ว" ได้และส่งเมื่อกลับออนไลน์ (FR-04 ข้อ 7)
  const db = fsMod.initializeFirestore(app, { localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentSingleTabManager() }) });
  if (emulator) fsMod.connectFirestoreEmulator(db, '127.0.0.1', 8080);
  return { app, auth, db, fs: fsMod, uid: auth.currentUser.uid, sdk: { app: appMod, auth: authMod, firestore: fsMod }, sdkBase };
}
