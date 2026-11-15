import { ChevronDown, FlaskConical, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Button, StatusDot } from '../ui/primitives';

const STORAGE_KEY = 'urban_crisis_demo_bar';

/**
 * Demo / jury tool, not part of an operator's daily screen: collapsed by
 * default (remembered per browser) and visually quiet.
 */
export function SimulationBar({ zones = [], assemblyPoints = [], routing, onRunAction, canReset = false, isBusy }) {
  const { t } = useI18n();
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'open';
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setIsOpen((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, prev ? 'closed' : 'open');
      } catch {
        // storage unavailable
      }
      return !prev;
    });

  const zoneId = zones.find((z) => z.id === selectedZoneId)?.id ?? zones[0]?.id ?? '';
  const openPoint =
    assemblyPoints.find((ap) => ap.status === 'OPEN' && ap.zoneId === zoneId) ||
    assemblyPoints.find((ap) => ap.status === 'OPEN') ||
    assemblyPoints[0];

  return (
    <div className="rounded-xl border border-dashed border-line-strong">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-muted transition hover:text-fg"
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {t('demoScenariosToggle')}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-dashed border-line-strong px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-faint">{t('simGroupCrisis')}</span>
            <select
              aria-label={t('selectDistrictLabel')}
              value={zoneId}
              onChange={(e) => setSelectedZoneId(Number(e.target.value))}
              className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-fg focus:outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <Button size="sm" disabled={isBusy || !zoneId} onClick={() => onRunAction('sos-burst', { zoneId })}>
              {t('sim4Sos')}
            </Button>
            <Button
              size="sm"
              disabled={isBusy || !zoneId}
              onClick={() => onRunAction('road-toggle', { zoneId, status: 'CLOSED' })}
            >
              {t('simCloseRoad')}
            </Button>
            <Button
              size="sm"
              disabled={isBusy || !openPoint}
              onClick={() => onRunAction('occupancy-spike', { assemblyPointId: openPoint?.id, targetPercent: 92 })}
            >
              {t('simSpike92')}
            </Button>
            <Button
              size="sm"
              disabled={isBusy || !openPoint}
              onClick={() => onRunAction('occupancy-spike', { assemblyPointId: openPoint?.id, targetPercent: 97 })}
            >
              {t('simSpike97')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-faint">{t('simGroupRouting')}</span>
            <span data-testid="routing-api-status" title={routing?.circuit ? `Circuit: ${routing.circuit.state}` : undefined}>
              <StatusDot tone={routing?.degraded ? 'warning' : 'success'}>
                {routing?.degraded ? t('routingApiDegraded') : t('routingApiOnline')}
                {routing?.circuit?.state && routing.circuit.state !== 'CLOSED' && (
                  <span className="font-mono">({routing.circuit.state})</span>
                )}
              </StatusDot>
            </span>
            <Button size="sm" disabled={isBusy} onClick={() => onRunAction('routing-api', { mode: 'DOWN' })}>
              {t('simRoutingDown')}
            </Button>
            <Button size="sm" disabled={isBusy} onClick={() => onRunAction('routing-api', { mode: 'SLOW' })}>
              {t('simRoutingSlow')}
            </Button>
            <Button size="sm" disabled={isBusy} onClick={() => onRunAction('routing-api', { mode: 'HEALTHY' })}>
              {t('simRoutingHealthy')}
            </Button>
            {canReset && (
              <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => onRunAction('reset')}>
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                {t('simReset')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
