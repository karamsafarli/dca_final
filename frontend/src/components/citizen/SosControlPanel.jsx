import { Accessibility, Building2, ChevronRight, Flame, HeartPulse, ShieldCheck, Waves } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Button, Card, CardHeader } from '../ui/primitives';

const HAZARDS = [
  { value: 'FIRE', icon: Flame, tone: 'text-warning-fg' },
  { value: 'COLLAPSE', icon: Building2, tone: 'text-danger-fg' },
  { value: 'FLOOD', icon: Waves, tone: 'text-info-fg' },
  { value: 'MEDICAL', icon: HeartPulse, tone: 'text-success-fg' },
];

export function SosControlPanel({
  activeSos,
  lastSafeConfirmedAt,
  citizenCategory = 'STANDARD',
  isSubmitting,
  onSendSos,
  onMarkSafe,
}) {
  const { t } = useI18n();
  const [citizenName, setCitizenName] = useState('');
  const [notes, setNotes] = useState('');
  const isSpecialCare = citizenCategory === 'SPECIAL_CARE';
  const isPriority = activeSos && (activeSos.priorityLevel === 1 || activeSos.citizenCategory === 'SPECIAL_CARE');

  const send = (hazardType) =>
    onSendSos({
      hazardType,
      citizenName: citizenName.trim() || undefined,
      notes: notes.trim() || undefined,
      citizenCategory,
    });

  return (
    <Card aria-labelledby="sos-title">
      <CardHeader
        id="sos-title"
        title={t('sosPrefix')}
        description={t('sosCardHint')}
        aside={
          isSpecialCare && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-priority/10 px-2 py-1 text-xs font-medium text-priority-fg">
              <Accessibility className="h-3.5 w-3.5" aria-hidden="true" />
              {t('priorityBadge')}
            </span>
          )
        }
      />

      <div className="space-y-3 p-4">
        {activeSos ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3.5" role="status">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-danger sos-pulse-dot" aria-hidden="true" />
              <span className="text-sm font-semibold text-danger-fg">{t('activeSosBannerTitle')}</span>
              {isPriority && (
                <span className="rounded bg-priority px-1.5 py-0.5 text-xs font-medium text-white">
                  {t('priorityBadge')}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-fg">
              {t(`hazards.${activeSos.hazardType}`)}
              {activeSos.zone?.name ? ` · ${activeSos.zone.name}` : ''}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {activeSos.status === 'DISPATCHED' ? t('sosDispatchedNote') : t('sosPendingNote')}
            </p>
            <Button
              variant="success"
              size="lg"
              className="mt-3 w-full"
              disabled={isSubmitting}
              onClick={() => onMarkSafe(activeSos.id)}
            >
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              {t('markSafeBtn')}
            </Button>
          </div>
        ) : (
          lastSafeConfirmedAt && (
            <p role="status" className="flex items-center gap-2 text-sm text-success-fg">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t('safeConfirmedBanner')}
            </p>
          )
        )}

        <div className="grid grid-cols-2 gap-2">
          {HAZARDS.map(({ value, icon: Icon, tone }) => (
            <button
              key={value}
              type="button"
              disabled={isSubmitting}
              onClick={() => send(value)}
              className="group flex min-h-[64px] flex-col items-start justify-between gap-2 rounded-lg border border-line bg-canvas p-3 text-left transition hover:border-danger/50 hover:bg-danger/5 active:scale-[0.99] disabled:opacity-50"
            >
              <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
              <span className="text-sm font-medium text-fg">{t(`hazards.${value}`)}</span>
            </button>
          ))}
        </div>

        <details className="group rounded-lg">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-muted hover:text-fg">
            <ChevronRight className="h-4 w-4 transition group-open:rotate-90" aria-hidden="true" />
            {t('optionalDetails')}
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-2">
            <input
              type="text"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              placeholder={t('namePlaceholder')}
              aria-label={t('namePlaceholder')}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg placeholder-faint focus:border-line-strong focus:outline-none"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              aria-label={t('notesPlaceholder')}
              className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg placeholder-faint focus:border-line-strong focus:outline-none"
            />
          </div>
        </details>

        {!activeSos && (
          <Button variant="secondary" className="w-full" disabled={isSubmitting} onClick={() => onMarkSafe(null)}>
            <ShieldCheck className="h-4 w-4 text-success-fg" aria-hidden="true" />
            {t('markSafeQuickBtn')}
          </Button>
        )}
      </div>
    </Card>
  );
}
