# Postman - NoteChord API

Este directorio contiene la colección y el entorno de Postman configurados para interactuar con los servicios backend de la aplicación **NoteChord** (Firebase Authentication y Cloud Firestore REST API).

---

## 📁 Archivos incluidos

- **`NoteChord.postman_collection.json`**: Colección v2.1.0 organizada en módulos:
  - **1. Authentication**: Registro, Login, Refresco de Token, Perfil de Usuario y Recuperación de Contraseña.
  - **2. Folders (Carpetas)**: Listar carpetas del usuario (`:runQuery`), obtener por ID, crear carpeta, actualizar carpeta y eliminar carpeta.
  - **3. Notes (Notas y Cifrados)**: Listar todas las notas del usuario, filtrar notas por carpeta, obtener por ID, crear nota con acordes/letras, actualizar nota y eliminar nota.
- **`NoteChord.postman_environment.json`**: Entorno con las variables preconfiguradas del proyecto (`FIREBASE_API_KEY`, `PROJECT_ID`, endpoints base, tokens y variables dinámicas).

---

## 🚀 Cómo importar en Postman

1. Abre **Postman**.
2. Haz clic en **Import** (esquina superior izquierda).
3. Arrastra o selecciona los dos archivos:
   - `postman/NoteChord.postman_collection.json`
   - `postman/NoteChord.postman_environment.json`
4. En el selector de entornos (arriba a la derecha), selecciona **NoteChord - Environment (Dev)**.

---

## 🔑 Variables de Entorno

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `FIREBASE_API_KEY` | Llave de API de Firebase | Configurada desde `environment.ts` |
| `PROJECT_ID` | ID del proyecto de Firebase | `notejam-df4e4` |
| `FIRESTORE_BASE_URL` | URL base de Firestore REST API | `https://firestore.googleapis.com/...` |
| `FIREBASE_AUTH_URL` | URL base de Identity Toolkit | `https://identitytoolkit.googleapis.com/v1` |
| `FIREBASE_TOKEN_URL` | URL base del Secure Token Service | `https://securetoken.googleapis.com/v1` |
| `user_email` | Correo de prueba para auth | `test@notechord.com` |
| `user_password` | Contraseña de prueba | `Password123*` |
| `idToken` | Token JWT de sesión activa | Se autocompleta en Login/Register |
| `refreshToken` | Token para renovar sesión | Se autocompleta en Login/Register |
| `userId` | UID del usuario autenticado | Se autocompleta en Login/Register |
| `folderId` | ID de la carpeta actual | Se autocompleta al crear una carpeta |
| `noteId` | ID de la nota actual | Se autocompleta al crear una nota |

---

## ⚡ Flujo de Trabajo Recomendado

1. **Autenticación**:
   - Ejecuta `1. Authentication > Register (Sign Up)` o `Login (Sign In)`.
   - El script de prueba guardará automáticamente el `idToken` y `userId` en las variables de entorno.
2. **Carpetas**:
   - Ejecuta `2. Folders > Create Folder`.
   - El script capturará automáticamente el `folderId` recién creado.
   - Ejecuta `Get Folders by User` para verificar la consulta estructurada.
3. **Notas y Cifrados**:
   - Con el `folderId` establecido, ejecuta `3. Notes > Create Note`.
   - Se guardará automáticamente el `noteId`.
   - Ejecuta `Get Notes by Folder` o `Get Note by ID`.
   - Modifica acordes con `Update Note` y prueba `Delete Note`.

