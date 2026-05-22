# Branding & Assets

## App Identity

- **Name:** Nathan's Career Game
- **Package ID:** com.nathanluxford.careergame
- **Tagline (in-game):** "A 2D jetpack adventure through 15+ years in tech"

## Current Status (Android)

- Adaptive launcher icon: Uses dark slate background (#1f2937) with default Capacitor foreground.
- Splash screen: Uses bundled `splash.png` + dark background via Capacitor SplashScreen plugin.
- In-game titles: Updated with "Nathan's Career Game" + credits linking to luxford.link

## Recommended Next Steps for Production Assets

### 1. Adaptive App Icon (Highly Recommended)

Use Android Studio:

1. Open the `android/` folder in Android Studio
2. Right-click `res` → New → Image Asset
3. Choose "Launcher Icons (Adaptive and Legacy)"
4. Foreground: Upload a 1024×1024 PNG with transparent background (recommended: stylized jetpack character or bold "N" with flame)
5. Background: Solid #1f2937 or subtle gradient
6. Generate

Alternative (free online):
- https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html

### 2. Splash Screen Image

- Recommended size: 2880×2880 (or at least 1920×1920)
- Dark background matching #1f2937
- Centered logo + small "Nathan's Career Game" text
- Replace `android/app/src/main/res/drawable/splash.png`

### 3. Play Store Listing Assets

- **Feature graphic**: 1024×500 px
- **Screenshots**: 
  - Phone: 1080×1920 (portrait) or 1920×1080 (landscape gameplay)
  - 7" tablet
  - 10" tablet
- Short description (80 chars)
- Full description

## Color Palette (Game Theme)

- Dark background: `#1f2937` / `#0f172a`
- Accent gold: `#FACC15`
- Accent green: `#22C55E`
- Accent blue: `#3B82F6`

## Credits

See `CREDITS.md` for audio and content licensing notes.

---
Last updated during Android port (May 2026)
