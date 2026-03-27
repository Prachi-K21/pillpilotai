import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.pillpilotai',
  appName: 'PillPilot AI',
  webDir: 'dist',
  server: {
    url: "https://72d487d0-b59e-43e6-a3c6-c6dfea6e9208.lovableproject.com?forceHideBadge=true",
    cleartext: true
  }
};

export default config;
