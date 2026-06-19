/**
 * i18n setup (react-i18next).
 *
 * Spanish is the product default; English is the secondary language.
 * The active language is persisted to localStorage ("sentinel-lang") and
 * also sent to the API on every request (see services/api.ts) so the
 * backend localizes enriched data (Wikidata labels, nationalities, …).
 *
 * Add UI strings to locales/es.json + locales/en.json and read them with
 * useTranslation()'s `t('namespace.key')`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import esBase from './locales/es.json';
import enBase from './locales/en.json';
// Per-area namespace fragments (created by area). Some are wrapped in their
// namespace key (compliance/components/data/entity/review) → spread; others
// hold their content directly (account/insights/workspace) → assigned.
import esWorkspace from './locales/es/workspace.json';
import enWorkspace from './locales/en/workspace.json';
import esInsights from './locales/es/insights.json';
import enInsights from './locales/en/insights.json';
import esAccount from './locales/es/account.json';
import enAccount from './locales/en/account.json';
import esCompliance from './locales/es/compliance.json';
import enCompliance from './locales/en/compliance.json';
import esComponents from './locales/es/components.json';
import enComponents from './locales/en/components.json';
import esData from './locales/es/data.json';
import enData from './locales/en/data.json';
import esEntity from './locales/es/entity.json';
import enEntity from './locales/en/entity.json';
import esReview from './locales/es/review.json';
import enReview from './locales/en/review.json';

const es = {
  ...esBase,
  workspace: esWorkspace,
  insights: esInsights,
  account: esAccount,
  ...esCompliance,
  ...esComponents,
  ...esData,
  ...esEntity,
  ...esReview,
};

const en = {
  ...enBase,
  workspace: enWorkspace,
  insights: enInsights,
  account: enAccount,
  ...enCompliance,
  ...enComponents,
  ...enData,
  ...enEntity,
  ...enReview,
};

export const SUPPORTED_LANGS = ['es', 'en'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];
export const LANG_STORAGE_KEY = 'sentinel-lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGS,
    // Map regional variants (es-MX, en-US) down to the base language.
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      // localStorage only — Spanish is the product default for fresh
      // visitors (no navigator sniffing); English is an explicit opt-in.
      order: ['localStorage'],
      lookupLocalStorage: LANG_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: {
      // SPA (no SSR) — avoid Suspense so first paint never blocks on i18n.
      useSuspense: false,
    },
  });

/** Active language as a base code ("es" / "en"), region stripped. */
export function currentLang(): AppLang {
  const base = (i18n.language || 'es').split('-')[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(base) ? (base as AppLang) : 'es';
}

export default i18n;
