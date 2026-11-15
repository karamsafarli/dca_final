import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

export function DispatcherLoginCard({ onLoginSuccess, loginFn }) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = await loginFn({ username, password });
      onLoginSuccess(data.dispatcher);
    } catch (err) {
      setError(err.message || t('loginErrorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-md items-center px-4 py-8">
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400 ring-1 ring-red-500/40">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-extrabold text-white">{t('loginTitle')}</h2>
          <p className="mt-1 text-xs text-slate-400">{t('loginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/60 px-3.5 py-2.5 text-xs font-medium text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dispatcher-username"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
            >
              {t('usernameLabel')}
            </label>
            <input
              id="dispatcher-username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('usernamePlaceholder')}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="dispatcher-password"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
            >
              {t('passwordLabel')}
            </label>
            <div className="relative">
              <input
                id="dispatcher-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-500 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isSubmitting ? t('loginChecking') : t('loginSubmit')}</span>
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-[11px] text-slate-400">
          {t('loginSecurityNote')}
        </div>
      </div>
    </div>
  );
}
