import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.notechord.app',
  appName: 'NoteChord',
  webDir: 'www',
  server: {
    url: 'http://192.168.18.229:4200', // <-- Tu Mac en la red Wi-Fi
    cleartext: true
  }
};
export default config;
