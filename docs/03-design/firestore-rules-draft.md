# Firestore Security Rules — ฉบับร่าง (ยังไม่ได้ทดสอบ)

> **ห้ามนำไป deploy จนกว่าจะเขียนเทสต์ใน Firebase Emulator ผ่านทุกข้อด้านล่าง** — ร่างด้วย AI จาก SRS (NFR-04, 05, 10; BR-01, 02, 03, 17) โดยมีผู้ตรวจ (System Designer) เป็นผู้รับรอง · ถ้ากฎขัดกับ SRS ให้ยึด SRS
> ไม่ได้วางเป็น `firestore.rules` ที่ root เพื่อไม่ให้ถูก deploy โดยไม่ตั้งใจ — เมื่อทดสอบผ่านแล้วค่อยย้ายไปเป็น `firestore.rules`

## แนวคิด
- **ปฏิเสธทุกอย่างเป็นค่าเริ่มต้น** อนุญาตเฉพาะที่ระบุ
- ทุกเส้นทางใต้ `pairs/{pairId}` อนุญาตเฉพาะ `seniorUid` / `caregiverUid` ของ pair นั้น
- การจับคู่ทำใน batch เดียว: (1) แก้ `invites/{code}` ใส่ `usedBy`, `usedAt` (2) แก้ `pairs/{pairId}` ใส่ `caregiverUid` — กฎใช้ `getAfter()` ตรวจว่าสองอย่างไปด้วยกัน
- pair เก็บ `inviteCode` ปัจจุบัน (เห็นได้เฉพาะสมาชิก) เพื่อให้กฎอ้างถึง invite ได้

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function pairRef(pairId) { return /databases/$(database)/documents/pairs/$(pairId); }
    function isSenior(pairId)    { return signedIn() && get(pairRef(pairId)).data.seniorUid == request.auth.uid; }
    function isCaregiver(pairId) { return signedIn() && get(pairRef(pairId)).data.caregiverUid == request.auth.uid; }
    function isMember(pairId)    { return isSenior(pairId) || isCaregiver(pairId); }

    // ----- รหัสเชิญ (BR-01) -----
    match /invites/{code} {
      // ผู้สูงอายุสร้างรหัสของ pair ตัวเอง อายุ 10 นาที
      allow create: if signedIn()
        && request.resource.data.seniorUid == request.auth.uid
        && request.resource.data.usedAt == null
        && request.resource.data.expiresAt <= request.time + duration.value(10, 'm');
      // ผู้ดูแลใช้รหัส: ต้องยังไม่ใช้ ไม่หมดอายุ ผู้สูงอายุยินยอมแล้ว และยังไม่มีผู้ดูแล
      allow update: if signedIn()
        && resource.data.usedAt == null
        && request.time < resource.data.expiresAt
        && get(pairRef(resource.data.pairId)).data.consentAt != null
        && get(pairRef(resource.data.pairId)).data.caregiverUid == null
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usedAt', 'usedBy'])
        && request.resource.data.usedBy == request.auth.uid
        && getAfter(pairRef(resource.data.pairId)).data.caregiverUid == request.auth.uid;
      allow read, delete: if false; // ลบผ่านการลบ pair (ดูหมายเหตุ) หรือให้ผู้สูงอายุลบรหัสเก่าของตัวเอง
    }

    // ----- คู่ (pair) -----
    match /pairs/{pairId} {
      allow create: if signedIn()
        && request.resource.data.seniorUid == request.auth.uid
        && request.resource.data.caregiverUid == null
        && request.resource.data.consentAt == null;
      allow read: if signedIn()
        && (resource.data.seniorUid == request.auth.uid || resource.data.caregiverUid == request.auth.uid);
      allow update: if signedIn() && (
        // ผู้สูงอายุ: กดยินยอม (ครั้งเดียว) หรือเปลี่ยนรหัสเชิญ
        ( resource.data.seniorUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['consentAt', 'inviteCode'])
          && (resource.data.consentAt == null || request.resource.data.consentAt == resource.data.consentAt) )
        ||
        // ผู้ดูแล: เข้าร่วม (ต้องมี invite ที่ถูกใช้ใน batch เดียวกัน) — ต้องยินยอมแล้วและยังว่าง
        ( resource.data.caregiverUid == null
          && resource.data.consentAt != null
          && request.resource.data.caregiverUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['caregiverUid'])
          && getAfter(/databases/$(database)/documents/invites/$(resource.data.inviteCode)).data.usedBy == request.auth.uid
          && get(/databases/$(database)/documents/invites/$(resource.data.inviteCode)).data.usedAt == null
          && request.time < get(/databases/$(database)/documents/invites/$(resource.data.inviteCode)).data.expiresAt )
        ||
        // ผู้ดูแล: ตั้งเวลามื้อ (BR-06)
        ( resource.data.caregiverUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mealTimes']) )
      );
      allow delete: if signedIn()
        && (resource.data.seniorUid == request.auth.uid || resource.data.caregiverUid == request.auth.uid);
    }

    // ----- ยา: ผู้ดูแลเท่านั้นที่เขียน (BR-03) -----
    match /pairs/{pairId}/medicines/{id} {
      allow read: if isMember(pairId);
      allow create, update: if isCaregiver(pairId);
      allow delete: if isMember(pairId);   // unpair ลบได้ทั้งสองฝั่ง (BR-17)
    }

    // ----- บันทึกยืนยัน: ผู้สูงอายุสร้างได้ครั้งเดียวต่อมื้อ ห้ามแก้เวลาเดิม (BR-12, NFR-07) -----
    match /pairs/{pairId}/doses/{doseId} {
      allow read: if isMember(pairId);
      allow create: if isSenior(pairId)
        && request.resource.data.keys().hasOnly(['confirmedAt', 'status'])
        && request.resource.data.status in ['taken', 'taken_late'];
      allow update: if false;
      allow delete: if isMember(pairId);   // unpair
    }

    // ----- เหตุการณ์ "ยังไม่กิน" รอบ T+10 (BR-11) -----
    match /pairs/{pairId}/events/{doseId} {
      allow read: if isMember(pairId);
      allow create: if isSenior(pairId) && request.resource.data.keys().hasOnly(['kind', 'at']);
      allow update: if false;
      allow delete: if isMember(pairId);
    }

    // ----- ผู้ดูแลเห็นการแจ้งแล้ว (BR-13: ครั้งเดียวต่อมื้อ) -----
    match /pairs/{pairId}/alertSeen/{doseId} {
      allow read: if isMember(pairId);
      allow create: if isCaregiver(pairId) && request.resource.data.keys().hasOnly(['seenAt']);
      allow update: if false;
      allow delete: if isMember(pairId);
    }
  }
}
```

## หมายเหตุสำหรับผู้ตรวจ
- **ลบ pair (BR-17):** ฝั่งไคลเอนต์ต้องอ่านรายการเอกสารในทุก sub-collection แล้วลบเป็น batch ก่อนลบ `pairs/{pairId}` (Firestore ไม่ลบ sub-collection ให้เอง) — กฎด้านบนยอมให้สมาชิกทั้งสองฝั่งลบ · หลังลบ `get(pairRef)` จะไม่พบ pair ทุกคำขอจึงถูกปฏิเสธ (NFR-10)
- **กดยืนยันซ้ำ:** การเขียนซ้ำ `doses/{doseId}` ถูกปฏิเสธ (ไม่มี update) — ฝั่งแอปต้องถือว่า "ถูกปฏิเสธเพราะมีอยู่แล้ว" = ยืนยันสำเร็จและไม่ทับเวลาเดิม (NFR-07)
- **ออฟไลน์:** Firestore เก็บการเขียนไว้และส่งเมื่อกลับมาออนไลน์ — `confirmedAt` เป็นเวลาที่กดบนเครื่อง ไม่ใช่เวลา server (FR-04 AC 7)
- **ความเสี่ยงที่ยังไม่ปิด:** รหัส 6 หลักอาจถูกเดาสุ่ม (1,000,000 ค่า, อายุ 10 นาที, ใช้ครั้งเดียว) — ถ้ามีเวลา ให้ลองเทสต์การเดาและตัดสินใจว่าต้องจำกัดจำนวนครั้งหรือไม่ (ต้องเสนอแก้ SRS ก่อนถ้าเพิ่ม requirement)

## เทสต์ที่ต้องมี (Firebase Emulator)
| # | กรณี | ผลที่คาดหวัง | NFR / AC |
|---|---|---|---|
| R-1 | ผู้ใช้อ่าน `pairs/{pairอื่น}` | ปฏิเสธ | NFR-04 |
| R-2 | ผู้ดูแลจับคู่ก่อนผู้สูงอายุกดยินยอม | ปฏิเสธ | NFR-05, FR-01 AC 2 |
| R-3 | จับคู่ด้วยรหัสผิด / หมดอายุ / ใช้แล้ว | ปฏิเสธ | FR-01 AC 4 |
| R-4 | ผู้ดูแลคนที่สองจับคู่กับ pair ที่มีผู้ดูแลแล้ว | ปฏิเสธ | FR-01 AC 5 |
| R-5 | จับคู่ถูกต้อง (batch ครบ) | สำเร็จ | FR-01 AC 3 |
| R-6 | ผู้สูงอายุเขียน `medicines` | ปฏิเสธ | BR-03 |
| R-7 | เขียน `doses/{id}` ซ้ำ | ปฏิเสธ (แอปถือว่าสำเร็จ) | NFR-07 |
| R-8 | หลัง unpair ผู้ดูแลเดิมอ่านข้อมูล | ปฏิเสธ และเอกสารเหลือ 0 | NFR-10 |
