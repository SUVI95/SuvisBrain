# SuvisBrain / Knuut — Tender & demo scope (kotoutumiskoulu 0→A2)

**→ Full procurement + LMS rebuild brief:** [`ALKUPOLKU-PLATFORM-BRIEF.md`](./ALKUPOLKU-PLATFORM-BRIEF.md) (Kuopio / TyöNavigaattori, 120-day 0→A2, teacher + student sides).

This document defines the **product vision**, **roles**, **features**, and **design constraints** for a Finnish integration education platform demo. It is written so **Cursor and collaborators** can implement consistently.

---

## 1. Vision

- **Learners** (often low formal education, diverse L1s) get a **clear, calm path** from **0 → A2** Finnish, with **daily practice** (Knuut voice + text fallback), **YKI-oriented** tasks, and **life/work** modules (passit, työelämä).
- **Teachers** save time: one dashboard for **class-level + individual** plans, **progress**, **at-risk alerts**, and **AI suggestions only** — **humans decide** (EU AI Act, Finnish practice).
- **Admins** (municipality / school) manage **organisations**, **cohorts**, **permissions**, and **audit-friendly** reporting.

---

## 2. Design principles (non-negotiable)

### 2.1 Human-in-the-loop AI

- AI **suggests** (next topic, reminder wording, difficulty); **teacher confirms** or edits.
- Every automated nudge/email is **logged** and **attributable** (who triggered, when).
- No “black box” grading as final: YKI-style feedback is **assistive**; teacher can override.

### 2.2 Accessibility & low-literacy UX

- **Large default type** (min ~18px body where possible); scalable text.
- **High contrast**; avoid tiny grey-on-grey.
- **One primary action per screen**; short Finnish labels; icons + text.
- **Predictable navigation**: same shell for learner / teacher / admin.

### 2.3 Finnish visual identity (replace generic “forest/amber” if it feels off-brand)

Use a **Nordic / Finnish** palette (examples — tune in CSS variables):

| Role        | Suggestion                                      |
|------------|--------------------------------------------------|
| Primary    | Deep lake blue `#003399` or `#1E3A5F` (trust)  |
| Accent     | Nordic cyan or soft coral for CTAs (not neon)   |
| Success    | Forest/moss green `#2E6B4E`                     |
| Background | Warm off-white `#F7F5F0` or cool `#F4F7FA`      |
| Surface    | White `#FFFFFF` with subtle border              |

Avoid: pure black text on pure white for long reading — use `#1A1A1A` on `#FAFAF8`.

### 2.4 Technical: no client-side LLM keys

- Prototypes that call `api.anthropic.com` from the browser are **not production-safe**.
- All LLM calls must go through **backend** (`POST /api/agents/:id/prompt` or dedicated route) with **server env keys**, logging, and rate limits.

---

## 3. Roles & surfaces

| Role    | Entry / shell | Core jobs |
|---------|-----------------|-----------|
| **Learner** | `oppipolku.html` (→ Knuut, modules) | Daily path, lessons, voice/text, YKI practice, passports |
| **Teacher** | `teacher-dashboard.html` | Cohort + individual plans, progress, nudges, AI suggestions (approve) |
| **Admin**   | `admin` (new or extend) | Orgs, users, cohorts, content flags, exports |

---

## 4. Learner experience (Oppipolku 0→A2)

### 4.1 Modules (aligned with your HTML prototype)

- **Etusivu**: greeting, day N/120, level sub-steps (e.g. A1.1→A2), streak, words learned (from brain/skills when wired).
- **Kirjaimet**: Finnish alphabet; **larger letter cells**; TTS (`speechSynthesis` fi-FI) optional; track “mastered / practicing”.
- **Päivän tunti**: topic chips → lesson; **server-side** AI via Knuut/Nelli persona, not raw Anthropic in browser.
- **YKI**: reading/listening/writing/speaking tabs; speaking deep-links to `knuut.html`.
- **Passit & kortit**: hygienia, EA1, työturva, etc. — status **mock** first, later DB.
- **HOPS / Opiskelupolku**: 120-day timeline; **teacher comment** block (from DB or mock).

### 4.2 Integration with existing app

- Reuse **auth** (learner JWT with `cefr_level`).
- Reuse **`/api/learners/:id/progress`**, **`/api/brain/stats`**, episodes list.
- **New page**: e.g. `public/oppipolku.html` — shell + sections; can reuse styles from prototype after palette/typography pass.

---

## 5. Teacher experience (time-saving, decision-centric)

### 5.1 Today’s view (mock OK)

- **Queue**: learners at risk (no session 7d), new enrollments, reviews pending.
- **Cohort snapshot**: active this week, total sessions, avg per active learner (already partially in API).

### 5.2 Individual learner

- **Plan**: next 2 weeks — topics, target CEFR sub-level, suggested Knuut sessions/week (teacher edits).
- **Progress**: same metrics as dashboard + episode list + brain nodes (weakest topics).
- **AI suggestions** (draft): “Assign topic X”, “Send reminder” — **Approve / Edit / Dismiss** with reason stored (audit).

### 5.3 Class / group planning (phase 2)

- Create **groups** within org; assign **shared module sequence**; still allow **individual overrides**.

### 5.4 Data model direction (for real implementation)

- `learning_plans` (learner_id, org_id, jsonb milestones, teacher_id, updated_at)
- `plan_events` or `teacher_notes` for comments visible on HOPS

---

## 6. Admin experience

- List **organisations**, **teachers**, **learners**; impersonation **optional** (demo only, audited).
- Toggle **features** (YKI mode, nudges, Oppipolku beta).
- **Export** aggregates for municipality (GDPR-aware).

---

## 7. What exists in repo today (anchor for Cursor)

- Auth: `api/auth.js` (learner email-only, teacher password).
- Teacher metrics: `GET /api/teacher/learners` — summary + learners (sessions, streak, XP, at_risk).
- Student UI: `public/student-dashboard.html`.
- Teacher UI: `public/teacher-dashboard.html`.
- Voice + text fallback: `public/knuut.html`.
- Agents: `GET /api/agents`, `POST /api/agents/:id/prompt` (OpenRouter).
- Schema health: `GET /api/schema-check`.

---

## 8. Phased delivery (demo → tender)

| Phase | Goal |
|-------|------|
| **A** | `oppipolku.html`: Finnish palette, large type, sections wired to **mock** + links to Knuut; no browser LLM keys. |
| **B** | Teacher “individual plan” panel: **mock** data + UI for approve/edit suggestions. |
| **C** | Persist plans in DB + show on learner HOPS. |
| **D** | Admin minimal org view + feature flags. |

---

## 9. Success criteria (demo)

- Teacher can open **one dashboard** and see **who needs help** and **what to do next** without reading raw logs.
- Learner sees **where they are** on 0→A2, **what today is**, and can **practice in one click** (Knuut).
- Stakeholder sees **EU AI Act** story: suggestions + **human approval**.

---

## 10. Out of scope for first demo (unless requested)

- Full LMS (grades, full attendance legal records).
- Native mobile apps.
- Replacing official YKI or passport issuers.

---

*Last updated for tender alignment — Finnish integration / municipality context.*
