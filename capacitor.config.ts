import type { CapacitorConfig } from '@capacitor/cli';

const url = process.env.LIFE_OS_URL || 'https://progress.fahadshahbaz.fun';

const config: CapacitorConfig = {
  appId: 'app.lifeos.mobile',
  appName: 'Life OS',
  webDir: 'native/www',
  server: {
    url,
    cleartext: url.startsWith('http://'),
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
