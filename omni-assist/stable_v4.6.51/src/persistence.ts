/**
 * OmniAssist Persistence Layer
 * Generic interface for storing guide state across sessions.
 */

export interface PersistenceProvider {
  save(key: string, value: any): void;
  load<T>(key: string): T | null;
  remove(key: string): void;
}

export class LocalStorageProvider implements PersistenceProvider {
  save(key: string, value: any): void {
    try {
      localStorage.setItem(`omni_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('OmniAssist: Failed to save to localStorage', e);
    }
  }

  load<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(`omni_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('OmniAssist: Failed to load from localStorage', e);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(`omni_${key}`);
  }
}

export const defaultPersistence = new LocalStorageProvider();
