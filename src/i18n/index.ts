import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

export const LANGUAGES = [
  { code: 'en', locale: 'en-GB', label: 'EN', name: 'English' },
  { code: 'vi', locale: 'vi-VN', label: 'VI', name: 'Tiếng Việt' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, vi: { translation: vi } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

const formatters = new Map<string, Intl.NumberFormat>();

/** Locale-aware number formatting (e.g. 0.5 in English, 0,5 in Vietnamese). */
export function useFormat() {
  const { i18n: instance } = useTranslation();
  const locale = LANGUAGES.find((l) => l.code === instance.language)?.locale ?? 'en-GB';
  return {
    locale,
    number(value: number, maxFractionDigits = 2) {
      const key = `${locale}:${maxFractionDigits}`;
      let fmt = formatters.get(key);
      if (!fmt) {
        fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: maxFractionDigits });
        formatters.set(key, fmt);
      }
      return fmt.format(value);
    },
  };
}

export default i18n;
