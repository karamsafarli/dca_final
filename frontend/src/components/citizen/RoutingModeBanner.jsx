import { WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

/**
 * Challenge Drop #2: tells the citizen that routes come from the local backup
 * (cache / local road graph / coordinate matrix) because the external map &
 * routing API is down. Hidden while routing is online.
 */
export function RoutingModeBanner({ routing }) {
  const { t, lang } = useI18n();
  if (!routing?.degraded) return null;

  const time = routing.cachedAt
    ? new Date(routing.cachedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'az-AZ', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="routing-offline-banner"
      className="rounded-2xl border border-amber-500/60 bg-amber-950/50 p-3.5"
    >
      <div className="flex items-start gap-2.5">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="space-y-1 text-sm">
          <p className="font-bold text-amber-200">{t('routingOfflineTitle')}</p>
          <p className="text-amber-100/90">{t(`routingMode${routing.mode}`, { time })}</p>
          {routing.reason && (
            <p className="text-xs text-amber-200/80">{t(`routingReason${routing.reason}`)}</p>
          )}
          <p className="text-xs text-amber-200/70">{t('routingOfflineFooter')}</p>
        </div>
      </div>
    </div>
  );
}
