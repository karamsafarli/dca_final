import { useI18n } from '../../i18n/I18nContext';
import { Card, CardHeader, StatusDot } from '../ui/primitives';

const STATUS_TONE = { AVAILABLE: 'success', DISPATCHED: 'warning', STANDBY: 'neutral' };

export function BrigadeStatusList({ rescueBrigades = [] }) {
  const { t } = useI18n();
  return (
    <Card aria-labelledby="brigades-title">
      <CardHeader id="brigades-title" title={t('brigadesTitle', { count: rescueBrigades.length })} />
      <ul className="mt-3 max-h-[480px] divide-y divide-line overflow-y-auto border-t border-line">
        {rescueBrigades.map((brg) => (
          <li key={brg.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-fg">{brg.name}</div>
              <div className="truncate text-xs text-muted">
                {brg.zone?.name} · {t(`brigadeTypes.${brg.unitType}`)}
              </div>
            </div>
            <StatusDot tone={STATUS_TONE[brg.status]}>{t(`brigadeStatuses.${brg.status}`)}</StatusDot>
          </li>
        ))}
      </ul>
    </Card>
  );
}
