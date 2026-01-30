import { ptBR, Translations } from "./translations/pt-BR";
import { en } from "./translations/en";

export type Language = "pt-BR" | "en";

export const translations: Record<Language, Translations> = {
  "pt-BR": ptBR,
  "en": en,
};

export const STORAGE_KEY = "paddock-language";

/**
 * Get the default language - always Portuguese
 */
export function detectLanguage(): Language {
  return "pt-BR";
}

/**
 * Save language preference to localStorage
 */
export function saveLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Get translations for a specific language
 */
export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export type { Translations };
