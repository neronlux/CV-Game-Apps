# AGENTS.md - Development Guidelines for Nathan's Career Game

This document provides guidelines for working on the Android port of Nathan's Career Game.

## Project Overview

- **Name:** Nathan's Career Game
- **Type:** 2D canvas-based side-scrolling game (Jetpack Joyride style)
- **Platform:** Android-first (Capacitor), web build as fallback
- **Tech:** React 18 + TypeScript + Vite + Tailwind + Zustand + Capacitor
- **No server, no database, fully offline**

## Essential Commands

```bash
# Development
npm run dev

# Quality gates (run before every commit / PR)
npm run check          # TypeScript type checking (strict)
npm run lint           # ESLint
npm run format:check   # Prettier formatting check

# Auto-fix
npm run lint:fix
npm run format

# Production build
npm run build          # Runs tsc --noEmit + vite build

# Capacitor / Android
npm run cap:sync       # Build web + sync to native
npm run cap:open       # Open Android Studio
npm run cap:build      # Build + sync (convenience)
```

**Golden Rule:** Always run `npm run check && npm run lint && npm run format:check` before committing.

## Code Quality Standards

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- No implicit any
- Prefer interfaces for component props
- Use `type` for unions and utility types

### ESLint
- Follows the configuration in `eslint.config.js`
- Warnings for unused vars (with `_` prefix allowed)
- No console.log (warn/error allowed)
- React hooks rules enforced

### Prettier
- Run `npm run format` to auto-format
- Tailwind class sorting enabled via `prettier-plugin-tailwindcss`
- Use `cn()` from `src/lib/utils.ts` for conditional classes

### File Headers (Recommended for new files)
Add a JSDoc header on major files:

```ts
/**
 * @fileoverview Short description of the file
 * @module src/path/to/file
 * @author Nathan Luxford
 */
```

## Project Structure

```
src/
├── components/
│   ├── GameCanvas.tsx      # The entire game engine (core file)
│   └── GameUI.tsx          # Overlay UI (plain HTML + Tailwind)
├── data/
│   └── gameData.ts         # Levels, bosses, achievements
├── hooks/                  # Mobile detection hooks
├── lib/
│   ├── gameLogic.ts        # Difficulty helpers (no three.js)
│   ├── capacitor.ts        # Native bridge wrappers
│   ├── utils.ts            # cn() + legacy localStorage helpers
│   └── stores/             # Zustand stores (useGameState, useAudio)
```

## Native / Capacitor Guidelines

- All native features must be wrapped in `isNative()` checks (see `src/lib/capacitor.ts`)
- Graceful degradation on web is required
- Use `@capacitor/preferences` via the helpers in `capacitor.ts` instead of direct localStorage where possible
- Haptics, share, orientation, back button, etc. live in the bridge file

## Android-Specific Notes

- Landscape is locked both statically (AndroidManifest) and at runtime
- Status bar is hidden for immersive gameplay
- Back button pauses the game; double-press within 2s exits the app
- Screen stays awake during gameplay (`@capacitor-community/keep-awake`)
- App auto-pauses + mutes audio on background/visibility change
- Haptic feedback on all game events and UI buttons
- Package name: `com.career.rocketride`

## Release Process

### Version numbering

Version is tracked in `android/app/build.gradle`:
- `versionCode` — incrementing integer (1, 2, 3...). Must be higher than the previous Play Console upload.
- `versionName` — human-readable string ("1.0", "2.0", "3.0"...).

**Always bump both before building a release AAB.**

### Full release workflow

```bash
# 1. Bump version in android/app/build.gradle (versionCode + versionName)

# 2. Run quality gates
npm run check && npm run lint && npm run format:check

# 3. Commit and push
git add -A && git commit -m "Release vN.N" && git push origin main

# 4. Wait for CI to pass
gh run list --limit 1

# 5. Sync web assets
npm run cap:sync

# 6. Build signed release AAB
./android/gradlew -p android --stop
rm -rf android/app/build
./android/gradlew -p android clean bundleRelease
```

### Upload to Play Console

Three files to upload per release:

| File | Path | Where in Play Console |
|---|---|---|
| **AAB** | `android/app/build/outputs/bundle/release/app-release.aab` | Internal testing → Create release → Upload |
| **Deobfuscation** | `android/app/build/outputs/mapping/release/mapping.txt` | "Upload deobfuscation file" under the release |
| **Native debug symbols** | N/A — no native code, skip this warning | — |

After upload:
1. Add release notes
2. Review release → Save → Roll out to Internal Testing

### Signing details
- See `SIGNING_KEYS.md` for both keystore details and how to switch between them
- Active key: `android/app/upload-keystore.jks` (Warm-Up-Senpai shared key)
- Credentials: stored in `android/keystore.properties` (gitignored)
- Java version: **21** required (Capacitor 8.x targets Java 21)
- `android/gradle.properties` sets `org.gradle.java.home=/usr/lib/jvm/java-21-openjdk-amd64`

### R8 / ProGuard
- `minifyEnabled true` is set in the release build
- Rules in `android/app/proguard-rules.pro` keep Capacitor/WebView classes intact
- The mapping file (`mapping.txt`) must be uploaded to Play Console for crash analysis

### Troubleshooting
- **"invalid source release: 21"** → ensure `gradle.properties` points to Java 21
- **NullPointerException in signReleaseBundle** → check `keystore.properties` path in `build.gradle` resolves correctly
- **Wrong package name** → update `capacitor.config.ts` appId, `build.gradle` namespace + applicationId, `strings.xml`, and Java package directory
- **CI fails with ERESOLVE** → `npm ci` is strict; use `--legacy-peer-deps` locally but ensure `package.json` has compatible versions

## Git & Commits

- Run full quality gate before pushing
- Commit messages should be clear (e.g. "Add haptic feedback on boss defeat")
- Never commit `android/app/build/`, `node_modules/`, or local signing keys

## Testing

There is currently no automated test suite. Manual testing checklist lives in the main plan and `BRANDING.md`.

When adding new features, at minimum:
- Verify it works on Android emulator (landscape)
- Verify it still works in browser (graceful degradation)
- Run `npm run build` successfully

## Important Files

- `capacitor.config.ts` — Capacitor + plugin configuration
- `BRANDING.md` — How to generate proper app icons and splash screens
- `CREDITS.md` — Audio and content licensing notes (critical before Play Store)
- `AGENTS.md` (this file)

## Before Submitting a PR

- [ ] `npm run check` passes
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run build` succeeds
- [ ] Tested on Android emulator (at least cold launch + one full playthrough)
- [ ] No new console errors in browser or logcat

---
Maintained as part of the CV-Game-Apps Android port project.
