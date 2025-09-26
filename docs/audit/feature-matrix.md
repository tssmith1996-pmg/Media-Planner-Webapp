# Phase 0 Feature Matrix

Status legend: **Present** = implemented end-to-end and production-ready, **Partial** = exists but requires significant hardening or missing major scope, **Missing** = no meaningful implementation detected.

| Capability | Status | Notes & Evidence |
| --- | --- | --- |
| Organizations, workspaces, users, RBAC & sharing | Partial | Firestore schemas, tenant bootstrap, and scoped repositories now provide org/workspace-aware persistence, but the UI still uses a demo persona and lacks sharing flows. 【F:src/lib/db/index.ts†L1-L259】【F:src/store/firebaseAdapter.ts†L1-L266】 |
| Media plan builder (grid + calendar, scenarios, approvals) | Partial | Plan editor exists with channel grid, budget adjustments, approvals, and exports but lacks calendar/scenario tooling, collaboration, or persistence. 【F:src/pages/MediaPlanningPage.tsx†L1-L130】【F:src/components/ChannelTable.tsx†L1-L42】【F:src/components/PlanTitleBar.tsx†L1-L107】 |
| Insertion Order (IO) generation from approved plans | Missing | Only client-side block plan export dialog is available; no IO templates, versioning, or function-backed PDF generation. 【F:src/components/ExportDialog.tsx†L1-L74】 |
| Budgeting & pacing with alerts/thresholds | Partial | Budget allocator and static pacing warnings exist, but there are no thresholds, alerting workflows, or live pacing integrations. 【F:src/components/BudgetAllocator.tsx†L1-L51】【F:src/components/PacingWarnings.tsx†L1-L24】 |
| Performance data & reporting (dashboards, exports) | Missing | Dashboard view lists plans without performance metrics, dashboards, or reporting exports. 【F:src/pages/DashboardPage.tsx†L1-L48】 |
| Integrations hub (connectors + sync runs, retries) | Missing | No connectors, sync job tracking, or Secret Manager references are implemented. |
| Data pipeline & warehousing-lite | Partial | Plans persist to Firestore via typed repositories and converters, establishing the foundation for downstream exports; BigQuery syncs remain TODO. 【F:src/lib/db/converters.ts†L1-L47】【F:src/store/firebaseAdapter.ts†L1-L266】 |
| Notifications & tasks | Missing | No notification system, inbox, or task management components are present. |
| Compliance, audit logs, and reliability | Partial | Plans keep a lightweight audit trail rendered in the review drawer, but there are no platform audit logs, security rules, or reliability tooling. 【F:src/components/AuditDrawer.tsx†L1-L75】【F:src/store/localAdapter.ts†L56-L143】 |
| Ops/DevEx (testing, CI/CD, linting, type safety) | Partial | TypeScript, lint config, and a few Jest/Vitest tests exist, but there is no CI/CD automation, emulator coverage, or strict Firebase typings. 【F:package.json†L1-L87】【F:src/tests/PlanCard.test.tsx†L1-L82】 |
