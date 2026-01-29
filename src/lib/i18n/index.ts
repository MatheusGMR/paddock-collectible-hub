import { ptBR, Translations } from "./translations/pt-BR";
import { en } from "./translations/en";

export type Language = "pt-BR" | "en";

export const translations: Record<Language, Translations> = {
  "pt-BR": ptBR,
  "en": en,
};

export const STORAGE_KEY = "paddock-language";

/**
 * Detect the user's preferred language based on browser settings
 */
export function detectLanguage(): Language {
  // Check localStorage first for saved preference
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "pt-BR" || saved === "en") {
    return saved;
  }

  // Use browser's language setting
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // If starts with "pt" (pt, pt-BR, pt-PT), use Portuguese
  if (browserLang?.toLowerCase().startsWith("pt")) {
    return "pt-BR";
  }
  
  // Default to English
  return "en";
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
