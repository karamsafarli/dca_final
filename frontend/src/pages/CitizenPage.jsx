import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { CitizenRoleSelector } from '../components/citizen/CitizenRoleSelector';
import { CitizenStatusHero } from '../components/citizen/CitizenStatusHero';
import { MobileActionBar } from '../components/citizen/MobileActionBar';
import { EvacuationRouteCard } from '../components/citizen/EvacuationRouteCard';
import { RoutingModeBanner } from '../components/citizen/RoutingModeBanner';
import { SosControlPanel } from '../components/citizen/SosControlPanel';
import { ZoneCoordinateSelector } from '../components/citizen/ZoneCoordinateSelector';
import { CrisisMap } from '../components/map/CrisisMap';
import { useI18n } from '../i18n/I18nContext';
import { didRouteChange, shouldRefetchPlan } from '../lib/planUpdates';
import { socket } from '../lib/socket';
import { crisisApi } from '../services/crisisApi';

const CITIZEN_CODE_KEY = 'urban_crisis_citizen_code';
const ACTIVE_SOS_KEY = 'urban_crisis_active_sos';
const CITIZEN_CATEGORY_KEY = 'urban_crisis_citizen_category';
const PLAN_REFETCH_DEBOUNCE_MS = 400;

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
  const planRef = useRef(plan);
  planRef.current = plan;
  const refetchTimerRef = useRef(null);

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
        return data;
      } catch (err) {
        toast.error(err.message);
        return null;
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

      // Only events that can change routes trigger a refetch, and bursts are
      // coalesced into one request.
      if (!shouldRefetchPlan(payload?.reason)) return;
      clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(async () => {
        const previous = planRef.current;
        const next = await loadEvacuationPlan({
          zoneId: selectedZoneId,
          coord: customCoord,
          silent: true,
        });
        // Tell the citizen only when the guidance they follow really changed
        if (next && didRouteChange(previous, next)) {
          toast.info(tRef.current('toastRouteRecalculated'), { toastId: 'route-changed' });
        }
      }, PLAN_REFETCH_DEBOUNCE_MS);
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

    // Routing provider went down / came back (Challenge Drop #2). The plan is
    // refetched through state:updated; this only tells the user what happened.
    const handleRoutingStatus = (status) => {
      if (status?.degraded) {
        toast.warning(tRef.current('toastRoutingOffline'), { toastId: 'routing-mode' });
      } else {
        toast.success(tRef.current('toastRoutingOnline'), { toastId: 'routing-mode' });
      }
    };

    socket.on('state:updated', handleStateUpdate);
    socket.on('sos:status', handleSosStatus);
    socket.on('routing:status', handleRoutingStatus);
    return () => {
      clearTimeout(refetchTimerRef.current);
      socket.off('state:updated', handleStateUpdate);
      socket.off('sos:status', handleSosStatus);
      socket.off('routing:status', handleRoutingStatus);
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

  const handleSendSos = async ({
    hazardType,
    citizenName,
    notes,
    citizenCategory: category,
    needsTransport,
  }) => {
    setIsSubmitting(true);
    const effectiveCategory = category || citizenCategory;
    try {
      const origin = plan?.origin;
      const result = await crisisApi.sendSos({
        citizenCode,
        citizenName,
        hazardType,
        citizenCategory: effectiveCategory,
        needsTransport: needsTransport || undefined,
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

  const scrollToId = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 pb-28 lg:grid-cols-12 lg:pb-4">
      <div className="space-y-4 lg:col-span-5 xl:col-span-4">
        <RoutingModeBanner routing={plan?.routing} />

        {/* 1. Where to go — the answer first */}
        <CitizenStatusHero
          plan={plan}
          isLoading={isLoadingPlan}
          onShowMap={() => scrollToId('citizen-map')}
        />

        {/* 2. Help — one click away */}
        <div id="sos-panel" className="scroll-mt-24">
          <SosControlPanel
            activeSos={activeSos}
            lastSafeConfirmedAt={lastSafeConfirmedAt}
            citizenCategory={citizenCategory}
            isSubmitting={isSubmitting}
            onSendSos={handleSendSos}
            onMarkSafe={handleMarkSafe}
          />
        </div>

        {/* 3. Setup — location and profile */}
        <ZoneCoordinateSelector
          zones={zones}
          selectedZoneId={plan?.selectedZone?.id || selectedZoneId}
          origin={plan?.origin}
          pickMode={pickMode}
          onSelectZone={handleSelectZone}
          onTogglePickMode={() => {
            setPickMode((prev) => !prev);
            scrollToId('citizen-map');
          }}
          onUseGps={handleUseGps}
        />

        <CitizenRoleSelector
          citizenCategory={citizenCategory}
          onChange={handleCategoryChange}
        />

        {/* 4. Details — why this route, all nearby points */}
        <EvacuationRouteCard
          plan={plan}
          isLoading={isLoadingPlan}
          isSubmitting={isSubmitting}
          onRequestAssistance={() =>
            handleSendSos({
              hazardType: 'MEDICAL',
              notes: t('assistanceSosNote'),
              needsTransport: true,
            })
          }
        />
      </div>

      <div
        id="citizen-map"
        className="h-[70dvh] scroll-mt-24 lg:sticky lg:top-20 lg:col-span-7 lg:h-[calc(100dvh-7rem)] xl:col-span-8"
      >
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

      <MobileActionBar
        onSos={() => scrollToId('sos-panel')}
        onRoute={() => scrollToId('citizen-map')}
      />
    </div>
  );
}
