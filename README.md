

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: [https://ai.studio/apps/a849c043-54be-4cf3-94ff-99e5cc813360](https://ai.studio/apps/a849c043-54be-4cf3-94ff-99e5cc813360)

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
  `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
  `npm run dev`

## Install on Mobile Home Screen (PWA)

- Open the deployed app URL in Chrome (Android) or Safari (iPhone).
- In browser menu, choose `Add to Home Screen`.
- The app opens in standalone mode without browser UI.

## Deploy and share one link (Render)

This project uses Express + Socket.IO + SQLite, so deploy it as a Node web service.

1. Push this project to GitHub.
2. Go to [Render](https://render.com) -> `New` -> `Web Service`.
3. Select your GitHub repo.
4. Use these settings:
  - Runtime: `Node`
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
5. Deploy. Render gives you one HTTPS URL (example: `https://communication-radiologie.onrender.com`).
6. Send this single URL to your client.

### Client install flow

- Android (Chrome): open link -> menu -> `Add to Home screen`
- iPhone (Safari): open link -> share -> `Add to Home Screen`

## Build APK (Android)

If you want a real APK file, wrap this Vite app with Capacitor:

1. `npm install @capacitor/core @capacitor/cli @capacitor/android`
2. `npx cap init "Communication Radiologie" "com.radiologie.app" --web-dir=dist`
3. `npm run build`
4. `npx cap add android`
5. `npx cap copy android`
6. `npx cap open android` (then build APK from Android Studio)

