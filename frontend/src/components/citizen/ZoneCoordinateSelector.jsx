import { Crosshair, LocateFixed } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { Button, Card, CardHeader } from '../ui/primitives';

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
    <Card aria-labelledby="location-title">
      <CardHeader
        id="location-title"
        title={t('locationTitle')}
        aside={
          origin && (
            <span className="font-mono text-xs text-faint tabular">
              {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
            </span>
          )
        }
      />
      <div className="space-y-2 p-4 pt-3">
        <label htmlFor="zone-select" className="sr-only">
          {t('selectDistrictLabel')}
        </label>
        <select
          id="zone-select"
          value={selectedZoneId || ''}
          onChange={(e) => onSelectZone(Number(e.target.value))}
          className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-fg focus:border-line-strong focus:outline-none"
        >
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={pickMode ? 'ink' : 'secondary'}
            onClick={onTogglePickMode}
            aria-pressed={pickMode}
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            {pickMode ? t('pickingActive') : t('pickOnMap')}
          </Button>
          <Button variant="secondary" onClick={onUseGps}>
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {t('useGps')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
