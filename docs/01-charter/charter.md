🌐 **Language:** English · [ไทย](charter.th.md)

# Team Charter (M1)

> สำเนา Markdown ของ Team Charter (M1) สำหรับอ่านบน GitHub — ฉบับที่ส่งคือ [`M1-Charter_MedMind.pdf`](M1-Charter_MedMind.pdf) · แก้ทั้งสองไฟล์ให้ตรงกัน

**Project name:** MedMind — medication reminders and medication status for the caregivers of older adults

**GitHub repo:** https://github.com/yaroo393-png/MedMind

**Team Members**

| Student ID | Name | GitHub | Role | Feature owned |
|---|---|---|---|---|
| 6931503064 | Yar Oo | yaroo393-png | Project Manager | FR-02 label scanning + all project documents |
| 6931503035 | Takkan Khanlui | V31311 | System Designer | FR-01 pairing, consent and data access rules |
| 6931503066 | Rossatorn Sangkaew | IDK-SleepyBro | UX/UI Designer | FR-03 meal reminders and reminder screen |
| 6931503049 | Nichanan Lalua | KaidangSuk | Prototype Developer | FR-04 confirming a meal and home screen |
| 6931503079 | Suchitra Khomdee | Khaiwann | QA / Tester | FR-05 caregiver alert, daily status and test plan |

## PROBLEM

**The problem, in 2–3 sentences:** Older adults on fixed-time tablets or capsules may forget a dose, take it late, or not remember whether they took it, while the child who cares for them is at work and cannot follow up. Alarms, pill boxes, calls and LINE messages cannot confirm the status and report it to the caregiver automatically.

**Who exactly has it:** (1) older adults in Thailand on fixed-time tablets or capsules who use a smartphone and whose child or relative sets things up for them; (2) the adult child / caregiver who is not with them during the day.

**Why it matters:** a missed or mistimed dose means the treatment is not taken as prescribed, and the caregiver has to call or send a LINE message to check on every meal.

**Scope:** in — FR-01 to FR-05 (the MVP); FR-09 AI weekly summary only after the MVP. Out — reminders while the page is closed or the screen is locked, as-needed medicines, liquids and half tablets, reading handwriting, any medical advice.

**Success measure:** the caregiver is contacted only about meals that are not confirmed, instead of calling or messaging for every meal, and every meal not confirmed within 15 minutes of its reminder reaches the caregiver as an alert.

## GATE 1 — REACHABLE USERS

| # | Name / role | How we reach them | When |
|---|---|---|---|
| 1 | Peerapap Kummongkon — older adult on daily medication | By phone | September 3, 2026, 12:00–12:20 PM |
| 2 | Mrs. Wun Daengsan — adult child / caregiver | By phone | September 4, 2026, 4:20–4:30 PM |
| 3 | Ms. Chanantida Nosuk — older adult on daily medication | By phone | September 4, 2026, 4:40–4:50 PM |

## GATE 2 — MVP SHAPE

| FR | Planned functional requirement |
|---|---|
| FR-01 | Pair the older adult and the caregiver with a QR code or 6-digit invite code (the older adult consents first; no account or password) |
| FR-02 | Photograph a medication label → caregiver covers the name and HN → AI drafts the details → caregiver checks → save |
| FR-03 | Reminder at each medication meal, with repeat reminders |
| FR-04 | Confirm the whole meal with one tap |
| FR-05 | Alert the caregiver when a meal is not confirmed + daily status of every meal |

**Which FR carries a real rule or decision?** FR-03–05: each meal follows a timeline — reminders at T, T+5, T+10; not confirmed by T+15 → one caregiver alert; late confirmation until the next meal. FR-02: the reminder time comes from the label (“after a meal”, “N minutes before”, “at bedtime”) and is never guessed.

**What data has to persist between sessions?** kept in the shared online data store: the pairing (with consent), medicines (name, tablets per dose, meal / time, warnings), meal times and bedtime, and the confirmation record of each meal. Not stored: national ID, address, date of birth, phone number, hospital number, label photos.

## GATE 3 — ACCESS

| Data, licence or system we depend on | How we know we can get it | If it fails |
|---|---|---|
| Firebase Spark plan — Authentication (anonymous sign-in), Cloud Firestore (shared live data, offline queue), Hosting (HTTPS) | No payment method needed; no-cost quota of 50,000 Firestore reads and 20,000 writes a day (Firebase pricing page, checked 30 Oct 2026) | Hosting moves to GitHub Pages; usage checked daily against the quota |
| Firebase AI Logic + Gemini Developer API (free tier) — reads the covered label photo and returns only the medicine fields; later also writes the weekly summary (FR-09, Could) | Firebase AI Logic is free and the Gemini free tier needs no payment method, so the project stays on Spark (Firebase AI Logic pricing page, checked 31 Oct 2026); calls go through the Firebase SDK, so the API key stays on Google's side; free-tier content may be used to improve Google's products, so only images with the name, HN and other personal details covered are sent; 20 real labels tested before FR-02 is finished | Manual entry when offline or when the daily limit is reached |
| html5-qrcode (Apache-2.0) to scan, qrcode (MIT) to draw the QR code | Free open-source libraries; run in the browser | 6-digit invite code |
| Real medicine labels for testing | From interviewees and team families, with consent; names and HN covered | Results reported as a small sample |
| Test phones: OPPO Reno 16 5G (ColorOS 16) as the older adult, a second team phone as the caregiver | Owned by the team | A laptop browser as the caregiver |

## PROCESS & TEAM

**Chosen SDLC:** Incremental — Increment 1: core loop (remind → confirm → alert, FR-03–05) on real shared data with a team test pair; Increment 2: pairing and AI label reading (FR-01, FR-02), because label-reading accuracy is the biggest unknown and must not block the core loop.
