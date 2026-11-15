import {
  Activity,
  Languages,
  Lock,
  LogOut,
  Radio,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { cn } from '../../lib/utils';

export function Navbar({
  isSocketConnected,
  activeAlertsCount = 0,
  dispatcher = null,
  onLogout = null,
}) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 text-red-400 ring-1 ring-red-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white md:text-base">
              {t('brandTitle')}
            </h1>
            <p className="text-xs text-slate-400">{t('brandSubtitle')}</p>
          </div>
        </div>

        <nav className="flex items-center gap-2 rounded-xl bg-slate-900 p-1 ring-1 ring-slate-800">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition md:text-sm',
                isActive
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              )
            }
          >
            <Users className="h-4 w-4" />
            <span>{t('navCitizen')}</span>
          </NavLink>

          <NavLink
            to="/dispatcher"
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition md:text-sm',
                isActive
                  ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              )
            }
          >
            {dispatcher ? (
              <Activity className="h-4 w-4" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>
              {dispatcher ? t('navDispatcher') : t('navDispatcherLogin')}
            </span>
            {dispatcher && activeAlertsCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dynamic Language Switcher (AZ / EN) */}
          <div
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1"
            role="group"
            aria-label="Language switcher"
          >
            <Languages className="ml-1.5 h-3.5 w-3.5 text-slate-400" />
            {['az', 'en'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  'rounded-lg px-2 py-1 text-[11px] font-bold uppercase transition',
                  lang === code
                    ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-500/50'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {code}
              </button>
            ))}
          </div>

          {dispatcher && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs">
              <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300">
                {dispatcher.badgeCode}
              </span>
              <span className="hidden font-medium text-slate-200 sm:inline">
                {dispatcher.fullName}
              </span>
              <button
                type="button"
                onClick={onLogout}
                title={t('logout')}
                className="ml-1 flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:bg-red-600/25 hover:text-red-200"
              >
                <LogOut className="h-3 w-3" />
                <span>{t('logout')}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs ring-1 ring-slate-800">
            <Radio
              className={cn(
                'h-3.5 w-3.5',
                isSocketConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
              )}
            />
            <span className={isSocketConnected ? 'text-emerald-300' : 'text-amber-300'}>
              {isSocketConnected ? t('liveSyncActive') : t('reconnecting')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
