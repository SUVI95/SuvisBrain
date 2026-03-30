# ALKUPOLKU — Kotoutumiskoulutus LMS (Cursor brief)

**Product:** Full learning management platform for Finnish integration education (*kotoutumiskoulutus*), aligned with public procurement context **Kuopion kaupunki / TyöNavigaattori** (case **2042/02.08.00/2026**).

**Contract window (reference):** 1.6.2026 – 31.5.2027 + option years · **~60–100 students/year**, groups **20–25** · **120 days** path **0 → A2** Finnish.

**Legal / curriculum:** OPH 2022, työvoimapalvelulaki 380/2023, GDPR, JYSE 2025 · **Koulutusportti** integration for enrollment / completion / level / dropout signals.

---

## What stays in this repo (do not throw away)

| Asset | Role in ALKUPOLKU |
|--------|-------------------|
| **`public/index.html`** + brain graph (D3) | Teacher/admin **knowledge graph** — concepts, skills, “what the learner knows” |
| **`public/knuut.html`** | **Voice + text** Finnish practice (core “brain of Knuut”) |
| **`public/dashboard.html`** | **Agents fleet** — Nelli, pedagogical agents, `/api/agents` prompts |
| **`api/`** (brain, agents, session, learners, auth) | Backend **spine** — extend with LMS entities, not replace wholesale |
| **`public/oppipolku.html`** | **Student shell** (0→A2) — expand into modules, HOPS, YKI, passit, etc. |
| **`public/teacher-dashboard.html`** | **Teacher shell** — expand into attendance, HOPS editor, placements, reports |

---

## What we removed or deprecated (redundant for tender LMS)

| Page / route | Action |
|--------------|--------|
| **`public/leads.html`** | **B2B lead pipeline** — not part of tender; **redirected** to teacher dashboard (bookmarks still work). |
| **`/quiz`, `/learn`, `/writing`** (static pages) | Standalone demos → **redirect** to **`oppipolku.html`** until **module shell + level quiz** lives in the LMS. |
| **`student-dashboard.html`** | Already a **redirect** to Oppipolku — keep as legacy URL. |

**Still useful (keep for now):** `onboarding.html` (first-run flow), `yki-results.html` (YKI mock reports), `privacy-ai.html` (GDPR / AI notice).

---

## Two-sided platform (build order)

### Teacher (Vastuuopettaja A + Ohjaaja B)

1. Dashboard: all students, level, attendance, progress  
2. **Module builder** (shell + mock): Finnish modules A1.1 → A2  
3. **HOPS** editor per student  
4. **Attendance** + **5 consecutive absences** → alert → **työvoimaviranomainen** workflow  
5. **Language assessment** (A1–B2, OPH-based)  
6. **Työssäoppiminen** tracker (2–3 weeks, 8 credits min, contacts, 3-way agreement)  
7. **YKI readiness** tracker  
8. **Passi / kortti** tracker  
9. Student **feedback** (interim + final)  
10. **Final report** → Kuopio e-lomake **5182/5183**  
11. **Jatkosuunnitelma** builder  
12. **Employer contact database** (Kuopio area)  
13. Staff **CV/credentials** + **change approval** workflow  

### Student

- Personal dashboard (level badge, **0→A2** progress)  
- **Daily path** / schedule  
- **Modules** (structured levels — mock now)  
- **Latin alphabet** module where needed  
- Self-assessment, homework, vocabulary/grammar refs  
- **YKI** four subtests  
- Passi/kortti prep content  
- **Työssäoppimispäiväkirja**  
- View/comment **jatkosuunnitelma**  
- **Notifications**  
- **Low Finnish / multilingual hints** — icons, simple FI, optional EN  

---

## Module structure (shells + mock)

| Level | Theme (examples) |
|-------|-------------------|
| Pre-A1 | Latin alphabet, sounds, numbers |
| A1.1 | Greetings, daily life, family |
| A1.2 | Work vocabulary, asking for help |
| A1.3 | Healthcare, services, transport |
| A2.1 | Workplace Finnish, instructions |
| A2.2 | Job seeking, interviews, YKI prep |
| +All | Yhteiskuntatietous, elämänhallinta |

Each module: **video slot**, **text**, **exercises**, **vocabulary**, **speaking prompt**, **level quiz**.

---

## Operational flows (to implement)

1. **Lifecycle:** Koulutusportti referral → enrollment → HOPS → daily learning → työssäoppiminen → YKI readiness → jatkosuunnitelma → certificate → Koulutusportti update  
2. **Attendance:** daily check-in → **5 misses** → alert to vastuuopettaja → notification to **työvoimaviranomainen**  
3. **Levels:** entry → module progress → mid → exit (A1–B2) → final report fields  
4. **Työssäoppiminen:** workplace, supervisor, dates, goals, agreement, feedback  
5. **OTP / billing:** monthly **opiskelijatyöpäivät** — **1 OTP = 7 h** (7×45 min), partial days  

---

## Compliance (non-negotiable)

- GDPR, EU data, **role-based access**, **audit log**  
- **Salassapito** for employment authority, health, social/financial data  
- **Koulutusportti** export fields (enrollment, dropout, completion, level, jatkosuunnitelma, recommendation)  
- **Saavutettavuus** (Finnish law 306/2019): SR, contrast, keyboard  
- **Retention** + secure deletion  
- **Encrypted** transfers  

---

## Tech stack (current SuvisBrain)

- **Frontend:** static HTML + progressive React (Knuut orb); **future:** React app for heavy LMS UI if needed  
- **Backend:** Vercel serverless `/api/*` + Node  
- **DB:** Neon Postgres  
- **Auth:** extend to **student / ohjaaja / vastuuopettaja / admin**  
- **Files:** certificates, CVs, agreements (S3 / Vercel Blob — TBD)  
- **PDF:** reports for e-lomake — TBD  

---

## Priority build order (for Cursor)

1. Auth + **3 roles** (student, teacher, admin) — refine from current learner/teacher  
2. Student dashboard: **level + progress bar**  
3. Teacher dashboard: **student list + attendance**  
4. **Language module shell** (6 modules, mock)  
5. **HOPS** editor  
6. Attendance + **5-day alert**  
7. Työssäoppiminen tracker  
8. Language assessment A1–B2  
9. YKI prep section (expand Oppipolku)  
10. Monthly OTP report  
11. Jatkosuunnitelma builder  
12. GDPR data layer + audit  

---

## Related docs

- `docs/TENDER-SCOPE.md` — earlier demo vision (still aligned; use this file for **procurement + LMS scope**).
