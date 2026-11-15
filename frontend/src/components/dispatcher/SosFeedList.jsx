import { Accessibility, Send } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn, formatTimeAgo } from '../../lib/utils';
import { Button, Card, CardHeader, StatusDot } from '../ui/primitives';

const RISK_TONE = { LOW: 'success', MEDIUM: 'warning', HIGH: 'warning', CRITICAL: 'danger' };

export function SosFeedList({ zones = [], sosSignals = [], onDispatch, isBusy }) {
  const { lang, t } = useI18n();

  return (
    <div className="space-y-4">
      <Card aria-labelledby="sos-feed-title">
        <CardHeader id="sos-feed-title" title={t('sosFeedTitle', { count: sosSignals.length })} />
        <ul className="mt-3 max-h-[420px] divide-y divide-line overflow-y-auto border-t border-line">
          {sosSignals.length === 0 && <li className="px-4 py-6 text-sm text-muted">—</li>}
          {sosSignals.map((sos) => {
            const isSafe = sos.citizenStatus === 'SAFE' || sos.status === 'RESOLVED';
            const isPriority = !isSafe && (sos.priorityLevel === 1 || sos.citizenCategory === 'SPECIAL_CARE');
            const tone = isSafe ? 'success' : sos.status === 'PENDING' ? 'danger' : 'warning';

            return (
              <li
                key={sos.id}
                className={cn('relative px-4 py-3', isSafe && 'opacity-60')}
              >
                {isPriority && (
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-priority" aria-hidden="true" />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-fg">
                        {isSafe ? t('safeBadge') : t(`hazards.${sos.hazardType}`)}
                      </span>
                      {isPriority && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-priority-fg">
                          <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('priorityBadge')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {sos.citizenName || sos.citizenCode} · {sos.zone?.name}
                    </p>
                    {sos.notes && <p className="mt-1 text-sm text-fg/80">{sos.notes}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <StatusDot tone={tone}>
                        {isSafe
                          ? t('safeBadge')
                          : sos.assignedBrigade
                          ? `${t('assignedBrigade')}: ${sos.assignedBrigade.name}`
                          : t('sosPendingNote')}
                      </StatusDot>
                      <span className="text-xs text-faint tabular">{formatTimeAgo(sos.createdAt, lang)}</span>
                    </div>
                  </div>
                  {onDispatch && !isSafe && sos.status === 'PENDING' && (
                    <Button variant="ink" size="sm" disabled={isBusy} onClick={() => onDispatch(sos.id)}>
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('dispatchBrigadeBtn')}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card aria-labelledby="zones-title">
        <CardHeader id="zones-title" title={t('zoneStatusTitle')} />
        <ul className="mt-3 divide-y divide-line border-t border-line">
          {zones.map((zone) => (
            <li key={zone.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">{zone.name}</div>
                <div className="text-xs text-muted tabular">
                  {t('zoneStatsLine', {
                    sos: zone.activeSosCount,
                    shelters: zone.openSheltersCount,
                    brigades: zone.activeBrigadesCount,
                  })}
                </div>
              </div>
              <StatusDot tone={RISK_TONE[zone.riskLevel] || 'success'}>
                {t(`riskLevels.${zone.riskLevel || 'LOW'}`)}
              </StatusDot>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
