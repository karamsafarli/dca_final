import { hashPassword } from '../services/authService.js';
import { haversineDistanceMeters } from '../services/geometryService.js';

export const SEED_DISPATCHERS = [
  {
    username: 'dispatcher1',
    fullName: 'Fövqəladə Hallar Dispetçeri #1',
    badgeCode: 'FHN-112',
    role: 'DISPATCHER',
    password: process.env.SEED_DISPATCHER_PASSWORD || 'Fhn112!Crisis',
  },
  {
    username: 'commander',
    fullName: 'Növbə Rəisi — Baş Operator',
    badgeCode: 'CMD-001',
    role: 'COMMANDER',
    password: process.env.SEED_COMMANDER_PASSWORD || 'Cmd001!Crisis',
  },
  {
    username: 'observer',
    fullName: 'Şəhər İcra Hakimiyyəti — Müşahidəçi',
    badgeCode: 'OBS-001',
    role: 'OBSERVER',
    password: process.env.SEED_OBSERVER_PASSWORD || 'Obs001!Crisis',
  },
];

export async function ensureDispatchersSeeded(prisma) {
  for (const d of SEED_DISPATCHERS) {
    await prisma.dispatcher.upsert({
      where: { username: d.username },
      update: {},
      create: {
        username: d.username,
        fullName: d.fullName,
        badgeCode: d.badgeCode,
        role: d.role,
        passwordHash: hashPassword(d.password),
        isActive: true,
      },
    });
  }
}

export const SEED_ZONES = [
  {
    code: 'YASAMAL',
    name: 'Yasamal rayonu',
    centerLat: 40.3895,
    centerLng: 49.8205,
    radiusMeters: 2500,
    riskLevel: 'LOW',
  },
  {
    code: 'SABAIL',
    name: 'Səbail rayonu',
    centerLat: 40.362,
    centerLng: 49.8345,
    radiusMeters: 2400,
    riskLevel: 'LOW',
  },
  {
    code: 'NASIMI',
    name: 'Nəsimi rayonu',
    centerLat: 40.4025,
    centerLng: 49.824,
    radiusMeters: 2500,
    riskLevel: 'LOW',
  },
  {
    code: 'NARIMANOV',
    name: 'Nərimanov rayonu',
    centerLat: 40.403,
    centerLng: 49.869,
    radiusMeters: 2600,
    riskLevel: 'LOW',
  },
  {
    code: 'KHATAI',
    name: 'Xətai rayonu',
    centerLat: 40.3895,
    centerLng: 49.891,
    radiusMeters: 2800,
    riskLevel: 'LOW',
  },
];

export const SEED_NODES = [
  { code: 'N_YAS_ELMLER', name: 'Elmlər Akademiyası qovşağı', zoneCode: 'YASAMAL', lat: 40.3753, lng: 49.8148 },
  { code: 'N_YAS_PARK', name: 'Yasamal Parkı qovşağı', zoneCode: 'YASAMAL', lat: 40.3832, lng: 49.8065 },
  { code: 'N_YAS_INSAAT', name: 'İnşaatçılar m/s qovşağı', zoneCode: 'YASAMAL', lat: 40.3886, lng: 49.8025 },
  { code: 'N_YAS_20YANVAR', name: '20 Yanvar dairəsi', zoneCode: 'YASAMAL', lat: 40.4043, lng: 49.8075 },
  { code: 'N_YAS_TBILISI', name: 'Tbilisi pr. qovşağı', zoneCode: 'YASAMAL', lat: 40.391, lng: 49.8215 },
  { code: 'N_YAS_NIZAMI', name: 'Nizami m/s qovşağı', zoneCode: 'YASAMAL', lat: 40.3793, lng: 49.83 },

  { code: 'N_SAB_ICERI', name: 'İçərişəhər qovşağı', zoneCode: 'SABAIL', lat: 40.366, lng: 49.8315 },
  { code: 'N_SAB_SAHIL', name: 'Sahil Bulvarı qovşağı', zoneCode: 'SABAIL', lat: 40.3708, lng: 49.8445 },
  { code: 'N_SAB_AZNEFT', name: 'Azneft meydanı', zoneCode: 'SABAIL', lat: 40.3612, lng: 49.8342 },
  { code: 'N_SAB_BAYIL', name: 'Bayıl / Su İdmanı qovşağı', zoneCode: 'SABAIL', lat: 40.3475, lng: 49.8365 },

  { code: 'N_NAS_28MAY', name: '28 May qovşağı', zoneCode: 'NASIMI', lat: 40.3798, lng: 49.8488 },
  { code: 'N_NAS_ZABIT', name: 'Zabitlər Parkı qovşağı', zoneCode: 'NASIMI', lat: 40.3865, lng: 49.8385 },
  { code: 'N_NAS_MEMAR', name: 'Memar Əcəmi qovşağı', zoneCode: 'NASIMI', lat: 40.411, lng: 49.8145 },

  { code: 'N_NAR_GANCLIK', name: 'Gənclik m/s qovşağı', zoneCode: 'NARIMANOV', lat: 40.4002, lng: 49.8515 },
  { code: 'N_NAR_METRO', name: 'N.Nərimanov m/s qovşağı', zoneCode: 'NARIMANOV', lat: 40.4028, lng: 49.8705 },
  { code: 'N_NAR_HEYDAR', name: 'Heydər Əliyev Mərkəzi qovşağı', zoneCode: 'NARIMANOV', lat: 40.3958, lng: 49.8672 },

  { code: 'N_KHA_METRO', name: 'Xətai m/s qovşağı', zoneCode: 'KHATAI', lat: 40.3832, lng: 49.872 },
  { code: 'N_KHA_AGSEHER', name: 'Ağ Şəhər Bulvarı qovşağı', zoneCode: 'KHATAI', lat: 40.3765, lng: 49.8965 },
  { code: 'N_KHA_BABEK', name: 'Babək pr. qovşağı', zoneCode: 'KHATAI', lat: 40.3915, lng: 49.894 },
];

export const SEED_ROADS = [
  { code: 'RD_HCAVID', name: 'Hüseyn Cavid prospekti', zoneCode: 'YASAMAL', from: 'N_YAS_ELMLER', to: 'N_YAS_PARK' },
  { code: 'RD_SERIFZADE', name: 'Şərifzadə küçəsi', zoneCode: 'YASAMAL', from: 'N_YAS_PARK', to: 'N_YAS_INSAAT' },
  { code: 'RD_MOSKVA', name: 'Moskva prospekti', zoneCode: 'YASAMAL', from: 'N_YAS_INSAAT', to: 'N_YAS_20YANVAR' },
  { code: 'RD_TBILISI_N', name: 'Tbilisi prospekti (Şimal)', zoneCode: 'YASAMAL', from: 'N_YAS_20YANVAR', to: 'N_YAS_TBILISI' },
  { code: 'RD_TBILISI_S', name: 'Tbilisi prospekti (Mərkəz)', zoneCode: 'YASAMAL', from: 'N_YAS_TBILISI', to: 'N_YAS_NIZAMI' },
  { code: 'RD_LANDAU', name: 'Z.Xəlilov / İnşaatçılar pr.', zoneCode: 'YASAMAL', from: 'N_YAS_ELMLER', to: 'N_YAS_NIZAMI' },
  {
    code: 'RD_MEHSETI',
    name: 'Abbas Mirzə Şərifzadə keçidi',
    zoneCode: 'YASAMAL',
    from: 'N_YAS_TBILISI',
    to: 'N_YAS_PARK',
    isWheelchairAccessible: false,
    accessibilityNotes: 'Yeraltı piyada keçidində pilləkən var (pandus yoxdur)',
  },

  { code: 'RD_NIZAMI_ICERI', name: 'İstiqlaliyyət küçəsi', zoneCode: 'SABAIL', from: 'N_YAS_NIZAMI', to: 'N_SAB_ICERI' },
  {
    code: 'RD_PARLAMENT',
    name: 'Parlament prospekti',
    zoneCode: 'SABAIL',
    from: 'N_YAS_ELMLER',
    to: 'N_SAB_ICERI',
    isWheelchairAccessible: false,
    accessibilityNotes: 'Dik pilləkənli yamac — əlil arabası üçün uyğun deyil',
  },
  { code: 'RD_NEFTCILER_W', name: 'Neftçilər prospekti (Qərb)', zoneCode: 'SABAIL', from: 'N_SAB_ICERI', to: 'N_SAB_AZNEFT' },
  { code: 'RD_NEFTCILER_E', name: 'Neftçilər prospekti (Sahil)', zoneCode: 'SABAIL', from: 'N_SAB_AZNEFT', to: 'N_SAB_SAHIL' },
  { code: 'RD_BULVAR_N', name: 'Rəşid Behbudov / Sahil keçidi', zoneCode: 'SABAIL', from: 'N_SAB_ICERI', to: 'N_SAB_SAHIL' },
  { code: 'RD_BAYIL_HWY', name: 'Salyan şossesi (Bayıl)', zoneCode: 'SABAIL', from: 'N_SAB_AZNEFT', to: 'N_SAB_BAYIL' },
  {
    code: 'RD_BAYIL_UP',
    name: 'Dağüstü Park - Bayıl yolu',
    zoneCode: 'SABAIL',
    from: 'N_YAS_ELMLER',
    to: 'N_SAB_BAYIL',
    isWheelchairAccessible: false,
    accessibilityNotes: 'Dağüstü pilləkən marşrutu — tibbi nəqliyyat üçün keçilməzdir',
  },

  { code: 'RD_SVURGUN', name: 'Səməd Vurğun küçəsi', zoneCode: 'NASIMI', from: 'N_NAS_ZABIT', to: 'N_NAS_28MAY' },
  { code: 'RD_AZADLIQ_S', name: 'Azadlıq prospekti (Cənub)', zoneCode: 'NASIMI', from: 'N_SAB_SAHIL', to: 'N_NAS_28MAY' },
  { code: 'RD_FIZULI', name: 'Füzuli / Şəmsi Bədəlbəyli küç.', zoneCode: 'NASIMI', from: 'N_YAS_NIZAMI', to: 'N_NAS_ZABIT' },
  { code: 'RD_BAKIxANOV', name: 'Bakıxanov küçəsi', zoneCode: 'NASIMI', from: 'N_YAS_TBILISI', to: 'N_NAS_ZABIT' },
  { code: 'RD_CAVADXAN', name: 'Cavadxan küçəsi', zoneCode: 'NASIMI', from: 'N_YAS_20YANVAR', to: 'N_NAS_MEMAR' },
  { code: 'RD_ZABIT_MEMAR', name: 'Cəlil Məmmədquluzadə küç.', zoneCode: 'NASIMI', from: 'N_NAS_MEMAR', to: 'N_NAS_ZABIT' },

  { code: 'RD_ATATAURK', name: 'Fətəli xan Xoyski prospekti', zoneCode: 'NARIMANOV', from: 'N_NAS_ZABIT', to: 'N_NAR_GANCLIK' },
  { code: 'RD_AZADLIQ_N', name: 'Azadlıq prospekti (Şimal)', zoneCode: 'NARIMANOV', from: 'N_NAS_28MAY', to: 'N_NAR_GANCLIK' },
  { code: 'RD_ZEYNAL', name: 'Ziya Bünyadov prospekti', zoneCode: 'NARIMANOV', from: 'N_NAS_MEMAR', to: 'N_NAR_GANCLIK' },
  { code: 'RD_TBAYRAMOV', name: 'Təbriz küçəsi', zoneCode: 'NARIMANOV', from: 'N_NAR_GANCLIK', to: 'N_NAR_METRO' },
  { code: 'RD_HEYDAR_PR', name: 'Heydər Əliyev prospekti', zoneCode: 'NARIMANOV', from: 'N_NAR_HEYDAR', to: 'N_NAR_METRO' },
  { code: 'RD_K_RAHIMOV', name: 'Koroğlu Rəhimov küçəsi', zoneCode: 'NARIMANOV', from: 'N_NAR_GANCLIK', to: 'N_NAR_HEYDAR' },

  { code: 'RD_Y_SAFAROV', name: 'Yusif Səfərov küçəsi', zoneCode: 'KHATAI', from: 'N_NAS_28MAY', to: 'N_KHA_METRO' },
  { code: 'RD_HEYDAR_S', name: 'Heydər Əliyev - Xətai körpüsü', zoneCode: 'KHATAI', from: 'N_NAR_HEYDAR', to: 'N_KHA_METRO' },
  { code: 'RD_NOBEL', name: '8 Noyabr prospekti', zoneCode: 'KHATAI', from: 'N_KHA_METRO', to: 'N_KHA_AGSEHER' },
  { code: 'RD_BABEK', name: 'Babək prospekti', zoneCode: 'KHATAI', from: 'N_KHA_METRO', to: 'N_KHA_BABEK' },
  { code: 'RD_AGSEHER_N', name: 'Xəqani Rüstəmov küçəsi', zoneCode: 'KHATAI', from: 'N_KHA_AGSEHER', to: 'N_KHA_BABEK' },
  { code: 'RD_NAR_BABEK', name: 'Mikayıl Əliyev / Babək keçidi', zoneCode: 'KHATAI', from: 'N_NAR_METRO', to: 'N_KHA_BABEK' },
  { code: 'RD_SAHIL_KHA', name: 'Dənizkənarı Şərq Dəhlizi', zoneCode: 'KHATAI', from: 'N_SAB_SAHIL', to: 'N_KHA_METRO' },
];

export const SEED_ASSEMBLY_POINTS = [
  {
    code: 'AP_YAS_1',
    name: 'Elmlər Metro Sığınacağı',
    type: 'SHELTER',
    zoneCode: 'YASAMAL',
    nodeCode: 'N_YAS_ELMLER',
    lat: 40.3756,
    lng: 49.8154,
    address: 'Yasamal r., Hüseyn Cavid pr. 55',
    capacity: 500,
    currentOccupancy: 215,
    status: 'OPEN',
    isEmergencyReserve: false,
    isWheelchairAccessible: false,
  },
  {
    code: 'AP_YAS_2',
    name: 'Yasamal Mərkəzi Park Toplanış Sahəsi',
    type: 'PARK',
    zoneCode: 'YASAMAL',
    nodeCode: 'N_YAS_PARK',
    lat: 40.3829,
    lng: 49.8074,
    address: 'Yasamal r., M.Xiyabani küç.',
    capacity: 900,
    currentOccupancy: 360,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_YAS_RES',
    name: 'Yasamal Ehtiyat İdman Kompleksi',
    type: 'STADIUM',
    zoneCode: 'YASAMAL',
    nodeCode: 'N_YAS_INSAAT',
    lat: 40.3894,
    lng: 49.8035,
    address: 'Yasamal r., Şərifzadə küç. 142 (Ehtiyat)',
    capacity: 1100,
    currentOccupancy: 0,
    status: 'STANDBY',
    isEmergencyReserve: true,
  },
  {
    code: 'AP_SAB_1',
    name: 'Dənizkənarı Bulvar Parkı',
    type: 'PARK',
    zoneCode: 'SABAIL',
    nodeCode: 'N_SAB_SAHIL',
    lat: 40.3702,
    lng: 49.8453,
    address: 'Səbail r., Neftçilər pr. 26',
    capacity: 1400,
    currentOccupancy: 560,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_SAB_2',
    name: 'İçərişəhər Mərkəzi Sığınacağı',
    type: 'SHELTER',
    zoneCode: 'SABAIL',
    nodeCode: 'N_SAB_ICERI',
    lat: 40.3664,
    lng: 49.8321,
    address: 'Səbail r., İstiqlaliyyət küç. 18',
    capacity: 450,
    currentOccupancy: 270,
    status: 'OPEN',
    isEmergencyReserve: false,
    isWheelchairAccessible: false,
  },
  {
    code: 'AP_SAB_RES',
    name: 'Su İdmanı Sarayı Ehtiyat Məntəqəsi',
    type: 'STADIUM',
    zoneCode: 'SABAIL',
    nodeCode: 'N_SAB_BAYIL',
    lat: 40.3481,
    lng: 49.8373,
    address: 'Səbail r., Bayıl qəs. (Ehtiyat)',
    capacity: 1600,
    currentOccupancy: 0,
    status: 'STANDBY',
    isEmergencyReserve: true,
  },
  {
    code: 'AP_NAS_1',
    name: 'Zabitlər Parkı Toplanış Sahəsi',
    type: 'PARK',
    zoneCode: 'NASIMI',
    nodeCode: 'N_NAS_ZABIT',
    lat: 40.3869,
    lng: 49.839,
    address: 'Nəsimi r., S.Vurğun küç. 84',
    capacity: 950,
    currentOccupancy: 418,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_NAS_2',
    name: '28 May Yeraltı Sığınacağı',
    type: 'SHELTER',
    zoneCode: 'NASIMI',
    nodeCode: 'N_NAS_28MAY',
    lat: 40.3796,
    lng: 49.8495,
    address: 'Nəsimi r., Azadlıq pr. 19',
    capacity: 600,
    currentOccupancy: 330,
    status: 'OPEN',
    isEmergencyReserve: false,
    isWheelchairAccessible: false,
  },
  {
    code: 'AP_NAS_RES',
    name: 'Memar Əcəmi Ehtiyat Kompleksi',
    type: 'STADIUM',
    zoneCode: 'NASIMI',
    nodeCode: 'N_NAS_MEMAR',
    lat: 40.4105,
    lng: 49.8152,
    address: 'Nəsimi r., Cavadxan küç. 40 (Ehtiyat)',
    capacity: 1100,
    currentOccupancy: 0,
    status: 'STANDBY',
    isEmergencyReserve: true,
  },
  {
    code: 'AP_NAR_1',
    name: 'Tofiq Bəhramov Respublika Stadionu',
    type: 'STADIUM',
    zoneCode: 'NARIMANOV',
    nodeCode: 'N_NAR_GANCLIK',
    lat: 40.3976,
    lng: 49.8524,
    address: 'Nərimanov r., F.Xoyski pr. 98',
    capacity: 2200,
    currentOccupancy: 770,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_NAR_2',
    name: 'Heydər Əliyev Mərkəzi Parkı',
    type: 'PARK',
    zoneCode: 'NARIMANOV',
    nodeCode: 'N_NAR_HEYDAR',
    lat: 40.3955,
    lng: 49.8679,
    address: 'Nərimanov r., H.Əliyev pr. 1',
    capacity: 1300,
    currentOccupancy: 585,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_NAR_RES',
    name: 'Nərimanov Ehtiyat Yeraltı Sığınacağı',
    type: 'SHELTER',
    zoneCode: 'NARIMANOV',
    nodeCode: 'N_NAR_METRO',
    lat: 40.4033,
    lng: 49.8712,
    address: 'Nərimanov r., Təbriz küç. 87 (Ehtiyat)',
    capacity: 750,
    currentOccupancy: 0,
    status: 'STANDBY',
    isEmergencyReserve: true,
  },
  {
    code: 'AP_KHA_1',
    name: 'Ağ Şəhər Mərkəzi Parkı',
    type: 'PARK',
    zoneCode: 'KHATAI',
    nodeCode: 'N_KHA_AGSEHER',
    lat: 40.3762,
    lng: 49.8972,
    address: 'Xətai r., 8 Noyabr pr. 32',
    capacity: 1500,
    currentOccupancy: 450,
    status: 'OPEN',
    isEmergencyReserve: false,
  },
  {
    code: 'AP_KHA_2',
    name: 'Xətai Metro Sığınacağı',
    type: 'SHELTER',
    zoneCode: 'KHATAI',
    nodeCode: 'N_KHA_METRO',
    lat: 40.3836,
    lng: 49.8726,
    address: 'Xətai r., Xocalı pr. 14',
    capacity: 550,
    currentOccupancy: 220,
    status: 'OPEN',
    isEmergencyReserve: false,
    isWheelchairAccessible: false,
  },
  {
    code: 'AP_KHA_RES',
    name: 'Babək Ehtiyat Toplanış Kompleksi',
    type: 'STADIUM',
    zoneCode: 'KHATAI',
    nodeCode: 'N_KHA_BABEK',
    lat: 40.392,
    lng: 49.8948,
    address: 'Xətai r., Babək pr. 65 (Ehtiyat)',
    capacity: 1000,
    currentOccupancy: 0,
    status: 'STANDBY',
    isEmergencyReserve: true,
  },
];

export const SEED_BRIGADES = [
  { code: 'BRG-YAS-01', name: 'Yasamal Yanğınsöndürmə-1', unitType: 'FIRE', zoneCode: 'YASAMAL', lat: 40.3812, lng: 49.8112, status: 'AVAILABLE' },
  { code: 'BRG-YAS-02', name: 'Yasamal Ehtiyat Axtarış-Xilasetmə', unitType: 'SEARCH_RESCUE', zoneCode: 'YASAMAL', lat: 40.3875, lng: 49.805, status: 'STANDBY' },
  { code: 'BRG-SAB-01', name: 'Səbail Təcili Tibbi Briqada-1', unitType: 'MEDICAL', zoneCode: 'SABAIL', lat: 40.368, lng: 49.8395, status: 'AVAILABLE' },
  { code: 'BRG-SAB-02', name: 'Səbail Ehtiyat Sahil Xilasetmə', unitType: 'GENERAL', zoneCode: 'SABAIL', lat: 40.354, lng: 49.8355, status: 'STANDBY' },
  { code: 'BRG-NAS-01', name: 'Nəsimi Çevik Xilasetmə-1', unitType: 'SEARCH_RESCUE', zoneCode: 'NASIMI', lat: 40.384, lng: 49.8435, status: 'AVAILABLE' },
  { code: 'BRG-NAS-02', name: 'Nəsimi Ehtiyat Tibbi Briqada', unitType: 'MEDICAL', zoneCode: 'NASIMI', lat: 40.399, lng: 49.825, status: 'STANDBY' },
  { code: 'BRG-NAR-01', name: 'Nərimanov Yanğın və Qəza-1', unitType: 'FIRE', zoneCode: 'NARIMANOV', lat: 40.3995, lng: 49.8615, status: 'AVAILABLE' },
  { code: 'BRG-NAR-02', name: 'Nərimanov Ehtiyat Briqada', unitType: 'GENERAL', zoneCode: 'NARIMANOV', lat: 40.402, lng: 49.869, status: 'STANDBY' },
  { code: 'BRG-KHA-01', name: 'Xətai Sənaye-Xilasetmə-1', unitType: 'SEARCH_RESCUE', zoneCode: 'KHATAI', lat: 40.382, lng: 49.883, status: 'AVAILABLE' },
  { code: 'BRG-KHA-02', name: 'Xətai Ehtiyat Tibbi Briqada', unitType: 'MEDICAL', zoneCode: 'KHATAI', lat: 40.388, lng: 49.891, status: 'STANDBY' },
];

export const SEED_INITIAL_SOS = [
  {
    citizenCode: 'CIT-DEMO-101',
    citizenName: 'Rəşad Məmmədov',
    phone: '+994501112233',
    hazardType: 'MEDICAL',
    citizenStatus: 'SOS',
    zoneCode: 'SABAIL',
    lat: 40.3675,
    lng: 49.8355,
    notes: 'Yaşlı sakin üçün təcili tibbi yardım tələb olunur',
    status: 'PENDING',
  },
  {
    citizenCode: 'CIT-DEMO-102',
    citizenName: 'Leyla Əliyeva',
    phone: '+994552223344',
    hazardType: 'FIRE',
    citizenStatus: 'SOS',
    zoneCode: 'NASIMI',
    lat: 40.3822,
    lng: 49.8442,
    notes: 'Transformator məntəqəsində tüstülənmə',
    status: 'PENDING',
  },
];

/**
 * Populate PostgreSQL with Baku baseline data inside a clean reset transaction.
 */
export async function seedDatabase(prisma) {
  await ensureDispatchersSeeded(prisma);

  await prisma.$transaction(async (tx) => {
    await tx.criticalAlert.deleteMany();
    await tx.safetyCheckIn.deleteMany();
    await tx.sosSignal.deleteMany();
    await tx.assemblyPoint.deleteMany();
    await tx.roadSegment.deleteMany();
    await tx.roadNode.deleteMany();
    await tx.rescueBrigade.deleteMany();
    await tx.zone.deleteMany();

    const zoneMap = new Map();
    for (const z of SEED_ZONES) {
      const created = await tx.zone.create({ data: z });
      zoneMap.set(z.code, created);
    }

    const nodeMap = new Map();
    for (const n of SEED_NODES) {
      const created = await tx.roadNode.create({
        data: {
          code: n.code,
          name: n.name,
          zoneId: zoneMap.get(n.zoneCode).id,
          lat: n.lat,
          lng: n.lng,
        },
      });
      nodeMap.set(n.code, created);
    }

    for (const r of SEED_ROADS) {
      const fromNode = nodeMap.get(r.from);
      const toNode = nodeMap.get(r.to);
      const distanceMeters = haversineDistanceMeters(
        fromNode.lat,
        fromNode.lng,
        toNode.lat,
        toNode.lng
      );
      const midLat = Number(((fromNode.lat + toNode.lat) / 2 + 0.0005).toFixed(6));
      const midLng = Number(((fromNode.lng + toNode.lng) / 2 - 0.0004).toFixed(6));

      await tx.roadSegment.create({
        data: {
          code: r.code,
          name: r.name,
          zoneId: zoneMap.get(r.zoneCode).id,
          fromNodeId: fromNode.id,
          toNodeId: toNode.id,
          distanceMeters,
          waypoints: [
            [fromNode.lat, fromNode.lng],
            [midLat, midLng],
            [toNode.lat, toNode.lng],
          ],
          status: 'OPEN',
          isWheelchairAccessible: r.isWheelchairAccessible ?? true,
          accessibilityNotes:
            r.accessibilityNotes || 'Panduslu və əlil arabası / tibbi nəqliyyat üçün maneəsiz dəhliz',
        },
      });
    }

    for (const ap of SEED_ASSEMBLY_POINTS) {
      await tx.assemblyPoint.create({
        data: {
          code: ap.code,
          name: ap.name,
          type: ap.type,
          zoneId: zoneMap.get(ap.zoneCode).id,
          nodeId: nodeMap.get(ap.nodeCode)?.id ?? null,
          lat: ap.lat,
          lng: ap.lng,
          address: ap.address,
          capacity: ap.capacity,
          currentOccupancy: ap.currentOccupancy,
          status: ap.status,
          isEmergencyReserve: ap.isEmergencyReserve,
          isWheelchairAccessible: ap.isWheelchairAccessible ?? true,
        },
      });
    }

    for (const brg of SEED_BRIGADES) {
      await tx.rescueBrigade.create({
        data: {
          code: brg.code,
          name: brg.name,
          unitType: brg.unitType,
          zoneId: zoneMap.get(brg.zoneCode).id,
          lat: brg.lat,
          lng: brg.lng,
          status: brg.status,
        },
      });
    }

    for (const sos of SEED_INITIAL_SOS) {
      await tx.sosSignal.create({
        data: {
          citizenCode: sos.citizenCode,
          citizenName: sos.citizenName,
          phone: sos.phone,
          hazardType: sos.hazardType,
          citizenStatus: sos.citizenStatus,
          zoneId: zoneMap.get(sos.zoneCode).id,
          lat: sos.lat,
          lng: sos.lng,
          notes: sos.notes,
          status: sos.status,
        },
      });
    }
  });
}
