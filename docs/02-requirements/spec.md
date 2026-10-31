🌐 **Language:** English · [ไทย](spec.th.md)

# Software Requirements Specification

> สำเนา Markdown ของ SRS v1.2 สำหรับอ่านบน GitHub — ฉบับที่ส่งคือ [`M2-SRS_MedMind.pdf`](M2-SRS_MedMind.pdf) · ถ้าแก้ requirement ต้องแก้ทั้ง PDF (ต้นฉบับ Word) และไฟล์นี้ให้ตรงกัน แล้วคัดไป `docs/TRACEABILITY.md`

**MedMind — medication reminders and medication status for the caregivers of older adults**

Introduction to Software Engineering (15031001) · Milestone 2 · Requirements & Specification

| Field | Value |
|---|---|
| Team name | MedMind |
| Project title | MedMind — medication reminders and medication status for the caregivers of older adults |
| SDLC chosen in M1 + reason | Incremental — Increment 1 builds the core loop (remind → confirm → alert the caregiver, FR-03–05) on real shared data, using a test pair and test medicines set up by the team; Increment 2 adds pairing and label reading (FR-01, FR-02), because Thai label-reading accuracy is the biggest unknown and must not block the core loop. |
| Date / version | v1.2 · 31 October 2026 |
| GitHub repo | https://github.com/yaroo393-png/MedMind |

**Document history**

| Version | Date | What changed and why |
|---|---|---|
| v1.0 | 30 Oct 2026 | Restarted SRS for the new team repository: earlier repo links, demo and test results removed; gaps added (first-tap sound condition, page reopen BR-18, OCR accuracy NFR-11, success measure, two out-of-scope items); layout aligned with the instructor's template. |
| v1.1 | 30 Oct 2026 | Describes the working system instead of a clickable prototype: shared online data store on a no-cost plan, offline confirmation (FR-04 criterion 7), NFR-12 and NFR-13; review fixes — caregiver alerts only while MedMind is open (NFR-01, BR-18), late-arriving offline confirmations (BR-13), no accounts or passwords. |
| v1.2 | 31 Oct 2026 | Label reading by an external AI service after the caregiver covers the name, HN and other personal details (FR-02, BR-19, NFR-14) — the course requires an AI feature; FR-09 AI weekly summary added as Could; use-case diagram redrawn with “Cover name and HN”; repository link; this history table; AI usage log updated. |

## 1. Introduction

### 1.1 Purpose and scope

Older adults who take medication regularly may forget a dose, take it at the wrong time, or not remember whether they have already taken it, while their children go out to work and cannot follow up all day. Current methods — alarm clocks, pill boxes, phone calls and LINE messages — cannot confirm the medication status and report it to the caregiver automatically.

MedMind answers exactly two questions: “What medicine do I take at this meal, and have I taken it?” (older adult) and “Has every meal's medicine been taken today, without me having to call?” (caregiver). The system links the older adult with the caregiver, uses AI to read the medicine label into a draft that the caregiver checks before saving, reminds the older adult at each medication meal, lets them confirm the whole meal with one tap, and alerts the caregiver when a meal is still not confirmed after three reminders. The MVP is five FRs. Success means the caregiver no longer has to call or send a LINE message for every medication meal (interviewee 2): they are contacted only about meals that are not confirmed, and every meal not confirmed by T+15 reaches them as an alert — at once while MedMind is open on their phone, otherwise as soon as they open it (NFR-01, BR-18).

### 1.2 Users and stakeholders

| Name / role | Kind | What they need | What they fear / forbid |
|---|---|---|---|
| Older adult (senior) | primary user | A reminder sound, large text, large buttons, few taps; their child sets it up for them (interviewees 1, 3) | Having to sign up and enter data themselves (interviewee 3) |
| Child / caregiver | primary user | An alert only when a meal is not yet confirmed; photograph a label and have the details filled in (interviewee 2) | Having to check every meal; wrong medicine details from the label reader |
| Pharmacist / hospital (label issuer) | secondary stakeholder (sets the rules) | Label instructions turned into reminder times exactly as written | The system interpreting, changing or recommending how a medicine is taken (§6) |
| AI label reader (external AI service, no-cost tier) | external system | A clear label photo with the patient's name and HN covered | Receiving a patient's name, HN or other personal information, which its no-cost terms forbid (BR-19, NFR-14); an outage or a used-up daily limit — manual entry must still work (FR-02, criterion 5) |
| Online data store (no-cost plan) | external system | Usage that stays within its free daily quota (NFR-13) | An outage — a confirmation then waits on the phone and is sent when the connection returns (FR-04, criterion 7) |

## 2. Overall description

### 2.1 Product context — what it does / does not

MedMind links one older adult with one caregiver, turns caregiver-checked medicine details into medication meals, and tracks whether each meal is confirmed. Everything below is the whole MVP for this term — nothing else is implied.

| IN SCOPE (MVP this term) | OUT OF SCOPE (explicit promise) |
|---|---|
| • FR-01 Pair older adult and caregiver (QR / invite code)<br>• FR-02 Scan a label (name and HN covered) → AI draft → caregiver checks → save<br>• FR-03 Reminder at each meal + repeat reminders<br>• FR-04 Confirm the whole meal<br>• FR-05 Caregiver alert + daily status | • Reading doctors' handwriting<br>• Saving label-reading results without a check<br>• Sending a label photo in which the patient's name or HN can be read<br>• AI diagnosis, medicine advice, or advice on making up a missed dose<br>• The system adding, reducing or changing how a medicine is taken<br>• Reminders or alerts while the page is closed or the screen is locked<br>• As-needed medicines, liquids and half tablets<br>• Post-MVP features (Should / Could): see §3 |

### 2.2 Assumptions and constraints

- Constraint: confirming is self-reported; it is not proof that the medicine was taken.
- Constraint: every label-reading result must be checked by the caregiver before it is saved.
- Constraint: the MVP supports only tablets and capsules taken at fixed times.
- Constraint: MedMind is built as a working web app, not a mock-up: pairing, reminders, confirmations and caregiver alerts work for real between the older adult's phone and the caregiver's phone, through an online data store on a no-cost plan — no paid service and no credit card.
- Constraint: the system has no server code of its own; each phone works out reminders and caregiver alerts from the shared data. The older adult is therefore reminded, and the caregiver alerted, only while MedMind is open; when the page is closed or the screen is locked, no alert is given. What happens when the page is reopened is set by BR-18.
- Constraint: neither side has a password or creates an account; each phone is identified automatically the first time MedMind is opened. If a phone's browser data is cleared, that phone has to pair again.
- Constraint: both phones need an internet connection to share status; a confirmation made while offline is kept on the phone and sent when the connection returns (FR-04, criterion 7).
- Constraint: label reading uses an external AI service on its no-cost tier. Before a photo is sent, the caregiver covers the patient's name, HN, any barcode or QR code and any other personal detail on the phone; only the covered copy is sent, and MedMind stores no photo (BR-19, NFR-09, NFR-14).
- Constraint: the AI only drafts. It never decides a reminder time, gives medicine advice or saves anything by itself — reminder times are worked out by the system from the label text (BR-06), and the caregiver checks every draft (BR-04).
- Constraint: the AI service's no-cost tier limits how many requests can be made per minute and per day; when the limit is reached, the phone is offline or the service is down, manual entry is used (FR-02, criterion 5).
- Constraint: on the no-cost tier, the AI provider may use what is sent to improve its products and its staff may review it, and its terms say no sensitive or personal information may be sent. MedMind therefore sends only covered images with no name, HN, barcode or other personal detail, and the consent screen says this before the first photo is sent (BR-19).
- Constraint: browsers play sound only after the user has tapped the page at least once after opening it, so the reminder sound plays only after that first tap.
- Constraint: scanning a QR code or photographing a label needs camera permission; without it, the 6-digit invite code or manual entry (FR-02, criterion 5) is used instead.
- Constraint: in the MVP one older adult has one caregiver (several caregivers is a Should).
- Constraint: reminder times come from the label instructions only; the system never guesses a time.
- Assumption: the older adult and the caregiver have smartphones that can open the web app and keep it open during medication times — not yet verified with users.
- Assumption: both phones set their clocks automatically from the network, so meal times match on both sides.
- Assumption: the caregiver does all of the main setup (interviewee 3).

## 3. Functional requirements

Format: As a <role>, I want <goal>, so that <benefit>. Every story below traces to the problem statement and to what the interviewees said, and every acceptance criterion covers a correct path or a wrong / edge path that a test could actually check. Business rules BR-01 to BR-19 are listed in Appendix A.

**Priority summary (MoSCoW)**

| ID | Requirement | Priority | Why this priority |
|---|---|---|---|
| FR-01 | Pair older adult and caregiver by QR / invite code | Must | Answers question 2 |
| FR-02 | Scan a medication label and create the medicine record | Must | Answers question 1 |
| FR-03 | Reminder at each meal + repeat reminders | Must | Answers question 1 — the heart of the MVP |
| FR-04 | Confirm the whole meal with one tap | Must | Answers questions 1 and 2 |
| FR-05 | Caregiver alert + daily status | Must | Answers question 2 |
| FR-06 | Several caregivers per older adult | Should | The MVP supports one caregiver |
| FR-07 | List of all of the older adult's medicines | Could | The reminder screen (FR-03) already shows the meal's medicines |
| FR-08 | Medicine photos on the reminder screen | Could | Interviewee 1 asked for photos; the MVP uses a reminder sound only |
| FR-09 | AI weekly summary for the caregiver | Could | Built only after FR-01–05 are done; it reuses the confirmation records that FR-04 and FR-05 already keep |

The course sets the MVP at 3–5 Must FRs; we chose 5 so that both questions in §1.1 are answered end to end. FR-06 to FR-09 can wait until after the MVP and the system still answers both questions. Won't: see §6.

**FR-01 — Pair older adult and caregiver [Must]**

*User story: As a caregiver, I want to pair with my parent's phone by scanning a QR code or entering an invite code, so that I can set up medicines and receive their status without my parent creating an account.*

Pain this traces to: the caregiver is not there and has to call; older adults find it hard to sign up for an account (interviewee 3).

Definition: the invite code (QR + 6 digits) works once and expires after 10 minutes; the older adult can tap “Create new code”. The older adult must tap consent before pairing; neither side needs an account or password. The consent screen states (1) what the caregiver will see: medicines, meal times and confirmation status, (2) why: to alert the caregiver when a meal is not confirmed, (3) that either side can unpair at any time and the pair's data is then deleted (BR-17). In the MVP an older adult has one caregiver. Either side can unpair (with a second confirmation); the caregiver then loses access immediately and that pair's medicines and confirmation history are deleted (PDPA right to erasure).

1. Given the older adult opens the app for the first time, when the start screen appears, then it shows a QR code and an invite code without any sign-up or typing, and before consenting the older adult sees what data will be shared, why, and that they can cancel at any time.
2. Wrong path. Given the older adult has not tapped consent, when a caregiver tries to pair, then pairing fails and the caregiver is told it is waiting for consent.
3. Given the older adult has consented, when the caregiver scans or enters a valid code, then both screens show that they are connected.
4. Wrong path. Given a code that is wrong, older than 10 minutes, or already used, when the caregiver enters it, then it is rejected with a clear message and no connection is made.
5. Wrong path. Given the older adult is already paired with a caregiver, when a second caregiver scans or enters the code, then it is rejected with “This older adult already has a caregiver” and no connection is made.
6. Wrong path. Given a paired older adult and caregiver, when either of them unpairs and confirms, then the caregiver immediately can no longer see the older adult's data, the pair's medicines and confirmation history are deleted, and the older adult sees a new QR code.

**FR-02 — Scan a medication label and create the medicine record [Must]**

*User story: As a caregiver, I want to photograph a medication label and get a draft filled in by AI that I can check and correct, so that I don't have to type every medicine by hand while staying in control of what is saved.*

Pain this traces to: the caregiver wants to photograph the label and have it filled in (interviewee 2); the older adult wants their child to set it up (interviewee 3).

Definition: only the caregiver can add or edit medicines. Required fields are medicine name, tablets per dose, and meal / time; warnings and contraindications are saved only when the label has them. The reminder time follows the label only: after a meal = the meal time; N minutes before a meal = the meal time − N; at bedtime = bedtime (worked examples in BR-06). The caregiver sets breakfast, lunch and dinner times and bedtime when adding the first medicine. Medicines with the same reminder time are grouped into one meal. Before the photo is sent, the caregiver covers the patient's name, HN, any barcode or QR code and any other personal detail (address, phone number, date of birth) by drawing boxes on it, sees the exact image that will be sent, and ticks “Name and HN are covered” (BR-19). The AI returns only the medicine fields of BR-05; it has no field for a name or HN.

1. Given a clear label photo with the name and HN covered, when the caregiver sends it to the AI, then a draft is shown (medicine name, tablets per dose, meal / time, warnings, contraindications) and nothing is saved yet.
2. Given the caregiver edits a field in the draft, when they tap save, then the edited value is saved, not the value read from the photo.
3. Wrong path. Given a field cannot be read, or the label says “before meals” without a number of minutes, when the draft is shown, then that field is empty and marked “Please check” (never guessed), and saving is blocked until every required field is filled.
4. Wrong path. Given a label for a medicine taken only when needed, when the draft is shown, then the system says “As-needed medicines are not supported yet” and creates no schedule.
5. Wrong path. Given the photo cannot be read, or the AI service is unavailable (offline, service down or daily limit reached), when the caregiver sends the photo, then the system says why and an empty form opens for manual entry.
6. Wrong path. Given the caregiver is on the draft screen, when they tap cancel, then nothing is saved.
7. Given the label “30 minutes before breakfast” and breakfast set at 07:00, when the medicine is saved, then its reminder is at 06:30.
8. Wrong path. Given the caregiver has not ticked “Name and HN are covered”, when they try to send the photo, then nothing is sent and the “Send to AI” button stays disabled.
9. Given the caregiver has covered the name and HN and ticked the box, when they tap “Send to AI”, then only the covered copy of the photo leaves the phone, without its file details (metadata), and the original photo is not kept.

**FR-03 — Reminder at each meal [Must]**

*User story: As an older adult, I want a reminder at each meal time that shows all of that meal's medicines on one screen, and to be reminded again if I haven't confirmed, so that I don't forget or mix up my medicines.*

Pain this traces to: forgetting a dose or taking it late (problem statement); switching the alarm off and then forgetting (interviewee 1).

Definition — reminder timeline, shared with FR-04 and FR-05 (T = the meal's reminder time):

| Time | What happens (only while the meal is not confirmed) |
|---|---|
| T | First reminder with “Taken” / “Not yet” |
| T+5 | Repeat reminder 1 |
| T+10 | Repeat reminder 2 — last round; “Not yet” alerts the caregiver now |
| T+15 | Caregiver alerted “Medicine not yet confirmed” (unless already alerted at T+10) |
| After T+15 | Late confirmation allowed until the reminder time of the next meal that starts after T+15 (none = 23:59); the caregiver is then told “Medicine confirmed” |

Repeat reminders are at fixed times from T and only while the meal is not confirmed. The reminder screen shows every medicine in the meal (name, tablets, warnings, contraindications), a green “Taken” and a red “Not yet” button, and plays a sound at every round while MedMind is open and has been tapped once since opening; it shows no medicine photos. The caregiver alert is sent once per meal and never says “not taken”. Meals that overlap (e.g. 06:45 before breakfast and 07:00 after breakfast) each keep their own reminders, caregiver alert and late-confirmation window; the screen lists every unconfirmed meal in time order under separate headings, each with its own buttons, and reminders due at the same moment sound once. When the page is reopened, BR-18 applies.

1. Given an 08:00 meal with two medicines, MedMind open on the older adult's phone and the page tapped at least once since it was opened, when it is 08:00, then a reminder sound plays and both medicines (name, tablets, warnings, contraindications) are shown on one screen with “Taken” / “Not yet” buttons and no medicine photos.
2. Wrong path. Given the meal is not confirmed, when it is 08:05 and then 08:10, then repeat reminders 1 and 2 are given, each with sound.
3. Given the meal is confirmed, when the next repeat-reminder time arrives, then no reminder is given.
4. Wrong path. Given meal A at 06:45 (15 minutes before breakfast) is not confirmed and meal B is at 07:00, when it is 07:00, then the reminder screen shows both meals in time order under separate headings with separate buttons and one sound, and the caregiver is alerted about meal A at 07:00, on meal A's own timeline.
5. Wrong path. Given the page was closed at 08:00 and the meal is not confirmed, when the older adult opens MedMind at 08:07, then the reminder screen shows the meal at once, the 08:00 and 08:05 rounds are not replayed, and the 08:10 round still happens.

**FR-04 — Confirm the whole meal [Must]**

*User story: As an older adult, I want to confirm the whole meal with one tap, so that I don't have to confirm each pill and my family knows I reported taking them.*

Pain this traces to: not remembering whether the medicine was taken (problem statement); wanting an easy way to tell their child (interviewee 1); large buttons and few taps (interviewee 3).

Definition: the older adult confirms on the reminder screen (FR-03) or on their home screen, which shows today's meals with their status and a “Taken” button for any meal still in the late-confirmation window.

1. Given the 08:00 meal reminder is showing, when the older adult taps “Taken” at 08:03, then the status becomes “Taken”, 08:03 is recorded, and reminders for that meal stop.
2. Wrong path. Given the meal is already confirmed, when “Taken” is tapped again, then no duplicate record is created.
3. Given the first reminder at 08:00, when the older adult taps “Not yet”, then they are reminded again at 08:05.
4. Wrong path. Given the last reminder at 08:10, when the older adult taps “Not yet”, then the caregiver is alerted immediately (without waiting for 08:15).
5. Given the meal was not confirmed by 08:15, when the older adult taps “Taken” on the home screen at 08:40, then the status becomes “Taken (late confirmation)” with 08:40.
6. Wrong path. Given the next meal's reminder time (12:00) has passed, when the older adult tries to confirm the 08:00 meal, then it cannot be confirmed and the status stays “Not yet confirmed”.
7. Wrong path. Given the older adult's phone is offline, when they tap “Taken” at 08:03, then their screen shows “Taken” at once, and the confirmation reaches the caregiver with 08:03 as its time within 10 seconds of the connection returning.

**FR-05 — Caregiver alert and daily status [Must]**

*User story: As a caregiver, I want to be notified only when a meal is still not confirmed after the reminders, and to see today's status of every meal in one place, so that I don't have to call or message for every meal.*

Pain this traces to: having to call or send a LINE message for every meal; no single place showing the status (problem statement); wanting an alert only when a meal is not yet confirmed (interviewee 2).

1. Given the older adult confirmed at 08:12, when it is 08:15, then the caregiver is not alerted.
2. Wrong path. Given there is no confirmation, when it is 08:15, then the caregiver is alerted “Medicine not yet confirmed” (never “not taken”).
3. Given several meals in the day, when the caregiver opens the status page, then every meal of the day is shown as “Taken” + time, “Taken (late confirmation)” + time, “Not yet confirmed”, or “Not due yet”.
4. Wrong path. Given there are no medication meals today, when the caregiver opens the status page, then it shows “No medication meals today”.
5. Given the older adult tapped “Not yet” in the 08:10 round (the caregiver has already been alerted), when it is 08:15, then the caregiver is not alerted again.
6. Given the caregiver has been alerted “Medicine not yet confirmed”, when the older adult confirms late at 08:40, then the caregiver receives “Medicine confirmed at 08:40”.
7. Wrong path. Given the caregiver's page was closed at 08:15 when a meal was not confirmed, when the caregiver opens MedMind at 09:00, then the unseen alert is shown and the meal's status is “Not yet confirmed” (or “Taken (late confirmation)” + time if confirmed since).

**Should and Could requirements**

These are specified at story level for this milestone; full acceptance criteria are written when each one is moved into an increment.

| ID | Priority | User story |
|---|---|---|
| FR-06 | Should | As a caregiver who shares care with my siblings, I want more than one caregiver to pair with the same older adult, so that whoever is free at that time can see the status and follow up. |
| FR-07 | Could | As an older adult, I want to see all my medicines and their times for the day, so that I know what I take today without waiting for a reminder. |
| FR-08 | Could | As an older adult, I want to see a photo of each medicine on the reminder, so that I pick the right pills. |
| FR-09 | Could | As a caregiver, I want a short AI-written summary of the past week's confirmations, so that I can see patterns (such as a meal that is often confirmed late) without reading every day's status. Only meal times and confirmation statuses are sent to the AI — never names, HN or medicine details — and the summary gives no medicine advice. Built after FR-01–05 are done. |

## 4. Non-functional requirements

Forbidden words unless quantified: fast, easy, user-friendly, smart, secure. NFR-04 (security / privacy) is required for M2 — every SRS must have at least one. The numbers are the team's targets; they are measured on the working system as each increment is finished.

| ID | Kind | Statement (testable) | How we will check |
|---|---|---|---|
| NFR-01 | reliability | Repeat reminders occur at T+5 and T+10, and every meal not confirmed raises exactly one caregiver alert no later than T+15 (at T+15, or immediately when “Not yet” is tapped in the T+10 round); it shows at once while the caregiver's MedMind is open, otherwise on the next open (BR-18). | Automated test with a simulated clock |
| NFR-02 | usability | At least 4 of 5 older adults confirm within 10 seconds of seeing the reminder screen, on their first try and without help (if only 3 can be found: 3 of 3, reported as a small sample). | Hand over the working app on the reminder screen, say only “If you have taken your medicine, what do you do next?”, and time it — when Increment 1 is done |
| NFR-03 | usability | “Taken” / “Not yet” buttons at least 64 px high and full width; medicine names on the reminder screen at least 24 px; body text at least 18 px; text-to-background contrast at least 4.5:1. | Measure in browser DevTools and a contrast checker — when Increment 1 is done |
| NFR-04 | security / privacy (required) | A caregiver sees only the older adult they are paired with; a request for another older adult's data is refused. | Automated test of the access rules: a caregiver asks for another older adult's data and is refused |
| NFR-05 | privacy | No connection happens before the older adult taps consent (0 times). | Automated test (FR-01, criterion 2) |
| NFR-06 | safety | No medicine record is saved without the caregiver's check (0 records). | Automated test (FR-02) |
| NFR-07 | reliability | However many times “Taken” is tapped, there is only one confirmation record for that meal. | Automated test (FR-04, criterion 2) |
| NFR-08 | performance | With the phone online, the AI draft appears within 10 seconds of tapping “Send to AI” for at least 18 of 20 real labels (90%). | Time from tapping “Send to AI” to seeing the draft, with 20 real labels on a phone on mobile data |
| NFR-09 | privacy / PDPA | The system stores only what FR-01–05 use (medicine details, meal times, confirmation status, pairing and its consent record) and none of the older adult's national ID number, address, date of birth, phone number or hospital number (0 fields). MedMind never stores a label photo (0 photos); only a copy with the name, HN and barcodes covered is sent to the AI service. Medicine data and medication status are health data (sensitive under PDPA), kept only as far as the FRs need and shared only after consent (BR-02). | Review every field in the data model in the Design document, and check the data store holds no images |
| NFR-10 | privacy / PDPA | After unpairing, the former caregiver's requests for that data succeed 0 times, and that pair's medicines and history are 0 records. | Automated test: after unpairing, the request is refused and remaining records are counted |
| NFR-11 | accuracy | All required fields (medicine name, tablets per dose, meal / time) are read correctly, with no edit needed, on at least 16 of 20 real labels (80%). | Compare each draft with its label by hand, using the same 20 labels as NFR-08 |
| NFR-12 | performance | With both phones online, a confirmation, or a “Not yet” in the last round, appears on the caregiver's phone within 10 seconds in at least 19 of 20 trials. | Timed trials on two real phones on mobile data |
| NFR-13 | cost | Running 5 test pairs (team phones and browsers) for 7 days stays inside the online data store's free daily quota (0 days over) and needs no payment method. | Read the daily usage in the data store's console at the end of the test week |
| NFR-14 | privacy / PDPA | In a test with 20 real labels, 0 of the images sent to the AI service show a readable patient name, HN, barcode or other personal detail. | In a local test build, save each image just before it is sent (never uploaded) and check all 20 by eye |

## 5. Use cases

### 5.1 Use-case list

| Use case | Actor | Related FR | Brief success story |
|---|---|---|---|
| UC-1 Pair devices | Caregiver, Older adult | FR-01 | The older adult taps consent → the caregiver scans the QR → both screens show “connected”. |
| UC-2 Add medicine from a label | Caregiver | FR-02 | The caregiver photographs a label, covers the name and HN, fixes one field in the AI draft and taps save → the medicine and its meal are saved. |
| UC-3 Receive a meal reminder | Timer → Older adult | FR-03 | At 08:00 the older adult sees both morning medicines on one screen. |
| UC-4 Confirm medicine taken | Older adult | FR-04 | The older adult taps “Taken” → the meal is confirmed and reminders stop. |
| UC-5 Alert the caregiver when not confirmed | Timer → Caregiver | FR-05 | No confirmation by T+15 → the caregiver receives “Medicine not yet confirmed”. |
| UC-6 View daily status | Caregiver | FR-05 | The caregiver opens the status page and sees every meal of the day with its time. |
| UC-7 Cancel pairing | Older adult, Caregiver | FR-01 | Either side taps cancel and confirms → the caregiver loses access at once; the pair's medicines and history are deleted. |

FR-01 has two use cases (UC-1, UC-7) because cancelling a pairing is a separate goal that happens later, not an optional step inside pairing. FR-05 has two (UC-5, UC-6) because it combines the alert and the daily status.

### 5.2 Use-case diagram

![Use-case diagram](../03-design/diagrams/use-case-diagram.png)

| Element | What the diagram shows |
|---|---|
| Actors | Older adult and Caregiver (primary users, §1.2) · Timer (device clock), which starts UC-3 at the meal time T and UC-5 at T+15 |
| Associations | Older adult — UC-1, UC-3, UC-4, UC-7 · Caregiver — UC-1, UC-2, UC-5, UC-6, UC-7 · Timer — UC-3, UC-5 |
| «include» | UC-2 always includes “Cover name and HN” — nothing is sent to the AI before they are covered (BR-19) — and “Review and correct the draft” — nothing is saved before the caregiver checks it (BR-04) |
| «extend» | “Set meal times” → UC-2 on the first medicine (BR-06) · “Enter medicine manually” → UC-2 when the scan fails (FR-02, criterion 5) · “Confirm late” → UC-4 after T+15 (BR-15) |
| Traceability | Every use case keeps its number, name and FR from §5.1, so it traces to the same rows of §7; the sub-cases name the business rule (Appendix A) they come from. |

*AI use: the diagram was drawn with Claude from §5.1 and BR-04, BR-06, BR-15, BR-17, BR-19; it is logged in §8.*

## 6. Out of scope

1. Reading doctors' handwriting — easily misread, so the older adult could take the wrong medicine.
2. Saving label-reading results without a check — the caregiver must check every time.
3. AI diagnosis or medicine advice — the team are not medical professionals, and wrong advice could harm the patient.
4. The system adding, reducing or changing how a medicine is taken — it follows the label or the doctor's order only.
5. Advice on making up a missed dose — e.g. a double dose could be dangerous; it is medical advice.
6. Reminders or caregiver alerts while the page is closed or the screen is locked — this needs push notifications sent by server code, which the no-cost plan used here does not include.
7. As-needed medicines, liquids and half tablets — the MVP handles fixed-time tablets and capsules only (BR-07).
8. Sending a label photo in which the patient's name or HN can be read — the caregiver covers them first (BR-19).

## 7. Traceability matrix (Golden Thread)

Only FR-03 (the heart of the MVP) is filled all the way across, following the instructor's example. The other rows are completed when the Design document and each increment are done; the Test column becomes real results once the tests have run on the working system.

| Problem / pain | Requirement (FR) | Solution / design | Feature built | Test |
|---|---|---|---|---|
| Older adults find sign-up hard; the caregiver is not there | FR-01 (UC-1, UC-7) | (Design) | (Increment 2) | FR-01 criteria 1–6 · NFR-04, NFR-05, NFR-10 |
| The caregiver wants help filling in medicine details from the label | FR-02 (UC-2) | (Design) | (Increment 2) | FR-02 criteria 1–9 · NFR-06, NFR-08, NFR-09, NFR-11, NFR-14 |
| Forgetting a dose / taking it late | FR-03 (UC-3) | State machine of a meal: waiting → reminding (T, T+5, T+10) → taken / not yet confirmed / late confirmation (planned) | Reminder screen: every medicine in the meal + sound + “Taken” / “Not yet” buttons (Increment 1, planned) | FR-03 criteria 1–5 · NFR-01 (planned) |
| Not remembering whether the medicine was taken | FR-04 (UC-4) | (Design) | (Increment 1) | FR-04 criteria 1–7 · NFR-02, NFR-03, NFR-07, NFR-12 |
| Calling or messaging for every meal; no single status | FR-05 (UC-5, UC-6) | (Design) | (Increment 1) | FR-05 criteria 1–7 · NFR-01, NFR-12, NFR-13 |
| The caregiver is not always around | FR-06 (Should) | (after the MVP) | (after the MVP) | (criteria written when moved into an increment) |
| Not knowing which medicines to take today | FR-07 (Could) | (after the MVP) | (after the MVP) | (criteria written when moved into an increment) |
| Wanting to see medicine photos (interviewee 1) | FR-08 (Could) | (after the MVP) | (after the MVP) | (criteria written when moved into an increment) |
| Seeing patterns across the week means reading every day's status | FR-09 (Could) | (after the MVP) | (after the MVP) | (criteria written when moved into an increment) |

## 8. AI usage log

If this table is empty but the prose looks generated, the milestone is capped at 50% — log every prompt that drafted a story or paragraph, honestly.

| Date | Tool / model | What we asked | What AI produced | What we changed / verified | What we learned |
|---|---|---|---|---|---|
| 7 Oct 2026 | Claude (Claude Code) | Draft the user stories and acceptance criteria for our FRs, together with the Charter and this SRS, from our team's new problem statement | A first Charter with six FRs, two of them not in our problem statement (medicine stock with low-stock alerts, and viewing / editing the medication history); it also filled in choices we had not made (a “Not yet” button, meal times) and carried over content from our old M1 | Cut to the five FRs of our problem statement and moved stock and history editing out of the MVP; had the old M1 content reverted; decided the reminder rules, the buttons and the caregiver messages ourselves | AI pads the scope and reaches for old material. Every FR must trace to a pain we heard in an interview, and the team decides the scope and the numbers |
| 8 Oct 2026 | Claude (Claude Code) | Suggest numbers for NFR-02, NFR-03 and NFR-08 and for the success measure | Values with sources (WCAG 2.2 / Apple / Material for button size, 5 users following Nielsen) | Asked how these could be tested before the app exists → each NFR now says when it is measured; the success-measure baseline comes from interviewee 2, not from AI | A number must say when and how it is measured, or it looks as if it has already been measured |
| 8 Oct 2026 | Claude (Claude Code) | Check the SRS against the M2 guide and the instructor's example SRS | Found only 2 stakeholders (at least 3 needed), no priority on the FRs, and PDPA covering consent only; it had also wrongly deleted the “capped at 50%” sentence from the template | Added stakeholders, a priority on every FR plus the MoSCoW table, and NFR-09 / NFR-10 with the rule that unpairing deletes the pair's data (FR-01, criterion 6); restored the 50% sentence | Check against the instructor's source documents before removing or adding a rule |
| 8 Oct 2026 | Claude (Claude Code) | Re-check the SRS against the M2 guide and the Final Project file (M4) | Every FR was Must (the guide says prioritising was not done), FR-05 combined two behaviours, and the Golden Thread table was empty | Wrote FR-06 (Should) and FR-07–08 (Could) as user stories from the interviews, justified keeping FR-05 as one FR, and filled the FR-03 row of §7 as planned | Priority must be visible on the FR itself, not only in the backlog |
| 9 Oct 2026 | Claude (Claude Code) | The project is a web app — what in the documents must change? | A web page cannot alert once it is closed or the screen is locked, browsers play no sound before the first tap, and the camera needs permission | Chose reminders and alerts only while the page is open; updated §2.2, the reminder-screen rule and FR-03 criterion 1 | Platform limits must be written into the constraints before the criteria that depend on them |
| 27 Oct 2026 | Claude (Claude Code) | Draw a use-case diagram from §5.1 and BR-04, BR-06, BR-15, BR-17 | A first diagram that drew “Cancel pairing” as an «extend» of UC-1 | After a review the PM made “Cancel pairing” its own use case, UC-7; use-case names and FR numbers checked against §5.1 | «extend» is only for an optional step inside the base use case; a separate goal that happens later needs its own use case |
| 30 Oct 2026 | Claude | Check the SRS against the M2 guide and the Final Project file, and remove everything tied to earlier work so the team can restart | A clean v1.0: old repo, demo, test results and dates removed; gaps added — first-tap sound condition, page reopen (BR-18, FR-03 criterion 5, FR-05 criterion 7), OCR accuracy NFR-11, success measures, two out-of-scope items; FR-02 reminder-time examples moved into BR-06 | Accepted the clean-up and every added gap. Asked for the layout, colours and headings of the instructor's template, and changed the scope from a clickable prototype to a working system (shared online data store on a no-cost plan, offline confirmation in FR-04, NFR-12, NFR-13). Asked for a second line-by-line review, which fixed contradictions such as caregiver alerts only while MedMind is open (NFR-01) and late-arriving offline confirmations (BR-13). | A clean-up is not finished until the whole document is re-read: one decision (a working system instead of a prototype) changed §2.2, the NFRs, the business rules and the Charter together. |
| 30 Oct 2026 | Claude | Draw the use-case diagram for §5.2 from the use-case list (§5.1) and business rules BR-04, BR-06, BR-15 and BR-17 | A diagram with 3 actors (Older adult, Caregiver, Timer), the 7 use cases of §5.1 and 4 sub-cases linked by «include» / «extend» | The team asked for the layout of the earlier SRS and the colours and fonts of the instructor's template; Cancel pairing kept as its own use case (UC-7, decided on 27 Oct); names and FR numbers checked against §5.1 | The diagram must use the same names and numbers as §5.1, so every use case traces to the same row of §7 |
| 31 Oct 2026 | Claude | Redraw the use-case diagram so that UC-2 includes the new sub-case “Cover name and HN” (BR-19) | A diagram with 3 actors, the 7 use cases of §5.1 and 5 sub-cases, in the template's colours; the «include» table under it updated | [ ] | [ ] |
| 31 Oct 2026 | Claude | Set up the new team repository: README, team rules, AI-agent rules, design draft (architecture, design system, Security Rules draft), traceability from this SRS, per-member FR pages, report skeletons, CI and a secrets check, following the structure of the team's earlier repository | All files as a draft package; the design and the Security Rules are drafts that are not yet tested | The PM chose the earlier repository's folder structure, kept only PDF copies of the Charter and SRS, confirmed the FR owners from the Charter, and chose which AI-log rows go into this SRS; [the design and Security Rules still to be reviewed and tested by the System Designer] | [ ] |

## 9. Self-check

☑  Every FR is a user story with a benefit — all 9 FRs in §3 end in a “so that” clause, and each Must FR names the pain it traces to.

☑  Every FR has acceptance criteria you could actually test — 34 criteria across the 5 Must FRs, each a number, a state, or a yes/no; 19 of them are wrong paths.

☑  No FR is vague — no bare “fast”, “easy”, or “user-friendly” anywhere in §3, and no product or vendor is named in an FR.

☑  NFRs exist, including security / privacy — NFR-04 is the required access-control check; NFR-05, NFR-09 and NFR-10 cover consent, minimisation and erasure under PDPA; NFR-14 checks that no name or HN reaches the AI service; all 14 NFRs carry a number.

☑  Every FR traces back to a stated problem — see “Pain this traces to” under each FR, and §7.

☑  Scope and out-of-scope are stated — §2.1 and §6; the MoSCoW table in §3 marks the 5 Must FRs as the MVP.

☑  Use-case list matches the FR list — 7 use cases cover the 5 Must FRs (FR-01 and FR-05 have two each); diagram in §5.2.

☑  AI log is honest — §8 shows exactly what was asked, drafted, and hand-corrected.

## Appendix A — Business rules

| ID | Rule | FR |
|---|---|---|
| BR-01 | The invite code (QR + 6 digits) works once and expires after 10 minutes; the older adult can tap “Create new code”. | FR-01 |
| BR-02 | The older adult must tap consent before pairing; neither side has an account or password; one older adult has one caregiver. The consent screen states (1) what the caregiver will see: medicines, meal times and confirmation status, (2) why: to alert the caregiver when a meal is not confirmed, (3) that either side can unpair at any time and the pair's data is then deleted (BR-17). | FR-01 |
| BR-03 | Only the caregiver can add or edit medicines. | FR-02 |
| BR-04 | A scanned draft is never saved until the caregiver checks and confirms it; a field that cannot be read is left empty and marked “Please check” (never guessed); saving is blocked while a required field is empty. | FR-02 |
| BR-05 | Required fields: medicine name, tablets per dose, meal / time. Warnings and contraindications are saved only when the label has them. | FR-02 |
| BR-06 | The reminder time follows the label only: after a meal = the meal time; N minutes before a meal = meal time − N; at bedtime = bedtime. The caregiver sets breakfast, lunch and dinner times and bedtime when adding the first medicine. No time or no minutes on the label → empty + “Please check” (BR-04). Medicines with the same reminder time form one meal. Examples (breakfast 07:00, bedtime 21:00): “after breakfast” → 07:00 · “30 minutes before breakfast” → 06:30 · “at bedtime” → 21:00 · “before meals” with no minutes → empty, saving blocked. | FR-02,<br>FR-03 |
| BR-07 | Only tablets and capsules taken at fixed times; no as-needed medicines, liquids or half tablets. | FR-02 |
| BR-08 | Reminder at T, repeats at T+5 and T+10 (fixed times from T), only while the meal is not confirmed. | FR-03 |
| BR-09 | The reminder screen shows every medicine in the meal (name, tablets, warnings, contraindications), a green “Taken” and a red “Not yet” button, and plays a sound at every round while MedMind is open and has been tapped once since opening; no medicine photos. | FR-03 |
| BR-10 | One tap on “Taken” confirms the whole meal, records the time and stops the reminders. | FR-04 |
| BR-11 | “Not yet” in round 1 or 2 → wait for the next round; in round 3 → alert the caregiver immediately. | FR-04,<br>FR-05 |
| BR-12 | Tapping “Taken” again creates no duplicate record. | FR-04 |
| BR-13 | Not confirmed by T+15 → status “Not yet confirmed” + caregiver alert “Medicine not yet confirmed”, sent once per meal (not again at T+15 if already sent under BR-11); never “not taken”. A confirmation tapped before T+15 that arrives later because the phone was offline is shown to the caregiver as “Medicine confirmed at …” with the time it was tapped. | FR-05 |
| BR-14 | The daily status shows every meal of the day: “Taken” + time / “Taken (late confirmation)” + time / “Not yet confirmed” / “Not due yet”. | FR-05 |
| BR-15 | Late confirmation: after T+15 the older adult can still tap “Taken” on the home screen until the reminder time of the next meal that starts after this meal's T+15 (none = 23:59) → “Taken (late confirmation)” + time, and the caregiver is told “Medicine confirmed at …”; after that window it cannot be confirmed and stays “Not yet confirmed”. | FR-04,<br>FR-05 |
| BR-16 | Overlapping meals (e.g. 06:45 and 07:00): each keeps its own rounds (BR-08), caregiver alert (BR-13) and late window (BR-15); the reminder screen lists every unconfirmed meal in time order under separate headings, each with its own buttons; reminders due at the same moment sound once. | FR-03,<br>FR-04,<br>FR-05 |
| BR-17 | Unpairing: either side can unpair (with a second confirmation) → the caregiver loses access immediately, and that pair's medicines and confirmation history are deleted (PDPA right to erasure). | FR-01 |
| BR-18 | Reopening the page: each meal's status is worked out from the clock. Rounds whose time passed while the page was closed are not replayed. A meal still within T to T+15 shows the reminder screen at once and keeps its remaining rounds; a meal in its late window shows “Not yet confirmed” with a “Taken” button. On the caregiver's side, an alert due while the page was closed is shown as unseen on the next open. | FR-03,<br>FR-05 |
| BR-19 | Before a label photo is sent to the AI service, the caregiver covers the patient's name, HN, any barcode or QR code and any other personal detail, sees the exact image that will be sent, and ticks “Name and HN are covered”; until then nothing is sent. The consent screen states that, on its no-cost tier, the AI provider may use and review what is sent. Only the covered copy is sent, without its file details (metadata), and no photo is stored. The AI returns only the medicine fields of BR-05; reminder times are still worked out by BR-06 and every draft is checked under BR-04. | FR-02 |
