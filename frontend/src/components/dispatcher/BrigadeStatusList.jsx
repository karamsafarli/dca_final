import { Truck } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

export function BrigadeStatusList({ rescueBrigades = [] }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5">
      <div className="mb-2.5 flex items-center gap-2">
        <Truck className="h-4 w-4 text-cyan-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('brigadesTitle', { count: rescueBrigades.length })}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {rescueBrigades.map((brg) => (
          <div
            key={brg.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs"
          >
            <div>
              <div className="font-bold text-white">{brg.name}</div>
              <div className="text-[11px] text-slate-400">
                {brg.zone?.name} • {t(`brigadeTypes.${brg.unitType}`)}
              </div>
            </div>

            <span
              className={cn(
                'shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold',
                brg.status === 'DISPATCHED'
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                  : brg.status === 'AVAILABLE'
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
              )}
            >
              {t(`brigadeStatuses.${brg.status}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
