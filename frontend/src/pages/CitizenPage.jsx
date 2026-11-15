import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { CitizenRoleSelector } from '../components/citizen/CitizenRoleSelector';
import { EvacuationRouteCard } from '../components/citizen/EvacuationRouteCard';
import { SosControlPanel } from '../components/citizen/SosControlPanel';
import { ZoneCoordinateSelector } from '../components/citizen/ZoneCoordinateSelector';
import { CrisisMap } from '../components/map/CrisisMap';
import { useI18n } from '../i18n/I18nContext';
import { socket } from '../lib/socket';
import { crisisApi } from '../services/crisisApi';

const CITIZEN_CODE_KEY = 'urban_crisis_citizen_code';
const ACTIVE_SOS_KEY = 'urban_crisis_active_sos';
const CITIZEN_CATEGORY_KEY = 'urban_crisis_citizen_category';

function getOrCreateCitizenCode() {
  const existing = localStorage.getItem(CITIZEN_CODE_KEY);
  if (existing && existing.length >= 20) return existing;
  // getRandomValues also works on plain-http LAN demos, unlike randomUUID
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const generated = `CIT-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
  localStorage.setItem(CITIZEN_CODE_KEY, generated);
  return generated;
}

/** Restore the citizen's own SOS; entries without an access token are unusable. */
function loadStoredSos() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACTIVE_SOS_KEY) || 'null');
    if (saved?.id && saved?.accessToken) return saved;
  } catch {
    // corrupted entry
  }
  localStorage.removeItem(ACTIVE_SOS_KEY);
  return null;
}

export function CitizenPage() {
  const { t } = useI18n();
  const [citizenCode] = useState(getOrCreateCitizenCode);
  const [citizenCategory, setCitizenCategory] = useState(() => {
    const saved = localStorage.getItem(CITIZEN_CATEGORY_KEY);
    return saved === 'SPECIAL_CARE' ? 'SPECIAL_CARE' : 'STANDARD';
  });
  const citizenCategoryRef = useRef(citizenCategory);
  citizenCategoryRef.current = citizenCategory;

  const tRef = useRef(t);
  tRef.current = t;

  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [customCoord, setCustomCoord] = useState(null);
  const [pickMode, setPickMode] = useState(false);
  const [plan, setPlan] = useState(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSafeConfirmedAt, setLastSafeConfirmedAt] = useState(null);

  const [activeSos, setActiveSos] = useState(loadStoredSos);

  const loadEvacuationPlan = useCallback(
    async ({ zoneId, coord, category, silent = false }) => {
      if (!silent) setIsLoadingPlan(true);
      const effectiveCategory = category || citizenCategoryRef.current;
      try {
        const data = await crisisApi.getEvacuationPlan({
          zoneId,
          lat: coord?.lat,
          lng: coord?.lng,
          accessibleOnly: effectiveCategory === 'SPECIAL_CARE',
          citizenCategory: effectiveCategory,
        });
        setPlan(data);
        if (!zoneId && data.selectedZone) {
          setSelectedZoneId(data.selectedZone.id);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (!silent) setIsLoadingPlan(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { zones: zoneList } = await crisisApi.getZones();
        if (!mounted) return;
        setZones(zoneList);
        const firstId = zoneList[0]?.id || null;
        setSelectedZoneId(firstId);
        await loadEvacuationPlan({ zoneId: firstId, coord: null });
      } catch (err) {
        toast.error(err.message);
        setIsLoadingPlan(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadEvacuationPlan]);

  useEffect(() => {
    const handleStateUpdate = async (payload) => {
      if (payload?.reason === 'SYSTEM_RESET') {
        setActiveSos(null);
        localStorage.removeItem(ACTIVE_SOS_KEY);
        setCustomCoord(null);
        try {
          const { zones: freshZones } = await crisisApi.getZones();
          setZones(freshZones);
          const nextId = freshZones[0]?.id || null;
          setSelectedZoneId(nextId);
          await loadEvacuationPlan({ zoneId: nextId, coord: null, silent: true });
          return;
        } catch {
          // fallback below
        }
      }

      loadEvacuationPlan({
        zoneId: selectedZoneId,
        coord: customCoord,
        silent: true,
      });
      if (
        payload?.reason === 'ROAD_STATUS_CHANGED' ||
        payload?.reason === 'OCCUPANCY_CHANGED' ||
        payload?.reason === 'ALERT_EXECUTED'
      ) {
        toast.info(tRef.current('toastRouteRecalculated'));
      }
    };

    // Private, PII-free status of this citizen's own SOS (see citizen:watch below)
    const handleSosStatus = (status) => {
      setActiveSos((prev) => {
        if (!prev || prev.id !== status.id) return prev;
        if (status.citizenStatus === 'SAFE' || status.status === 'RESOLVED') {
          localStorage.removeItem(ACTIVE_SOS_KEY);
          return null;
        }
        const next = { ...prev, ...status };
        localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(next));
        return next;
      });
    };

    socket.on('state:updated', handleStateUpdate);
    socket.on('sos:status', handleSosStatus);
    return () => {
      socket.off('state:updated', handleStateUpdate);
      socket.off('sos:status', handleSosStatus);
    };
  }, [selectedZoneId, customCoord, loadEvacuationPlan]);

  // Join the private room of our own SOS (proved with its access token);
  // re-join after every reconnect because rooms do not survive disconnects.
  const watchedSosId = activeSos?.id;
  const watchedSosToken = activeSos?.accessToken;
  useEffect(() => {
    if (!watchedSosId || !watchedSosToken) return undefined;
    const watch = () =>
      socket.emit('citizen:watch', { sosId: watchedSosId, accessToken: watchedSosToken });
    if (socket.connected) watch();
    socket.on('connect', watch);
    return () => socket.off('connect', watch);
  }, [watchedSosId, watchedSosToken]);

  const handleCategoryChange = (nextCategory) => {
    setCitizenCategory(nextCategory);
    citizenCategoryRef.current = nextCategory;
    localStorage.setItem(CITIZEN_CATEGORY_KEY, nextCategory);
    loadEvacuationPlan({
      zoneId: customCoord ? null : selectedZoneId,
      coord: customCoord,
      category: nextCategory,
    });
  };

  const handleSelectZone = (zoneId) => {
    setSelectedZoneId(zoneId);
    setCustomCoord(null);
    setPickMode(false);
    loadEvacuationPlan({ zoneId, coord: null });
  };

  const handlePickCoordinate = (coord) => {
    setCustomCoord(coord);
    setPickMode(false);
    loadEvacuationPlan({ zoneId: null, coord });
    toast.success(t('toastCoordPicked'));
  };

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.warning(t('toastGpsUnsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setCustomCoord(coord);
        loadEvacuationPlan({ zoneId: null, coord });
        toast.success(t('toastGpsSet'));
      },
      () => {
        toast.warning(t('toastGpsDenied'));
      },
      { timeout: 6000 }
    );
  };

  const handleSendSos = async ({ hazardType, citizenName, notes, citizenCategory: category }) => {
    setIsSubmitting(true);
    const effectiveCategory = category || citizenCategory;
    try {
      const origin = plan?.origin;
      const result = await crisisApi.sendSos({
        citizenCode,
        citizenName,
        hazardType,
        citizenCategory: effectiveCategory,
        zoneId: plan?.selectedZone?.id || selectedZoneId,
        lat: origin?.lat,
        lng: origin?.lng,
        notes,
      });
      const ownSos = { ...result.sos, accessToken: result.accessToken };
      setActiveSos(ownSos);
      setLastSafeConfirmedAt(null);
      localStorage.setItem(ACTIVE_SOS_KEY, JSON.stringify(ownSos));
      const hazardLabel = t(`hazards.${hazardType}`);
      toast.error(
        effectiveCategory === 'SPECIAL_CARE'
          ? t('toastPrioritySosSent', { hazard: hazardLabel })
          : t('toastSosSent', { hazard: hazardLabel })
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSafe = async (sosId) => {
    setIsSubmitting(true);
    try {
      const payload =
        sosId && activeSos?.id === sosId
          ? { sosId, accessToken: activeSos.accessToken }
          : {
              citizenCode,
              zoneId: plan?.selectedZone?.id || selectedZoneId || undefined,
              lat: plan?.origin?.lat,
              lng: plan?.origin?.lng,
            };
      await crisisApi.markSafe(payload);
      setActiveSos(null);
      localStorage.removeItem(ACTIVE_SOS_KEY);
      setLastSafeConfirmedAt(new Date().toISOString());
      toast.success(t('toastSafeRecorded'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5 xl:col-span-4">
        <CitizenRoleSelector
          citizenCategory={citizenCategory}
          onChange={handleCategoryChange}
        />

        <ZoneCoordinateSelector
          zones={zones}
          selectedZoneId={plan?.selectedZone?.id || selectedZoneId}
          origin={plan?.origin}
          pickMode={pickMode}
          onSelectZone={handleSelectZone}
          onTogglePickMode={() => setPickMode((prev) => !prev)}
          onUseGps={handleUseGps}
        />

        <SosControlPanel
          activeSos={activeSos}
          lastSafeConfirmedAt={lastSafeConfirmedAt}
          citizenCategory={citizenCategory}
          isSubmitting={isSubmitting}
          onSendSos={handleSendSos}
          onMarkSafe={handleMarkSafe}
        />

        <EvacuationRouteCard plan={plan} isLoading={isLoadingPlan} />
      </div>

      <div className="h-[520px] lg:sticky lg:top-20 lg:col-span-7 lg:h-[calc(100dvh-7rem)] xl:col-span-8">
        <CrisisMap
          mode="citizen"
          accessibleOnly={citizenCategory === 'SPECIAL_CARE'}
          origin={plan?.origin}
          focusCenter={plan?.origin ? [plan.origin.lat, plan.origin.lng] : null}
          pickMode={pickMode}
          onPickCoordinate={handlePickCoordinate}
          roads={plan?.roads || []}
          assemblyPoints={plan?.assemblyPoints || []}
          recommendedRoute={plan?.recommendedPoint?.route?.polyline || null}
          idealBlockedPolyline={plan?.idealBlockedPolyline || null}
          sosSignals={activeSos ? [activeSos] : []}
        />
      </div>
    </div>
  );
}
