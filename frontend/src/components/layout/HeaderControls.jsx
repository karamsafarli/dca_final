import { Monitor, Moon, Sun } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';
import { useTheme } from '../../theme/ThemeContext';

const THEME_ORDER = ['light', 'dark', 'system'];
const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABEL = { light: 'themeLight', dark: 'themeDark', system: 'themeSystem' };

export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div role="group" aria-label={t('languageLabel')} className="flex rounded-lg border border-line p-0.5">
      {['az', 'en'].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium uppercase transition',
            lang === code ? 'bg-subtle text-fg' : 'text-muted hover:text-fg'
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

/** One button cycling light → dark → system; the label says what is active. */
export function ThemeToggle() {
  const { preference, setThemePreference } = useTheme();
  const { t } = useI18n();
  const Icon = THEME_ICON[preference];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(preference) + 1) % THEME_ORDER.length];
  const label = `${t('themeLabel')}: ${t(THEME_LABEL[preference])}`;
  return (
    <button
      type="button"
      onClick={() => setThemePreference(next)}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:text-fg"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function ConnectionDot({ isConnected, showLabel = false }) {
  const { t } = useI18n();
  const label = isConnected ? t('connectionLive') : t('connectionLost');
  return (
    <span role="status" title={label} className="flex items-center gap-2 text-xs text-muted">
      <span
        className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-success' : 'bg-warning animate-pulse')}
        aria-hidden="true"
      />
      <span className={showLabel ? '' : 'sr-only'}>{label}</span>
    </span>
  );
}

export function BrandMark({ subtitle }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-danger text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 3v18M3 12h18" strokeLinecap="round" />
        </svg>
      </span>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-semibold text-fg">{t('brandShort')}</div>
        {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
    </div>
  );
}
