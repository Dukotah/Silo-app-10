import type { CapacitorConfig } from '@capacitor/cli';

// Replace YOUR_BUNDLE_ID with your actual bundle ID, e.g. com.yourname.silo
const config: CapacitorConfig = {
  appId: 'com.yourname.silo',
  appName: 'SILO',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0d1117',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
