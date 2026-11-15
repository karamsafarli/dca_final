import { MapPinned, Navigation } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatDistance } from '../../lib/utils';

/**
 * The single most important answer for a citizen in a crisis, shown first:
 * where to go, how far, how long, how full. Details live further down.
 */
export function CitizenStatusHero({ plan, isLoading, onShowMap }) {
  const { t } = useI18n();
  const point = plan?.recommendedPoint;

  if (isLoading && !plan) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4" aria-busy="true">
        <p className="text-sm text-slate-400">{t('heroLoading')}</p>
        <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-slate-800" />
      </div>
    );
  }

  if (!point) return null; // the route card shows the explicit "no route" panel

  return (
    <section
      aria-labelledby="hero-title"
      aria-live="polite"
      className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
        {t('heroLabel')}
      </p>
      <h2 id="hero-title" className="mt-1 flex items-start gap-2 text-lg font-bold leading-snug text-white">
        <Navigation className="mt-1 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
        {point.name}
      </h2>
      <p className="mt-1 text-sm text-emerald-100/90">
        {t('heroMeta', {
          distance: formatDistance(point.route?.distanceMeters),
          min: point.route?.estimatedMinutes || 1,
          percent: point.occupancyPercent,
        })}
      </p>
      {onShowMap && (
        <button
          type="button"
          onClick={onShowMap}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10 lg:hidden"
        >
          <MapPinned className="h-4 w-4" aria-hidden="true" />
          {t('heroShowMap')}
        </button>
      )}
    </section>
  );
}
