# SILO — App Store Publish Checklist

Complete these steps in order on your Mac. Estimated total time: 3–5 hours (not counting Apple's review wait).

---

## BEFORE YOU TOUCH YOUR MAC — Online Setup (1 hour)

### 1. Apple Developer Account
- Go to https://developer.apple.com/account
- Enroll in the Apple Developer Program ($99/yr)
- Approval takes up to 48 hours if you're new
- ⚠️ Do this first — everything else blocks on it

### 2. RevenueCat Account
- Sign up free at https://app.revenuecat.com
- Create a new project → name it "SILO"
- Add iOS App → note your **iOS API key** (starts with `appl_`)
- Add Android App → note your **Android API key** (starts with `goog_`)
- Create an Entitlement with identifier: `vip`
- Create an Offering and attach a Package to it (you'll link the actual product later)

### 3. App Store Connect Setup
- Go to https://appstoreconnect.apple.com
- My Apps → + → New App
  - Platform: iOS
  - Name: SILO
  - Bundle ID: Register a new one, e.g. `com.YOURNAME.silo`
  - SKU: `silo-ios-v1`
- Under **In-App Purchases** → + → Non-Consumable → name it "SILO VIP"
  - Product ID: `com.YOURNAME.silo.vip`
  - Link this product in RevenueCat dashboard

---

## ON YOUR MAC — Code Config (10 min)

Open the project and make these 3 edits:

### Edit `capacitor.config.ts`
```diff
- appId: 'com.yourname.silo',
+ appId: 'com.YOURNAME.silo',   // must match App Store Connect exactly
```

### Edit `src/useVIP.js`
```diff
- export var REVENUECAT_IOS_KEY     = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
- export var REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
+ export var REVENUECAT_IOS_KEY     = 'appl_YOUR_ACTUAL_KEY_HERE';
+ export var REVENUECAT_ANDROID_KEY = 'goog_YOUR_ACTUAL_KEY_HERE';
```

### Edit `public/privacy-policy.html`
Replace both instances of `your@email.com` with your real contact email.

---

## ON YOUR MAC — Terminal Setup (30 min)

Run these commands from the project folder:

```bash
# 1. Install dependencies
npm install

# 2. Install Xcode from Mac App Store if you haven't
#    (free, ~10GB, takes a while to download)

# 3. Install CocoaPods
sudo gem install cocoapods

# 4. Generate all icon and splash screen sizes from the SVGs
npx @capacitor/assets generate

# 5. Create the iOS native project
npx cap add ios

# 6. Install iOS dependencies
cd ios/App && pod install && cd ../..

# 7. Build the web app and sync to native
npm run mobile:build

# 8. Open in Xcode
npx cap open ios
```

---

## IN XCODE (45 min)

1. **Set your Team**: Signing & Capabilities → Team → your Apple Developer account
2. **Bundle Identifier**: Verify it matches `com.YOURNAME.silo`
3. **Version**: Set to `1.0` / Build `1`
4. **Deployment Target**: Set to iOS 15.0 or higher
5. **Capabilities**: Add `In-App Purchase` capability
6. **Run on Simulator**: Press ▶ and verify the app loads and looks correct
7. **Screenshots**: Take screenshots in these simulators for the App Store:
   - iPhone 16 Pro Max (6.9" — required)
   - iPhone 16 (6.1" — required)
   - iPad Pro 13" (optional but recommended)
8. **Archive for submission**:
   - Select `Any iOS Device (arm64)` as the target (not a simulator)
   - Product → Archive
   - Distribute App → App Store Connect → Upload

---

## APP STORE CONNECT — Store Listing (45 min)

Copy from `docs/app-store-listing.md`:

- [ ] App description (use the iOS Description block)
- [ ] Subtitle: `Signal Clarity · Self Growth`
- [ ] Keywords (100 chars)
- [ ] Support URL (can be a simple landing page or GitHub page)
- [ ] Privacy Policy URL — host `public/privacy-policy.html` somewhere and paste the URL
  - Simplest option: push to GitHub and use GitHub Pages
- [ ] Screenshots — upload what you captured in Xcode
- [ ] App icon — Xcode uploads this automatically from the asset catalog
- [ ] Age Rating — fill out questionnaire (answer No to everything, result: 4+)
- [ ] In-App Purchases — add your VIP product and submit for review alongside the app

---

## SUBMIT

1. In App Store Connect: Add Build (select the one you uploaded from Xcode)
2. Set pricing: Free (VIP is the IAP)
3. Click **Submit for Review**
4. Apple reviews in 24–72 hours (usually ~24h)

---

## AFTER APPROVAL

- [ ] Test VIP purchase on a real device using a Sandbox test account
- [ ] Set up Android: `npx cap add android` → open Android Studio → publish to Google Play
- [ ] Add your privacy policy URL to the RevenueCat dashboard
- [ ] Update RevenueCat product IDs to match your actual App Store product ID

---

## Things You Do NOT Need to Do

- ✓ Backend server — not needed, all data is local
- ✓ User accounts — not needed
- ✓ Push notifications — not set up, not required for v1
- ✓ Analytics SDK — intentionally omitted (privacy-first)
