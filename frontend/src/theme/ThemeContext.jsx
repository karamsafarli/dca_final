import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'urban_crisis_theme';
const ThemeContext = createContext(null);
const media = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Light / dark / system theme. The resolved theme toggles the `dark` class on
 * <html>; all colours come from CSS tokens, so components need no dark: variants.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPreference);
  const [systemDark, setSystemDark] = useState(() => Boolean(media()?.matches));

  useEffect(() => {
    const mq = media();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setThemePreference = useCallback((next) => {
    setPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage unavailable: preference lasts for this session only
    }
  }, []);

  const value = useMemo(
    () => ({ theme, preference, setThemePreference }),
    [theme, preference, setThemePreference]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
