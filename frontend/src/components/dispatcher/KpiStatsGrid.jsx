import {
  AlertTriangle,
  Building,
  CheckCircle2,
  RouteOff,
  Siren,
  Truck,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function KpiStatsGrid({ summary = {} }) {
  const { t } = useI18n();

  const cards = [
    {
      label: t('kpiActiveSos'),
      value: summary.activeSosCount ?? 0,
      sub: t('kpiPrioritySub', {
        priority: summary.prioritySosCount ?? 0,
        pending: summary.pendingSosCount ?? 0,
      }),
      icon: Siren,
      tone: 'border-red-500/30 bg-red-950/20 text-red-300',
    },
    {
      label: t('kpiActiveAlerts'),
      value: summary.activeAlertsCount ?? 0,
      sub: t('kpiCrisisAlgo'),
      icon: AlertTriangle,
      tone:
        (summary.activeAlertsCount ?? 0) > 0
          ? 'border-red-500/60 bg-red-950/40 text-red-200'
          : 'border-slate-800 bg-slate-900/90 text-slate-300',
    },
    {
      label: t('kpiBrigades'),
      value: `${summary.dispatchedBrigadesCount ?? 0} / ${
        (summary.dispatchedBrigadesCount ?? 0) + (summary.availableBrigadesCount ?? 0)
      }`,
      sub: t('kpiBrigadesSub', { count: summary.availableBrigadesCount ?? 0 }),
      icon: Truck,
      tone: 'border-cyan-500/30 bg-cyan-950/20 text-cyan-300',
    },
    {
      label: t('kpiOpenShelters'),
      value: summary.openSheltersCount ?? 0,
      sub: t('kpiCrowdedSub', { count: summary.crowdedSheltersCount ?? 0 }),
      icon: Building,
      tone: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
    },
    {
      label: t('kpiClosedRoads'),
      value: summary.closedRoadsCount ?? 0,
      sub: t('kpiAutoRouteSub'),
      icon: RouteOff,
      tone: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
    },
    {
      label: t('kpiSafeConfirmations'),
      value: summary.safeConfirmationsCount ?? 0,
      sub: t('kpiCitizenStatusSub'),
      icon: CheckCircle2,
      tone: 'border-slate-800 bg-slate-900/90 text-emerald-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-xl border px-3 py-2.5 ${card.tone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">
                {card.label}
              </span>
              <Icon className="h-4 w-4 shrink-0 opacity-85" />
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-white">
              {card.value}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
