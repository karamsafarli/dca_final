import { MapPinned } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatDistance } from '../../lib/utils';
import { Button, Card } from '../ui/primitives';

/**
 * The single most important answer for a citizen in a crisis, shown first:
 * where to go, how far, how long, how full. Details live further down.
 */
export function CitizenStatusHero({ plan, isLoading, onShowMap }) {
  const { t } = useI18n();
  const point = plan?.recommendedPoint;

  if (isLoading && !plan) {
    return (
      <Card className="p-4" aria-busy="true">
        <p className="text-sm text-muted">{t('heroLoading')}</p>
        <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-subtle" />
        <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-subtle" />
      </Card>
    );
  }

  if (!point) return null; // the route card shows the explicit "no route" panel

  const percent = point.occupancyPercent ?? 0;
  return (
    <Card aria-labelledby="hero-title" aria-live="polite" className="p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-success-fg">
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
        {t('heroLabel')}
      </div>
      <h2 id="hero-title" className="mt-2 text-xl font-semibold leading-tight tracking-tight text-fg">
        {point.name}
      </h2>
      <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
        <div>
          <dt className="text-xs text-muted">{t('distanceLabel')}</dt>
          <dd className="text-base font-semibold text-fg tabular">{formatDistance(point.route?.distanceMeters)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('walkLabel')}</dt>
          <dd className="text-base font-semibold text-fg tabular">~{point.route?.estimatedMinutes || 1} {t('minutesShort')}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('occupancyLabel')}</dt>
          <dd className={`text-base font-semibold tabular ${percent >= 90 ? 'text-danger-fg' : percent >= 70 ? 'text-warning-fg' : 'text-fg'}`}>
            {percent}%
          </dd>
        </div>
      </dl>
      {onShowMap && (
        <Button variant="secondary" className="mt-3 w-full lg:hidden" onClick={onShowMap}>
          <MapPinned className="h-4 w-4" aria-hidden="true" />
          {t('heroShowMap')}
        </Button>
      )}
    </Card>
  );
}
