import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { DispatcherLoginCard } from './components/auth/DispatcherLoginCard';
import { Navbar } from './components/layout/Navbar';
import { useI18n } from './i18n/I18nContext';
import { reconnectSocket, socket } from './lib/socket';
import { CitizenPage } from './pages/CitizenPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { crisisApi } from './services/crisisApi';

export function App() {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [dispatcher, setDispatcher] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const syncAlertBadge = useCallback(async () => {
    try {
      const data = await crisisApi.getDispatcherDashboard();
      setActiveAlertsCount(data.summary?.activeAlertsCount || 0);
    } catch {
      // Ignore if session expired; auth interceptor handles redirect
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await crisisApi.getCurrentDispatcher();
        if (mounted) {
          setDispatcher(res.dispatcher);
        }
      } catch {
        if (mounted) {
          setDispatcher(null);
        }
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();

    const handleUnauthorized = () => {
      setDispatcher(null);
      setActiveAlertsCount(0);
      reconnectSocket();
      toast.warning(tRef.current('toastSessionExpired'));
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (dispatcher) {
      syncAlertBadge();
      socket.on('state:updated', syncAlertBadge);
      socket.on('alert:created', syncAlertBadge);
      socket.on('alert:executed', syncAlertBadge);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('state:updated', syncAlertBadge);
      socket.off('alert:created', syncAlertBadge);
      socket.off('alert:executed', syncAlertBadge);
    };
  }, [dispatcher, syncAlertBadge]);

  const handleLoginSuccess = (authenticatedDispatcher) => {
    setDispatcher(authenticatedDispatcher);
    reconnectSocket();
    toast.success(t('toastWelcome', { name: authenticatedDispatcher.fullName }));
  };

  const handleLogout = async () => {
    try {
      await crisisApi.logoutDispatcher();
    } catch {
      // Clear local session state regardless
    }
    setDispatcher(null);
    setActiveAlertsCount(0);
    reconnectSocket();
    toast.info(t('toastLoggedOut'));
  };

  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-slate-950 text-slate-100">
        <Navbar
          isSocketConnected={isSocketConnected}
          activeAlertsCount={activeAlertsCount}
          dispatcher={dispatcher}
          onLogout={handleLogout}
        />

        <main>
          <Routes>
            <Route path="/" element={<CitizenPage />} />
            <Route
              path="/dispatcher"
              element={
                !authChecked ? (
                  <div className="mx-auto max-w-[1600px] p-6 text-sm text-slate-400">
                    {t('checkingSession')}
                  </div>
                ) : dispatcher ? (
                  <DispatcherPage onAlertsCountChange={setActiveAlertsCount} />
                ) : (
                  <DispatcherLoginCard
                    loginFn={crisisApi.loginDispatcher}
                    onLoginSuccess={handleLoginSuccess}
                  />
                )
              }
            />
          </Routes>
        </main>

        <ToastContainer
          position="bottom-right"
          theme="dark"
          autoClose={4000}
          newestOnTop
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
