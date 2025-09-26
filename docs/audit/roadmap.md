# Implementation Roadmap

This roadmap will track follow-on pull requests aligned with the capability modules. Each PR should link back to this document and update the status column when merged.

| Module | Scope (per brief) | Planned Deliverables | Status |
| --- | --- | --- | --- |
| Rules & Security | Firestore schemas, security rules, rule tests, App Check enablement | `firestore.rules`, `firestore.indexes.json`, emulator test suite, `docs/security.md` | In progress |
| A. Organizations & Sharing | Orgs/workspaces data model, role management UI, invite/sharing flows, audit logging | `src/lib/db/orgs.ts`, auth claim refresh hooks, org/workspace switcher, audit log middleware | Not started |
| B. Media Plan Builder | Grid + calendar UX, scenario planning, approvals hardening, file attachments | Virtualized grid, calendar view, scenario diffing, attachment storage, optimistic updates | Not started |
| C. Insertion Orders | Function-backed IO PDF generation, versioning, e-signature stubs | Cloud Function templates, Storage integration, IO viewer UI | Not started |
| D. Budgeting & Pacing | Threshold editor, alerting pipeline, pacing dashboards | Scheduled functions, alert documents, notification hooks, channel/market pacing views | Not started |
| E. Reporting | Dashboards, exports, schedules | Dashboard builder UI, export Functions, schedule triggers, share links | Not started |
| F. Integrations Hub | Connectors, sync runs, retries, normalization | Provider scaffolding, Secret Manager wiring, sync run tracking, Firestore repositories | Not started |
| G. Notifications & Tasks | Inbox, task assignment, email transport | Notification center UI, callable email Function, task board, due reminders | Not started |
| H. Compliance & Reliability | Audit logs, monitoring, health checks, error boundaries | Platform audit log service, structured logging, status endpoint, error boundary coverage | Not started |
| Phase 4 – DevEx | Type safety, testing matrix, CI/CD, seeds | Strict TS config, ESLint/Prettier, GitHub Actions, emulator tests, `scripts/seed.ts` | Not started |
| Phase 5 – Docs & UX | User guides, runbooks, accessibility polish | Module READMEs, user guides with screenshots, runbooks, design system updates | Not started |

As each module advances, update both this roadmap and the feature matrix to reflect new coverage and hardening progress. Current gaps and priorities are summarized in the Phase 0 findings. 【F:docs/audit/findings.md†L1-L33】
