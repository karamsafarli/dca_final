import { Compass, Crosshair, MapPin } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

export function ZoneCoordinateSelector({
  zones = [],
  selectedZoneId,
  origin,
  pickMode,
  onSelectZone,
  onTogglePickMode,
  onUseGps,
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">{t('locationTitle')}</h2>
        </div>
        {origin && (
          <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
            {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="zone-select"
            className="mb-1 block text-xs font-medium text-slate-400"
          >
            {t('selectDistrictLabel')}
          </label>
          <select
            id="zone-select"
            value={selectedZoneId || ''}
            onChange={(e) => onSelectZone(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onTogglePickMode}
            className={cn(
              'flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition',
              pickMode
                ? 'border-blue-400 bg-blue-600 text-white'
                : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
            )}
          >
            <Crosshair className="h-4 w-4 shrink-0" />
            <span>{pickMode ? t('pickingActive') : t('pickOnMap')}</span>
          </button>

          <button
            type="button"
            onClick={onUseGps}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <Compass className="h-4 w-4 shrink-0 text-cyan-400" />
            <span>{t('useGps')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
