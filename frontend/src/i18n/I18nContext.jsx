import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setErrorTranslator } from '../lib/api';
import { TRANSLATIONS } from './translations';

const LANG_STORAGE_KEY = 'urban_crisis_lang';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return saved === 'en' ? 'en' : 'az';
  });

  const setLang = useCallback((nextLang) => {
    const normalized = nextLang === 'en' ? 'en' : 'az';
    localStorage.setItem(LANG_STORAGE_KEY, normalized);
    document.documentElement.lang = normalized;
    setLangState(normalized);
  }, []);

  const t = useCallback(
    (key, vars = {}) => {
      const dict = TRANSLATIONS[lang] || TRANSLATIONS.az;
      const parts = key.split('.');
      let val = dict;
      for (const p of parts) {
        val = val?.[p];
      }
      if (typeof val !== 'string') return key;
      return val.replace(/\{(\w+)\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`
      );
    },
    [lang]
  );

  // Let the API layer translate backend error codes into the active language
  setErrorTranslator(t);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
