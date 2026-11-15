import {
  Accessibility,
  AlertOctagon,
  Clock,
  Navigation,
  Route,
  Users,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn, formatDistance } from '../../lib/utils';

function getOccupancyBarClass(percent) {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function EvacuationRouteCard({ plan, isLoading }) {
  const { t } = useI18n();

  if (isLoading && !plan) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-400">
        {t('calculatingRoute')}
      </div>
    );
  }

  if (!plan) return null;

  const {
    accessibleOnly = false,
    recommendedPoint,
    rerouted,
    rerouteReasons = [],
    skippedCrowdedPoint,
    skippedInaccessiblePoint,
    blockedRoads = [],
    assemblyPoints = [],
  } = plan;

  const hasAccessibilityAlert =
    accessibleOnly || rerouteReasons.includes('ACCESSIBILITY_REQUIRED');

  return (
    <div className="space-y-3">
      {/* Accessibility Active Notice */}
      {hasAccessibilityAlert && (
        <div className="rounded-2xl border border-fuchsia-500/50 bg-fuchsia-950/40 p-3.5 shadow-lg">
          <div className="flex items-start gap-2.5">
            <Accessibility className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-fuchsia-200">
                {t('accessibilityActiveBadge')}
              </div>
              <p className="text-fuchsia-100/90">{t('rerouteAccessibility')}</p>
              {skippedInaccessiblePoint && (
                <p className="text-[11px] font-semibold text-fuchsia-200">
                  • {skippedInaccessiblePoint.name} ({t('inaccessibleTag')})
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automatic Rerouting Alert Banner */}
      {rerouted && (
        <div className="rounded-2xl border border-amber-500/60 bg-amber-950/60 p-3.5 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-amber-200">{t('rerouteBannerTitle')}</div>
              {rerouteReasons.includes('ROAD_CLOSURE') && blockedRoads.length > 0 && (
                <p className="text-amber-100/90">
                  •{' '}
                  {t('rerouteRoadClosure', {
                    roads: blockedRoads.map((r) => r.name).join(', '),
                  })}
                </p>
              )}
              {rerouteReasons.includes('OCCUPANCY_THRESHOLD_90') &&
                skippedCrowdedPoint && (
                  <p className="text-amber-100/90">
                    •{' '}
                    {t('rerouteOccupancy90', {
                      name: skippedCrowdedPoint.name,
                      percent: skippedCrowdedPoint.occupancyPercent,
                    })}
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Evacuation Destination */}
      {recommendedPoint && (
        <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/30 p-4 shadow-lg">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/40">
                  <Navigation className="h-3 w-3" />
                  {t('recommendedBadge')}
                </span>
                {recommendedPoint.isWheelchairAccessible !== false && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-200 ring-1 ring-fuchsia-500/35">
                    <Accessibility className="h-3 w-3" />
                    {t('accessibleTag')}
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 text-base font-bold text-white">
                {recommendedPoint.name}
              </h3>
              <p className="text-xs text-slate-400">
                {t(`pointTypes.${recommendedPoint.type}`)} • {recommendedPoint.address}
              </p>
            </div>

            <div className="text-right">
              <div className="text-lg font-extrabold text-emerald-300">
                {formatDistance(recommendedPoint.route?.distanceMeters)}
              </div>
              <div className="flex items-center justify-end gap-1 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>
                  {t('walkMinutes', {
                    min: recommendedPoint.route?.estimatedMinutes || 1,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Occupancy Progress */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-slate-300">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                {t('currentOccupancy', {
                  curr: recommendedPoint.currentOccupancy,
                  cap: recommendedPoint.capacity,
                })}
              </span>
              <span className="font-bold text-emerald-300">
                {recommendedPoint.occupancyPercent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  getOccupancyBarClass(recommendedPoint.occupancyPercent)
                )}
                style={{ width: `${Math.min(100, recommendedPoint.occupancyPercent)}%` }}
              />
            </div>
          </div>

          {/* Road Corridor Path */}
          {recommendedPoint.route?.roadNamesUsed?.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-300">
                <Route className="h-3.5 w-3.5" />
                <span>{t('routeCorridor')}</span>
              </div>
              <p className="leading-relaxed text-slate-300">
                {recommendedPoint.route.roadNamesUsed.join(' → ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Nearby Assembly Points List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-lg">
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('nearbyPointsTitle', { count: assemblyPoints.length })}
        </h3>

        <div className="max-h-[290px] space-y-2 overflow-y-auto pr-1">
          {assemblyPoints.map((point) => {
            const isOver90 = point.occupancyPercent >= 90 || point.status === 'FULL';
            const unreachable = !point.route?.reachable;
            const inaccessible =
              point.isInaccessibleForUser || point.isWheelchairAccessible === false;

            return (
              <div
                key={point.id}
                className={cn(
                  'rounded-xl border p-3 transition',
                  point.isRecommended
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : point.isInaccessibleForUser
                    ? 'border-fuchsia-500/30 bg-fuchsia-950/15 opacity-75'
                    : isOver90 || unreachable
                    ? 'border-red-500/30 bg-red-950/15 opacity-80'
                    : 'border-slate-800 bg-slate-950/60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{point.name}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                        {t(`pointTypes.${point.type}`)}
                      </span>
                      {point.isRecommended && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          {t('recommendedShort')}
                        </span>
                      )}
                      {inaccessible ? (
                        <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-300">
                          {t('inaccessibleTag')}
                        </span>
                      ) : (
                        accessibleOnly && (
                          <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                            {t('accessibleTag')}
                          </span>
                        )
                      )}
                      {isOver90 && (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                          {t('full90Tag')}
                        </span>
                      )}
                      {unreachable && !point.isInaccessibleForUser && (
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                          {t('roadBlockedTag')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {point.zone?.name} • {t('statusLabel')}:{' '}
                      {t(`pointStatuses.${point.status}`)}
                    </p>
                  </div>

                  <div className="text-right text-xs">
                    <div className="font-bold text-slate-200">
                      {point.route?.reachable
                        ? formatDistance(point.route.distanceMeters)
                        : t('unreachable')}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-400">
                      {point.occupancyPercent}%
                    </div>
                  </div>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      getOccupancyBarClass(point.occupancyPercent)
                    )}
                    style={{ width: `${Math.min(100, point.occupancyPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
