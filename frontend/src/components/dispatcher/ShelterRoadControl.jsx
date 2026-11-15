import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

export function ShelterRoadControl({
  assemblyPoints = [],
  roads = [],
  onUpdateOccupancy,
  onUpdateRoadStatus,
  isBusy,
}) {
  const { lang, t } = useI18n();
  const [tab, setTab] = useState('shelters');

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex rounded-xl bg-slate-950 p-1 ring-1 ring-slate-800">
          <button
            type="button"
            onClick={() => setTab('shelters')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              tab === 'shelters'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {t('tabShelters', { count: assemblyPoints.length })}
          </button>
          <button
            type="button"
            onClick={() => setTab('roads')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
              tab === 'roads'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {t('tabRoads', { count: roads.length })}
          </button>
        </div>
      </div>

      {tab === 'shelters' ? (
        <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
          {assemblyPoints.map((point) => (
            <div
              key={point.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-white">{point.name}</span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                      {t(`pointTypes.${point.type}`)}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-bold',
                        point.status === 'OPEN'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : point.status === 'STANDBY'
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-red-500/20 text-red-300'
                      )}
                    >
                      {t(`pointStatuses.${point.status}`)}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-xs font-semibold',
                        point.isWheelchairAccessible === false
                          ? 'bg-fuchsia-500/20 text-fuchsia-300'
                          : 'bg-cyan-500/15 text-cyan-300'
                      )}
                    >
                      {point.isWheelchairAccessible === false
                        ? t('inaccessibleTag')
                        : t('accessibleTag')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {point.zone?.name} • {point.currentOccupancy}/{point.capacity}{' '}
                    {t('peopleUnit')}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-sm font-extrabold',
                    point.occupancyPercent >= 95
                      ? 'text-red-400'
                      : point.occupancyPercent >= 90
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  )}
                >
                  {point.occupancyPercent}%
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    point.occupancyPercent >= 90
                      ? 'bg-red-500'
                      : point.occupancyPercent >= 70
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(100, point.occupancyPercent)}%` }}
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {point.status === 'STANDBY' ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onUpdateOccupancy(point.id, { status: 'OPEN' })}
                    className="rounded-lg bg-emerald-600/30 px-2.5 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-600/45"
                  >
                    {t('openPointBtn')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        onUpdateOccupancy(point.id, { occupancyPercent: 40, status: 'OPEN' })
                      }
                      className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      40%
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        onUpdateOccupancy(point.id, { occupancyPercent: 92, status: 'OPEN' })
                      }
                      className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/30"
                    >
                      92% (Reroute)
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        onUpdateOccupancy(point.id, { occupancyPercent: 97, status: 'OPEN' })
                      }
                      className="rounded-lg bg-red-500/25 px-2 py-1 text-xs font-bold text-red-200 hover:bg-red-500/35"
                    >
                      {lang === 'en' ? '97% (Red Alert)' : '97% (Qırmızı Həyəcan)'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
          {roads.map((road) => (
            <div
              key={road.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs"
            >
              <div>
                <div className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                  <span>{road.name}</span>
                  {road.isWheelchairAccessible === false && (
                    <span className="rounded bg-fuchsia-500/20 px-1.5 py-0.5 text-xs font-semibold text-fuchsia-300">
                      {t('inaccessibleTag')}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  {road.zone?.name} • {road.distanceMeters} m •{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      road.status === 'CLOSED'
                        ? 'text-red-400'
                        : road.status === 'CONGESTED'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {t(`roadStatuses.${road.status}`)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {['OPEN', 'CONGESTED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={isBusy || road.status === st}
                    onClick={() => onUpdateRoadStatus(road.id, { status: st })}
                    className={cn(
                      'rounded-lg px-2 py-1 text-xs font-bold transition disabled:opacity-45',
                      road.status === st
                        ? 'bg-slate-700 text-white'
                        : st === 'CLOSED'
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                        : st === 'CONGESTED'
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    )}
                  >
                    {t(`roadStatuses.${st}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
