import { Route, Siren } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

/** Thumb-reachable SOS and route actions on phones (hidden on desktop). */
export function MobileActionBar({ onSos, onRoute }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('actionBarLabel')}
      className="fixed inset-x-0 bottom-0 z-[1100] border-t border-line bg-canvas p-3 lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-xl gap-3">
        <button
          type="button"
          onClick={onSos}
          className="flex min-h-[52px] flex-[2] items-center justify-center gap-2 rounded-xl bg-danger text-base font-semibold text-white active:bg-danger"
        >
          <Siren className="h-5 w-5" aria-hidden="true" />
          {t('mobileSos')}
        </button>
        <button
          type="button"
          onClick={onRoute}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong text-base font-semibold text-fg active:bg-subtle"
        >
          <Route className="h-5 w-5" aria-hidden="true" />
          {t('mobileRoute')}
        </button>
      </div>
    </nav>
  );
}
