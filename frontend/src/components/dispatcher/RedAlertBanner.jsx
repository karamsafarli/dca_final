import { CheckCircle2, Siren, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatTimeAgo } from '../../lib/utils';

/** Build the alert text from structured fields so it follows the UI language. */
export function describeAlert(alert, t) {
  if (alert.alertType === 'CAPACITY_OVERFLOW') {
    return t('redAlertMsgCapacity', {
      point: alert.assemblyPoint?.name || alert.zone?.name || '—',
      percent: alert.occupancyPercent ?? '>95',
    });
  }
  return t('redAlertMsgCluster', {
    zone: alert.zone?.name || '—',
    count: alert.sosCount || 4,
  });
}

export function RedAlertBanner({ alerts = [], onExecute, onDismiss, isBusy }) {
  const { lang, t } = useI18n();
  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');
  const recentExecuted = alerts.filter((a) => a.status === 'EXECUTED').slice(0, 2);

  if (activeAlerts.length === 0 && recentExecuted.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      {activeAlerts.map((alert) => {
        const displayTitle = t('redAlertTitle');
        const displayMessage = describeAlert(alert, t);

        return (
          <div
            key={alert.id}
            className="rounded-2xl border-2 border-red-500 bg-red-950/80 p-4"
          >
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white sos-pulse-dot">
                  <Siren className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white">
                      {t('redAlertTag')}
                    </span>
                    <span className="text-xs font-semibold text-red-200">
                      {alert.zone?.name} • {formatTimeAgo(alert.createdAt, lang)}
                    </span>
                  </div>
                  <h2 className="mt-1 text-base font-extrabold text-white">
                    {displayTitle}
                  </h2>
                  <p className="mt-0.5 text-sm text-red-100/90">{displayMessage}</p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onExecute(alert.id)}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-red-700 transition hover:bg-emerald-400 hover:text-slate-950 active:scale-[0.98] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t('redAlertExecuteBtn')}</span>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onDismiss(alert.id)}
                  title={t('closeBtn')}
                  aria-label={t('closeBtn')}
                  className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-red-400/40 bg-red-900/50 text-red-200 transition hover:bg-red-800/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {recentExecuted.map((item) => (
        <div
          key={`exec-${item.id}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/35 px-4 py-2.5 text-xs text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>
              <strong className="text-white">
                {t('executedLabel')} ({item.zone?.name}):
              </strong>{' '}
              {t('executedSummary', {
                brigade: item.actionTaken?.dispatchedBrigade?.name || '—',
                shelter: item.actionTaken?.openedAssemblyPoint?.name || '—',
              })}
            </span>
          </div>
          <span className="text-xs text-emerald-300/80">
            {formatTimeAgo(item.executedAt, lang)}
          </span>
        </div>
      ))}
    </div>
  );
}
