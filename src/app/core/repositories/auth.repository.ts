import { Observable } from 'rxjs';
import { UserModel } from '../models/auth/user.model';
import { Result } from '../models/result.model';

export abstract class AuthRepository {
  abstract getCurrentUser(): Observable<Result<UserModel | null>>;
  abstract login(email: string, password: string): Promise<Result<UserModel>>;
  abstract register(email: string, password: string): Promise<Result<UserModel>>;
  abstract logout(): Promise<Result<void>>;
  abstract resetPassword(email: string): Promise<Result<void>>;
}

