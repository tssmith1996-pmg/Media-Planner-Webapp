# Security & Tenancy Overview

This project now enforces organization and workspace scoping for all Firestore
resources. Role-based access is driven by Firebase Auth custom claims exposed as
`orgRoles` and `workspaceRoles`. The default tenant bootstrap performed by the
app creates a demo organization (`ENV.defaultOrgId`) and workspace
(`ENV.defaultWorkspaceId`) so local development can run against the Firestore
emulator or a sandbox project.

## Firestore Rules

The `firestore.rules` file introduces helper functions to validate org and
workspace membership before allowing access to sensitive collections. The rules
cover the core collections defined in the data model: plans, plan versions,
tactics, insertion orders, dashboards, alerts, tasks, reports, and audit logs.
Write privileges are reserved for planners and admins, while read access is
extended to analysts and partners for view-only scenarios.

Key highlights:

- **Organization guardrails** – writes to `/orgs/{orgId}` require the `admin`
  org role; reads permit any role granted at the org scope.
- **Workspace row-level checks** – each document must include `workspaceId`
  (or derive the workspace) so the rule layer can verify membership before
  granting access.
- **Immutable audit log** – the `/auditLogs` collection is readable only by org
  admins and cannot be mutated directly by clients; writes occur exclusively in
  server-side logic through the typed data access layer.

## Tenant Bootstrap

The Firebase adapter ensures default org/workspace documents exist before any
queries run. This happens via `bootstrapTenant()` inside
`src/store/firebaseAdapter.ts` and ensures the Firestore security rules have the
necessary hierarchy to evaluate role memberships.

## Future Work

- Replace the demo bootstrap with an invite-based onboarding flow that assigns
  roles and propagates custom claims when org membership changes.
- Add emulator-based security rule tests (using `@firebase/rules-unit-testing`)
  to automatically verify that unauthorized users cannot access cross-tenant
data.
- Wire App Check enforcement into CI/CD so deployed clients refuse to operate
  without a valid token.
