import { Accessibility, Send, ShieldCheck } from 'lucide-react';
import { HAZARD_LABEL_MAP, RISK_LEVEL_STYLES } from '../../constants/labels';
import { useI18n } from '../../i18n/I18nContext';
import { cn, formatTimeAgo } from '../../lib/utils';

export function SosFeedList({ zones = [], sosSignals = [], onDispatch, isBusy }) {
  const { lang, t } = useI18n();

  return (
    <div className="space-y-3">
      {/* Zone Status Chips */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('zoneStatusTitle')}
        </h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
          {zones.map((zone) => {
            const risk = RISK_LEVEL_STYLES[zone.riskLevel] || RISK_LEVEL_STYLES.LOW;
            return (
              <div
                key={zone.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{zone.name}</div>
                  <div className="text-xs text-slate-400">
                    {t('zoneStatsLine', {
                      sos: zone.activeSosCount,
                      shelters: zone.openSheltersCount,
                      brigades: zone.activeBrigadesCount,
                    })}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-lg border px-2 py-0.5 text-xs font-bold',
                    risk.cls
                  )}
                >
                  {t(`riskLevels.${zone.riskLevel || 'LOW'}`)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live SOS Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t('sosFeedTitle', { count: sosSignals.length })}
          </h3>
        </div>

        <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {sosSignals.map((sos) => {
            const hazard = HAZARD_LABEL_MAP[sos.hazardType];
            const isSafe = sos.citizenStatus === 'SAFE' || sos.status === 'RESOLVED';
            const isPriority =
              !isSafe &&
              (sos.priorityLevel === 1 || sos.citizenCategory === 'SPECIAL_CARE');

            return (
              <div
                key={sos.id}
                className={cn(
                  'rounded-xl border p-3 text-xs transition',
                  isSafe
                    ? 'border-emerald-500/25 bg-emerald-950/15 opacity-75'
                    : isPriority
                    ? 'border-fuchsia-500/75 bg-fuchsia-950/35 ring-1 ring-fuchsia-500/40'
                    : sos.status === 'PENDING'
                    ? 'border-red-500/40 bg-red-950/20'
                    : 'border-amber-500/35 bg-amber-950/15'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isPriority && (
                      <div className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-fuchsia-600 px-2 py-0.5 text-xs font-extrabold text-white shadow">
                        <Accessibility className="h-3 w-3" />
                        <span>{t('priorityBadge')}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md border px-1.5 py-0.5 text-xs font-bold',
                          isSafe
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                            : hazard?.color
                        )}
                      >
                        {isSafe ? t('safeBadge') : t(`hazards.${sos.hazardType}`)}
                      </span>
                      <span className="font-bold text-white">
                        {sos.citizenName || sos.citizenCode}
                      </span>
                      <span className="text-xs text-slate-400">
                        • {sos.zone?.name}
                      </span>
                    </div>

                    {sos.notes && (
                      <p className="mt-1 text-xs text-slate-300">{sos.notes}</p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{formatTimeAgo(sos.createdAt, lang)}</span>
                      {sos.assignedBrigade && (
                        <span className="font-semibold text-cyan-300">
                          {t('assignedBrigade')}: {sos.assignedBrigade.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isSafe && sos.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDispatch(sos.id)}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      <span>{t('dispatchBrigadeBtn')}</span>
                    </button>
                  )}

                  {isSafe && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
