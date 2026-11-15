import { Check, CheckCircle2, Siren, X } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { formatTimeAgo } from '../../lib/utils';
import { Button } from '../ui/primitives';

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

  if (activeAlerts.length === 0 && recentExecuted.length === 0) return null;

  return (
    <div className="space-y-2">
      {activeAlerts.map((alert) => (
        <section
          key={alert.id}
          role="alert"
          className="relative overflow-hidden rounded-xl border border-danger/40 bg-surface"
        >
          <span className="absolute inset-y-0 left-0 w-1 bg-danger" aria-hidden="true" />
          <div className="flex flex-col gap-4 p-4 pl-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="sos-pulse-dot mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                <Siren className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-danger-fg">
                  {t('redAlertTag')} · {alert.zone?.name} ·{' '}
                  <span className="tabular">{formatTimeAgo(alert.createdAt, lang)}</span>
                </p>
                <h2 className="mt-1 text-base font-semibold text-fg">{t('redAlertTitle')}</h2>
                <p className="mt-0.5 text-sm text-muted">{describeAlert(alert, t)}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {onExecute && (
              <Button variant="danger" size="lg" disabled={isBusy} onClick={() => onExecute(alert.id)}>
                <Check className="h-5 w-5" aria-hidden="true" />
                {t('redAlertExecuteBtn')}
              </Button>
              )}
              {onDismiss && (
              <Button
                variant="ghost"
                size="lg"
                disabled={isBusy}
                onClick={() => onDismiss(alert.id)}
                title={t('closeBtn')}
                aria-label={t('closeBtn')}
                className="w-12 px-0"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
              )}
            </div>
          </div>
        </section>
      ))}

      {recentExecuted.map((item) => (
        <div
          key={`exec-${item.id}`}
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2 text-muted">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success-fg" aria-hidden="true" />
            <span className="font-medium text-fg">
              {t('executedLabel')} · {item.zone?.name}
            </span>
            <span className="truncate">
              {t('executedSummary', {
                brigade: item.actionTaken?.dispatchedBrigade?.name || '—',
                shelter: item.actionTaken?.openedAssemblyPoint?.name || '—',
              })}
            </span>
          </span>
          <span className="text-xs text-faint tabular">{formatTimeAgo(item.executedAt, lang)}</span>
        </div>
      ))}
    </div>
  );
}
