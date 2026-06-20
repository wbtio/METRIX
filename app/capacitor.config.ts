import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.metrix.app",
  appName: "Metrix",
  webDir: "www",
  server: {
    url: "https://metrix-beryl-zeta.vercel.app/",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0b1120",
  },
};

export default config;
