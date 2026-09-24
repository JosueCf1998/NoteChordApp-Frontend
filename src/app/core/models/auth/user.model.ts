export interface UserModel {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber?: string | null;
  lastLoginAt?: number;
}

