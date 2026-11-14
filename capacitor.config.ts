import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Configuración dinámica de Capacitor:
 * - Modo Normal (por defecto): Carga los archivos locales de `www`. La app NUNCA da pantalla negra.
 * - Modo Live Reload: Se activa únicamente al definir CAP_LIVE_RELOAD=true.
 */
const isLiveReload = process.env['CAP_LIVE_RELOAD'] === 'true';
const liveUrl = process.env['CAP_SERVER_URL'] || 'http://192.168.18.105:4200';

const config: CapacitorConfig = {
  appId: 'com.notechord.app',
  appName: 'NoteChord',
  webDir: 'www',
  server: isLiveReload
    ? {
        url: liveUrl,
        cleartext: true
      }
    : {
        cleartext: true
      }
};

export default config;
