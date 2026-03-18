import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en';
import fr from './fr';

type LangKey = keyof typeof en;
type Translations = Record<LangKey, string>;

const languages: Record<string, Translations> = { en: en as Translations, fr: fr as Translations };
const LANG_KEY = 'shelfer_lang';

let currentLang = 'en';
let currentStrings: Translations = en as Translations;
let listeners: (() => void)[] = [];

export async function initLanguage(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved && languages[saved]) {
    currentLang = saved;
    currentStrings = languages[saved];
  }
}

export async function setLanguage(lang: string): Promise<void> {
  if (!languages[lang]) return;
  currentLang = lang;
  currentStrings = languages[lang];
  await AsyncStorage.setItem(LANG_KEY, lang);
  listeners.forEach(fn => fn());
}

export function getLanguage(): string { return currentLang; }
export function getSupportedLanguages(): { code: string; label: string }[] {
  return [{ code: 'en', label: 'English' }, { code: 'fr', label: 'Français' }];
}

export function t(key: LangKey): string {
  return currentStrings[key] || en[key] || key;
}

/** React hook that re-renders on language change */
export function useTranslation() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick(t => t + 1), []);

  // Register listener on first render (simplified — no cleanup needed for global singleton)
  if (!listeners.includes(rerender)) listeners.push(rerender);

  return { t, lang: currentLang, setLanguage };
}
