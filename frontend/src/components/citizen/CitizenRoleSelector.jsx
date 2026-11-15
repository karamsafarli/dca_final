import { Accessibility, User } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

export function CitizenRoleSelector({ citizenCategory, onChange }) {
  const { t } = useI18n();
  const isSpecialCare = citizenCategory === 'SPECIAL_CARE';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Accessibility className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">{t('citizenRoleTitle')}</h2>
        </div>
        {isSpecialCare && (
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-extrabold text-cyan-300 ring-1 ring-cyan-500/40">
            Priority #1
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange('STANDARD')}
          className={cn(
            'flex flex-col items-start rounded-xl border p-2.5 text-left transition',
            !isSpecialCare
              ? 'border-emerald-500/60 bg-emerald-950/35 text-white ring-1 ring-emerald-500/30'
              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/70'
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <User className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t('roleStandard')}</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            {t('roleStandardDesc')}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChange('SPECIAL_CARE')}
          className={cn(
            'flex flex-col items-start rounded-xl border p-2.5 text-left transition',
            isSpecialCare
              ? 'border-cyan-400 bg-cyan-950/50 text-white ring-1 ring-cyan-400/50'
              : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/70'
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Accessibility className="h-3.5 w-3.5 text-cyan-300" />
            <span>{t('roleSpecialCare')}</span>
          </div>
          <p className="mt-1 text-xs leading-snug text-slate-300">
            {t('roleSpecialCareDesc')}
          </p>
        </button>
      </div>
    </div>
  );
}
