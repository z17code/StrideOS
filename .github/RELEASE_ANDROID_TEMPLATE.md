# GitHub Release notes template (Android)

Use when publishing `android-vX.Y.Z`.

## Title
Android APK vX.Y.Z

## Body

```markdown
## StrideOS Android APK (Capacitor WebView)

This is a **WebView shell**, not a native offline app.

- **Package**: `com.strideos.app`
- **Loads**: https://stride-os-livid.vercel.app
- **Asset**: `strideos-android.apk`

### Install
1. Download `strideos-android.apk` from Assets
2. Allow install from unknown sources if prompted
3. Open the app (requires network to the production site)

### Also available
- In-app: Me → Download Android APK (`/downloads/strideos-android.apk`)

### Notes
- Debug/internal builds may be unsigned for store distribution
- Login, plans, and check-ins still use the live backend (Vercel + Neon)
```

## Commands

```powershell
# create (first time for a tag)
gh release create android-v1.0.0 `
  "public/downloads/strideos-android.apk#strideos-android.apk" `
  --title "Android APK v1.0.0" `
  --notes-file .github/RELEASE_ANDROID_TEMPLATE.md

# or upload into existing release
gh release upload android-v1.0.0 "public/downloads/strideos-android.apk#strideos-android.apk" --clobber
```
