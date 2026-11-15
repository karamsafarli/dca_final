import { render } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';

/** Render a component inside the real i18n provider with a chosen language. */
export function renderWithI18n(ui, { lang = 'az' } = {}) {
  localStorage.setItem('urban_crisis_lang', lang);
  return render(<I18nProvider>{ui}</I18nProvider>);
}
