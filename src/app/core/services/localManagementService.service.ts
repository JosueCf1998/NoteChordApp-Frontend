import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LocalManagementService {
  setVariable(key: string, value: string | number | boolean): boolean {
    if (value === undefined || value === null) return false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value.toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getVariable(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  }

  getNonEmptyVariable(key: string): string | null {
    const val = this.getVariable(key)?.trim();
    return (!val || val === 'null' || val === 'undefined') ? null : val;
  }

  removeVariable(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignored for safety in non-browser environments
    }
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }
    } catch {
      // Ignored for safety in non-browser environments
    }
  }
}

