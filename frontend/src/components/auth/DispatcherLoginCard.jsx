import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
    <div className="w-full max-w-sm">
      <div className="w-full rounded-xl border border-line bg-surface p-6">
        <div className="mb-5 flex flex-col items-center text-center">
          <h1 className="text-lg font-semibold text-fg">{t('loginTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('loginSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger-fg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="dispatcher-username"
              className="mb-1.5 block text-sm font-medium text-fg"
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
              className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder-faint focus:border-line-strong focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="dispatcher-password"
              className="mb-1.5 block text-sm font-medium text-fg"
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
                className="w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 pr-10 text-sm text-fg placeholder-faint focus:border-line-strong focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:text-fg"
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
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-ink-fg transition hover:bg-ink/90 disabled:opacity-50"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isSubmitting ? t('loginChecking') : t('loginSubmit')}</span>
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-line bg-canvas px-3 py-2.5 text-xs text-muted">
          {t('loginSecurityNote')}
        </div>
      </div>
    </div>
  );
}
