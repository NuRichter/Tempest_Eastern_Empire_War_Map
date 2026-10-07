'use client';

/**
 * Interface translations.
 *
 * Keys are the English text itself (gettext style): `t('Search the campaign')`,
 * with `{name}` placeholders. English needs no catalog; the other 29 locales are
 * static JSON in public/locales/<code>.json (English text -> translation),
 * fetched only when chosen, with English as the fallback for any missing
 * string. `npm run i18n:extract` collects every t()/msg() string into
 * i18n/catalog.json for translators; `npm run i18n:check` validates the locale
 * files (coverage, placeholders, glossary terms left untranslated).
 * Campaign records (event titles, evidence) stay in English.
 */

import { useCallback } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { LOCALES, matchLocale } from '@/i18n/locales';

export { msg } from '@/i18n/msg';
export type MessageKey = string;
type Messages = Record<string, string>;

interface I18nState {
  locale: string;
  /** Whether the reader chose a language (otherwise the browser's is used). */
  chosen: boolean;
  messages: Messages;
  loaded: string;
  setLocale: (code: string) => void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__tempest_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch {
    const mem = new Map<string, string>();
    return { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  }
});

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'en',
      chosen: false,
      messages: {},
      loaded: 'en',
      setLocale: (code) => set({ locale: LOCALES.some((l) => l.code === code) ? code : 'en', chosen: true }),
    }),
    { name: 'tempest-atlas.locale.v1', storage: safeStorage, partialize: (s) => ({ locale: s.locale, chosen: s.chosen }) },
  ),
);

const cache = new Map<string, Messages>();

/** Loads the messages of the current locale and applies lang/dir to <html>. */
export async function syncLocale(): Promise<void> {
  const st = useI18n.getState();
  let code = st.locale;
  if (!st.chosen && typeof navigator !== 'undefined') code = matchLocale(navigator.language);
  const info = LOCALES.find((l) => l.code === code) ?? LOCALES[0];
  document.documentElement.lang = info.code;
  document.documentElement.dir = info.dir;
  if (info.code === 'en') {
    useI18n.setState({ messages: {}, loaded: 'en', locale: 'en' });
    return;
  }
  let messages = cache.get(info.code);
  if (!messages) {
    try {
      const res = await fetch(`/locales/${info.code}.json`);
      messages = res.ok ? ((await res.json()) as Messages) : {};
    } catch {
      messages = {};
    }
    cache.set(info.code, messages);
  }
  useI18n.setState({ messages, loaded: info.code, locale: info.code });
}

export type Vars = Record<string, string | number>;

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Translate outside React (e.g. canvas labels): current messages, English fallback. */
export function translate(key: MessageKey, vars?: Vars): string {
  const m = useI18n.getState().messages[key];
  return format(m || key, vars);
}

/** The hook components use: `const t = useT(); t('Current situation')`. */
export function useT(): (key: MessageKey, vars?: Vars) => string {
  const messages = useI18n((s) => s.messages);
  return useCallback((key: MessageKey, vars?: Vars) => format(messages[key] || key, vars), [messages]);
}

/** Number formatting in the reader's locale. */
export function useNumberFormat(): Intl.NumberFormat {
  const locale = useI18n((s) => s.loaded);
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : locale);
}
