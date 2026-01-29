import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Language, detectLanguage, saveLanguage, getTranslations, Translations } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => detectLanguage());
  const [translations, setTranslations] = useState<Translations>(() => getTranslations(detectLanguage()));

  useEffect(() => {
    // Update translations when language changes
    setTranslations(getTranslations(language));
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    saveLanguage(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Shorthand hook for just getting translations
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}
