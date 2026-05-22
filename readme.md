# Nathan's Career Game

A 2D side-scrolling "Jetpack Joyride"-style career adventure game for Android.

Play through 7 real companies from Nathan Luxford's 15+ year journey in enterprise tech — from first support job to leading developer experience at Tesco scale.

## Features (Current)

- Pure HTML5 Canvas 2D engine (no game framework)
- Touch + keyboard + mouse controls
- 7 career levels with unique bosses
- Combo system, power-ups, status effects
- Fully offline (all assets bundled)
- Mobile-optimized (DPR-aware, safe areas, touch handling)
- Audio with mute + volume controls

## Tech Stack

- React 18 + TypeScript + Vite
- Zustand for state
- Tailwind CSS
- Capacitor (Android) — coming in next phase

## Project Goals

- Low-cost native port of the original web game
- Android first (iOS later)
- No server / no accounts for v1
- Local persistence + native mobile game features (haptics, share, orientation lock, etc.)

## Running Locally

```bash
npm install
npm run dev
```

## Build for Android (future)

```bash
npm run build
npx cap sync android
npx cap open android
```

## Audio Licensing

See `CREDITS.md` — background music and explosion SFX currently bundled from original CDN. These **must** have commercial redistribution rights confirmed (or be replaced) before Play Store submission.

## Links

- Play the original web version: https://nathanluxford.com
- Personal site: https://luxford.link

## License

Code: MIT (unless otherwise noted in files)
Game content & branding: © Nathan Luxford

---
Built during the CV-Game-Apps port (May 2026)
