import {
  Accessibility,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Flame,
  HeartPulse,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { useState } from 'react';
import { HAZARD_TYPES } from '../../constants/labels';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

const HAZARD_ICONS = {
  FIRE: Flame,
  COLLAPSE: Building2,
  FLOOD: Waves,
  MEDICAL: HeartPulse,
};

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

  const handleHazardClick = (hazardType) => {
    onSendSos({
      hazardType,
      citizenName: citizenName.trim() || undefined,
      notes: notes.trim() || undefined,
      citizenCategory,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="text-sm font-bold text-white">{t('sosPanelTitle')}</h2>
        </div>
        {isSpecialCare && (
          <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/20 px-2 py-0.5 text-xs font-bold text-fuchsia-300 ring-1 ring-fuchsia-500/40">
            <Accessibility className="h-3 w-3" />
            {t('priorityBadge')}
          </span>
        )}
      </div>

      {activeSos ? (
        <div
          className={cn(
            'mb-3 rounded-xl border p-3.5',
            activeSos.priorityLevel === 1 || activeSos.citizenCategory === 'SPECIAL_CARE'
              ? 'border-fuchsia-500/70 bg-fuchsia-950/35'
              : 'border-red-500/50 bg-red-950/50'
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 sos-pulse-dot" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-300">
                  {t('activeSosBannerTitle')}
                </span>
                {(activeSos.priorityLevel === 1 ||
                  activeSos.citizenCategory === 'SPECIAL_CARE') && (
                  <span className="rounded bg-fuchsia-600/80 px-1.5 py-0.5 text-xs font-extrabold text-white">
                    {t('priorityBadge')}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {t('hazardLabel')}: {t(`hazards.${activeSos.hazardType}`)} (
                {activeSos.zone?.name || t('zoneLabel')})
              </p>
              <p className="text-xs text-red-200/80">
                {t('codeLabel')}: <span className="font-mono">{activeSos.citizenCode}</span> •{' '}
                {t('statusLabel')}:{' '}
                {activeSos.status === 'DISPATCHED'
                  ? t('sosDispatchedNote')
                  : t('sosPendingNote')}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onMarkSafe(activeSos.id)}
            className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <ShieldCheck className="h-5 w-5" />
            <span>{t('markSafeBtn')}</span>
          </button>
        </div>
      ) : (
        lastSafeConfirmedAt && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{t('safeConfirmedBanner')}</span>
          </div>
        )
      )}

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={citizenName}
          onChange={(e) => setCitizenName(e.target.value)}
          placeholder={t('namePlaceholder')}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('notesPlaceholder')}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
        />
      </div>

      <p className="mb-2 text-xs font-medium text-slate-400">{t('sosInstruction')}</p>

      <div className="grid grid-cols-2 gap-2">
        {HAZARD_TYPES.map((hazard) => {
          const Icon = HAZARD_ICONS[hazard.value];
          return (
            <button
              key={hazard.value}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleHazardClick(hazard.value)}
              className={cn(
                'flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition active:scale-[0.98] disabled:opacity-50',
                hazard.color,
                isSpecialCare && 'ring-1 ring-fuchsia-500/50',
                'hover:brightness-125'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>
                {t('sosPrefix')}: {t(`hazards.${hazard.value}`)}
              </span>
            </button>
          );
        })}
      </div>

      {!activeSos && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onMarkSafe(null)}
          className="mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t('markSafeQuickBtn')}</span>
        </button>
      )}
    </div>
  );
}
