# Media Planning Workflow QA – 2025-03-01

## Environment
- Vite dev server (`npm run dev -- --host 0.0.0.0 --port 4173`)
- Authentication mode: mock (default for local development)

## Test Scenarios

### 1. Authentication Header
- Launch application and confirm automatic mock sign-in displays planner identity in the header.
- ✅ Result: Header shows "Signed in as Taylor Planner" with role selector.

### 2. Create New Plan
- From Dashboard click **New Plan**.
- ✅ Result: Navigated to plan editor for a new draft plan with default metadata (`New Plan` / auto-generated code).

### 3. Edit Plan Metadata
- Update plan name to "QA Automation Plan" and code to "QA-2025-SPRING".
- ✅ Result: Autosave updates persisted and reflected in dashboard summary.

### 4. Submit Plan for Approval
- Click **Submit for Approval** on the editor.
- ✅ Result: Status chip switched to `Submitted`, actions update to show **Revert to Draft**.

### 5. Dashboard Status Refresh
- Return to dashboard and verify the new plan card reflects `Submitted` state.
- ✅ Result: Card shows latest status and metadata.

### 6. Budget Adjustment Regression
- Open seeded "Aurora Sparkling FY25 Launch" plan, adjust first line item's planned cost, confirm table updates, then revert value.
- ✅ Result: Planned cost reflected new value immediately in both allocator and channel table, confirming mutation workflow.

## Noted Limitations
- Newly created plans start with zero campaigns, flights, and line items and there is no UI to add them, blocking true data entry for fresh plans.
- Firebase authentication cannot be exercised locally without providing the required `VITE_FIREBASE_*` variables.

