import { Accessibility, Ambulance, Shuffle } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn, formatDistance } from '../../lib/utils';
import { Button, Callout, Card, CardHeader } from '../ui/primitives';

function occupancyTone(percent) {
  if (percent >= 90) return { bar: 'bg-danger', text: 'text-danger-fg' };
  if (percent >= 70) return { bar: 'bg-warning', text: 'text-warning-fg' };
  return { bar: 'bg-success', text: 'text-muted' };
}

export function EvacuationRouteCard({ plan, isLoading, onRequestAssistance, isSubmitting }) {
  const { t } = useI18n();

  if (isLoading && !plan) return null; // the hero shows the loading state
  if (!plan) return null;

  const {
    accessibleOnly = false,
    recommendedPoint,
    assistanceRequired,
    rerouted,
    rerouteReasons = [],
    skippedCrowdedPoint,
    skippedInaccessiblePoint,
    blockedRoads = [],
    assemblyPoints = [],
  } = plan;

  const showAccessibility = accessibleOnly || rerouteReasons.includes('ACCESSIBILITY_REQUIRED');
  const rerouteLines = [
    rerouteReasons.includes('ROAD_CLOSURE') &&
      blockedRoads.length > 0 &&
      t('rerouteRoadClosure', { roads: blockedRoads.map((r) => r.name).join(', ') }),
    rerouteReasons.includes('OCCUPANCY_THRESHOLD_90') &&
      skippedCrowdedPoint &&
      t('rerouteOccupancy90', {
        name: skippedCrowdedPoint.name,
        percent: skippedCrowdedPoint.occupancyPercent,
      }),
    rerouteReasons.includes('ALL_POINTS_HIGH_OCCUPANCY') && t('rerouteAllHigh'),
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {assistanceRequired && (
        <div data-testid="assistance-required">
          <Callout
            tone="danger"
            role="alert"
            icon={<Ambulance className="h-4 w-4" aria-hidden="true" />}
            title={
              assistanceRequired === 'NO_ACCESSIBLE_ROUTE'
                ? t('assistanceNoAccessibleTitle')
                : t('assistanceNoReachableTitle')
            }
          >
            <p>
              {assistanceRequired === 'NO_ACCESSIBLE_ROUTE'
                ? t('assistanceNoAccessibleBody')
                : t('assistanceNoReachableBody')}
            </p>
            {onRequestAssistance && (
              <Button
                variant="danger"
                size="lg"
                className="mt-3 w-full"
                disabled={isSubmitting}
                onClick={onRequestAssistance}
              >
                <Ambulance className="h-5 w-5" aria-hidden="true" />
                {t('assistanceRequestBtn')}
              </Button>
            )}
          </Callout>
        </div>
      )}

      {rerouted && rerouteLines.length > 0 && (
        <Callout
          tone="warning"
          icon={<Shuffle className="h-4 w-4" aria-hidden="true" />}
          title={t('rerouteBannerTitle')}
        >
          <ul className="space-y-1">
            {rerouteLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Callout>
      )}

      {showAccessibility && (
        <Callout
          tone="priority"
          icon={<Accessibility className="h-4 w-4" aria-hidden="true" />}
          title={t('accessibilityActiveBadge')}
        >
          <p>{t('rerouteAccessibility')}</p>
          {skippedInaccessiblePoint && (
            <p className="mt-1 text-muted">
              {skippedInaccessiblePoint.name} — {t('inaccessibleTag')}
            </p>
          )}
        </Callout>
      )}

      <Card aria-labelledby="route-details-title">
        <CardHeader id="route-details-title" title={t('routeDetailsTitle')} />

        {recommendedPoint?.route?.roadNamesUsed?.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs text-muted">{t('routeCorridor')}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg">
              {recommendedPoint.route.roadNamesUsed.join(' → ')}
            </p>
          </div>
        )}

        <div className="px-4 pb-2 pt-4">
          <p className="text-xs text-muted">
            {t('nearbyPointsShort')} · {assemblyPoints.length}
          </p>
        </div>
        <ul className="max-h-[360px] divide-y divide-line overflow-y-auto border-t border-line">
          {assemblyPoints.map((point) => {
            const percent = point.occupancyPercent ?? 0;
            const tone = occupancyTone(percent);
            const unreachable = !point.route?.reachable;
            const inaccessible = point.isInaccessibleForUser || (accessibleOnly && point.isWheelchairAccessible === false);
            const dimmed = !point.isRecommended && (unreachable || inaccessible || point.status === 'FULL');

            return (
              <li key={point.id} className={cn('px-4 py-3', dimmed && 'opacity-60')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-fg">{point.name}</span>
                      {point.isRecommended && (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-xs font-medium text-success-fg">
                          {t('recommendedPill')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {t(`pointTypes.${point.type}`)}
                      {point.zone?.name ? ` · ${point.zone.name}` : ''}
                      {inaccessible && (
                        <span className="text-priority-fg"> · {t('inaccessibleTag')}</span>
                      )}
                      {unreachable && !inaccessible && (
                        <span className="text-danger-fg"> · {t('roadBlockedTag')}</span>
                      )}
                      {(percent >= 90 || point.status === 'FULL') && (
                        <span className="text-danger-fg"> · {t('full90Tag')}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-medium text-fg tabular">
                      {unreachable ? t('unreachable') : formatDistance(point.route.distanceMeters)}
                    </div>
                    <div className={cn('text-xs tabular', tone.text)}>{percent}%</div>
                  </div>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-subtle">
                  <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
