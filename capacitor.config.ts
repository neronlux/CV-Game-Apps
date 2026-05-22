import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nathanluxford.careergame',
  appName: "Nathan's Career Game",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Do NOT set a remote url here — we want fully bundled offline app
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#1f2937',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1f2937',
      overlaysWebView: true,
    },
    ScreenOrientation: {
      // We will lock to landscape at runtime, but we also set it statically in AndroidManifest later
    },
  },
};

export default config;
