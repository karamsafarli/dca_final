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
import { crisisApi } from '../services/crisisApi';

export function DispatcherPage({ onAlertsCountChange }) {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadDashboard = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsLoading(true);
      try {
        const data = await crisisApi.getDispatcherDashboard();
        setDashboard(data);
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

  useEffect(() => {
    const handleStateUpdate = () => {
      loadDashboard({ silent: true });
    };

    const handleAlertCreated = () => {
      toast.error(tRef.current('redAlertTitle'), { autoClose: 7000 });
      loadDashboard({ silent: true });
    };

    const handleSosCreated = (sos) => {
      if (sos?.priorityLevel === 1 || sos?.citizenCategory === 'SPECIAL_CARE') {
        toast.error(tRef.current('toastPrioritySosArrived'), { autoClose: 8000 });
      }
      loadDashboard({ silent: true });
    };

    socket.on('state:updated', handleStateUpdate);
    socket.on('alert:created', handleAlertCreated);
    socket.on('sos:created', handleSosCreated);
    return () => {
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
    if (actionType === 'reset') {
      return runAction(() => crisisApi.resetSimulation(), t('toastSimReset'));
    }
    return undefined;
  };

  if (isLoading && !dashboard) {
    return (
      <div className="mx-auto max-w-[1600px] p-6 text-sm text-slate-400">
        {t('loadingDispatcher')}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <SimulationBar
        zones={dashboard?.zones || []}
        roads={dashboard?.roads || []}
        assemblyPoints={dashboard?.assemblyPoints || []}
        onRunAction={handleSimulationAction}
        isBusy={isBusy}
      />

      <RedAlertBanner
        alerts={dashboard?.alerts || []}
        onExecute={handleExecuteAlert}
        onDismiss={handleDismissAlert}
        isBusy={isBusy}
      />

      <KpiStatsGrid summary={dashboard?.summary || {}} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="h-[480px] xl:col-span-7 xl:h-[620px]">
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
            onDispatch={handleDispatchSos}
            isBusy={isBusy}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ShelterRoadControl
            assemblyPoints={dashboard?.assemblyPoints || []}
            roads={dashboard?.roads || []}
            onUpdateOccupancy={handleUpdateOccupancy}
            onUpdateRoadStatus={handleUpdateRoadStatus}
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
