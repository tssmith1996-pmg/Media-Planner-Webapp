# Media Planner Webapp


A minimalist React and Tailwind CSS application providing a sidebar navigation layout.
Use the menu to switch between Dashboard, Create New Plan, and Plans sections.


## Development

```bash
npm install
npm run dev
```


## Local testing with Firebase emulators

Before deploying to Firebase Hosting you can test the app locally.

1. Install dependencies and the Firebase CLI:

   ```bash
   npm install
   npm install -g firebase-tools
   ```

2. Start the Firestore and Auth emulators (uses `firebase.json` for ports):

   ```bash
   firebase emulators:start
   ```

3. In another terminal start the Vite dev server:

   ```bash
   npm run dev
   ```


4. Open <http://localhost:5173> to use the app. If you don't define any globals,
   clicking **Continue as Guest** will automatically configure the app to use the
   local emulators with a default project ID of `demo-app`.

   To customize these settings manually, define the globals below in `index.html`
   before loading `src/main.jsx`:


   ```html
   <script>
     window.__use_emulator = true;
    window.__firebase_config = {
      projectId: 'your-project-id',
      apiKey: 'fake-api-key',
      authDomain: 'your-project-id.firebaseapp.com',
    };
    window.__app_id = 'your-project-id';

   </script>
   ```

   Replace the placeholders with any identifier you'd like. When `__use_emulator` is
   true the app connects to the local emulators instead of production services.

## Authentication

When the app loads you are presented with a login page. You can create an account,
sign in with an existing email and password, or choose **Continue as Guest** to
sign in anonymously for quick testing. The guest option now bootstraps a default

Firebase emulator configuration with placeholder `apiKey` and `authDomain`
values automatically, so you can try the app without editing `index.html` first.


## Production build

```bash
npm run build
```

## Data Model

Plans now use a normalized, channel-extensible data model. Every plan contains:

- **Campaigns** (`campaign_id`, brand, market, objective, primary KPI, fiscal period)
- **Flights** (linked to campaigns with start/end dates, budget, buy type, currency, FX rate)
- **Audiences** (definition, age range, gender, geo, and segment identifiers)
- **Vendors** (name, rich contact details, IO references)
- **Creatives** (metadata, asset URIs, formats, and clearance details)
- **Line Items** (the unit of purchase) with pricing, pacing, cap rules, brand safety, and
  links to flights/audiences/vendors/creatives.
- **Channel extensions** – one-to-one records that capture channel specific fields for all
  supported tactics (OOH, TV, BVOD/CTV, Digital Display & Video, Social, Search, Radio,
  Streaming Audio, Podcast, Cinema, Print, Retail Media, Influencer, Sponsorship,
  Email/Direct Mail, Gaming/Native, Affiliate, Experiential).
- **Tracking** (ad server metadata, verification vendors, conversion sources, KPI targets)
- **Delivery Actuals** (daily performance metrics and actual spend).

Only columns common to every channel appear in the media planning grid by default.
Channel-specific extension data is accessible via the “View details” toggle on each
line item, keeping the table focused while still exposing full fidelity data on demand.

## UI Mockups

The simplified SVG diagrams below illustrate the main screens so you can quickly

understand the layout without running the app. Click any image to open the raw
SVG file.

### Authentication Screen

[![Authentication screen mockup](docs/ui-mockups/authentication.svg)](docs/ui-mockups/authentication.svg)

### Dashboard Overview

[![Dashboard layout mockup](docs/ui-mockups/dashboard.svg)](docs/ui-mockups/dashboard.svg)

### Plan Builder Form

[![Plan builder form mockup](docs/ui-mockups/plan-builder.svg)](docs/ui-mockups/plan-builder.svg)

## UI QA Checklist

Use the checklist below to verify the refreshed layouts after pulling the latest
changes:

- Confirm the layout scales cleanly at 320px, 768px, 1024px, and 1280px without
  horizontal scrolling.
- Ensure the primary actions remain prominent and visible within the initial
  viewport.
- Check that heading levels progress sequentially and body copy stays within a
  comfortable 65–75 character line length.
- Tab through interactive elements to verify consistent focus rings and
  accessible form spacing.
- Review form sections for aligned labels and supporting text, and confirm there
  are no regressions in functionality.
