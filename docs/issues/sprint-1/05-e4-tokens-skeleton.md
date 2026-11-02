<!-- title: E-4 Design tokens + CSS กลาง + โครงหน้า S-00…S-03, C-07 -->
<!-- labels: design · assignees: IDK-SleepyBro · milestone: Increment 1 — วงจรหลัก -->

**FR / AC:** NFR-03 (ขนาด/contrast) · BR-09 · design-system §2–4, §4.1 (ผู้ออกแบบ: Rossatorn) · ADR-9
**ผู้รับผิดชอบ:** Rossatorn
**Milestone:** Increment 1 · **ขนาด (เสนอ):** 3 · **ทำขนานกับ:** logic ได้เลย

## ขอบเขต
- `public/css/tokens.css` (เริ่มจาก `docs/02-design/prototypes/tokens.css`) + `public/css/base.css` — ใช้ token เท่านั้น ห้ามใส่สีลอย
- โครงหน้า HTML: `public/index.html` (S-00 เลือกบทบาท), `public/senior.html` (S-01…S-03), `public/caregiver.html` (C-07) — ยังไม่ต่อ logic
- ทุกหน้า: `<p class="covers">Covers: FR-xx …</p>` (design-system §5) · `lang="th"` · viewport มือถือ
- คอมโพเนนต์ HTML/CSS: `BigButton`, `MealCard`, `StatusChip`, `AlertBanner` ตาม design-system §3
- **แก้ `fr/FR-03-reminder/README.md`:** หัวข้อ "Definition" ยังว่าง → คัดจาก `docs/01-requirements/spec.md` FR-03

## ทำเสร็จเมื่อ
- [ ] MT-08 ผ่านบนหน้าโครง: ปุ่ม "กินแล้ว"/"ยังไม่กิน" ≥ 64 px เต็มแถว · ชื่อยา ≥ 24 px · เนื้อหา ≥ 18 px · contrast ≥ 4.5:1 (แนบภาพ DevTools ใน PR)
- [ ] ใช้งานที่จอกว้าง 360 px ได้ · เปิดผ่าน static server (ไม่ใช่ `file://`)
- [ ] Screen Map ใน `design-system.md` §4 ตรงกับไฟล์จริง
- [ ] `npm run check` ผ่าน · AI log

## ไม่อยู่ใน issue นี้
เสียงเตือน · ต่อ logic (`features/reminder.js` — issue หน้า S-03)
