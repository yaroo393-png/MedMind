# Firestore Security Rules — ฉบับร่าง (ยังไม่ได้ทดสอบ)

> **ห้ามนำไป deploy จนกว่าจะเขียนเทสต์ใน Firebase Emulator ผ่านทุกข้อด้านล่าง** — ร่างด้วย AI จาก SRS (NFR-04, 05, 10; BR-01, 02, 03, 17; FR-04 ข้อ 8; FR-05 ข้อ 8–10) โดยมีผู้ตรวจ (System Designer) เป็นผู้รับรอง · ถ้ากฎขัดกับ SRS ให้ยึด SRS
> ไม่ได้วางเป็น `firestore.rules` ที่ root เพื่อไม่ให้ถูก deploy โดยไม่ตั้งใจ — เมื่อทดสอบผ่านแล้วค่อยย้ายไปเป็น `firestore.rules`
> **ปรับ 1 พ.ย. 2569** ตาม architecture §5.1, §6, ADR-11, ADR-12: เพิ่ม `users`, `schedules`, DoseEvent 3 เวลา, สถานะคู่ `waiting → active → unpairing`, ตรวจ `expiresAt` สองที่โดยอิสระ

## แนวคิด
- **ปฏิเสธทุกอย่างเป็นค่าเริ่มต้น** อนุญาตเฉพาะที่ระบุ · ทุกการเขียนผูกกับ `request.auth.uid` — ไม่เชื่อ uid ที่แอปส่งมาเอง
- ข้อมูลสุขภาพใต้ `pairs/{pairId}` อ่าน/เขียนได้เฉพาะ `seniorUid` / `caregiverUid` ของ pair นั้น **และ `status == 'active'`** · `status = 'unpairing'` คือสวิตช์ตัดสิทธิ์ทันที (ADR-12) — หลังจากนั้นสมาชิกเดิมทำได้แค่ลบ
- การจับคู่ทำใน batch เดียว: (1) `invites/{code}` ใส่ `usedBy`, `usedAt` (2) `pairs/{pairId}` ใส่ `caregiverUid`, `status = 'active'` — กฎใช้ `getAfter()` ตรวจว่าสองอย่างไปด้วยกัน และตรวจ "ยังไม่ใช้ + ยังไม่หมดอายุ" **ทั้งใน rule ของ invite และ rule ของ pair โดยอิสระ** (ถ้ากฎฝั่งหนึ่งพลาด อีกฝั่งยังกัน)
- pair เก็บ `inviteCode` ปัจจุบัน (เห็นได้เฉพาะสมาชิก) เพื่อให้กฎอ้างถึง invite ได้
- เวลาที่ใช้ตัดสินสิทธิ์มาจาก server (`request.time`) เสมอ · เวลาจากเครื่อง (`confirmedAt`, `at`) ถูกจำกัดไม่ให้อยู่ในอนาคต

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ----- ตัวช่วย -----
    function signedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function pairPath(pairId) { return /databases/$(database)/documents/pairs/$(pairId); }
    function invitePath(code) { return /databases/$(database)/documents/invites/$(code); }
    function pair(pairId) { return get(pairPath(pairId)).data; }
    // ต้องมีฟิลด์ครบและไม่มีฟิลด์เกิน
    function exactKeys(d, fields) { return d.keys().hasAll(fields) && d.keys().hasOnly(fields); }
    function isMemberOf(p) { return signedIn() && (p.seniorUid == uid() || p.caregiverUid == uid()); }
    // สิทธิ์ข้อมูลสุขภาพ: เป็นสมาชิก และคู่ยัง active (NFR-04, ADR-12)
    function activeSenior(pairId)    { let p = pair(pairId); return signedIn() && p.status == 'active' && p.seniorUid == uid(); }
    function activeCaregiver(pairId) { let p = pair(pairId); return signedIn() && p.status == 'active' && p.caregiverUid == uid(); }
    function activeMember(pairId)    { let p = pair(pairId); return p.status == 'active' && isMemberOf(p); }
    // ระหว่างยกเลิกจับคู่: สมาชิกเดิมลบได้อย่างเดียว (BR-17, NFR-10)
    function unpairingMember(pairId) { let p = pair(pairId); return p.status == 'unpairing' && isMemberOf(p); }

    // ----- รหัสเชิญ (BR-01) -----
    match /invites/{code} {
      // ผู้สูงอายุสร้างรหัสของ pair ตัวเอง (สร้างพร้อม pair ใน batch เดียวได้ จึงใช้ getAfter)
      // รหัส 6 หลัก ยังไม่ใช้ และหมดอายุภายใน 10 นาทีนับจากเวลา server
      allow create: if signedIn()
        && code.matches('^[0-9]{6}$')
        && exactKeys(request.resource.data, ['pairId', 'seniorUid', 'expiresAt', 'usedAt', 'usedBy'])
        && request.resource.data.seniorUid == uid()
        && getAfter(pairPath(request.resource.data.pairId)).data.seniorUid == uid()
        && getAfter(pairPath(request.resource.data.pairId)).data.status == 'waiting'
        && request.resource.data.usedAt == null
        && request.resource.data.usedBy == null
        && request.resource.data.expiresAt is timestamp
        && request.resource.data.expiresAt > request.time
        && request.resource.data.expiresAt <= request.time + duration.value(10, 'm');
      // ผู้ดูแลใช้รหัส — ตรวจครั้งที่ 1: ยังไม่ใช้ + ยังไม่หมดอายุ · แก้ได้แค่ usedAt/usedBy (ต่ออายุเองไม่ได้)
      allow update: if signedIn()
        && resource.data.usedAt == null
        && request.time < resource.data.expiresAt
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['usedAt', 'usedBy'])
        && request.resource.data.usedAt == request.time
        && request.resource.data.usedBy == uid()
        && resource.data.seniorUid != uid()
        && getAfter(pairPath(resource.data.pairId)).data.caregiverUid == uid()
        && getAfter(pairPath(resource.data.pairId)).data.status == 'active';
      // ห้ามอ่าน (กันการไล่ดูรหัส) · ผู้สูงอายุลบรหัสของตัวเองได้ (สร้างรหัสใหม่ / ยกเลิกจับคู่)
      allow read: if false;
      allow delete: if signedIn() && resource.data.seniorUid == uid();
    }

    // ----- คู่ (pair) -----
    match /pairs/{pairId} {
      allow create: if signedIn()
        && exactKeys(request.resource.data, ['seniorUid', 'caregiverUid', 'consentAt', 'status', 'inviteCode', 'mealTimes', 'timezone', 'createdAt'])
        && request.resource.data.seniorUid == uid()
        && request.resource.data.caregiverUid == null
        && request.resource.data.consentAt == null
        && request.resource.data.status == 'waiting'
        && request.resource.data.timezone is string
        && request.resource.data.timezone.size() > 0 && request.resource.data.timezone.size() <= 64
        && request.resource.data.createdAt == request.time;
      // สมาชิกอ่านได้ทุกสถานะ เพื่อให้เห็น 'unpairing' แล้วล้างข้อมูลในเครื่อง (ตอน unpairing ไม่มีข้อมูลสุขภาพเหลือในเอกสารนี้)
      allow read: if isMemberOf(resource.data);
      allow update: if signedIn() && (
        // (ก) ผู้สูงอายุกดยินยอม (ครั้งเดียว ด้วยเวลา server) หรือเปลี่ยนรหัสเชิญ — ระหว่างรอผู้ดูแลเท่านั้น
        ( resource.data.seniorUid == uid()
          && resource.data.status == 'waiting'
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['consentAt', 'inviteCode'])
          && ( request.resource.data.consentAt == resource.data.consentAt
               || (resource.data.consentAt == null && request.resource.data.consentAt == request.time) ) )
        ||
        // (ข) ผู้ดูแลเข้าร่วม: ยินยอมแล้ว ยังไม่มีผู้ดูแล และใช้ invite ของคู่นี้ใน batch เดียวกัน
        //     ตรวจครั้งที่ 2 (อิสระจาก rule ของ invite): invite เป็นของ pair นี้ + ยังไม่ใช้ + ยังไม่หมดอายุ
        ( resource.data.status == 'waiting'
          && resource.data.caregiverUid == null
          && resource.data.consentAt != null
          && resource.data.seniorUid != uid()
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['caregiverUid', 'status'])
          && request.resource.data.caregiverUid == uid()
          && request.resource.data.status == 'active'
          && get(invitePath(resource.data.inviteCode)).data.pairId == pairId
          && get(invitePath(resource.data.inviteCode)).data.usedAt == null
          && request.time < get(invitePath(resource.data.inviteCode)).data.expiresAt
          && getAfter(invitePath(resource.data.inviteCode)).data.usedBy == uid() )
        ||
        // (ค) ผู้ดูแลตั้งเวลามื้อ / แก้เขตเวลา (BR-06, FR-03 ข้อ 6) — เฉพาะคู่ที่ active
        ( resource.data.status == 'active'
          && resource.data.caregiverUid == uid()
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['mealTimes', 'timezone'])
          && request.resource.data.timezone is string
          && request.resource.data.timezone.size() > 0 && request.resource.data.timezone.size() <= 64 )
        ||
        // (ง) เริ่มยกเลิกจับคู่ (ฝ่ายใดก็ได้): เขียนครั้งเดียว → ตัดสิทธิ์ข้อมูลสุขภาพทันที (ADR-12, BR-17, FR-05 ข้อ 10)
        ( resource.data.status == 'active'
          && isMemberOf(resource.data)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'mealTimes'])
          && request.resource.data.status == 'unpairing'
          && request.resource.data.mealTimes == null )
      );
      // ลบได้เมื่อกำลังยกเลิกจับคู่ (ลบลูกให้หมดก่อน) หรือผู้สูงอายุยกเลิกคู่ที่ยังไม่มีผู้ดูแล
      allow delete: if signedIn() && (
        (resource.data.status == 'unpairing' && isMemberOf(resource.data))
        || (resource.data.status == 'waiting' && resource.data.seniorUid == uid()) );
    }

    // ----- ผู้ใช้: เวลาที่เปิดแอปล่าสุด (FR-05 ข้อ 8–9) -----
    match /users/{userId} {
      // เขียนได้แค่เอกสารของตัวเอง · lastActiveAt ต้องเป็นเวลา server (serverTimestamp) — ปลอมเวลาไม่ได้
      allow create, update: if signedIn() && userId == uid()
        && request.resource.data.keys().hasOnly(['role', 'pairId', 'lastActiveAt'])
        && request.resource.data.role in ['senior', 'caregiver']
        && ( !('lastActiveAt' in request.resource.data)
             || request.resource.data.lastActiveAt == request.time
             || (resource != null && request.resource.data.lastActiveAt == resource.data.lastActiveAt) );
      // อ่านได้: ตัวเอง หรือผู้ดูแลของคู่ที่ active ซึ่งเจ้าของเอกสารนี้เป็นผู้สูงอายุของคู่นั้น
      allow read: if signedIn() && (
        userId == uid()
        || ( resource.data.pairId != null
             && pair(resource.data.pairId).status == 'active'
             && pair(resource.data.pairId).seniorUid == userId
             && pair(resource.data.pairId).caregiverUid == uid() ) );
      allow delete: if signedIn() && userId == uid();
    }

    // ----- ยา: ผู้ดูแลเท่านั้นที่เขียน (BR-03) -----
    match /pairs/{pairId}/medicines/{medicationId} {
      allow read: if activeMember(pairId);
      allow create, update: if activeCaregiver(pairId);
      allow delete: if activeCaregiver(pairId) || unpairingMember(pairId);
    }

    // ----- ตารางยา: 1 เอกสาร = ยา 1 ตัว × 1 เวลา (ADR-11) -----
    function validSchedule(pairId, d) {
      return exactKeys(d, ['medicationId', 'patientId', 'time', 'mealType', 'timezone', 'daysOfWeek', 'enabled', 'createdAt'])
        && existsAfter(/databases/$(database)/documents/pairs/$(pairId)/medicines/$(d.medicationId))
        && d.patientId == pair(pairId).seniorUid
        && d.time is string && d.time.matches('^([01][0-9]|2[0-3]):[0-5][0-9]$')
        && d.mealType in ['breakfast', 'lunch', 'dinner', 'bedtime']
        && d.timezone == getAfter(pairPath(pairId)).data.timezone   // ต้องตรงกับเขตเวลาของคู่ — เปลี่ยนเงียบ ๆ ไม่ได้
        && d.daysOfWeek is list && d.daysOfWeek.size() >= 1 && d.daysOfWeek.size() <= 7
        && d.enabled is bool;
    }
    match /pairs/{pairId}/schedules/{scheduleId} {
      allow read: if activeMember(pairId);
      allow create: if activeCaregiver(pairId) && validSchedule(pairId, request.resource.data)
        && request.resource.data.createdAt == request.time;
      allow update: if activeCaregiver(pairId) && validSchedule(pairId, request.resource.data)
        && request.resource.data.createdAt == resource.data.createdAt;
      allow delete: if activeCaregiver(pairId) || unpairingMember(pairId);
    }

    // ----- DoseEvent: ผู้สูงอายุสร้างได้ครั้งเดียว ห้ามแก้ (BR-12, NFR-07, FR-04 ข้อ 8) -----
    function validDose(pairId, doseId, d) {
      let schedule = get(/databases/$(database)/documents/pairs/$(pairId)/schedules/$(d.scheduleId)).data;
      return exactKeys(d, ['scheduleId', 'medicationId', 'patientId', 'scheduledTime', 'confirmedAt', 'serverReceivedAt', 'status'])
        // id = วันที่_scheduleId → กดซ้ำ/ส่งซ้ำได้ id เดิม
        && doseId.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}_' + d.scheduleId + '$')
        && d.medicationId == schedule.medicationId
        && d.patientId == uid()
        // 3 เวลาแยกกัน: เวลาที่ server ได้รับต้องเป็นเวลาจริงของ server
        && d.serverReceivedAt == request.time
        && d.scheduledTime is timestamp && d.confirmedAt is timestamp
        // เวลาที่กดมาจากเครื่อง: ไม่อยู่ในอนาคตเกิน 5 นาที และไม่ก่อน T เกิน 5 นาที (เผื่อนาฬิกาคลาด) — ส่งช้าเพราะออฟไลน์ได้
        && d.confirmedAt <= request.time + duration.value(5, 'm')
        && d.confirmedAt >= d.scheduledTime - duration.value(5, 'm')
        // สถานะต้องตรงกับเวลาที่กด: ≤ T+15 = taken, > T+15 = taken_late (ตรงกับ mealState)
        && ( (d.status == 'taken' && d.confirmedAt <= d.scheduledTime + duration.value(15, 'm'))
             || (d.status == 'taken_late' && d.confirmedAt > d.scheduledTime + duration.value(15, 'm')) );
    }
    match /pairs/{pairId}/doses/{doseId} {
      allow read: if activeMember(pairId);
      allow create: if activeSenior(pairId) && validDose(pairId, doseId, request.resource.data);
      allow update: if false;
      allow delete: if unpairingMember(pairId);
    }

    // ----- เหตุการณ์ "ยังไม่กิน" รอบ T+10 (BR-11) -----
    match /pairs/{pairId}/events/{mealId} {
      allow read: if activeMember(pairId);
      allow create: if activeSenior(pairId)
        && exactKeys(request.resource.data, ['kind', 'at'])
        && request.resource.data.kind == 'not_yet_last_round'
        && request.resource.data.at is timestamp
        && request.resource.data.at <= request.time + duration.value(5, 'm');
      allow update: if false;
      allow delete: if unpairingMember(pairId);
    }

    // ----- ผู้ดูแลเห็นการแจ้งแล้ว (BR-13: แต่ละแบบครั้งเดียวต่อมื้อ) — id = mealId_kind -----
    match /pairs/{pairId}/alertSeen/{alertId} {
      allow read: if activeMember(pairId);
      allow create: if activeCaregiver(pairId)
        && alertId.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{4}_(not_confirmed|confirmed_late)$')
        && exactKeys(request.resource.data, ['seenAt'])
        && request.resource.data.seenAt == request.time;
      allow update: if false;
      allow delete: if unpairingMember(pairId);
    }
  }
}
```

## หมายเหตุสำหรับผู้ตรวจ
- **ยกเลิกจับคู่ (BR-17, ADR-12):** ขั้นแรกเขียน `status = 'unpairing'` (rule (ง)) → ทุก rule ที่ใช้ `activeMember/activeSenior/activeCaregiver` ปฏิเสธทันที รวมถึง `users/{seniorUid}` ของผู้ดูแล · จากนั้นฝั่งไคลเอนต์อ่านรายการเอกสารในทุก sub-collection แล้วลบเป็น batch (Firestore ไม่ลบ sub-collection ให้เอง) ก่อนลบ `pairs/{pairId}` · หลังลบ `get(pairPath)` ไม่พบ pair ทุกคำขอจึงถูกปฏิเสธ (NFR-10) · ลำดับเต็มอยู่ใน architecture §6
- **ข้อมูลที่ดาวน์โหลดไปแล้ว:** Rules ปฏิเสธคำขอใหม่ได้ทันที แต่ลบสำเนาใน cache ของเครื่องอดีตผู้ดูแลไม่ได้ — แอปต้องตัด listener และล้าง cache เอง (FR-05 ข้อ 10, architecture §6 ขั้น 5) · ต้องยืนยันใน Emulator ว่า listener ที่เปิดค้างได้ `permission-denied` หลังเปลี่ยนสถานะ (R-14)
- **ขีดจำกัด `get()` ของ Rules:** การลบหลายร้อยเอกสารใน batch เดียวเรียก `get(pair)` ทุกเอกสาร — ต้องทดสอบใน Emulator ว่าไม่เกินขีดจำกัดจำนวนการเข้าถึงเอกสารของ Rules ถ้าเกินให้ลดขนาด batch
- **กดยืนยันซ้ำ / ส่งซ้ำตอนออฟไลน์:** การเขียนซ้ำ `doses/{doseId}` ถูกปฏิเสธ (ไม่มี update) — `FirebaseFirestoreService` ต้องแปลงเป็น "สำเร็จ ค่าเดิม" และไม่ทับเวลาเดิม (NFR-07) · ถ้า batch ของมื้อมีรายการที่มีอยู่แล้วปนอยู่ ทั้ง batch ถูกปฏิเสธ — แอปจึงเขียนเฉพาะ DoseEvent ที่ยังขาด (`buildDoseEvents`)
- **ออฟไลน์:** Firestore เก็บการเขียนไว้และส่งเมื่อกลับมาออนไลน์ — `confirmedAt` เป็นเวลาที่กดบนเครื่อง, `serverReceivedAt` = `serverTimestamp()` ซึ่ง server ใส่เวลาที่ได้รับจริง (FR-04 ข้อ 7–8) · ถ้าระหว่างออฟไลน์คู่ถูกยกเลิก การเขียนที่ค้างจะถูกปฏิเสธ (ถูกต้อง)
- **สิ่งที่ Rules ตรวจไม่ได้:** `scheduledTime` ตรงกับ `time` + `timezone` ของ Schedule จริงไหม (Rules คำนวณเขตเวลาไม่ได้) — `logic/zonedTime.js` + เทสต์รับผิดชอบ · การยืนยันเป็นการรายงานด้วยตนเองอยู่แล้ว (SRS §2.2) · Rules ตรวจชื่อ IANA ไม่ได้ ตรวจแค่เป็นข้อความ — `isValidTimeZone` ตรวจในแอปก่อนเขียน
- **ใช้รหัสเชิญ:** แอปเขียน invite ด้วย `batch.set(…, { merge: true })` ไม่ใช่ `update` เพราะ `update` บนเอกสารที่ไม่มีอยู่อาจตอบ `not-found` ซึ่งบอกใบ้ว่ารหัสไหนมีจริง — ด้วย `set` ทุกกรณีที่ผิดจะได้ `permission-denied` เหมือนกัน (ต้องยืนยันใน Emulator)
- **ความเสี่ยงเดารหัสที่ยังไม่ปิด (brute force):** รหัส 6 หลัก = 1,000,000 ค่า อายุ ≤ 10 นาที ใช้ครั้งเดียว · Rules **ไม่มี rate limit** และ Anonymous Auth สร้าง uid ใหม่ได้ไม่จำกัด จึงจำกัดจำนวนครั้งต่อ uid ไม่ได้ผล · ตัวอย่าง: ถ้ายิงได้ 100 ครั้ง/วินาทีตลอด 10 นาที ≈ 60,000 ครั้ง ≈ 6% ของรหัสทั้งหมด · ที่ช่วยลด: ต้องยินยอมก่อนจึงจับคู่ได้ (ช่วงที่โจมตีได้จริงคือหลังยินยอมจนผู้ดูแลจริงเข้าร่วม), ใช้ครั้งเดียว, ไม่บอกว่ารหัสมีจริง, ผู้สูงอายุเห็นสถานะ "เชื่อมต่อแล้ว" และยกเลิกได้ทันที, App Check · ถ้าต้องปิดจริงต้องเพิ่มความยาวรหัสหรือใช้ server นับครั้ง → **ต้องเสนอแก้ BR-01 ใน SRS ก่อน** · ลองเทสต์การเดาใน Emulator แล้วบันทึกผล

## เทสต์ที่ต้องมี (Firebase Emulator)
| # | กรณี | ผลที่คาดหวัง | NFR / AC |
|---|---|---|---|
| R-1 | ผู้ใช้อ่าน `pairs/{pairอื่น}` หรือลูกของ pair อื่น | ปฏิเสธ | NFR-04 |
| R-2 | ผู้ดูแลจับคู่ก่อนผู้สูงอายุกดยินยอม | ปฏิเสธ | NFR-05, FR-01 AC 2 |
| R-3 | จับคู่ด้วยรหัสผิด / หมดอายุ / ใช้แล้ว | ปฏิเสธ (`permission-denied` ทุกกรณี) | FR-01 AC 4, BR-01 |
| R-4 | ผู้ดูแลคนที่สองจับคู่กับ pair ที่มีผู้ดูแลแล้ว | ปฏิเสธ | FR-01 AC 5 |
| R-5 | จับคู่ถูกต้อง (batch ครบ) | สำเร็จ, `status = 'active'` | FR-01 AC 3 |
| R-6 | ผู้สูงอายุเขียน `medicines` หรือ `schedules` | ปฏิเสธ | BR-03 |
| R-7 | เขียน `doses/{id}` ซ้ำ (ออนไลน์ และจากคิวออฟไลน์) | ปฏิเสธ (แอปถือว่าสำเร็จ ค่าเดิมไม่เปลี่ยน) | NFR-07, FR-04 AC 2, 8 |
| R-8 | ยกเลิกจับคู่ครบทุกขั้น แล้วผู้ดูแลเดิมอ่านข้อมูล | ปฏิเสธ และเอกสารของคู่เหลือ 0 | NFR-10 |
| R-9 | ผู้ดูแลแก้ `expiresAt` หรือ `pairId` ของ invite ตอนใช้รหัส | ปฏิเสธ | BR-01 |
| R-10 | สร้าง invite ที่ `expiresAt` เกิน 10 นาที / อยู่ในอดีต / ไม่ใช่ 6 หลัก / ของ pair คนอื่น | ปฏิเสธ | BR-01 |
| R-11 | จับคู่โดยใช้ invite ของ pair อื่น หรือผู้สูงอายุจับคู่กับตัวเอง | ปฏิเสธ | FR-01, NFR-04 |
| R-12 | DoseEvent ที่ `serverReceivedAt` ≠ เวลา server, `confirmedAt` ในอนาคต, `status` ไม่ตรงกับเวลา, `patientId` ≠ ผู้เขียน หรือ id ไม่ตรง `วันที่_scheduleId` | ปฏิเสธ | FR-04 AC 8 |
| R-13 | ผู้ดูแลสร้าง DoseEvent | ปฏิเสธ | FR-04 |
| R-14 | หลัง `status = 'unpairing'` (ยังลบไม่เสร็จ) ผู้ดูแลอ่าน `medicines`/`doses`/`users/{seniorUid}` และ listener ที่เปิดค้าง | ปฏิเสธทันที / listener ได้ `permission-denied` | FR-05 AC 10, BR-17 |
| R-15 | อ่าน `users/{seniorUid}`: ผู้ดูแลของคู่ที่ active / ผู้ใช้อื่น | อนุญาต / ปฏิเสธ | FR-05 AC 8–9, NFR-04 |
| R-16 | เขียน `users/{uidอื่น}` หรือ `lastActiveAt` ≠ เวลา server | ปฏิเสธ | FR-05 |
| R-17 | Schedule ที่ `time` ผิดรูปแบบ, `timezone` ≠ ของคู่, `patientId` ≠ `seniorUid` หรือยาไม่มีอยู่ | ปฏิเสธ | FR-03 AC 6, ADR-11 |
| R-18 | ลองเดารหัสต่อเนื่องจากหลาย uid (บันทึกจำนวนครั้ง/วินาทีที่ทำได้) | ทุกครั้งที่ผิดถูกปฏิเสธ · บันทึกผลเพื่อประเมินความเสี่ยง | BR-01 (ความเสี่ยง) |
