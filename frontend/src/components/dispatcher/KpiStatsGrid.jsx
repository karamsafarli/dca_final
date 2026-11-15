import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

/** Neutral metric strip; a value turns red/amber only when it needs attention. */
export function KpiStatsGrid({ summary = {} }) {
  const { t } = useI18n();
  const total = (summary.dispatchedBrigadesCount ?? 0) + (summary.availableBrigadesCount ?? 0);

  const metrics = [
    {
      label: t('kpiActiveSos'),
      value: summary.activeSosCount ?? 0,
      sub: t('kpiPrioritySub', { priority: summary.prioritySosCount ?? 0, pending: summary.pendingSosCount ?? 0 }),
      tone: (summary.prioritySosCount ?? 0) > 0 ? 'danger' : null,
    },
    {
      label: t('kpiActiveAlerts'),
      value: summary.activeAlertsCount ?? 0,
      sub: t('kpiCrisisAlgo'),
      tone: (summary.activeAlertsCount ?? 0) > 0 ? 'danger' : null,
    },
    {
      label: t('kpiBrigades'),
      value: `${summary.dispatchedBrigadesCount ?? 0}/${total}`,
      sub: t('kpiBrigadesSub', { count: summary.availableBrigadesCount ?? 0 }),
      tone: (summary.availableBrigadesCount ?? 0) === 0 ? 'warning' : null,
    },
    {
      label: t('kpiOpenShelters'),
      value: summary.openSheltersCount ?? 0,
      sub: t('kpiCrowdedSub', { count: summary.crowdedSheltersCount ?? 0 }),
      tone: (summary.crowdedSheltersCount ?? 0) > 0 ? 'warning' : null,
    },
    {
      label: t('kpiClosedRoads'),
      value: summary.closedRoadsCount ?? 0,
      sub: t('kpiAutoRouteSub'),
      tone: (summary.closedRoadsCount ?? 0) > 0 ? 'warning' : null,
    },
    {
      label: t('kpiSafeConfirmations'),
      value: summary.safeConfirmationsCount ?? 0,
      sub: t('kpiCitizenStatusSub'),
      tone: null,
    },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 xl:grid-cols-6 [&>*]:bg-surface gap-px">
      {metrics.map((m) => (
        <div key={m.label} className="px-4 py-3">
          <dt className="truncate text-xs text-muted">{m.label}</dt>
          <dd
            className={cn(
              'mt-1 text-2xl font-semibold tracking-tight tabular',
              m.tone === 'danger' ? 'text-danger-fg' : m.tone === 'warning' ? 'text-warning-fg' : 'text-fg'
            )}
          >
            {m.value}
          </dd>
          <dd className="mt-0.5 truncate text-xs text-faint">{m.sub}</dd>
        </div>
      ))}
    </dl>
  );
}
