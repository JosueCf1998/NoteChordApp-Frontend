import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notechord.app',
  appName: 'NoteChord',
  webDir: 'www',
  server: {
    cleartext: true
  }
};

export default config;
