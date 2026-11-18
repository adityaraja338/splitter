# Splitter

A free, no-sign-up trip expense splitter (in the spirit of Kittysplit). Frontend-only React app on
**Firebase Hosting** with **Cloud Firestore** for real-time sync.

## Features

- Create a trip (name, currency, people) → get a short code + share link (`/t/CODE`)
- Open a trip by code or link; recent trips are remembered on your device
- "Who are you?" picker on each device (stored in localStorage, no accounts) — or add yourself
- Add / edit / delete expenses: who paid, who's involved, and split **equally**, by **exact amounts**, or by **shares**
- Live updates for everyone on the trip
- Balances per person, plus suggested minimal "who pays whom" settlements
- Anyone can **Mark paid** on a settlement or record any custom payment
- Add / rename / remove people (removal blocked while they're in expenses), rename trip, change currency
- Mobile-first UI, dark mode, offline cache

Amounts are stored as integer minor units (paise/cents) and split with largest-remainder rounding, so
splits always add up exactly.

## Setup

1. Create a Firebase project at https://console.firebase.google.com
2. **Build → Firestore Database → Create database** (production mode, any region).
3. **Project settings → Your apps → Add app → Web**. Copy the config values.
4. In this repo:
   ```bash
   npm install
   cp .env.example .env      # paste the config values
   # put your project id into .firebaserc ("default": "<project-id>")
   npm run dev
   ```

## Deploy

```bash
npx firebase login
npm run deploy     # builds, deploys hosting + firestore rules
```

Your app will be live at `https://<project-id>.web.app`. The Spark (free) plan is plenty for this.

## Local development without a Firebase project

```bash
npx firebase emulators:start --only firestore --project demo-splitter
echo "VITE_USE_EMULATOR=true" > .env.local
npm run dev
```

## Security model

There's no login, so the trip code *is* the key: 8 characters from a 32-character alphabet
(~10¹² combinations). `firestore.rules` lets anyone **get** a trip by code but never **list** trips,
so codes can't be enumerated, and validates the shape of every write. Anyone with the link can
edit the trip, so share it only with your group.

## Code layout

| Path | What |
| --- | --- |
| `src/logic.js` | Pure money logic: parsing, splits, balances, settlements (unit-tested in `logic.test.js`) |
| `src/api.js` | Firestore reads/writes (`trips/{code}` + `trips/{code}/entries`) |
| `src/components/` | React UI |
| `firestore.rules` | Security rules |
