import { Flame, Gauge, RotateCcw, RouteOff, Zap } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

export function SimulationBar({ zones = [], assemblyPoints = [], onRunAction, isBusy }) {
  const { t } = useI18n();
  const [selectedZoneId, setSelectedZoneId] = useState(null);

  const effectiveZoneId =
    zones.find((z) => z.id === selectedZoneId)?.id ?? zones[0]?.id ?? '';

  const openPoint =
    assemblyPoints.find((ap) => ap.status === 'OPEN' && ap.zoneId === effectiveZoneId) ||
    assemblyPoints.find((ap) => ap.status === 'OPEN') ||
    assemblyPoints[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 px-4 py-2.5 shadow-md">
      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
        <Zap className="h-4 w-4 text-cyan-400" />
        <span>{t('simTitle')}</span>
        <select
          value={effectiveZoneId}
          onChange={(e) => setSelectedZoneId(Number(e.target.value))}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-medium text-white focus:outline-none"
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBusy || !effectiveZoneId}
          onClick={() => onRunAction('sos-burst', { zoneId: effectiveZoneId })}
          className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          <Flame className="h-3.5 w-3.5" />
          <span>{t('sim4Sos')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy || !effectiveZoneId}
          onClick={() =>
            onRunAction('road-toggle', {
              zoneId: effectiveZoneId,
              status: 'CLOSED',
            })
          }
          className="flex items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/25 disabled:opacity-50"
        >
          <RouteOff className="h-3.5 w-3.5" />
          <span>{t('simCloseRoad')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy || !openPoint}
          onClick={() =>
            onRunAction('occupancy-spike', {
              assemblyPointId: openPoint?.id,
              targetPercent: 92,
            })
          }
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          <Gauge className="h-3.5 w-3.5" />
          <span>{t('simSpike92')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy || !openPoint}
          onClick={() =>
            onRunAction('occupancy-spike', {
              assemblyPointId: openPoint?.id,
              targetPercent: 97,
            })
          }
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-600/25 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-600/35 disabled:opacity-50"
        >
          <Gauge className="h-3.5 w-3.5" />
          <span>{t('simSpike97')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRunAction('reset')}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>{t('simReset')}</span>
        </button>
      </div>
    </div>
  );
}
