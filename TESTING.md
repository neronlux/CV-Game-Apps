# Manual Testing Checklist

Use this checklist before every release or major update.

## 1. First Launch (Cold Start)

- [ ] App icon looks correct on launcher
- [ ] Splash screen appears with dark background
- [ ] Game loads within ~3 seconds on mid-range device
- [ ] Title screen shows "Nathan's Career Game" with correct branding

## 2. Basic Gameplay (All Devices)

- [ ] Touch & hold makes the player fly up smoothly
- [ ] Releasing makes the player fall with natural gravity
- [ ] Double-tap (or X key) fires projectiles during boss fights
- [ ] No stuttering or major frame drops on mid-range Android devices
- [ ] Particle effects and screen shake feel responsive

## 3. Progression & Systems

- [ ] First boss appears around distance 3800
- [ ] Level transition triggers correctly at distance 4500
- [ ] All 7 levels are reachable
- [ ] Victory screen appears after surviving the final segment on level 7
- [ ] High score and max combo are saved after death
- [ ] Achievements unlock correctly

## 4. Audio

- [ ] Background music plays on start (if not muted)
- [ ] Hit, collect, explosion, and boss sounds play correctly
- [ ] Mute toggle works immediately
- [ ] Volume slider affects all sounds proportionally
- [ ] Game is fully playable with sound off

## 5. Native Android Features

- [ ] Device is locked to landscape (no portrait flash on launch)
- [ ] Status bar is hidden during gameplay (immersive mode)
- [ ] Android back button pauses the game instead of exiting
- [ ] Haptic feedback is felt on hits, collects, and boss defeats (if device supports it)
- [ ] "Share" button on end screen opens native share sheet
- [ ] Game resumes correctly after being backgrounded / returning from recent apps

## 6. Offline & Resilience

- [ ] Game runs completely offline (airplane mode)
- [ ] No network requests are made after initial launch
- [ ] Game continues correctly after screen rotation is blocked
- [ ] Game handles being killed by the system and relaunched

## 7. Edge Cases & Polish

- [ ] Very small screens (< 375px) show usable UI
- [ ] Large tablets show appropriately scaled UI
- [ ] No overlapping UI elements on any tested resolution
- [ ] No console errors or red screens in browser dev tools (web build)
- [ ] No crashes in Android logcat during normal play

## 8. Release Readiness (Before Play Store Upload)

- [ ] Signed AAB builds successfully (`./gradlew bundleRelease`)
- [ ] Version code incremented
- [ ] Privacy policy is publicly accessible
- [ ] Data Safety section in Play Console is filled (No data collection)
- [ ] Trademark/logo disclaimer decision has been made and implemented
- [ ] Audio licensing has been verified or tracks replaced

---

**Recommended Test Devices**
- One low-end Android phone (Android 12 or 13)
- One modern flagship phone (Android 14+)
- One 7" or 10" tablet (if available)

**Record any issues** in a simple notes file or GitHub issue before releasing.
