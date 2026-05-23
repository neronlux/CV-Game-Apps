# Signing Keys

This project uses two signing keys, both backed up in this repo.

## Key 1 — Warm-Up-Senpai (shared, currently active)

| Field | Value |
|---|---|
| File | `android/app/upload-keystore.jks` |
| Alias | `upload` |
| Password | `warmupsenpai2026` |
| SHA-256 | `D6:88:C9:8C:BD:88:AC:6D:73:F9:31:D0:EC:EB:7E:D1:40:7F:86:2C:EF:67:28:35:ED:6E:4A:C4:1C:CB:0D:4E` |
| SHA1 | `01:8E:B1:88:D2:88:CC:F3:11:B2:34:22:93:C8:45:3F:8C:2B:ED:DC` |
| Source | Shared with Warm-Up-Senpai app |
| Registered on Play Console | Yes (both apps) |

## Key 2 — Career Game (original)

| Field | Value |
|---|---|
| File | `android/app/careergame-backup.keystore` |
| Alias | `career-game` |
| Password | `career-game-store` |
| SHA-256 | `CA:B5:7D:43:3B:9C:2F:E3:4D:77:EA:6C:81:33:23:38:11:B5:E2:7A:19:E1:46:A0:B0:D6:4B:06:D1:B4:53:F4` |
| SHA1 | `E5:93:83:43:4A:4D:99:C5:3E:64:79:87:F4:7C:78:4B:11:F2:16:76` |
| Source | Original key from game-mobile project |
| Registered on Play Console | Yes |

## Switching keys

Edit `android/keystore.properties` to match the desired key:

**For Key 1 (Warm-Up-Senpai):**
```
storeFile=upload-keystore.jks
storePassword=warmupsenpai2026
keyAlias=upload
keyPassword=warmupsenpai2026
```

**For Key 2 (Career Game):**
```
storeFile=careergame-backup.keystore
storePassword=career-game-store
keyAlias=career-game
keyPassword=career-game-store
```

Then rebuild:
```bash
./android/gradlew -p android --stop
rm -rf android/app/build
./android/gradlew -p android clean bundleRelease
```
