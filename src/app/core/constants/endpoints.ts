export const ENDPOINTS = {
  AUTH: {
    LOGIN: 'auth/login',
    REGISTER: 'auth/register',
    LOGOUT: 'auth/logout',
    FORGOT_PASSWORD: 'auth/forgot-password'
  },
  FOLDERS: {
    COLLECTION: 'folders',
    BASE: 'folders'
  },
  NOTES: {
    COLLECTION: 'notes',
    BASE: 'notes'
  }
} as const;

