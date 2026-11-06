# Firestore Security Rules — ฉบับร่าง (ยังไม่ได้ทดสอบ)

> **ห้ามนำไป deploy จนกว่าจะเขียนเทสต์ใน Firebase Emulator ผ่านทุกข้อด้านล่าง** — ร่างด้วย AI จาก SRS v1.5 (NFR-04, 05, 07, 10; BR-01, 02, 03, 12, 17, 20; มติ A1/A5) โดยมีผู้ตรวจ (System Designer) เป็นผู้รับรอง · ถ้ากฎขัดกับ SRS ให้ยึด SRS
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
      // DL-20 (6 พ.ย. 2569): ช่อง consented / hasCaregiver เป็น "สำเนาเพื่อแสดงเหตุผล" ให้เครื่องผู้ดูแลบอกได้ว่าทำไมถูกปฏิเสธ (FR-01 ข้อ 2/4/5)
      //   ผู้ตัดสินจริงยังเป็นเอกสาร pairs/{pairId} (ตรวจใน update ด้านล่าง) — สำเนาผิดไม่ทำให้จับคู่ผ่าน
      // ผู้สูงอายุสร้างรหัสของ pair ตัวเอง อายุ 10 นาที
      allow create: if signedIn()
        && request.resource.data.seniorUid == request.auth.uid
        && request.resource.data.usedAt == null
        && request.resource.data.consented == (getAfter(pairRef(request.resource.data.pairId)).data.consentAt != null) // getAfter: สร้าง pair กับรหัสใน batch เดียวกันได้
        && request.resource.data.hasCaregiver == false
        && request.resource.data.expiresAt <= request.time + duration.value(10, 'm');
      // อ่านได้ทีละเอกสารเมื่อรู้รหัส (ใช้เลือกข้อความ) — ห้ามไล่ดูทั้งหมด (list) กันการกวาดหารหัส
      allow get: if signedIn();
      allow list: if false;
      // (1) ผู้ดูแลใช้รหัส: ยังไม่ใช้ ไม่หมดอายุ (รวมตรง expiresAt พอดี — "เกิน 10 นาที" จึงหมดอายุ) ผู้สูงอายุยินยอมแล้ว และยังไม่มีผู้ดูแล
      // (2) ผู้สูงอายุอัปเดตสำเนา consented หลังกดยินยอม (batch เดียวกับการตั้ง consentAt)
      allow update: if signedIn() && (
        ( resource.data.usedAt == null
          && request.time <= resource.data.expiresAt
          && get(pairRef(resource.data.pairId)).data.consentAt != null
          && get(pairRef(resource.data.pairId)).data.caregiverUid == null
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usedAt', 'usedBy', 'hasCaregiver'])
          && request.resource.data.usedBy == request.auth.uid
          && request.resource.data.hasCaregiver == true
          && getAfter(pairRef(resource.data.pairId)).data.caregiverUid == request.auth.uid )
        || ( resource.data.seniorUid == request.auth.uid
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['consented'])
          && request.resource.data.consented == true
          && getAfter(pairRef(resource.data.pairId)).data.consentAt != null )
      );
      allow delete: if false; // ลบผ่านการลบ pair (ดูหมายเหตุ) หรือให้ผู้สูงอายุลบรหัสเก่าของตัวเอง
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
      // A1: ยามี slots อย่างน้อย 1 ช่อง (ตรวจโครงหยาบเท่านั้น — ความถูกต้องของแต่ละ slot ตรวจด้วย validateSlot ฝั่งแอป)
      allow create, update: if isCaregiver(pairId)
        && request.resource.data.slots is list
        && request.resource.data.slots.size() >= 1;
      allow delete: if isMember(pairId);   // unpair ลบได้ทั้งสองฝั่ง (BR-17)
    }

    // ----- บันทึกยืนยัน: ผู้สูงอายุสร้างได้ครั้งเดียวต่อมื้อ ห้ามแก้เวลาเดิม (BR-12, NFR-07) -----
    match /pairs/{pairId}/doses/{doseId} {
      allow read: if isMember(pairId);
      // A5 / BR-20: เก็บเวลา 3 อย่างแยกกัน (scheduledTime, confirmedAt, serverReceivedAt) — ตัดสิน taken / taken_late ด้วย confirmedAt เท่านั้น
      allow create: if isSenior(pairId)
        && request.resource.data.keys().hasOnly(['scheduledTime', 'confirmedAt', 'serverReceivedAt', 'status'])
        && request.resource.data.scheduledTime is timestamp
        && request.resource.data.confirmedAt is timestamp
        && request.resource.data.serverReceivedAt == request.time     // serverTimestamp() — ห้ามเครื่องใส่เอง
        && request.resource.data.status in ['taken', 'taken_late']
        && request.resource.data.status ==
           (request.resource.data.confirmedAt <= request.resource.data.scheduledTime + duration.value(15, 'm')
             ? 'taken' : 'taken_late');                                  // ตรง T+15 พอดี = 'taken'
        // ยังไม่ใส่ขอบเขตของ confirmedAt เทียบ request.time (นาฬิกาคลาดเคลื่อน/ออฟไลน์นาน) — รอตัดสิน PD-4
      allow update: if false;                // ห้ามแก้ confirmedAt เดิม (BR-12, NFR-07)
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
    match /pairs/{pairId}/alertSeen/{alertId} {     // alertId = `${doseId}_${kind}` (kind: not_confirmed | confirmed_late — PD-5)
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
| R-9 | สร้าง dose โดย `serverReceivedAt` ไม่เท่า `request.time` (เครื่องใส่เวลาเอง) หรือมี field เกิน | ปฏิเสธ | BR-20, NFR-07 |
| R-10 | สร้าง dose ที่ `status` ไม่ตรงกฎ: (a) `confirmedAt = T+15:00` แต่ `status = taken_late` (b) `confirmedAt = T+15:00.001` แต่ `status = taken` | (a) ปฏิเสธ (b) ปฏิเสธ · ส่วน `confirmedAt = T+15:00` + `taken` และ `confirmedAt = T+15:00.001` + `taken_late` ต้องสำเร็จ | A5-T02, A5-T03 |
| R-11 | บันทึกยาที่ไม่มี `slots` หรือ `slots` ว่าง | ปฏิเสธ | A1, FR-02 |
| R-12 | ผู้ใช้ที่รู้รหัส `get` เอกสารรหัส · ผู้ใช้ `list` รหัสทั้งหมด | `get` สำเร็จ · `list` ปฏิเสธ | FR-01 AC 2/4/5 (เลือกข้อความ), NFR-04 · DL-20 |
| R-13 | ใช้รหัสที่ `request.time` = `expiresAt` พอดี · และหลัง `expiresAt` | พอดี: สำเร็จ · หลัง: ปฏิเสธ | FR-01 AC 4, BR-01 · DL-20 |
| R-14 | ผู้ดูแลแก้ `consented` เอง / ผู้สูงอายุตั้ง `consented = true` โดยยังไม่ยินยอมใน pair | ปฏิเสธทั้งคู่ | NFR-05 · DL-20 |
