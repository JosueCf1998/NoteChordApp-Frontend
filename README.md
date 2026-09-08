# NoteChord

Aplicacion multiplataforma sencilla para guardar notas musicales y cifrados.

## Requisitos

- Node.js 20
- npm 10 o compatible
- Ionic CLI 7 o compatible

## Desarrollo

```bash
npm install
npm start
```

La aplicacion estara disponible en `http://localhost:4200`.

## Build

```bash
npm run build
```

## Firebase Authentication

Para probar el login:

1. Crea un proyecto en Firebase.
2. Registra una aplicacion web.
3. Activa el proveedor Email/Password en Authentication.
4. Crea un usuario de prueba.
5. Copia la configuracion web en `src/environments/environment.ts` y `src/environments/environment.prod.ts`.

La aplicacion usa persistencia local para conservar la sesion y protege la ruta `/home` con un guard.

## Capacitor

La configuracion base esta en `capacitor.config.ts`. Las plataformas Android e iOS estan preparadas en `android/` e `ios/`.

```bash
npx cap open android
npx cap open ios
```
