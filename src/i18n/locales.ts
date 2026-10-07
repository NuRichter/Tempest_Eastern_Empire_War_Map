/**
 * The 30 interface languages. `code` is the file name under public/locales/
 * and the BCP 47 tag used for <html lang> and number formatting.
 */
export interface LocaleInfo {
  code: string;
  /** Name in the language itself, as shown in the selector. */
  native: string;
  /** English name, for search and documentation. */
  english: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: LocaleInfo[] = [
  { code: 'en', native: 'English', english: 'English', dir: 'ltr' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', dir: 'ltr' },
  { code: 'ja', native: '日本語', english: 'Japanese', dir: 'ltr' },
  { code: 'ko', native: '한국어', english: 'Korean', dir: 'ltr' },
  { code: 'zh-Hans', native: '简体中文', english: 'Chinese (Simplified)', dir: 'ltr' },
  { code: 'zh-Hant', native: '繁體中文', english: 'Chinese (Traditional)', dir: 'ltr' },
  { code: 'es', native: 'Español', english: 'Spanish', dir: 'ltr' },
  { code: 'pt', native: 'Português', english: 'Portuguese', dir: 'ltr' },
  { code: 'fr', native: 'Français', english: 'French', dir: 'ltr' },
  { code: 'de', native: 'Deutsch', english: 'German', dir: 'ltr' },
  { code: 'it', native: 'Italiano', english: 'Italian', dir: 'ltr' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch', dir: 'ltr' },
  { code: 'ru', native: 'Русский', english: 'Russian', dir: 'ltr' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian', dir: 'ltr' },
  { code: 'pl', native: 'Polski', english: 'Polish', dir: 'ltr' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish', dir: 'ltr' },
  { code: 'ar', native: 'العربية', english: 'Arabic', dir: 'rtl' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', dir: 'ltr' },
  { code: 'ur', native: 'اردو', english: 'Urdu', dir: 'rtl' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', dir: 'ltr' },
  { code: 'th', native: 'ไทย', english: 'Thai', dir: 'ltr' },
  { code: 'ms', native: 'Bahasa Melayu', english: 'Malay', dir: 'ltr' },
  { code: 'fil', native: 'Filipino', english: 'Filipino', dir: 'ltr' },
  { code: 'sw', native: 'Kiswahili', english: 'Swahili', dir: 'ltr' },
  { code: 'he', native: 'עברית', english: 'Hebrew', dir: 'rtl' },
  { code: 'fa', native: 'فارسی', english: 'Persian', dir: 'rtl' },
  { code: 'ro', native: 'Română', english: 'Romanian', dir: 'ltr' },
  { code: 'cs', native: 'Čeština', english: 'Czech', dir: 'ltr' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek', dir: 'ltr' },
];

export const LOCALE_CODES = LOCALES.map((l) => l.code);

/** Best supported locale for a browser language tag (e.g. "pt-BR" -> "pt", "zh-TW" -> "zh-Hant"). */
export function matchLocale(tag: string | undefined | null): string {
  if (!tag) return 'en';
  const t = tag.toLowerCase();
  if (t.startsWith('zh')) return /tw|hk|mo|hant/.test(t) ? 'zh-Hant' : 'zh-Hans';
  if (t.startsWith('tl') || t.startsWith('fil')) return 'fil';
  if (t === 'in' || t.startsWith('id')) return 'id';
  if (t.startsWith('iw') || t.startsWith('he')) return 'he';
  const base = t.split('-')[0];
  return LOCALE_CODES.find((c) => c.toLowerCase() === base) ?? 'en';
}
