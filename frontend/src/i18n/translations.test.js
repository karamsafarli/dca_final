import { describe, expect, it } from 'vitest';
import { TRANSLATIONS } from './translations';

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

describe('i18n dictionaries', () => {
  it('AZ and EN define exactly the same keys (no untranslated UI text)', () => {
    const az = flatKeys(TRANSLATIONS.az).sort();
    const en = flatKeys(TRANSLATIONS.en).sort();
    expect(en.filter((k) => !az.includes(k))).toEqual([]);
    expect(az.filter((k) => !en.includes(k))).toEqual([]);
  });

  it('uses the same {placeholders} in both languages', () => {
    const vars = (s) => (s.match(/\{(\w+)\}/g) || []).sort();
    for (const key of flatKeys(TRANSLATIONS.az)) {
      const get = (dict) => key.split('.').reduce((o, p) => o?.[p], dict);
      const az = get(TRANSLATIONS.az);
      const en = get(TRANSLATIONS.en);
      if (typeof az === 'string' && typeof en === 'string') {
        expect({ key, vars: vars(en) }).toEqual({ key, vars: vars(az) });
      }
    }
  });
});
