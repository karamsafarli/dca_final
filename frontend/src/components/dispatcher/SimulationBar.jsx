import { Flame, Gauge, RotateCcw, RouteOff, Timer, Wifi, WifiOff, Zap } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

export function SimulationBar({ zones = [], assemblyPoints = [], routing, onRunAction, isBusy }) {
  const { t } = useI18n();
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  // Simulation is a demo tool, not part of an operator's daily screen: collapsed
  // by default, remembered per browser.
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem('urban_crisis_demo_bar') === 'open';
    } catch {
      return false;
    }
  });
  const toggle = () => {
    setIsOpen((prev) => {
      try {
        localStorage.setItem('urban_crisis_demo_bar', prev ? 'closed' : 'open');
      } catch {
        // storage unavailable
      }
      return !prev;
    });
  };

  const effectiveZoneId =
    zones.find((z) => z.id === selectedZoneId)?.id ?? zones[0]?.id ?? '';

  const openPoint =
    assemblyPoints.find((ap) => ap.status === 'OPEN' && ap.zoneId === effectiveZoneId) ||
    assemblyPoints.find((ap) => ap.status === 'OPEN') ||
    assemblyPoints[0];

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded="false"
        className="flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-700 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
      >
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4" aria-hidden="true" />
          {t('demoScenariosToggle')}
        </span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/95 px-4 py-2.5">
      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
        <button
          type="button"
          onClick={toggle}
          aria-expanded="true"
          className="flex items-center gap-2"
        >
          <Zap className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <span>{t('simTitle')}</span>
          <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
        </button>
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

        <span
          data-testid="routing-api-status"
          title={routing?.circuit ? `Circuit: ${routing.circuit.state}` : undefined}
          className={
            routing?.degraded
              ? 'flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200'
              : 'flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200'
          }
        >
          {routing?.degraded ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          {t('routingApiLabel')}:{' '}
          {routing?.degraded ? t('routingApiDegraded') : t('routingApiOnline')}
          {routing?.circuit?.state && routing.circuit.state !== 'CLOSED' && (
            <span className="font-mono text-xs">({routing.circuit.state})</span>
          )}
        </span>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRunAction('routing-api', { mode: 'DOWN' })}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>{t('simRoutingDown')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRunAction('routing-api', { mode: 'SLOW' })}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
        >
          <Timer className="h-3.5 w-3.5" />
          <span>{t('simRoutingSlow')}</span>
        </button>

        <button
          type="button"
          disabled={isBusy}
          onClick={() => onRunAction('routing-api', { mode: 'HEALTHY' })}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span>{t('simRoutingHealthy')}</span>
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
