import { defaultConfig, type UserConfig } from '../data/model';

const KEY = 'wealthviz-config-v1';

function load(): UserConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaultConfig);
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    return { ...structuredClone(defaultConfig), ...parsed };
  } catch {
    return structuredClone(defaultConfig);
  }
}

export const config = $state<UserConfig>(load());

export function persist(snapshot: UserConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // localStorage unavailable (private mode) — config just won't survive reloads
  }
}

export function resetConfig(): void {
  Object.assign(config, structuredClone(defaultConfig));
}
