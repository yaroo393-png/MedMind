# Medication Reminder — M1 

## Team

| Student ID | Name|
| --- | --- | --- |
| [ID] | [Name] |
| [ID] | [Name] |
| [ID] | [Name] |
| [ID] | [Name] |
| [ID] | [Name] |

## Problem

Older adults who take medication on a schedule may forget, or be unsure whether they have already taken it. Setting up medication details and times in an app can involve many steps for people who are not comfortable with smartphones. When a dose is not confirmed, the caregiver may not know the status of that medication session right away.

**Who exactly has it:** Older adults in Thailand who take scheduled medication regularly and use a smartphone, and the family members or caregivers who help manage their medication.
**Why it matters:** Older adults rely on memory, alarms, or a caregiver, and caregivers may have to call to check when they are unsure whether the older adult has taken their medication.

## Gate 1 — Reachable Users

Real names and contact details are kept in the submitted PDF only.

| # | Participant | Contact method | Interview |
| --- | --- | --- | --- |
| 1 | P1 | Phone | 3 Sep 2026, 12:00–12:20 |
| 2 | P2 | Phone | 4 Sep 2026, 16:20–16:30 |
| 3 | P3 | Phone | 4 Sep 2026, 16:40–16:50 |
| 4 | P4 | Instagram | 4 Sep 2026, 14:30–14:40 |

## Gate 2 — MVP Shape

| FR | Requirement |
| --- | --- |
| FR-1 Pairing | Caregiver pairs with the senior's device by QR or invite code; no account, password, or typing for the senior. |
| FR-2 Label scan | Label photo becomes a medication draft; caregiver must review and confirm before saving. |
| FR-3 Reminder | At each session time, alert the senior and show that session's medicines on one screen. |
| FR-4 Confirm | Senior confirms the session with one tap; status and time are recorded. |
| FR-5 Escalation | If unconfirmed, re-remind a set number of times, then notify the caregiver "not yet confirmed". |

**FR with a real rule or decision:** FR-5 checks the confirmation status and reminder count to decide whether to stop reminding, remind again, or notify the caregiver.

**Data that persists between sessions:** senior–caregiver pairing, caregiver-confirmed medication details and schedule, medication photos, status of each session, confirmation time, and reminder count.

## Gate 3 — Access

| Dependency | Evidence |
| --- | --- |
| Gemini API to read labels and draft medication details (de-identified images only) | Free-tier key created; tested on 2 labels on 23 September. Name, dose, and times correct; "as needed only" warning missed, so caregiver review is required. More tests planned by 4 October. |
| Sample medication label photos | 2 photos from team members' families.|
| Android smartphone for testing camera and QR | OPPO Reno 16 5G (ColorOS 16) |
| Firebase Cloud Messaging for caregiver alerts | Free Spark plan, no payment method needed ([Firebase pricing](https://firebase.google.com/pricing)).|
## Process

**Agile:** OCR, notifications, and usability for older adults are still uncertain, so we test in short cycles and adjust based on feedback before building further.
