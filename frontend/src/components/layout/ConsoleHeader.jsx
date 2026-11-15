import { ArrowUpRight, ChevronDown, LogOut, Siren } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { BrandMark, ConnectionDot, LanguageSwitch, ThemeToggle } from './HeaderControls';

/**
 * Dispatcher console header. A different product surface from the citizen app:
 * live status, active-alert count, operator identity, and a link that opens the
 * citizen view in a new tab (operators watch both side by side).
 */
export function ConsoleHeader({ isSocketConnected, activeAlertsCount = 0, dispatcher, onLogout }) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-[1200] border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <BrandMark subtitle={t('consoleTitle')} />
          <ConnectionDot isConnected={isSocketConnected} showLabel />
        </div>

        <div className="flex items-center gap-2">
          {activeAlertsCount > 0 && (
            <span
              role="status"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-danger px-2.5 text-xs font-semibold text-white"
            >
              <Siren className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="tabular">{t('activeAlertsLabel', { count: activeAlertsCount })}</span>
            </span>
          )}
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-subtle hover:text-fg md:flex"
          >
            {t('openCitizenView')}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <LanguageSwitch />
          <ThemeToggle />

          {dispatcher && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={t('operatorMenu')}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2 text-xs font-medium text-fg transition hover:bg-subtle"
              >
                <span className="font-mono text-xs">{dispatcher.badgeCode}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl"
                >
                  <div className="px-2.5 py-2">
                    <div className="text-sm font-medium text-fg">{dispatcher.fullName}</div>
                    <div className="text-xs text-muted">
                      {dispatcher.username} · {dispatcher.role}
                    </div>
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-fg transition hover:bg-subtle"
                  >
                    <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
