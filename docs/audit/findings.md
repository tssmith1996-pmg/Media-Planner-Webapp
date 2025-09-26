# Phase 0 Findings

## 1. Repository Overview
The current app is a single Vite + React workspace focused on a local-only media planning demo. Authentication, storage, and approvals are simulated in-browser rather than backed by Firebase services. Plans, tactics, and campaigns are bundled via seed data and persisted with a local adapter that serializes to `localStorage`. 【F:src/store/localAdapter.ts†L1-L139】

## 2. Global Architectural Patterns
- **Routing:** React Router drives three primary routes (dashboard, plan editor, review) defined in `AppRoutes`. 【F:src/app/routes.tsx†L1-L17】
- **State & data fetching:** React Query wraps a custom `store` abstraction that currently resolves to the local adapter. No Firestore/RTDB integration is wired in. 【F:src/app/providers.tsx†L1-L15】【F:src/store/index.ts†L1-L12】
- **Forms & validation:** The plan title bar uses `react-hook-form` with Zod resolvers for inline validation; other forms rely on controlled inputs. 【F:src/components/PlanTitleBar.tsx†L1-L63】
- **UI toolkit & theming:** Tailwind CSS is configured with default tokens and a small library of bespoke components (`Button`, `Table`, etc.), but there are no shared design tokens beyond Tailwind defaults. 【F:tailwind.config.js†L1-L9】
- **Authentication shell:** `AuthGate` renders a static role selector tied to the mock user context; no Firebase Auth wiring is present. 【F:src/auth/AuthGate.tsx†L1-L32】【F:src/auth/useUser.tsx†L6-L58】
- **Firebase modules:** A placeholder Firebase adapter throws when invoked, indicating Firebase persistence is unimplemented. 【F:src/store/firebaseAdapter.ts†L1-L23】
 - **Firebase modules:** The Firebase adapter now integrates with Firestore via typed repositories, bootstrapping org/workspace scope automatically for production storage. 【F:src/store/firebaseAdapter.ts†L1-L266】
- **Testing setup:** Vitest with Testing Library covers a few components and utilities, but there is no emulator, integration, or e2e coverage. 【F:package.json†L1-L39】【F:src/tests/PlanCard.test.tsx†L1-L82】

## 3. Capability Audit Highlights
- **Core planning UI:** The media plan editor supports CRUD-like adjustments, approvals, and PDF/XLSX exports, but everything is client-side without multi-user collaboration or data integrity safeguards. 【F:src/pages/MediaPlanningPage.tsx†L1-L130】【F:src/components/ExportDialog.tsx†L1-L74】
- **Operational depth gaps:** Organizations, workspaces, budgeting alerts, integrations, notifications, reporting, compliance tooling, and DevEx workflows outlined in the target capability set are either absent or only sketched in mock form. 【F:docs/audit/feature-matrix.md†L7-L16】

## 4. Immediate Risks & Opportunities
1. **Tenancy & security:** Without Firestore schemas or security rules, every capability that depends on multi-tenant isolation must be implemented from scratch.
2. **Backend services:** IO generation, alerts, integrations, and reporting all require Cloud Functions, Cloud Tasks/Scheduler, and Secret Manager plumbing that currently does not exist.
3. **Data model alignment:** Existing Zod schemas cover plan/campaign/tactic basics, but the broader entity set (orgs, workspaces, alerts, dashboards, etc.) is missing and should be modeled before feature work.
4. **Developer workflow:** Lack of CI, linting hooks, emulator orchestration, and seeds for Firebase will slow future phases; establishing these early will de-risk subsequent PRs.

These findings inform the roadmap for Phases 1–5, where each module will need dedicated implementation and hardening to satisfy the production-level acceptance criteria.
