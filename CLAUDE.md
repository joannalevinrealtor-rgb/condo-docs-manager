@AGENTS.md

# CLAUDE.md — Condo Docs Manager

## What this project is
A tool for a real-estate **virtual assistant (VA)** to manage the legally-required
condominium disclosure documents that buyers must receive during a **Florida condo
purchase**. The VA requests these documents from sellers/associations, tracks which
have been received, and analyzes the rules for the buyer.

The original prototype was a single self-contained **HTML file**
(`CondoDocsManager...html`) that stored all data in **browser localStorage**. Because
of that, it only worked on one device for one person, and the data could be lost.
That prototype lives at `~/Downloads/CondoDocsManager_v4.html` for reference.

## The goal
Rebuild this into a **real, usable web app** that the owner's VA and team can log into
from anywhere, with shared data stored in a **cloud database**.

Priorities, in order:
1. **User accounts / login**
2. **Cloud-stored data** (replace localStorage) so it persists and can be shared
3. **Keep every existing feature** (listed below)
4. **Deployable to a real web address**

## Tech stack (chosen during rebuild)
- **Next.js 16** (App Router, TypeScript, Tailwind v4) — the web app. NOTE: Next.js 16
  has changed conventions vs older versions; consult `node_modules/next/dist/docs/`.
- **Supabase** — cloud Postgres database, file storage, and authentication.
- **Claude API** — powers the one-click AI analysis.
- **Vercel** — hosting / deployment.

Decisions made with the owner:
- **Login model:** one shared team login (built so individual logins are an easy upgrade).
- **AI analysis:** built-in one-click via the Claude API (not the old copy-paste flow).

## Who is directing this project
The owner is **not a developer**. Please always:
- Explain what you're about to do in plain English **before** doing it.
- Avoid jargon, or define it briefly when it's unavoidable.
- Propose a plan and pause for approval before big changes.
- Make sensible default technical choices rather than asking many technical questions.

## Core features (all existed in the prototype — preserve them)
- **Property dashboard** — one entry per condo property / transaction.
- **Document checklist** — tracks which required docs have been received.
- **Document upload** — attach the actual files per property.
- **Email generator** — produces a request email to send to the seller/association.
- **AI analysis** — reads the rules & regs and flags key restrictions (see below).
- **Notes section** — per-property notes.
- **Shareable package** — bundle documents + notes to hand off to the next party.

## Required documents (the checklist)
1. Purchaser Application
2. Rules and Regulations
3. Declaration of Condominium
4. Articles of Incorporation
5. Bylaws and Rules
6. Most Recent Annual Financial Statement
7. Annual Budget
8. Frequently Asked Questions and Answers
9. Preceding 12 months of meeting minutes & agendas
10. Insurance Declaration Pages
11. Milestone Inspection Report
12. Structural Integrity Reserve Study (SIRS)
(The prototype also tracked a 13th item: 40 Year Certification — keep it.)

## What the AI analysis should flag
When analyzing the Rules & Regulations / Declaration, surface:
- **Rental restrictions** — minimum lease terms, caps on number of rentals, waiting
  periods before a new owner can rent.
- **First right of refusal** — whether the association can approve or refuse a buyer.
- **Pet restrictions** — size, breed, and number limits.

## Florida legal context (relevant to several documents)
- **Milestone Inspection** — required for condo buildings 3+ stories AND 25+ years old
  (Fla. Stat. §553.899).
- **Structural Integrity Reserve Study (SIRS)** — required for all 3+ story buildings
  (Fla. Stat. §718.301(4)(p)).
- **Turnover** requirements and **Florida SB 4D (2022)** drive the SIRS / Milestone rules.

## How to start
1. Read the existing HTML file and **summarize what it currently does**. (Done.)
2. Propose a rebuild plan in plain English. (Done — approved.)
3. **Wait for approval** before scaffolding anything. (Done.)
