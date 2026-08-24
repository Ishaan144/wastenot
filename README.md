# 🥑 WasteNot

**An AI-powered mobile app that plans your meals around the food you already own — before it goes in the bin.**

### ▶️ [Try the live demo](https://ishaan144.github.io/wastenot/) — runs in your browser, no install

Built by [Ishaan Tatlay](https://www.linkedin.com/in/ishaan-tatlay-6a417a360) · West Island College

---

## The problem

The average Canadian household throws out **140 kg of food every year** — roughly **$1,300** — and **63% of it was still edible**. Nationally that's **2.3 million tonnes** and over **$20 billion** wasted annually.
<sub>Source: National Zero Waste Council</sub>

Most food waste apps tackle the *store* side of the problem (selling surplus stock at a discount). WasteNot tackles the *home* side: the yogurt at the back of your fridge that nobody remembered to eat.

## The idea

Three things existing apps do separately, combined for the first time:

1. **AI meal planning** built around what's expiring soonest
2. **Real barcode scanning** so filling your pantry takes seconds, not typing
3. **Gamification** — streaks, points, and a friend leaderboard, aimed at Gen Z households

## Features

| Feature | How it works |
|---|---|
| 📷 **Barcode scanning** | Uses the phone's real camera, then looks the product up in [Open Food Facts](https://world.openfoodfacts.org/) — a free open database of ~3 million products. Shelf life and category icon are inferred automatically. |
| 📅 **Expiry tracking** | Type the date off the package in any format (`2026-08-15`, `08/15`, `Aug 15`, or just `5` days) and the app computes days remaining, colour-coded from green → amber → red. |
| ✨ **AI Chef** | Sends your pantry to Google's Gemini API and gets back recipes prioritising what expires first, each with a food-waste tip. Every suggestion is validated against the real pantry, so AI-invented ingredients are filtered out. |
| 🔥 **Streaks & points** | Cooking a rescued meal earns points and grows your streak. Five badges unlock from real milestones. |
| 🏆 **Friend league** | A weekly leaderboard — the social hook that keeps people opening the app. |
| 💾 **Offline-first** | Everything is stored on the device. No account, no server, no data collection. If the AI is unreachable the app degrades gracefully to built-in suggestions rather than failing. |

## Tech stack

- **React Native** + **Expo (SDK 57)** — cross-platform iOS/Android from one codebase
- **expo-camera** — live barcode scanning (EAN-13, EAN-8, UPC-A/E, Code128)
- **Google Gemini API** (`gemini-flash-latest`) — recipe generation
- **Open Food Facts API** — free product lookup, no key required
- **AsyncStorage** — on-device persistence
- **Cloudflare Workers** (`/server`) — an optional proxy that keeps the API key server-side for a production release

## Repository layout

```
wastenot-mobile/     The real mobile app
  App.js             ← the entire app, heavily commented
  app.json           App name, icon, permissions
  server/            Optional Cloudflare Worker (keeps the API key off-device)

wastenot/            Early clickable prototype
  index.html         Single-file web version used to validate the concept
```

## Running it yourself

**Mobile app** — needs [Node.js](https://nodejs.org) and the free **Expo Go** app on your phone:

```bash
cd wastenot-mobile
npm install
cp .env.example .env     # then paste your own Gemini key into .env
npx expo start
```

Scan the QR code with your phone's camera. AI Chef needs a free key from [Google AI Studio](https://aistudio.google.com); without one, everything else still works.

**Web prototype** — no setup at all: open `wastenot/index.html` in any browser.

## Project history

This started as an entrepreneurship class project evaluating several app concepts. The household food-waste idea scored highest on market size and demo-ability, so it was built out in two stages: first a clickable web prototype to test the interaction design, then a real React Native app with working camera scanning and live AI.

## Licence

© 2026 Ishaan Tatlay. All rights reserved — see [LICENSE](wastenot-mobile/LICENSE).
Viewable for educational and evaluation purposes; not licensed for reuse or redistribution.

## Contact

📧 Ishaan.tatlay@gmail.com · 💼 [LinkedIn](https://www.linkedin.com/in/ishaan-tatlay-6a417a360)
