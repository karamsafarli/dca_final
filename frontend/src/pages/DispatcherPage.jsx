import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { BrigadeStatusList } from '../components/dispatcher/BrigadeStatusList';
import { KpiStatsGrid } from '../components/dispatcher/KpiStatsGrid';
import { RedAlertBanner } from '../components/dispatcher/RedAlertBanner';
import { ShelterRoadControl } from '../components/dispatcher/ShelterRoadControl';
import { SimulationBar } from '../components/dispatcher/SimulationBar';
import { SosFeedList } from '../components/dispatcher/SosFeedList';
import { CrisisMap } from '../components/map/CrisisMap';
import { useI18n } from '../i18n/I18nContext';
import { socket } from '../lib/socket';
import { throttle } from '../lib/throttle';
import { Callout } from '../components/ui/primitives';
import { ShieldAlert } from 'lucide-react';
import { crisisApi } from '../services/crisisApi';

export function DispatcherPage({ onAlertsCountChange, dispatcher }) {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [sosLatency, setSosLatency] = useState(null);

  // RBAC (Challenge Drop #3): the UI mirrors server-side permissions
  const permissions = dispatcher?.permissions ?? [];
  const can = (permission) => permissions.includes(permission);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      try {
        const [data, latency] = await Promise.all([
          crisisApi.getDispatcherDashboard(),
          crisisApi.getLatencyMetrics().catch(() => null),
        ]);
        setDashboard(data);
        setSosLatency(latency?.routes?.['POST /api/citizen/sos'] ?? null);
        onAlertsCountChange?.(data.summary?.activeAlertsCount || 0);
      } catch (err) {
        toast.error(err.message);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [onAlertsCountChange]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Under an SOS flood the server emits hundreds of events per second. The
  // panel refreshes at most once per second (plus a trailing refresh) and
  // aggregates toasts, so spam cannot freeze or bury the operator's screen.
  useEffect(() => {
    const refresh = throttle(() => loadDashboard({ silent: true }), 1000);
    const burst = { total: 0, priority: 0 };
    const flushToasts = throttle(() => {
      const { total, priority } = burst;
      burst.total = 0;
      burst.priority = 0;
      if (priority === 1) {
        toast.error(tRef.current('toastPrioritySosArrived'), { toastId: 'priority-sos', autoClose: 8000 });
      } else if (priority > 1) {
        toast.error(tRef.current('toastPriorityBurst', { count: priority }), { toastId: 'priority-sos', autoClose: 8000 });
      } else if (total > 1) {
        toast.info(tRef.current('toastSosBurst', { count: total }), { toastId: 'sos-burst' });
      }
    }, 3000);

    const handleStateUpdate = () => refresh();
    const handleAlertCreated = () => {
      toast.error(tRef.current('redAlertTitle'), { toastId: 'red-alert', autoClose: 7000 });
      refresh();
    };
    const handleSosCreated = (sos) => {
      burst.total += 1;
      if (sos?.priorityLevel === 1 || sos?.citizenCategory === 'SPECIAL_CARE') burst.priority += 1;
      flushToasts();
      refresh();
    };

    socket.on('state:updated', handleStateUpdate);
    socket.on('alert:created', handleAlertCreated);
    socket.on('sos:created', handleSosCreated);
    return () => {
      refresh.cancel();
      flushToasts.cancel();
      socket.off('state:updated', handleStateUpdate);
      socket.off('alert:created', handleAlertCreated);
      socket.off('sos:created', handleSosCreated);
    };
  }, [loadDashboard]);

  const runAction = async (fn, successMessage) => {
    setIsBusy(true);
    try {
      await fn();
      if (successMessage) toast.success(successMessage);
      await loadDashboard({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleExecuteAlert = (alertId) =>
    runAction(() => crisisApi.executeAlert(alertId), t('toastAlertExecuted'));

  const handleDismissAlert = (alertId) =>
    runAction(() => crisisApi.dismissAlert(alertId), t('toastAlertDismissed'));

  const handleDispatchSos = (sosId) =>
    runAction(() => crisisApi.dispatchBrigade(sosId), t('toastBrigadeDispatched'));

  const handleUpdateOccupancy = (pointId, payload) =>
    runAction(() => crisisApi.updateShelterOccupancy(pointId, payload), t('toastShelterUpdated'));

  const handleUpdateRoadStatus = (roadId, payload) =>
    runAction(() => crisisApi.updateRoadStatus(roadId, payload), t('toastRoadUpdated'));

  const handleSimulationAction = (actionType, payload) => {
    if (actionType === 'sos-burst') {
      return runAction(() => crisisApi.simulateSosBurst(payload), t('toastSimSosBurst'));
    }
    if (actionType === 'road-toggle') {
      return runAction(() => crisisApi.simulateRoadToggle(payload), t('toastSimRoadClosed'));
    }
    if (actionType === 'occupancy-spike') {
      return runAction(
        () => crisisApi.simulateOccupancySpike(payload),
        t('toastSimOccupancy', { percent: payload.targetPercent })
      );
    }
    if (actionType === 'routing-api') {
      return runAction(
        () => crisisApi.setRoutingApiMode(payload.mode),
        t(`toastSimRouting${payload.mode}`)
      );
    }
    if (actionType === 'reset') {
      return runAction(() => crisisApi.resetSimulation(), t('toastSimReset'));
    }
    return undefined;
  };

  if (isLoading && !dashboard) {
    return (
      <div className="mx-auto max-w-[1600px] p-6 text-sm text-muted">
        {t('loadingDispatcher')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <RedAlertBanner
        alerts={dashboard?.alerts || []}
        onExecute={can('alerts:execute') ? handleExecuteAlert : undefined}
        onDismiss={can('alerts:dismiss') ? handleDismissAlert : undefined}
        isBusy={isBusy}
      />

      {!can('brigades:dispatch') && (
        <Callout tone="priority" icon={<ShieldAlert className="h-4 w-4" aria-hidden="true" />}>
          {t('readOnlyMode', { role: t(`roles.${dispatcher?.role}`) })}
        </Callout>
      )}

      {can('simulation:run') && (
      <SimulationBar
        zones={dashboard?.zones || []}
        roads={dashboard?.roads || []}
        assemblyPoints={dashboard?.assemblyPoints || []}
        routing={dashboard?.routing}
        onRunAction={handleSimulationAction}
        canReset={can('system:reset')}
        isBusy={isBusy}
      />
      )}

      <KpiStatsGrid summary={dashboard?.summary || {}} sosLatency={sosLatency} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="h-[60dvh] min-h-[420px] xl:col-span-7 xl:h-[640px]">
          <CrisisMap
            mode="dispatcher"
            roads={dashboard?.roads || []}
            assemblyPoints={dashboard?.assemblyPoints || []}
            sosSignals={dashboard?.sosSignals || []}
            rescueBrigades={dashboard?.rescueBrigades || []}
            alerts={dashboard?.alerts || []}
          />
        </div>

        <div className="space-y-4 xl:col-span-5">
          <SosFeedList
            zones={dashboard?.zones || []}
            sosSignals={dashboard?.sosSignals || []}
            onDispatch={can('brigades:dispatch') ? handleDispatchSos : undefined}
            isBusy={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ShelterRoadControl
            assemblyPoints={dashboard?.assemblyPoints || []}
            roads={dashboard?.roads || []}
            onUpdateOccupancy={can('shelters:update') ? handleUpdateOccupancy : undefined}
            onUpdateRoadStatus={can('roads:update') ? handleUpdateRoadStatus : undefined}
            isBusy={isBusy}
          />
        </div>
        <div className="lg:col-span-5">
          <BrigadeStatusList rescueBrigades={dashboard?.rescueBrigades || []} />
        </div>
      </div>
    </div>
  );
}
