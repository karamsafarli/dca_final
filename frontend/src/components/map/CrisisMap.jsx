import { useEffect } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useI18n } from '../../i18n/I18nContext';
import { formatDistance } from '../../lib/utils';

const BAKU_CENTER = [40.3825, 49.845];

function MapClickHandler({ enabled, onPickCoordinate }) {
  useMapEvents({
    click(e) {
      if (enabled && onPickCoordinate) {
        onPickCoordinate({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
  });
  return null;
}

function MapViewportUpdater({ focusCenter }) {
  const map = useMap();
  useEffect(() => {
    if (focusCenter && focusCenter.length === 2) {
      map.panTo(focusCenter, { animate: true, duration: 0.6 });
    }
  }, [focusCenter, map]);
  return null;
}

function getShelterColor(point, accessibleOnly) {
  if (point.isRecommended) return '#10b981';
  if (accessibleOnly && point.isWheelchairAccessible === false) return '#a855f7';
  if (point.status === 'STANDBY') return '#818cf8';
  if (point.status === 'CLOSED') return '#64748b';
  if (point.status === 'FULL' || (point.occupancyPercent ?? 0) >= 90) return '#ef4444';
  if ((point.occupancyPercent ?? 0) >= 70) return '#f59e0b';
  return '#06b6d4';
}

export function CrisisMap({
  mode = 'citizen',
  accessibleOnly = false,
  origin = null,
  focusCenter = null,
  pickMode = false,
  onPickCoordinate = null,
  roads = [],
  assemblyPoints = [],
  recommendedRoute = null,
  idealBlockedPolyline = null,
  sosSignals = [],
  rescueBrigades = [],
  alerts = [],
  onSelectShelter = null,
}) {
  const { t } = useI18n();

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      {pickMode && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-blue-600/95 px-4 py-1.5 text-xs font-semibold text-white shadow-lg ring-1 ring-blue-300/40">
          {t('mapPickBanner')}
        </div>
      )}

      <MapContainer
        center={focusCenter || BAKU_CENTER}
        zoom={13}
        className="h-full w-full"
        style={{ cursor: pickMode ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler enabled={pickMode} onPickCoordinate={onPickCoordinate} />
        <MapViewportUpdater focusCenter={focusCenter} />

        {/* Road Network Segments */}
        {roads.map((road) => {
          const positions = Array.isArray(road.waypoints) ? road.waypoints : [];
          if (positions.length < 2) return null;

          const isClosed = road.status === 'CLOSED';
          const isCongested = road.status === 'CONGESTED';
          const isInaccessible = accessibleOnly && road.isWheelchairAccessible === false;

          const color = isClosed
            ? '#ef4444'
            : isInaccessible
            ? '#a855f7'
            : isCongested
            ? '#f59e0b'
            : '#475569';

          return (
            <Polyline
              key={`road-${road.id}`}
              positions={positions}
              pathOptions={{
                color,
                weight: isClosed || isInaccessible ? 5 : isCongested ? 4 : 2.5,
                opacity: isClosed || isInaccessible ? 0.9 : isCongested ? 0.85 : 0.55,
                dashArray: isClosed ? '8 8' : isInaccessible ? '4 6' : undefined,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-white">{road.name}</div>
                  <div>
                    {t('statusLabel')}:{' '}
                    <span
                      className={
                        isClosed
                          ? 'font-semibold text-red-400'
                          : isCongested
                          ? 'font-semibold text-amber-400'
                          : 'font-semibold text-emerald-400'
                      }
                    >
                      {t(`roadStatuses.${road.status}`)}
                    </span>
                  </div>
                  {road.isWheelchairAccessible === false && (
                    <div className="font-semibold text-fuchsia-300">
                      {t('inaccessibleTag')}
                      {road.accessibilityNotes ? ` (${road.accessibilityNotes})` : ''}
                    </div>
                  )}
                  {road.closureReason && (
                    <div className="text-red-300">
                      {t('popupReason')}: {road.closureReason}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Blocked primary ideal route comparison (if rerouted) */}
        {idealBlockedPolyline && idealBlockedPolyline.length >= 2 && (
          <Polyline
            positions={idealBlockedPolyline}
            pathOptions={{
              color: '#f43f5e',
              weight: 3,
              opacity: 0.55,
              dashArray: '4 8',
            }}
          />
        )}

        {/* Active recommended evacuation route */}
        {recommendedRoute && recommendedRoute.length >= 2 && (
          <Polyline
            positions={recommendedRoute}
            pathOptions={{
              color: '#10b981',
              weight: 6,
              opacity: 0.95,
            }}
          />
        )}

        {/* 500m Crisis Radius Circles for Active Red Alerts */}
        {mode === 'dispatcher' &&
          alerts
            .filter((a) => a.status === 'ACTIVE')
            .map((alert) => (
              <Circle
                key={`alert-radius-${alert.id}`}
                center={[alert.centerLat, alert.centerLng]}
                radius={500}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.16,
                  weight: 2,
                  dashArray: '6 4',
                }}
              />
            ))}

        {/* Assembly Points */}
        {assemblyPoints
          .filter((ap) => mode === 'dispatcher' || ap.status !== 'STANDBY')
          .map((point) => {
            const color = getShelterColor(point, accessibleOnly);
            const radius = point.isRecommended ? 11 : 8;
            return (
              <CircleMarker
                key={`ap-${point.id}`}
                center={[point.lat, point.lng]}
                radius={radius}
                pathOptions={{
                  color: point.isRecommended ? '#ffffff' : color,
                  fillColor: color,
                  fillOpacity: point.status === 'STANDBY' ? 0.45 : 0.9,
                  weight: point.isRecommended ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => onSelectShelter?.(point),
                }}
              >
                <Popup>
                  <div className="min-w-[190px] space-y-1 text-xs">
                    <div className="font-bold text-white">{point.name}</div>
                    <div className="text-slate-300">
                      {t('popupType')}: {t(`pointTypes.${point.type}`)} • {t('statusLabel')}
                      : {t(`pointStatuses.${point.status}`)}
                    </div>
                    <div
                      className={
                        point.isWheelchairAccessible === false
                          ? 'font-semibold text-fuchsia-300'
                          : 'font-semibold text-cyan-300'
                      }
                    >
                      {point.isWheelchairAccessible === false
                        ? t('inaccessibleTag')
                        : t('accessibleTag')}
                    </div>
                    <div>
                      {t('popupOccupancy')}:{' '}
                      <span className="font-bold text-white">
                        {point.occupancyPercent}%
                      </span>{' '}
                      ({point.currentOccupancy}/{point.capacity})
                    </div>
                    {point.route?.reachable && (
                      <div className="text-emerald-300">
                        {t('popupDistance')}: {formatDistance(point.route.distanceMeters)} (
                        {point.route.estimatedMinutes} {t('popupMin')})
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">{point.address}</div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Citizen Origin Marker */}
        {origin && (
          <CircleMarker
            center={[origin.lat, origin.lng]}
            radius={10}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#3b82f6',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-blue-300">{t('popupYourLocation')}</div>
                <div>
                  {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Active SOS Signals */}
        {sosSignals
          .filter((s) => s.citizenStatus === 'SOS' && s.status !== 'RESOLVED')
          .map((sos) => {
            const isPriority =
              sos.priorityLevel === 1 || sos.citizenCategory === 'SPECIAL_CARE';
            return (
              <CircleMarker
                key={`sos-${sos.id}`}
                center={[sos.lat, sos.lng]}
                radius={isPriority ? 10 : 8}
                pathOptions={{
                  color: isPriority ? '#f0abfc' : '#fecaca',
                  fillColor: isPriority ? '#d946ef' : '#ef4444',
                  fillOpacity: 0.95,
                  weight: isPriority ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    {isPriority && (
                      <div className="font-extrabold text-fuchsia-300">
                        {t('priorityBadge')}
                      </div>
                    )}
                    <div className="font-bold text-red-400">
                      {t('sosPrefix')} — {t(`hazards.${sos.hazardType}`)}
                    </div>
                    <div>
                      {t('popupCitizen')}: {sos.citizenName || sos.citizenCode}
                    </div>
                    <div>
                      {t('zoneLabel')}: {sos.zone?.name}
                    </div>
                    {sos.notes && <div className="text-slate-300">{sos.notes}</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* Rescue Brigades (Dispatcher Mode) */}
        {mode === 'dispatcher' &&
          rescueBrigades.map((brg) => (
            <CircleMarker
              key={`brg-${brg.id}`}
              center={[brg.lat, brg.lng]}
              radius={7}
              pathOptions={{
                color: '#0f172a',
                fillColor: brg.status === 'DISPATCHED' ? '#f59e0b' : '#38bdf8',
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-cyan-300">{brg.name}</div>
                  <div>
                    {t('popupBrigadeCode')}: {brg.code}
                  </div>
                  <div>
                    {t('popupType')}: {t(`brigadeTypes.${brg.unitType}`)}
                  </div>
                  <div>
                    {t('statusLabel')}: {t(`brigadeStatuses.${brg.status}`)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="pointer-events-auto absolute bottom-3 left-3 z-[450] flex flex-wrap gap-2 rounded-xl border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-[11px] text-slate-200 backdrop-blur">
        {origin && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
            {t('legendOrigin')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          {t('legendRecommended')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
          {t('legendOpen')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          {t('legendFullSos')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-red-500" />
          {t('legendClosedRoad')}
        </span>
        {accessibleOnly && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dotted border-fuchsia-400" />
            {t('legendInaccessibleRoad')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded bg-emerald-500" />
          {t('legendRoute')}
        </span>
      </div>
    </div>
  );
}
