🌐 **Language:** [ไทย](README.md) · English

# MedMind — medication reminders and medication status for the caregivers of older adults

> **Introduction to Software Engineering (15031001) — academic year 2026** · School of Applied Digital Technology, Mae Fah Luang University
> **Team:** MedMind · **Repository:** https://github.com/yaroo393-png/MedMind · **Live demo:** [ not yet — added after deployment ]
> *The Thai README is the primary version. If the two differ, the Thai one is edited first and this page is updated to match.*

## Current status
| Part | Status |
|---|---|
| M1 Team Charter | ✅ Complete (scope in/out + success measure) — [`M1-Charter_MedMind.pdf`](docs/01-charter/M1-Charter_MedMind.pdf) · readable on GitHub: [`charter.md`](docs/01-charter/charter.md) ([Thai](docs/01-charter/charter.th.md)) |
| M2 SRS | ✅ v1.2 (FR-01–05 Must, FR-06 Should, FR-07–09 Could · BR-01–19 · NFR-01–14 · use cases + diagram · document history) — [`M2-SRS_MedMind.pdf`](docs/02-requirements/M2-SRS_MedMind.pdf) · [`spec.md`](docs/02-requirements/spec.md) ([Thai](docs/02-requirements/spec.th.md)) · [`backlog.md`](docs/02-requirements/backlog.md) |
| M2 Design | 🟡 Draft (includes Demo mode, ADR-8, ADR-9) — [`architecture.md`](docs/03-design/architecture.md), [`design-system.md`](docs/03-design/design-system.md), [`firestore-rules-draft.md`](docs/03-design/firestore-rules-draft.md) · waiting for the team to review and decide §11 (documents in Thai) |
| Traceability (Golden Thread) | 🟡 Structure ready — [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) · Code/Test columns are filled in as code is written |
| System (web app) | ⬜ Not started — Increment 1: FR-03–05 · Increment 2: FR-01–02 |
| Automated tests | ⬜ Only the repository-structure tests exist (`tests/repo-structure.test.js`) · FR tests are added together with the code |
| Project plan (Week 10) | 🟡 Sprints 0–3, risks, rotating roles, retrospective — [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) |
| Final Report / AI-Use Statement / Demo | 🟡 Skeletons — [`docs/05-report/`](docs/05-report/), [`docs/06-presentation/`](docs/06-presentation/) |

> **[ ]** = no real data yet, nothing is guessed · this README is updated when there are real results

## Project overview
**Problem:** Older adults who take tablets or capsules at fixed times may forget a dose, take it at the wrong time, or not remember whether they have already taken it, while the child who cares for them is at work and cannot follow up all day. The methods used today (alarm clocks, pill boxes, phone calls, LINE messages) cannot confirm the status and report it to the caregiver automatically.

**MedMind answers two questions:** "What medicine do I take at this meal, and have I taken it?" (older adult) and "Has every meal's medicine been taken today, without me having to call?" (caregiver).

**Main users:** older adults on fixed-time tablets or capsules · the adult child / caregiver who is not with them all day · data from interviews with 3 users (3–4 September 2026, by phone)

### MVP scope
| FR | Feature | Priority | Owner |
|---|---|---|---|
| FR-01 | Pair the older adult and the caregiver with a QR code / 6-digit code (the older adult consents first, no account needed) | Must | Takkan Khanlui |
| FR-02 | Photograph a medication label → **the caregiver covers the name/HN** → **AI (Gemini) drafts the medicine record** → the caregiver checks → save | Must | Yar Oo |
| FR-03 | Reminder at every meal (sound + all of the meal's medicines) with repeats at T+5 and T+10 — the heart of the MVP | Must | Rossatorn Sangkaew |
| FR-04 | Confirm the whole meal with one tap (late confirmation allowed, works offline) | Must | Nichanan Lalua |
| FR-05 | Alert the caregiver when a meal is not confirmed (by T+15) + daily status | Must | Suchitra Khomdee |
| FR-06–08 | Several caregivers · list of all medicines · medicine photos | Should / Could | after the MVP |
| FR-09 | AI weekly summary for the caregiver (only meal statuses are sent — no name/HN/medicines) | Could | after FR-01–05 |

**AI feature:** label reading with Gemini through Firebase AI Logic (FR-02) — the AI **only drafts**; the caregiver checks every time; it gives no medicine advice, and reminder times are calculated by the system's rules, not by the AI.

## 🧵 The Golden Thread
*Marks are not given for how good the app looks but for continuity: problem → requirement → design → feature → test*

| Problem | → FR | → Design | → Feature | → Test |
|---|---|---|---|---|
| Older adults find sign-up hard; the caregiver is not there | **FR-01** | [architecture §6, §7.1](docs/03-design/architecture.md) | S-01, C-01 · [`fr/FR-01-pairing`](fr/FR-01-pairing/README.md) | AC 1–6 · NFR-04, 05, 10 |
| The caregiver wants help filling in medicine details from the label | **FR-02** | [architecture §5, §7.2, ADR-3](docs/03-design/architecture.md) | C-02…C-05 · [`fr/FR-02-label-scan`](fr/FR-02-label-scan/README.md) | AC 1–9 · NFR-06, 08, 09, 11, 14 |
| Forgetting a dose / taking it late | **FR-03** | [architecture §5.1, §7.3](docs/03-design/architecture.md) | S-03 · [`fr/FR-03-reminder`](fr/FR-03-reminder/README.md) | AC 1–5 · NFR-01 |
| Not remembering whether the medicine was taken | **FR-04** | [architecture §6 (`doses`)](docs/03-design/architecture.md) | S-02, S-03 · [`fr/FR-04-confirm`](fr/FR-04-confirm/README.md) | AC 1–7 · NFR-02, 03, 07, 12 |
| Calling or messaging for every meal; no single status | **FR-05** | [architecture §6 (`alertSeen`)](docs/03-design/architecture.md) | C-07, C-08 · [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/README.md) | AC 1–7 · NFR-01, 12, 13 |

AC → code → test, one by one, is in [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) · **the SRS is the source of truth** — change the SRS first, then copy the change here.

## 👥 Team and work split
| Name | Student ID | GitHub | Role | Feature written (whole chain: logic + tests + screens) | My work |
|---|---|---|---|---|---|
| Yar Oo | 6931503064 | [yaroo393-png](https://github.com/yaroo393-png) | Project Manager | **FR-02** AI label reading · all project documents · repo/CI | [`fr/FR-02-label-scan`](fr/FR-02-label-scan/README.md) |
| Takkan Khanlui | 6931503035 | [V31311](https://github.com/V31311) | System Designer | **FR-01** pairing · `core/firebase.js`, `core/repo.js`, Security Rules · design document | [`fr/FR-01-pairing`](fr/FR-01-pairing/README.md) |
| Rossatorn Sangkaew | 6931503066 | [IDK-SleepyBro](https://github.com/IDK-SleepyBro) | UX/UI Designer | **FR-03** meal reminders (`mealState`) · design system · screens | [`fr/FR-03-reminder`](fr/FR-03-reminder/README.md) |
| Nichanan Lalua | 6931503049 | [KaidangSuk](https://github.com/KaidangSuk) | Prototype Developer | **FR-04** confirming a meal · the older adult's home screen | [`fr/FR-04-confirm`](fr/FR-04-confirm/README.md) |
| Suchitra Khomdee | 6931503079 | [Khaiwann](https://github.com/Khaiwann) | QA / Tester | **FR-05** caregiver alert + daily status · test plan and results (MT) | [`fr/FR-05-caregiver-status`](fr/FR-05-caregiver-status/README.md) |

Team rules (branches, PRs, AI use, PDPA): [`RULES.md`](RULES.md) · individual contribution is measured from GitHub — **everyone commits with their own account**.

## 📂 Document index and repository structure
```text
docs/
├── 01-charter/
│   ├── M1-Charter_MedMind.pdf   # M1 (submitted): problem, users, scope in/out, success measure, Gates 1–3, SDLC, team
│   ├── charter.md               # readable copy (English) · charter.th.md = Thai translation
├── 02-requirements/
│   ├── M2-SRS_MedMind.pdf       # M2 (submitted) SRS v1.2
│   ├── spec.md                  # readable SRS copy (English) · spec.th.md = Thai translation
│   └── backlog.md               # Product backlog: MoSCoW + pain + size + status
├── 03-design/                   # architecture.md, design-system.md, firestore-rules-draft.md, diagrams/ (Thai)
├── 05-report/                   # final-report.md, ai-use-statement.md (skeletons)
├── 06-presentation/             # demo-slides.md
├── TRACEABILITY.md              # Golden Thread: AC → code → test, NFR, BR, manual tests MT-01…15
├── AI_USAGE_LOG.md              # the full, honest AI usage log
├── PROJECT-PLAN.md              # sprints, velocity, risks, rotating roles, retrospective
└── GITHUB-SETUP.md              # labels, milestones, ruleset, first issues
fr/FR-01…FR-05/README.md          # each member's work (evidence of individual contribution)
public/                           # web app: index.html (role choice) · senior.html · caregiver.html · demo.html (reviewers) · css/ · js/{core,logic,services,features}/
tests/                            # node --test
scripts/check-secrets.js          # secrets / forbidden-file check
.github/                          # CI, PR template, issue template
README.md (Thai) · README.en.md (English) · CLAUDE.md · RULES.md
```

## 🚀 How to run
**There is no system to open yet** (see the status above) — this section is updated when Increment 1 is done.

Node.js 22 or later is required (on Windows PowerShell use `npm.cmd` instead of `npm`):
```bash
git clone https://github.com/yaroo393-png/MedMind.git
cd MedMind
npm test              # automated tests (no npm install needed)
npm run check         # tests + secrets check — run before every push
```
Open the site locally (once pages exist): point a static server at the `public/` folder, for example Live Server in VS Code (do not open the HTML with `file://` because ES modules are used) · live demo: [ added after deployment ]

**Real use on phones (one device = one role):** the older adult's phone opens the link and chooses "Older adult" (a QR code appears) · the caregiver's phone opens the same link and chooses "Caregiver", or scans the QR code with the phone's camera app → pairing → the caregiver photographs a real label (must be served over HTTPS) — architecture §5.0, ADR-9.

**For reviewers — Demo mode:** open `demo.html` (link: [ added after deployment ]) to see the older adult's and the caregiver's screens side by side with sample data and a simulated clock (buttons: +5 minutes / go to next reminder time). No account, two phones or server needed — every Must FR and the wrong paths can be walked through (architecture ADR-8).

## ⚙️ Important limits (from SRS §2.2)
- Confirming is self-reported, not proof that the medicine was taken · the caregiver message is "Medicine not yet confirmed" (never "not taken").
- The system is a web app with **no server code** — the older adult is reminded and the caregiver is alerted only while the page is open (nothing happens when the page is closed or the screen is locked) · the reminder sound plays only after the first tap on the page.
- An internet connection is needed to share status (a confirmation made offline is sent when the connection returns).
- Only tablets and capsules taken at fixed times are supported (no as-needed medicines, liquids or half tablets).
- The AI can misread a label — the caregiver must check every field before saving · the system gives no diagnosis, no medicine advice and never changes how a medicine is taken.

## 🔒 Privacy (PDPA)
- Medicine data and medication status are health data — only what the FRs use is stored; no name, HN, national ID, address, date of birth or phone number, and **no label photos** (NFR-09).
- Before a photo is sent to the AI, the caregiver must cover the name, HN, barcode and other personal details and tick a confirmation (BR-19) · the free Gemini tier may use what is sent to improve its products — the consent screen must say so.
- When a pairing is cancelled, that pair's data is deleted (BR-17, NFR-10).
- Real label photos must never be committed (`test-labels/` is ignored).

## 🤖 AI use in development
Recorded honestly in [`docs/AI_USAGE_LOG.md`](docs/AI_USAGE_LOG.md) · summary in [`docs/05-report/ai-use-statement.md`](docs/05-report/ai-use-statement.md) · SRS §8 contains only the rows the team chose to include (see note ¹ in the log).

## 📚 References
- User data: interviews with 3 users — M1 Charter, Gate 1
- W3C. *WCAG 2.2 — Target Size (Enhanced)* — https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html · *Contrast (Minimum)* — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html (NFR-03)
- Apple. *Human Interface Guidelines — Accessibility* — https://developer.apple.com/design/human-interface-guidelines/accessibility · Google. *Material Design — Accessibility* — https://m2.material.io/design/usability/accessibility.html (NFR-03)
- Nielsen, J. *Why You Only Need to Test with 5 Users*. NN/g — https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ (NFR-02)
- Firebase. *Gemini API using Firebase AI Logic* — https://firebase.google.com/docs/ai-logic (ADR-3) · Google. *Gemini API Additional Terms of Service* (Unpaid Services) — https://ai.google.dev/gemini-api/terms
- Personal Data Protection Act B.E. 2562 (2019) (PDPA) (NFR-09, NFR-10, BR-17, BR-19)
- Course material, Introduction to Software Engineering 2026: guides M1, M2, M3 and Milestone 4 — Final Project
