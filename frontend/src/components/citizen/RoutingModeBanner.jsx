import { WifiOff } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { Callout } from '../ui/primitives';

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
    <div data-testid="routing-offline-banner" aria-live="polite">
      <Callout
        tone="warning"
        icon={<WifiOff className="h-4 w-4" aria-hidden="true" />}
        title={t('routingOfflineTitle')}
      >
        <p>{t(`routingMode${routing.mode}`, { time })}</p>
        {routing.reason && <p className="mt-1 text-muted">{t(`routingReason${routing.reason}`)}</p>}
        <p className="mt-1 text-muted">{t('routingOfflineFooter')}</p>
      </Callout>
    </div>
  );
}
