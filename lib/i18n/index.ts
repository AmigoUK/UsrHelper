import { useEffect, useState } from 'preact/hooks';
import en from './en.json';
import pl from './pl.json';

export type Language = 'en' | 'pl';

const DICTIONARIES: Record<Language, Record<string, string>> = { en, pl };
const DEFAULT_LANGUAGE: Language = 'en';
const STORAGE_KEY = 'language';

let currentLanguage: Language = DEFAULT_LANGUAGE;
const listeners = new Set<(lang: Language) => void>();

export function translate(key: string, params?: Record<string, string | number>): string {
  const dict = DICTIONARIES[currentLanguage] ?? DICTIONARIES[DEFAULT_LANGUAGE];
  let text = dict[key] ?? DICTIONARIES[DEFAULT_LANGUAGE][key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export async function loadLanguage(): Promise<Language> {
  const stored = await chrome.storage.sync.get(STORAGE_KEY);
  const lang = stored[STORAGE_KEY] === 'pl' ? 'pl' : DEFAULT_LANGUAGE;
  setLanguage(lang);
  return lang;
}

export async function saveLanguage(lang: Language): Promise<void> {
  setLanguage(lang);
  await chrome.storage.sync.set({ [STORAGE_KEY]: lang });
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  listeners.forEach((fn) => fn(lang));
}

export function getLanguage(): Language {
  return currentLanguage;
}

/** Preact hook: returns t() and re-renders on language change. */
export function useT() {
  const [lang, setLang] = useState<Language>(currentLanguage);
  useEffect(() => {
    listeners.add(setLang);
    void loadLanguage();
    return () => {
      listeners.delete(setLang);
    };
  }, []);
  return {
    t: (key: string, params?: Record<string, string | number>) => translate(key, params),
    lang,
    setLang: (l: Language) => void saveLanguage(l),
  };
}
