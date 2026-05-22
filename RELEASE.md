# Release & Play Store Guide

This document explains how to build a signed Android App Bundle (AAB) and prepare Nathan's Career Game for the Google Play Store.

## 1. Prerequisites

- Android Studio installed (recommended)
- A Google Play Console developer account ($25 one-time fee)
- Access to a computer that can run the Android build

## 2. Generate an Upload Keystore (One Time)

You only need to do this once.

### Using Android Studio (Easiest)

1. Open the `android/` folder in Android Studio
2. Go to **Build > Generate Signed Bundle / APK**
3. Choose **Android App Bundle**
4. Click **Create new...**
5. Fill in the keystore details (remember the password!)
6. Save the `.jks` file in a secure location (e.g. `~/keys/nathans-career-game-upload.jks`)
7. Note the key alias and passwords

### Using Command Line

```bash
keytool -genkey -v -keystore ~/keys/nathans-career-game-upload.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

**Important:** Back up this keystore file and passwords. If you lose them, you cannot update the app on the Play Store.

## 3. Configure Signing in the Project

Edit `android/app/build.gradle` and add a `signingConfigs` block:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('YOUR_PATH_TO/nathans-career-game-upload.jks')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'upload'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Security tip:** For CI/CD, use environment variables instead of hardcoding passwords.

## 4. Build the Signed AAB

### Option A: From Android Studio (Recommended for first release)

1. Open `android/` folder in Android Studio
2. **Build > Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Choose the release keystore you created
5. Select **release** build variant
6. Click **Finish**

The signed AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Option B: From Command Line

```bash
cd android
./gradlew bundleRelease
```

## 5. Play Store Submission Checklist

Before uploading the AAB, prepare the following in the Google Play Console:

### App Details
- **App name:** Nathan's Career Game
- **Short description:** (max 80 characters)
- **Full description:** (up to 4000 characters) — see suggested text below

### Store Listing Assets
- **Feature graphic:** 1024 × 500 px
- **Screenshots:** At least 2 phone screenshots (1080×1920 or 1920×1080)
- **High-res icon:** 512 × 512 px (use the generated adaptive icon)

### Content Rating
- Complete the questionnaire (this is a simple single-player game with no violence, gambling, or user-generated content).

### Privacy & Data Safety
- **Data Safety section:** Select "No" for all data collection questions (we don't collect anything)
- **Privacy Policy:** Host the file `privacy-policy.md` on your website or GitHub Pages and provide the public URL

### Pricing & Distribution
- Free
- Not for children (or select "Not primarily for children" if you prefer)

## 6. Suggested Play Store Descriptions

**Short description:**
"Play a 2D jetpack adventure through 15+ years of real tech career experience."

**Full description (example):**
```
Nathan's Career Game is a fast-paced 2D side-scrolling adventure that takes you through the real companies and challenges from Nathan Luxford's 15+ year journey in enterprise technology.

Fly, dodge obstacles, defeat bosses, and build combos as you progress from your first support role all the way to leading developer experience at massive scale.

Features:
• 7 unique career levels with thematic bosses
• Satisfying jetpack physics and combo system
• Fully offline — no internet required
• Haptic feedback and immersive fullscreen gameplay
• Designed for landscape play on phones and tablets

This is a passion project and portfolio piece. All proceeds (if any) go toward supporting independent game development.

Play the journey behind the CV.
```

## 7. Versioning

Current version in `android/app/build.gradle`:
- versionCode: 1
- versionName: "1.0"

Increment `versionCode` by 1 and update `versionName` for every new release.

## 8. First Release Tips

- Start with an **Internal Testing** track in Play Console
- Test thoroughly on real devices (especially Android 13+ and 14)
- Upload the AAB and wait for Google review (usually 1–3 days for first release)
- Once approved, promote to Production when ready

## 9. Future Improvements (Optional)

- Add Google Play Games Services for leaderboards (Phase 2)
- In-app review prompts after good sessions
- Local notifications to re-engage players
- Proper custom splash screen and high-quality icon

---

**You are now ready to produce a release-ready signed AAB.**

For any questions during the submission process, refer to the official Google Play Console help or contact the developer at luxford.link.
