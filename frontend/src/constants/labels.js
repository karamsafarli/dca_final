export const HAZARD_TYPES = [
  { value: 'FIRE', label: 'Yanğın', shortLabel: 'Yanğın', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { value: 'COLLAPSE', label: 'Dağıntı', shortLabel: 'Dağıntı', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { value: 'FLOOD', label: 'Su basması', shortLabel: 'Su basması', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
  { value: 'MEDICAL', label: 'Tibbi yardım', shortLabel: 'Tibbi', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

export const HAZARD_LABEL_MAP = Object.fromEntries(
  HAZARD_TYPES.map((h) => [h.value, h])
);

export const POINT_TYPE_LABELS = {
  SHELTER: 'Sığınacaq',
  PARK: 'Park',
  STADIUM: 'Stadion',
};

export const POINT_STATUS_LABELS = {
  OPEN: 'Açıq',
  STANDBY: 'Ehtiyatda',
  FULL: 'Tam Dolu',
  CLOSED: 'Bağlı',
};

export const ROAD_STATUS_LABELS = {
  OPEN: 'Açıq',
  CONGESTED: 'Tıxaclı',
  CLOSED: 'Bağlı',
};

export const BRIGADE_STATUS_LABELS = {
  AVAILABLE: 'Hazır',
  DISPATCHED: 'Yönləndirilib',
  STANDBY: 'Ehtiyatda',
};

export const BRIGADE_TYPE_LABELS = {
  FIRE: 'Yanğınsöndürmə',
  MEDICAL: 'Təcili Tibbi Yardım',
  SEARCH_RESCUE: 'Axtarış-Xilasetmə',
  GENERAL: 'Ümumi Xilasetmə',
};

export const RISK_LEVEL_STYLES = {
  LOW: { label: 'Normal', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  MEDIUM: { label: 'Orta Risk', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  HIGH: { label: 'Yüksək Risk', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  CRITICAL: { label: 'Kritik Həyəcan', cls: 'bg-red-500/25 text-red-200 border-red-500/60' },
};
