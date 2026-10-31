# ตั้งค่า GitHub สำหรับทีม (ทำครั้งเดียว โดย PM)

> หลักฐานส่วนร่วมรายคนวัดจาก GitHub (commits, PR, issues, เอกสารที่ commit) — ตั้งค่านี้ช่วยให้งานของทุกคนเห็นใน repo

## 1. สิทธิ์และการป้องกัน main
1. **Settings → Collaborators → Add people:** `V31311`, `IDK-SleepyBro`, `KaidangSuk`, `Khaiwann` (สิทธิ์ Write) — ทุกคนกดรับคำเชิญ
2. **Settings → General:** ชื่อ repo `MedMind` · **ปิด** "Template repository"
3. **Settings → Rules → Rulesets → New branch ruleset:** Target = Default branch · เปิด *Require a pull request before merging* (1 approval), *Block force pushes*, *Restrict deletions* · Bypass list เว้นว่าง
   (ทำหลัง commit ชุดแรกเสร็จ — ไม่งั้น push เข้า main ไม่ได้)

## 2. Labels
`FR-01` `FR-02` `FR-03` `FR-04` `FR-05` `FR-09` `docs` `test` `bug` `design` `ai-log`

ถ้าติดตั้ง GitHub CLI (`gh`) และล็อกอินแล้ว:
```bash
for l in FR-01 FR-02 FR-03 FR-04 FR-05 FR-09 docs test bug design ai-log; do gh label create "$l" --force; done
```

## 3. Milestones
วันที่ของแต่ละ sprint และขนาดงานอยู่ใน [`PROJECT-PLAN.md`](PROJECT-PLAN.md) และ [`02-requirements/backlog.md`](02-requirements/backlog.md) · บอร์ด: **Projects → New project → Board** (To do / Doing / Done) แล้วผูก issue ทุกใบ

| Milestone | ขอบเขต |
|---|---|
| Increment 0 — เอกสารและโครง repo | เอกสารทั้งหมดใน `docs/`, `fr/`, CI |
| Increment 1 — วงจรหลัก | FR-03, FR-04, FR-05 บนข้อมูลจริงใน Firestore (ใช้คู่ทดสอบ) |
| Increment 2 — จับคู่และ AI | FR-01, FR-02 |
| Final — ส่งงาน | Final Report, Demo Slides, AI-Use Statement, README |

## 4. Issue ชุดแรกที่แนะนำ
| # | Issue | ผู้รับผิดชอบ | Milestone | Label |
|---|---|---|---|---|
| 1 | ตรวจ architecture.md และตัดสินใจรายการ §11 | Takkan | 0 | design |
| 2 | ตั้ง Firebase project (Spark), เปิด Anonymous Auth + Firestore + Hosting | Takkan | 0 | design |
| 3 | `core/firebase.js`, `core/repo.js`, `core/clock.js` | Takkan | 1 | FR-01 |
| 4 | เขียนและทดสอบ Security Rules ใน Emulator (R-1…R-8) | Takkan | 2 | FR-01 |
| 5 | Design tokens + หน้าเปล่า S-00…S-03 ตาม design-system.md | Rossatorn | 1 | design |
| 6 | `logic/mealTimeline.js` — `mealState()` + เทสต์ TC-03.1–5 | Rossatorn | 1 | FR-03 |
| 7 | หน้าเตือน S-03 (เสียง, ปุ่ม Taken / Not yet) | Rossatorn | 1 | FR-03 |
| 8 | `logic/confirm.js` + เทสต์ TC-04.1–7 | Nichanan | 1 | FR-04 |
| 9 | หน้าหลักผู้สูงอายุ S-02 + ยืนยันออฟไลน์ | Nichanan | 1 | FR-04 |
| 10 | `logic/status.js` + เทสต์ TC-05.1–7 | Suchitra | 1 | FR-05 |
| 11 | หน้าสถานะรายวัน C-07 + แจ้งเตือน C-08 | Suchitra | 1 | FR-05 |
| 12 | แผนทดสอบมือ MT-01…MT-13 (เติมผล) | Suchitra | Final | test |
| 13 | `logic/schedule.js` + `logic/labelDraft.js` + เทสต์ TC-02.x | Yar | 1 | FR-02 |
| 14 | `services/redact.js` (วาดกรอบปิด, ลบ metadata) | Yar | 2 | FR-02 |
| 15 | `services/aiLabel.js` + หน้า C-03…C-05 | Yar | 2 | FR-02 |
| 16 | `logic/pairing.js` + หน้า S-01, C-01, ยกเลิกจับคู่ | Takkan | 2 | FR-01 |
| 17 | Final Report, Demo Slides, AI-Use Statement | Yar | Final | docs |
| 18 | Demo mode `demo.html` + `localRepo` + ข้อมูลตัวอย่าง (ADR-8) | Nichanan (+ ทุกคน) | 1 → 2 | design |
| 19 | Heuristic evaluation โดยทีมอื่น + think-aloud (MT-14, MT-07) | Suchitra | Final | test |

> ลำดับสำคัญ: **#2 และ #3 ก่อน** เพราะทุก FR พึ่ง `core/` · FR-03 (`mealState`) ต้องตกลงสัญญากับ FR-04/FR-05 ก่อนเขียน (architecture §5.1)

## 5. ตั้งค่าเครื่องแต่ละคน
```bash
git config --global user.name "ชื่อของคุณ"
git config --global user.email "<ตัวเลข>+<ชื่อผู้ใช้>@users.noreply.github.com"   # ดูที่ GitHub → Settings → Emails
```
อีเมลต้องผูกกับบัญชี GitHub ของตัวเอง ไม่งั้น commit จะไม่นับเป็นผลงาน
