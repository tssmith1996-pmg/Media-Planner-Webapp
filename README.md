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

Media plans are stored as documents with the following structure:

```
{
  client: string,
  name: string,
  totalBudget: number,
  goalKpi: string,
  campaignType: string,
  overallGoal: string,
  startDate: string,
  endDate: string,
  channels: [
    {
      name: string,
      publisher: string,
      adFormat: string,
      size: string,
      startDate: string,
      endDate: string,
      budget: number,
      demo: string,
      metric: string,
      value: number,
      mediaCommissionPct: number,
      mediaCommissionAmount: number,
      productionInstallationPct: number,
      productionInstallationAmount: number,
      daypart: string,
      spotLength: number,
      isProgrammatic: boolean,
      targetingDetails: string,
      impressionsPlanned: number,
      clicksPlanned: number,
      cpmPlanned: number,
      cpePlanned: number,
      cpcPlanned: number
    }
  ]
}
```

Additional channel details are hidden by default in the plan form and can be
revealed by expanding the respective line item.

## UI Mockups

The simplified SVG diagrams below illustrate the main screens so you can quickly
understand the layout without running the app.

### Authentication Screen

<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="authTitle authDesc">
  <title id="authTitle">Authentication screen mockup</title>
  <desc id="authDesc">Two column layout showing branding card and sign-in form</desc>
  <rect width="640" height="360" rx="16" fill="#f1f5f9"/>
  <rect x="24" y="24" width="280" height="312" rx="12" fill="#2563eb" opacity="0.16"/>
  <text x="48" y="80" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#1e293b">Media Planner</text>
  <text x="48" y="120" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#1e293b">Plan smarter media buys with a unified dashboard.</text>
  <rect x="332" y="64" width="276" height="224" rx="12" fill="#ffffff" stroke="#cbd5f5"/>
  <rect x="356" y="104" width="228" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="356" y="152" width="228" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="356" y="200" width="228" height="40" rx="8" fill="#2563eb"/>
  <text x="368" y="224" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#ffffff">Continue as Guest</text>
  <text x="356" y="92" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">Email</text>
  <text x="356" y="140" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">Password</text>
</svg>

### Dashboard Overview

<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dashTitle dashDesc">
  <title id="dashTitle">Dashboard layout mockup</title>
  <desc id="dashDesc">Sidebar navigation with header cards and channel table</desc>
  <rect width="640" height="360" rx="16" fill="#f8fafc"/>
  <rect x="16" y="16" width="120" height="328" rx="12" fill="#1e293b"/>
  <rect x="40" y="64" width="72" height="20" rx="4" fill="#38bdf8"/>
  <rect x="40" y="104" width="72" height="20" rx="4" fill="#334155"/>
  <rect x="40" y="144" width="72" height="20" rx="4" fill="#334155" opacity="0.6"/>
  <text x="40" y="48" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#e2e8f0">Menu</text>
  <rect x="152" y="32" width="472" height="72" rx="12" fill="#ffffff" stroke="#cbd5f5"/>
  <rect x="168" y="48" width="136" height="40" rx="10" fill="#2563eb" opacity="0.18"/>
  <rect x="320" y="48" width="136" height="40" rx="10" fill="#2563eb" opacity="0.12"/>
  <rect x="472" y="48" width="136" height="40" rx="10" fill="#2563eb" opacity="0.12"/>
  <rect x="152" y="128" width="472" height="192" rx="12" fill="#ffffff" stroke="#cbd5f5"/>
  <rect x="168" y="152" width="440" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="168" y="200" width="440" height="24" rx="4" fill="#f1f5f9"/>
  <rect x="168" y="232" width="440" height="24" rx="4" fill="#f1f5f9"/>
  <rect x="168" y="264" width="440" height="24" rx="4" fill="#f1f5f9"/>
  <text x="168" y="144" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#475569">Active plans and performance summary</text>
</svg>

### Plan Builder Form

<svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="formTitle formDesc">
  <title id="formTitle">Plan creation form mockup</title>
  <desc id="formDesc">Scrollable form fields with expandable channel details</desc>
  <rect width="640" height="360" rx="16" fill="#f8fafc"/>
  <rect x="16" y="16" width="120" height="328" rx="12" fill="#0f172a"/>
  <rect x="152" y="32" width="472" height="312" rx="12" fill="#ffffff" stroke="#cbd5f5"/>
  <rect x="176" y="64" width="204" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="392" y="64" width="204" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="176" y="112" width="420" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="176" y="160" width="420" height="32" rx="6" fill="#e2e8f0"/>
  <rect x="176" y="208" width="420" height="80" rx="8" fill="#f1f5f9"/>
  <rect x="188" y="220" width="396" height="20" rx="4" fill="#cbd5f5"/>
  <rect x="188" y="248" width="396" height="20" rx="4" fill="#e2e8f0"/>
  <rect x="176" y="304" width="164" height="24" rx="6" fill="#2563eb"/>
  <text x="184" y="320" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#ffffff">Save Plan</text>
  <text x="176" y="52" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">Client &amp; campaign details</text>
  <text x="176" y="196" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">Channel line items</text>
</svg>
