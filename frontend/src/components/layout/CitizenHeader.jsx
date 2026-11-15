import { KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { BrandMark, ConnectionDot, LanguageSwitch, ThemeToggle } from './HeaderControls';

/**
 * Public citizen app header: nothing but brand, language, theme and a quiet
 * entry point for operators. Citizens never see dispatcher controls.
 */
export function CitizenHeader({ isSocketConnected }) {
  const { t } = useI18n();
  return (
    <header className="border-b border-line bg-surface md:sticky md:top-0 md:z-[1200]">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4">
        <BrandMark />
        <div className="flex items-center gap-2">
          <ConnectionDot isConnected={isSocketConnected} />
          <LanguageSwitch />
          <ThemeToggle />
          <Link
            to="/dispatcher"
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-subtle hover:text-fg"
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{t('operatorLink')}</span>
            <span className="sr-only sm:hidden">{t('operatorLink')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
