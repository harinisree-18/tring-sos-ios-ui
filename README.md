# TringSOS - React Native Cross-Platform App

## Project Overview
This is a cross-platform React Native application migrated from an Android-only project. The app provides safety and emergency features with real-time location tracking, SOS alerts, and communication capabilities.

## ✅ VERIFIED WORKING BUILD

### Prerequisites
- Node.js >= 18
- React Native CLI
- Xcode 16 (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **iOS Setup**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Run the App**

   **iOS (VERIFIED WORKING):**
   ```bash
   npx @react-native-community/cli run-ios --simulator="iPhone 16"
   ```

   **Android (VERIFIED WORKING):**
   ```bash
   npx @react-native-community/cli run-android
   ```

## 🔧 Build Configuration

### Key Fixes Applied:
- ✅ Disabled Flipper to avoid Xcode 16 conflicts
- ✅ Fixed TypeScript configuration for mixed JS/TS project
- ✅ Resolved gRPC module conflicts
- ✅ Regenerated missing RCTThirdPartyFabricComponentsProvider.mm
- ✅ Updated Babel preset to @react-native/babel-preset
- ✅ Installed @tsconfig/react-native for proper TypeScript support

### Dependencies:
- React Native: 0.73.6
- TypeScript support enabled
- All original dependencies migrated with compatible versions
- Firebase packages aligned to version 22.2.1
- Cross-platform compatibility verified

## 📱 Features
- Real-time location tracking
- SOS emergency alerts
- Live chat functionality
- Fall detection
- Safety zone monitoring
- Multi-language support
- Admin dashboard
- User management

## 🚀 Quick Start Commands

```bash
# Start Metro bundler
npx react-native start

# Run iOS
npx @react-native-community/cli run-ios --simulator="iPhone 16"

# Run Android
npx @react-native-community/cli run-android

# Clean and rebuild
cd ios && pod deintegrate && pod install && cd ..
npx react-native start --reset-cache
```

## 📁 Project Structure
```
TringSOS/
├── src/
│   ├── Admin/           # Admin components
│   ├── components/      # Main app components
│   ├── services/        # API and service files
│   ├── utils/          # Utility functions
│   ├── hooks/          # Custom React hooks
│   ├── i18n/           # Internationalization
│   └── notifications/  # Push notification handling
├── assets/             # Images and static assets
├── ios/               # iOS native code
└── android/           # Android native code
```

## 🔍 Troubleshooting

### Common Issues:
1. **Metro bundler issues**: Run `npx react-native start --reset-cache`
2. **iOS build failures**: Run `cd ios && pod deintegrate && pod install`
3. **TypeScript errors**: Ensure @tsconfig/react-native is installed
4. **Babel preset errors**: Verify @react-native/babel-preset is installed

### Build Verification:
- ✅ iOS builds successfully on iPhone 16 simulator
- ✅ Android builds successfully
- ✅ All dependencies resolved
- ✅ No module not found errors
- ✅ No version conflicts
- ✅ Vector icons properly configured
- ✅ App icons restored
- ✅ API timeout increased to 30 seconds
- ✅ Missing translation keys added

## 🔥 Firebase Configuration

The app uses Firebase for push notifications and real-time database. Firebase is configured using the `GoogleService-info.plist` file located at `ios/TringSOS/GoogleService-info.plist`.

### Firebase Configuration Details:
- **Project ID**: `womensos-19b13`
- **Database URL**: `https://womensos-19b13-default-rtdb.firebaseio.com`
- **Storage Bucket**: `womensos-19b13.firebasestorage.app`
- **Messaging Sender ID**: `423810195957`

The Firebase configuration is centralized in `src/config/firebase.js` and automatically initializes when the app starts.

### Firebase Features:
- ✅ Push notifications
- ✅ Real-time database
- ✅ Background message handling
- ✅ Emergency sound triggers
- ✅ Cross-platform compatibility

## 📄 Migration Summary
This project was successfully migrated from an Android-only React Native app to a cross-platform solution with:
- All original functionality preserved
- iOS support added
- TypeScript configuration optimized
- Build issues resolved
- Dependencies aligned for compatibility
- Firebase properly configured for both platforms

For detailed migration information, see `MIGRATION_SUMMARY.md`.
