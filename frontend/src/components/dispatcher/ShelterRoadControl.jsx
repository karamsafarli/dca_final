import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';
import { Button, Card, Segmented, StatusDot } from '../ui/primitives';

const POINT_TONE = { OPEN: 'success', STANDBY: 'neutral', FULL: 'danger', CLOSED: 'danger' };
const ROAD_TONE = { OPEN: 'success', CONGESTED: 'warning', CLOSED: 'danger' };

function occupancyTone(percent) {
  if (percent >= 95) return { bar: 'bg-danger', text: 'text-danger-fg' };
  if (percent >= 90) return { bar: 'bg-warning', text: 'text-warning-fg' };
  return { bar: percent >= 70 ? 'bg-warning' : 'bg-success', text: 'text-fg' };
}

export function ShelterRoadControl({ assemblyPoints = [], roads = [], onUpdateOccupancy, onUpdateRoadStatus, isBusy }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('shelters');

  return (
    <Card aria-label={t('tabShelters', { count: assemblyPoints.length })}>
      <div className="p-4 pb-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'shelters', label: t('tabShelters', { count: assemblyPoints.length }) },
            { value: 'roads', label: t('tabRoads', { count: roads.length }) },
          ]}
        />
      </div>

      {tab === 'shelters' ? (
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto border-t border-line">
          {assemblyPoints.map((point) => {
            const percent = point.occupancyPercent ?? 0;
            const tone = occupancyTone(percent);
            return (
              <li key={point.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-fg">{point.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusDot tone={POINT_TONE[point.status]}>{t(`pointStatuses.${point.status}`)}</StatusDot>
                      <span className="text-xs text-muted">
                        {t(`pointTypes.${point.type}`)} · {point.zone?.name}
                      </span>
                      <span className={cn('text-xs', point.isWheelchairAccessible === false ? 'text-priority-fg' : 'text-muted')}>
                        {point.isWheelchairAccessible === false ? t('inaccessibleTag') : t('accessibleTag')}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className={cn('text-sm font-semibold tabular', tone.text)}>{percent}%</div>
                    <div className="text-xs text-faint tabular">
                      {point.currentOccupancy}/{point.capacity}
                    </div>
                  </div>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-subtle">
                  <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, percent)}%` }} />
                </div>
                {onUpdateOccupancy && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {point.status === 'STANDBY' ? (
                    <Button size="sm" variant="ink" disabled={isBusy} onClick={() => onUpdateOccupancy(point.id, { status: 'OPEN' })}>
                      {t('openPointBtn')}
                    </Button>
                  ) : (
                    [40, 92, 97].map((p) => (
                      <Button
                        key={p}
                        size="sm"
                        disabled={isBusy}
                        onClick={() => onUpdateOccupancy(point.id, { occupancyPercent: p, status: 'OPEN' })}
                        className="tabular"
                      >
                        {p}%
                      </Button>
                    ))
                  )}
                </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="max-h-[520px] divide-y divide-line overflow-y-auto border-t border-line">
          {roads.map((road) => (
            <li key={road.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">{road.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
                  <StatusDot tone={ROAD_TONE[road.status]}>{t(`roadStatuses.${road.status}`)}</StatusDot>
                  <span className="text-xs text-muted tabular">
                    {road.zone?.name} · {road.distanceMeters} m
                  </span>
                  {road.isWheelchairAccessible === false && (
                    <span className="text-xs text-priority-fg">{t('inaccessibleTag')}</span>
                  )}
                </div>
              </div>
              {onUpdateRoadStatus && (
              <Segmented
                value={road.status}
                onChange={(st) => !isBusy && st !== road.status && onUpdateRoadStatus(road.id, { status: st })}
                options={['OPEN', 'CONGESTED', 'CLOSED'].map((st) => ({ value: st, label: t(`roadStatuses.${st}`) }))}
              />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
