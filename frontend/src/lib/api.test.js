import { describe, expect, it } from 'vitest';
import { TRANSLATIONS } from '../i18n/translations';
import { setErrorTranslator, toApiError } from './api';

const translatorFor = (lang) => (key) =>
  key.split('.').reduce((o, p) => o?.[p], TRANSLATIONS[lang]) ?? key;

const axiosError = (status, data) => ({ response: { status, data }, message: 'Request failed' });

describe('API error translation', () => {
  it('translates a backend error code into the active language', () => {
    setErrorTranslator(translatorFor('en'));
    expect(toApiError(axiosError(409, { code: 'BRIGADE_BUSY', error: 'x' })).message).toBe(
      'This brigade is already on another mission.'
    );
    setErrorTranslator(translatorFor('az'));
    expect(toApiError(axiosError(409, { code: 'BRIGADE_BUSY', error: 'x' })).message).toBe(
      'Bu briqada artıq başqa tapşırıqdadır.'
    );
  });

  it('falls back to the server message for unknown codes', () => {
    setErrorTranslator(translatorFor('en'));
    const err = toApiError(axiosError(418, { code: 'TEAPOT', error: 'I am a teapot' }));
    expect(err.message).toBe('I am a teapot');
    expect(err.code).toBe('TEAPOT');
  });

  it('reports a translated network error when the server is unreachable', () => {
    setErrorTranslator(translatorFor('az'));
    const err = toApiError({ message: 'Network Error' });
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toMatch(/Serverlə əlaqə yoxdur/);
  });
});
