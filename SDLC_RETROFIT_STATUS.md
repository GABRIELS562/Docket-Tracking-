# SDLC Retrofit — Status & Handoff

**Project:** RFID Item Tracking System (React + backend API + reader gateway + Docker)
**Branch:** `chore/sdlc-retrofit`
**Owner:** Jaime
**Methodology:** GitHub Spec Kit (Spec-Driven Development) + GitHub Actions CI/CD
**Last updated:** 2026-04-17 (Phase 3 in progress)

---

## Purpose of This Document

This file tracks the retrofit of comprehensive SDLC rigor onto the existing codebase. If the Claude Code session is interrupted, restarted, or handed to a different agent, **read this file first** before doing anything. Update it at the end of every phase so the next session can resume cleanly.

---

## Context at a Glance

- **What we're building:** RFID-based item tracking. Small items get RFID tags. Readers placed in physical areas detect tags and report reads. A React dashboard shows where items are.
- **Current state when retrofit began:** Project roughly 50% built. No spec, no constitution, no CI, no pre-commit hooks, no structured logging guarantees. Vibe-coded so far.
- **Goal:** Bring the project up to a standard where it can be sold to a client with confidence — passing CI, full specs, constitution, clean handoff docs.
- **Constraint:** Stay on GitHub (not migrating to GitLab). Everything flows through GitHub Actions.

---

## Phase Tracker

Mark each phase as ⬜ Not started, 🟡 In progress, or ✅ Done. Add notes on deviations or follow-ups.

### ✅ Phase 1 — Safety Net
- [x] `git status` clean
- [x] Branch `chore/sdlc-retrofit` created and pushed
- [x] Status tracker committed
- **Notes:** Flattened repo structure first (moved files from nested Docket-Tracking-/ to root). Branch chore/flatten-structure merged to main before creating sdlc-retrofit branch.

### ✅ Phase 2 — Install Spec Kit
- [x] `specify init . --here --ai claude` run
- [x] `.specify/` and `.claude/` committed
- **Notes:** Spec Kit installed successfully. `.claude/` already in .gitignore for security. Skills installed to `.claude/skills/`.

### 🟡 Phase 3 — Constitution
- [x] `.specify/memory/constitution.md` drafted
- [ ] Reviewed and approved
- [ ] Committed
- **Notes:** Awaiting Jaime's review. One deviation: kept Winston instead of Pino (already implemented).

### ⬜ Phase 4 — Code Quality Tooling
- [ ] Husky + lint-staged installed
- [ ] Commitlint configured
- [ ] Prettier configured
- [ ] ESLint verified (or initialized if missing)
- [ ] Pre-commit and commit-msg hooks executable
- [ ] Test commit succeeds with hooks running
- **Notes:**

### ⬜ Phase 5 — GitHub Actions CI
- [ ] `.github/workflows/ci.yml` (quality + security + docker jobs)
- [ ] `.github/workflows/codeql.yml`
- [ ] `.github/dependabot.yml`
- [ ] `.github/pull_request_template.md`
- **Notes:**

### ⬜ Phase 6 — Observability Baseline
- [ ] Pino installed
- [ ] Logger module created
- [ ] `console.log` sweep-replace NOT done (tracked as ongoing retrofit task)
- **Notes:**

### ⬜ Phase 7 — Push & GitHub Config (manual, by Jaime)
- [ ] Branch pushed
- [ ] Branch protection on `main` configured
- [ ] Dependabot alerts + security updates enabled
- [ ] Secret scanning enabled
- [ ] First CI run green (or red issues resolved)
- **Notes:**

### ⬜ Phase 8 — Retroactive Spec
- [ ] `/speckit.specify` — existing system documented
- [ ] `/speckit.clarify` — ambiguities resolved
- [ ] `/speckit.plan` — Constitution Check produced retrofit backlog
- [ ] `/speckit.tasks` — ordered task list generated
- [ ] `/speckit.analyze` — cross-check run, findings reported
- **Notes:**

### ⬜ Phase 9 — Final Review & Merge
- [ ] Branch pushed
- [ ] PR opened `chore/sdlc-retrofit` → `main`
- [ ] CI green
- [ ] Self-review against PR template complete
- [ ] Merged
- **Notes:**

---

## Retrofit Backlog (populated by Phase 8)

The Constitution Check in `/speckit.plan` will list every place the existing code violates the constitution. Copy those findings here as follow-up tasks.

- [ ] _(populated after Phase 8)_

---

## Decisions Log

Record any deviations from the master prompt, trade-offs made, or choices that need revisiting.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-17 | Flattened repo structure before SDLC retrofit | Original repo had files nested in Docket-Tracking-/ subfolder, causing git tracking issues. Flattened to have files at repo root for cleaner structure. |
| 2026-04-17 | Merged flatten branch to main before creating sdlc-retrofit | Ensures sdlc-retrofit branch starts from a clean, properly-structured main branch. |
| 2026-04-17 | Keep Winston instead of Pino for logging | Prompt specified Pino, but Winston already implemented with proper JSON formatting. Migration cost not justified. |

---

## Known Issues / Parked Items

Things flagged during retrofit that we're consciously deferring, not forgetting.

- [ ] Structured logging: `console.log` calls throughout the codebase still need to be migrated to Winston logger. Do opportunistically as files are touched.
- [ ] Create `specs/` directory structure (referenced in constitution but doesn't exist yet)
- [ ] Create `specs/rfid/` with LLRP protocol documentation
- [ ] Create `docs/adr/` for Architecture Decision Records

---

## Commands Cheat Sheet

- Resume on the retrofit branch: `git checkout chore/sdlc-retrofit && git pull`
- Start Claude Code in the project: `claude`
- Inside Claude Code, continue Spec Kit workflow: `/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.implement`
- Run CI checks locally before pushing: `npm run lint`, `npx prettier --check .`, `npm test`, `docker build -t rfid-tracker:local .`
- Check branch status: `git log --oneline chore/sdlc-retrofit ^main`

---

## Handoff Instructions for Any Agent Reading This

1. Read the full file before touching anything.
2. Identify the current phase from the tracker above.
3. Only resume from the next unchecked phase — don't redo completed work.
4. Work on `chore/sdlc-retrofit` branch. Never commit to `main`.
5. Commit with Conventional Commits between every phase.
6. Update this file at the end of each phase.
7. When in doubt, stop and ask Jaime — don't invent.
