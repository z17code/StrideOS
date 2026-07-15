import type { CapacitorConfig } from "@capacitor/cli";

/**
 * StrideOS Android shell: loads the production Next.js site in a WebView.
 * Not a native rewrite — auth, API, and UI all stay on the web app.
 */
const config: CapacitorConfig = {
  appId: "com.strideos.app",
  appName: "StrideOS",
  webDir: "capacitor-www",
  server: {
    url: "https://stride-os-livid.vercel.app",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "stride-os-livid.vercel.app",
      "*.vercel.app",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0a0a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0a0a",
    },
  },
};

export default config;
