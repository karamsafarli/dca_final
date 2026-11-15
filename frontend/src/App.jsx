import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { DispatcherLoginCard } from './components/auth/DispatcherLoginCard';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CitizenHeader } from './components/layout/CitizenHeader';
import { ConsoleHeader } from './components/layout/ConsoleHeader';
import { BrandMark, LanguageSwitch, ThemeToggle } from './components/layout/HeaderControls';
import { useTheme } from './theme/ThemeContext';
import { useI18n } from './i18n/I18nContext';
import { reconnectSocket, socket } from './lib/socket';
import { CitizenPage } from './pages/CitizenPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { crisisApi } from './services/crisisApi';

export function App() {
  const { t } = useI18n();
  const { theme } = useTheme();
  const tRef = useRef(t);
  tRef.current = t;

  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [dispatcher, setDispatcher] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

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


    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

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
      <div className="min-h-dvh bg-canvas text-fg">
        <Routes>
          {/* Citizen app: public, minimal chrome */}
          <Route
            path="/"
            element={
              <>
                <CitizenHeader isSocketConnected={isSocketConnected} />
                <main>
                  <CitizenPage />
                </main>
              </>
            }
          />

          {/* Dispatcher console: a separate surface, reached via "Operator sign-in" */}
          <Route
            path="/dispatcher"
            element={
              !authChecked ? (
                <div className="p-6 text-sm text-muted">{t('checkingSession')}</div>
              ) : dispatcher ? (
                <>
                  <ConsoleHeader
                    isSocketConnected={isSocketConnected}
                    activeAlertsCount={activeAlertsCount}
                    dispatcher={dispatcher}
                    onLogout={handleLogout}
                  />
                  <main>
                    <DispatcherPage onAlertsCountChange={setActiveAlertsCount} dispatcher={dispatcher} />
                  </main>
                </>
              ) : (
                <div className="flex min-h-dvh flex-col">
                  <header className="mx-auto flex h-14 w-full max-w-[1440px] items-center justify-between px-4">
                    <Link
                      to="/"
                      className="flex items-center gap-1.5 text-sm text-muted transition hover:text-fg"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      {t('backToCitizen')}
                    </Link>
                    <div className="flex items-center gap-2">
                      <LanguageSwitch />
                      <ThemeToggle />
                    </div>
                  </header>
                  <main className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
                    <div className="mb-6">
                      <BrandMark subtitle={t('consoleTitle')} />
                    </div>
                    <DispatcherLoginCard
                      loginFn={crisisApi.loginDispatcher}
                      onLoginSuccess={handleLoginSuccess}
                    />
                  </main>
                </div>
              )
            }
          />
        </Routes>

        <ToastContainer
          position="bottom-right"
          theme={theme}
          autoClose={4000}
          newestOnTop
          hideProgressBar
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
