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
import { useTheme } from '../../theme/ThemeContext';

const BAKU_CENTER = [40.3825, 49.845];

/**
 * Standard OpenStreetMap tiles (no API key). They are rendered as a muted,
 * near-monochrome basemap by CSS filters per theme (see index.css), so only
 * our meaningful colours (route, SOS, closures) stand out.
 */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** Marker palette mirroring the CSS tokens (Leaflet needs literal colours). */
const PALETTE = {
  light: {
    safe: '#16a34a', danger: '#dc2626', warning: '#d97706', priority: '#2563eb',
    open: '#0f172a', standby: '#8c8c92', road: '#a3a3a3', halo: '#ffffff', brigade: '#0284c7',
  },
  dark: {
    safe: '#22c55e', danger: '#ef4444', warning: '#f59e0b', priority: '#608cff',
    open: '#e5e7eb', standby: '#70757c', road: '#4b5563', halo: '#0a0b0d', brigade: '#38bdf8',
  },
};

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

function getShelterColor(point, accessibleOnly, c) {
  if (point.isRecommended) return c.safe;
  if (accessibleOnly && point.isWheelchairAccessible === false) return c.priority;
  if (point.status === 'STANDBY' || point.status === 'CLOSED') return c.standby;
  if (point.status === 'FULL' || (point.occupancyPercent ?? 0) >= 90) return c.danger;
  if ((point.occupancyPercent ?? 0) >= 70) return c.warning;
  return c.open;
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
  const { theme } = useTheme();
  const c = PALETTE[theme];

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-line bg-surface">
      {pickMode && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-priority/15 px-4 py-1.5 text-xs font-semibold text-fg ring-1 ring-priority/30">
          {t('mapPickBanner')}
        </div>
      )}

      <MapContainer
        center={focusCenter || BAKU_CENTER}
        zoom={13}
        className="h-full w-full"
        style={{ cursor: pickMode ? 'crosshair' : 'grab' }}
      >
        <TileLayer attribution={ATTRIBUTION} url={TILE_URL} />

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
            ? c.danger
            : isInaccessible
            ? c.priority
            : isCongested
            ? c.warning
            : c.road;

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
                  <div className="font-semibold text-fg">{road.name}</div>
                  <div>
                    {t('statusLabel')}:{' '}
                    <span
                      className={
                        isClosed
                          ? 'font-semibold text-danger-fg'
                          : isCongested
                          ? 'font-semibold text-warning-fg'
                          : 'font-semibold text-success-fg'
                      }
                    >
                      {t(`roadStatuses.${road.status}`)}
                    </span>
                  </div>
                  {road.isWheelchairAccessible === false && (
                    <div className="font-semibold text-priority-fg">
                      {t('inaccessibleTag')}
                      {road.accessibilityNotes ? ` (${road.accessibilityNotes})` : ''}
                    </div>
                  )}
                  {road.closureReason && (
                    <div className="text-danger-fg">
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
              color: c.danger,
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
              color: c.safe,
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
                  color: c.danger,
                  fillColor: c.danger,
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
            const color = getShelterColor(point, accessibleOnly, c);
            const radius = point.isRecommended ? 11 : 8;
            return (
              <CircleMarker
                key={`ap-${point.id}`}
                center={[point.lat, point.lng]}
                radius={radius}
                pathOptions={{
                  color: point.isRecommended ? c.halo : color,
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
                    <div className="font-semibold text-fg">{point.name}</div>
                    <div className="text-muted">
                      {t('popupType')}: {t(`pointTypes.${point.type}`)} • {t('statusLabel')}
                      : {t(`pointStatuses.${point.status}`)}
                    </div>
                    <div
                      className={
                        point.isWheelchairAccessible === false
                          ? 'font-semibold text-priority-fg'
                          : 'font-semibold text-info-fg'
                      }
                    >
                      {point.isWheelchairAccessible === false
                        ? t('inaccessibleTag')
                        : t('accessibleTag')}
                    </div>
                    <div>
                      {t('popupOccupancy')}:{' '}
                      <span className="font-semibold text-fg">
                        {point.occupancyPercent}%
                      </span>{' '}
                      ({point.currentOccupancy}/{point.capacity})
                    </div>
                    {point.route?.reachable && (
                      <div className="text-success-fg">
                        {t('popupDistance')}: {formatDistance(point.route.distanceMeters)} (
                        {point.route.estimatedMinutes} {t('popupMin')})
                      </div>
                    )}
                    <div className="text-xs text-muted">{point.address}</div>
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
              color: c.halo,
              fillColor: c.priority,
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold text-priority-fg">{t('popupYourLocation')}</div>
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
                  color: c.halo,
                  fillColor: isPriority ? c.priority : c.danger,
                  fillOpacity: 0.95,
                  weight: isPriority ? 3 : 2,
                }}
              >
                <Popup>
                  <div className="space-y-1 text-xs">
                    {isPriority && (
                      <div className="font-semibold text-priority-fg">
                        {t('priorityBadge')}
                      </div>
                    )}
                    <div className="font-semibold text-danger-fg">
                      {t('sosPrefix')} — {t(`hazards.${sos.hazardType}`)}
                    </div>
                    <div>
                      {t('popupCitizen')}: {sos.citizenName || sos.citizenCode}
                    </div>
                    <div>
                      {t('zoneLabel')}: {sos.zone?.name}
                    </div>
                    {sos.notes && <div className="text-muted">{sos.notes}</div>}
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
                color: c.halo,
                fillColor: brg.status === 'DISPATCHED' ? c.warning : c.brigade,
                fillOpacity: 0.95,
                weight: 2,
              }}
            >
              <Popup>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-info-fg">{brg.name}</div>
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
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[450] flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs text-muted sm:right-auto">
        {origin && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-priority ring-2 ring-surface" />
            {t('legendOrigin')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          {t('legendRecommended')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-fg" />
          {t('legendOpen')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" />
          {t('legendFullSos')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-danger/40" />
          {t('legendClosedRoad')}
        </span>
        {accessibleOnly && (
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dotted border-priority" />
            {t('legendInaccessibleRoad')}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded bg-success" />
          {t('legendRoute')}
        </span>
      </div>
    </div>
  );
}
