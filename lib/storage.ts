import type { HistoryEntry, ProjectProfile, Settings } from './types';

const SETTINGS_KEY = 'settings';
const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 20;

export function defaultProfile(id = 'default'): ProjectProfile {
  return {
    id,
    name: 'Default',
    emailTo: [],
    emailCc: [],
    subjectPrefix: '[UsrHelper]',
    subfolder: 'UsrHelper',
    descriptionTemplate: '',
    clipMinutes: 5,
    maxMinutes: 30,
  };
}

export function defaultSettings(): Settings {
  return {
    activeProfileId: 'default',
    profiles: [defaultProfile()],
    showCameraBubble: false,
    showKeystrokes: true,
    showRipples: true,
    showTimestampOverlay: true,
    stampTimestampOnScreenshots: true,
    trackClickPath: true,
    captureConsoleErrors: true,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = stored[SETTINGS_KEY] as Partial<Settings> | undefined;
  if (!settings) return defaultSettings();
  const merged = { ...defaultSettings(), ...settings };
  if (!merged.profiles?.length) merged.profiles = [defaultProfile()];
  if (!merged.profiles.some((p) => p.id === merged.activeProfileId)) {
    merged.activeProfileId = merged.profiles[0].id;
  }
  return merged;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function getActiveProfile(): Promise<ProjectProfile> {
  const settings = await loadSettings();
  return settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0];
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  return (stored[HISTORY_KEY] as HistoryEntry[] | undefined) ?? [];
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry);
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, HISTORY_LIMIT) });
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const history = await loadHistory();
  await chrome.storage.local.set({ [HISTORY_KEY]: history.filter((e) => e.id !== id) });
}

export function newId(): string {
  return crypto.randomUUID();
}
