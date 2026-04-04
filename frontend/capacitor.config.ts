import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campuschat.app',
  appName: 'KTU Campus Chat',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
