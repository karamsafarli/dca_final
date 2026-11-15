/**
 * Visual styles only. All user-facing text lives in `src/i18n/translations.js`
 * (hazards.*, pointTypes.*, riskLevels.* ...) so AZ/EN switching covers it.
 */
export const HAZARD_TYPES = [
  { value: 'FIRE', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { value: 'COLLAPSE', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { value: 'FLOOD', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { value: 'MEDICAL', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

export const HAZARD_LABEL_MAP = Object.fromEntries(HAZARD_TYPES.map((h) => [h.value, h]));

export const RISK_LEVEL_STYLES = {
  LOW: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  MEDIUM: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  HIGH: { cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  CRITICAL: { cls: 'bg-red-500/25 text-red-200 border-red-500/60' },
};
