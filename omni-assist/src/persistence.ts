import type { ProjectSchema, PageConfig, TaskConfig } from './schema';

/**
 * Omni Studio Persistence Layer
 * Provides an abstraction for storing and retrieving versioned project schemas.
 */

export interface IStorageProvider {
  save(key: string, value: any): void;
  load<T>(key: string): T | null;
}

export class LocalStorageProvider implements IStorageProvider {
  private prefix = 'omni_studio_';

  save(key: string, value: any): void {
    try {
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Omni Studio: Failed to save to localStorage', e);
    }
  }

  load<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(`${this.prefix}${key}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Omni Studio: Failed to load from localStorage', e);
      return null;
    }
  }
}

export class ConfigManager {
  private storage: IStorageProvider;
  private currentSchema: ProjectSchema;
  private storageKey = 'active_config';

  constructor(defaultSchema: ProjectSchema, storage: IStorageProvider = new LocalStorageProvider()) {
    this.storage = storage;
    const saved = this.storage.load<ProjectSchema>(this.storageKey);
    
    console.log(`%c[OMNI] Schema Version Check: File(v${defaultSchema.version}) vs Storage(v${saved?.version || 'none'})`, "color: #1976d2; font-weight: bold;");

    if (saved && saved.version === defaultSchema.version) {
      this.currentSchema = saved;
    } else {
      console.log(`%c[OMNI] Version mismatch or first run. Updating to v${defaultSchema.version}...`, "color: #f57c00; font-weight: bold;");
      this.currentSchema = JSON.parse(JSON.stringify(defaultSchema));
      this.save();
    }
  }

  getPages(): PageConfig[] {
    // Return a deep copy to ensure React detects changes in nested arrays (tasks)
    return JSON.parse(JSON.stringify(this.currentSchema.pages));
  }

  updateTask(pageId: string, task: TaskConfig): void {
    const page = this.currentSchema.pages.find(p => p.id === pageId);
    if (page) {
      const index = page.tasks.findIndex((t: TaskConfig) => t.id === task.id);
      if (index !== -1) {
        page.tasks[index] = task;
      } else {
        page.tasks.push(task);
      }
      this.save();
    }
  }

  deleteTask(pageId: string, taskId: string): void {
    const page = this.currentSchema.pages.find(p => p.id === pageId);
    if (page) {
      page.tasks = page.tasks.filter((t: TaskConfig) => t.id !== taskId);
      this.save();
    }
  }

  private save(): void {
    this.storage.save(this.storageKey, this.currentSchema);
  }

  exportJSON(): string {
    return JSON.stringify(this.currentSchema, null, 2);
  }

  importJSON(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      if (parsed.version && Array.isArray(parsed.pages)) {
        this.currentSchema = parsed;
        this.save();
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

export const studioConfig = (defaultSchema: ProjectSchema) => new ConfigManager(defaultSchema);
