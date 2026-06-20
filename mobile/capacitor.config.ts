import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.metrix.app",
  appName: "Metrix",
  webDir: "www",
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1120",
  },
  plugins: {
    Browser: {
      preferredContentMode: "external",
    },
  },
};

export default config;
