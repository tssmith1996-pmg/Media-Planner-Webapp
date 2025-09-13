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

4. Open <http://localhost:5173> to use the app. To make the app talk to the emulators,
   define the following globals in `index.html` before loading `src/main.jsx`:

   ```html
   <script>
     window.__use_emulator = true;
     window.__firebase_config = { projectId: 'demo-app' };
     window.__app_id = 'demo-app';
   </script>
   ```

   Replace `demo-app` with any identifier you'd like. When `__use_emulator` is true the
   app connects to the local emulators instead of production services.


## Production build

```bash
npm run build
```
