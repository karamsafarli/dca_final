export const TRANSLATIONS = {
  az: {
    brandTitle: 'Urban Crisis & Crowd Evacuation Engine',
    brandSubtitle: 'Bakı Şəhəri Operativ Təxliyə və Fövqəladə Koordinasiya Sistemi',
    navCitizen: 'Modul 1: Vətəndaş',
    navDispatcher: 'Modul 2: Dispetçer',
    navDispatcherLogin: 'Dispetçer Girişi',
    logout: 'Çıxış',
    liveSyncActive: 'Canlı Sinxronizasiya Aktivdir',
    reconnecting: 'Yenidən qoşulur...',
    checkingSession: 'Sessiya yoxlanılır...',
    loadingDispatcher: 'Dispetçer mərkəzi yüklənir...',

    // Enum labels
    hazards: {
      FIRE: 'Yanğın',
      COLLAPSE: 'Dağıntı',
      FLOOD: 'Su basması',
      MEDICAL: 'Tibbi yardım',
    },
    pointTypes: {
      SHELTER: 'Sığınacaq',
      PARK: 'Park',
      STADIUM: 'Stadion',
    },
    pointStatuses: {
      OPEN: 'Açıq',
      STANDBY: 'Ehtiyatda',
      FULL: 'Tam Dolu',
      CLOSED: 'Bağlı',
    },
    roadStatuses: {
      OPEN: 'Açıq',
      CONGESTED: 'Tıxaclı',
      CLOSED: 'Bağlı',
    },
    brigadeStatuses: {
      AVAILABLE: 'Hazır',
      DISPATCHED: 'Yönləndirilib',
      STANDBY: 'Ehtiyatda',
    },
    brigadeTypes: {
      FIRE: 'Yanğınsöndürmə',
      MEDICAL: 'Təcili Tibbi Yardım',
      SEARCH_RESCUE: 'Axtarış-Xilasetmə',
      GENERAL: 'Ümumi Xilasetmə',
    },
    riskLevels: {
      LOW: 'Normal',
      MEDIUM: 'Orta Risk',
      HIGH: 'Yüksək Risk',
      CRITICAL: 'Kritik Həyəcan',
    },

    // Citizen Role & Accessibility
    citizenRoleTitle: 'Vətəndaş Kateqoriyası / Rolu',
    roleStandard: 'Standart Vətəndaş',
    roleStandardDesc: 'Ümumi təxliyə marşrutları və sığınacaqlar',
    roleSpecialCare: 'Hərəkət Məhdudiyyətli / Xüsusi Qayğı',
    roleSpecialCareDesc:
      'Prioritet #1 SOS + Yalnız panduslu və əlil arabası / tibbi nəqliyyat üçün maneəsiz marşrutlar',
    accessibilityActiveBadge: 'Maneəsiz & Panduslu Marşrut Rejimi',
    accessibleTag: 'Panduslu / Əlçatan',
    inaccessibleTag: 'Pandus yoxdur (Pilləkənli)',
    priorityBadge: 'KRİTİK PRİORİTET (Priority #1)',

    // Zone & Coordinate Selector
    locationTitle: 'Mövqe və Rayon Seçimi',
    selectDistrictLabel: 'Rayon / Zona seçin',
    pickOnMap: 'Xəritədən Seç',
    pickingActive: 'Seçim Aktivdir',
    useGps: 'GPS Mövqeyim',
    mapPickBanner:
      'Xəritə üzərində istənilən nöqtəyə klikləyin — koordinat yenilənəcək',

    // SOS Control Panel
    sosPanelTitle: 'Bir Kliklə SOS & Təhlükəsizlik Statusu',
    activeSosBannerTitle: 'Aktiv SOS Siqnalı Göndərilib',
    hazardLabel: 'Təhlükə',
    zoneLabel: 'Zona',
    codeLabel: 'Kod',
    statusLabel: 'Status',
    sosDispatchedNote: 'Xilasetmə briqadası yoldadır',
    sosPendingNote: 'Dispetçer emalındadır',
    markSafeBtn: 'Təhlükəsizəm — Statusu Yenilə',
    markSafeQuickBtn: 'Təhlükəsizəm (Statusu Təsdiqlə)',
    safeConfirmedBanner: 'Statusunuz "Təhlükəsizəm" olaraq yeniləndi.',
    namePlaceholder: 'Ad, Soyad (istəyə bağlı)',
    notesPlaceholder: 'Qısa qeyd (məs. əlil arabası ilə 2 nəfərik)',
    sosInstruction: 'Təhlükə növünü seçərək 1 kliklə SOS göndərin:',
    sosPrefix: 'SOS',

    // Evacuation Route Card
    calculatingRoute: 'Təxliyə marşrutu hesablanır...',
    rerouteBannerTitle: 'Avtomatik Alternativ Təxliyə Marşrutu Aktivləşdirildi',
    rerouteRoadClosure:
      'Bağlı yol ({roads}) aşkarlandığı üçün təhlükəsiz yan keçid marşrutu quruldu.',
    rerouteOccupancy90:
      '{name} doluluğu {percent}% (≥90%) olduğu üçün avtomatik olaraq növbəti təhlükəsiz məntəqə seçildi.',
    rerouteAccessibility:
      'Xüsusi qayğı / əlil arabası rejimi aktivdir — pilləkənli və pandussuz yollar/sığınacaqlar kənarlaşdırılaraq yalnız maneəsiz marşrut təyin edildi.',
    recommendedBadge: 'Tövsiyə Olunan Məntəqə',
    recommendedShort: 'Tövsiyə',
    walkMinutes: '~{min} dəq piyada',
    currentOccupancy: 'Cari doluluq: {curr} / {cap} nəfər',
    routeCorridor: 'Təxliyə Marşrutu Dəhlizi:',
    nearbyPointsTitle: 'Ən Yaxın Toplanış Məntəqələri ({count})',
    full90Tag: '≥90% Dolu',
    roadBlockedTag: 'Yol Bağlıdır',
    unreachable: 'Əlçatmaz',

    // Map Legend & Popups
    legendOrigin: 'Mövqe',
    legendRecommended: 'Tövsiyə edilən',
    legendOpen: 'Açıq məntəqə',
    legendFullSos: 'Dolu (≥90%) / SOS',
    legendClosedRoad: 'Bağlı yol',
    legendInaccessibleRoad: 'Pilləkənli (Pandussuz)',
    legendRoute: 'Təxliyə marşrutu',
    popupYourLocation: 'Sizin Cari Mövqeyiniz',
    popupType: 'Növ',
    popupOccupancy: 'Doluluq',
    popupDistance: 'Məsafə',
    popupMin: 'dəq',
    popupReason: 'Səbəb',
    popupCitizen: 'Vətəndaş',
    popupBrigadeCode: 'Kod',

    // Dispatcher Auth
    loginTitle: 'Dispetçer Mərkəzinə Təhlükəsiz Giriş',
    loginSubtitle:
      'Böhran idarəetmə əməliyyatları, yol statusu dəyişikliyi və Qırmızı Həyəcan icrası yalnız səlahiyyətli operatorlar üçün açıqdır.',
    usernameLabel: 'İstifadəçi adı',
    usernamePlaceholder: 'məs. dispatcher1',
    passwordLabel: 'Şifrə',
    loginSubmit: 'Dispetçer Panelinə Daxil Ol',
    loginChecking: 'Yoxlanılır...',
    loginErrorFallback: 'Giriş zamanı xəta baş verdi',
    loginSecurityNote:
      'Sessiya HttpOnly JWT tokeni ilə qorunur. İcazəsiz sorğular API səviyyəsində bloklanır.',

    // Dispatcher Dashboard
    simTitle: 'Sürətli Ssenari Simulyatoru:',
    sim4Sos: '4 SOS Klasteri (500m)',
    simCloseRoad: 'Yol Bağla',
    simSpike92: 'Doluluğu 92% Et',
    simSpike97: 'Doluluğu 97% Et (>95%)',
    simReset: 'Sıfırla',
    redAlertTag: 'KRİTİK BÖHRAN ALQORİTMİ',
    redAlertTitle:
      'Qırmızı Həyəcan: Əlavə xilasetmə briqadası göndər və yeni toplanış nöqtəsi aç',
    redAlertExecuteBtn: 'Təsdiqlə və İcra Et',
    closeBtn: 'Bağla',
    executedLabel: 'İcra Edildi',
    executedSummary:
      'Briqada {brigade} yönləndirildi və {shelter} toplanış məntəqəsi açıldı.',

    // KPIs
    kpiActiveSos: 'Aktiv SOS Siqnalları',
    kpiPrioritySub: '{priority} Kritik Prioritet #1 • {pending} gözləyən',
    kpiActiveAlerts: 'Aktiv Qırmızı Həyəcan',
    kpiCrisisAlgo: 'Böhran alqoritmi',
    kpiBrigades: 'Xilasetmə Briqadaları',
    kpiBrigadesSub: '{count} hazır/ehtiyat',
    kpiOpenShelters: 'Açıq Toplanış Məntəqəsi',
    kpiCrowdedSub: '{count} məntəqə ≥90%',
    kpiClosedRoads: 'Bağlı Yollar',
    kpiAutoRouteSub: 'Avto-marşrut aktivdir',
    kpiSafeConfirmations: 'Təhlükəsiz Təsdiqlər',
    kpiCitizenStatusSub: 'Vətəndaş statusu',

    // Dispatcher Lists
    zoneStatusTitle: 'Şəhər Zonaları üzrə Vəziyyət',
    zoneStatsLine: 'SOS: {sos} • Açıq məntəqə: {shelters} • Briqada: {brigades}',
    sosFeedTitle: 'Daxil Olan SOS Siqnalları ({count})',
    safeBadge: 'Təhlükəsizdir',
    assignedBrigade: 'Briqada',
    dispatchBrigadeBtn: 'Briqada Göndər',
    tabShelters: 'Məntəqələr ({count})',
    tabRoads: 'Yollar ({count})',
    peopleUnit: 'nəfər',
    openPointBtn: 'Məntəqəni Aç',
    brigadesTitle: 'Aktiv və Ehtiyat Xilasetmə Briqadaları ({count})',

    // Toasts
    toastWelcome: 'Xoş gəldiniz, {name}',
    toastLoggedOut: 'Dispetçer hesabından çıxış edildi',
    toastSessionExpired:
      'Dispetçer sessiyası bitdi. Zəhmət olmasa yenidən daxil olun.',
    toastRouteRecalculated:
      'Təhlükəsizlik vəziyyəti yeniləndi — marşrut yenidən hesablandı',
    toastCoordPicked: 'Yeni koordinat seçildi və marşrut yeniləndi',
    toastGpsUnsupported:
      'Brauzer GPS dəstəkləmir — xəritədən koordinat seçin',
    toastGpsSet: 'GPS mövqeyiniz təyin edildi',
    toastGpsDenied:
      'GPS icazəsi verilmədi. Xəritədən nöqtə seçə və ya rayon seçə bilərsiniz.',
    toastSosSent: 'SOS siqnalı ({hazard}) dispetçerə göndərildi!',
    toastPrioritySosSent:
      'KRİTİK PRİORİTET #1 SOS ({hazard}) göndərildi! Maneəsiz marşrut aktivdir.',
    toastSafeRecorded: 'Təhlükəsizlik statusunuz qeydə alındı!',
    toastPrioritySosArrived:
      'KRİTİK PRİORİTET #1 SOS daxil oldu: Hərəkət məhdudiyyətli vətəndaş!',
    toastAlertExecuted:
      'Qırmızı Həyəcan icra edildi: əlavə briqada göndərildi və yeni məntəqə açıldı!',
    toastAlertDismissed: 'Xəbərdarlıq bağlandı',
    toastBrigadeDispatched: 'Xilasetmə briqadası yönləndirildi',
    toastShelterUpdated: 'Toplanış məntəqəsi yeniləndi',
    toastRoadUpdated: 'Yol statusu yeniləndi',
    toastSimSosBurst: '4 SOS siqnalı simulyasiya edildi',
    toastSimRoadClosed: 'Yol bağlanması simulyasiya edildi',
    toastSimOccupancy: 'Məntəqə doluluğu {percent}% edildi',
    toastSimReset: 'Sistem ilkin vəziyyətə qaytarıldı',
  },

  en: {
    brandTitle: 'Urban Crisis & Crowd Evacuation Engine',
    brandSubtitle: 'Baku Emergency Evacuation & Crisis Coordination Platform',
    navCitizen: 'Module 1: Citizen',
    navDispatcher: 'Module 2: Dispatcher',
    navDispatcherLogin: 'Dispatcher Login',
    logout: 'Logout',
    liveSyncActive: 'Live Sync Active',
    reconnecting: 'Reconnecting...',
    checkingSession: 'Checking session...',
    loadingDispatcher: 'Loading dispatcher center...',

    // Enum labels
    hazards: {
      FIRE: 'Fire',
      COLLAPSE: 'Building Collapse',
      FLOOD: 'Flooding',
      MEDICAL: 'Medical Aid',
    },
    pointTypes: {
      SHELTER: 'Shelter',
      PARK: 'Park',
      STADIUM: 'Stadium',
    },
    pointStatuses: {
      OPEN: 'Open',
      STANDBY: 'Standby',
      FULL: 'Full',
      CLOSED: 'Closed',
    },
    roadStatuses: {
      OPEN: 'Open',
      CONGESTED: 'Congested',
      CLOSED: 'Closed',
    },
    brigadeStatuses: {
      AVAILABLE: 'Available',
      DISPATCHED: 'Dispatched',
      STANDBY: 'Standby',
    },
    brigadeTypes: {
      FIRE: 'Fire & Rescue',
      MEDICAL: 'Emergency Medical',
      SEARCH_RESCUE: 'Search & Rescue',
      GENERAL: 'General Rescue',
    },
    riskLevels: {
      LOW: 'Normal',
      MEDIUM: 'Moderate Risk',
      HIGH: 'High Risk',
      CRITICAL: 'Critical Alert',
    },

    // Citizen Role & Accessibility
    citizenRoleTitle: 'Citizen Category / Profile',
    roleStandard: 'Standard Citizen',
    roleStandardDesc: 'General evacuation routes & assembly shelters',
    roleSpecialCare: 'Mobility-Impaired / Special Care',
    roleSpecialCareDesc:
      'Priority #1 SOS + Ramp-equipped & barrier-free wheelchair / medical transport routes only',
    accessibilityActiveBadge: 'Step-Free & Wheelchair Route Mode',
    accessibleTag: 'Ramp / Accessible',
    inaccessibleTag: 'No Ramp (Stairs Only)',
    priorityBadge: 'CRITICAL PRIORITY (Priority #1)',

    // Zone & Coordinate Selector
    locationTitle: 'Location & District Selection',
    selectDistrictLabel: 'Select District / Zone',
    pickOnMap: 'Pick on Map',
    pickingActive: 'Map Pick Active',
    useGps: 'My GPS Location',
    mapPickBanner:
      'Click anywhere on the map to set your coordinates and recalculate routes',

    // SOS Control Panel
    sosPanelTitle: 'One-Click SOS & Safety Status',
    activeSosBannerTitle: 'Active SOS Signal Transmitted',
    hazardLabel: 'Hazard',
    zoneLabel: 'Zone',
    codeLabel: 'Code',
    statusLabel: 'Status',
    sosDispatchedNote: 'Rescue brigade is en route',
    sosPendingNote: 'Being processed by dispatcher',
    markSafeBtn: 'I Am Safe — Update Status',
    markSafeQuickBtn: 'I Am Safe (Confirm Status)',
    safeConfirmedBanner: 'Your status has been updated to "Safe".',
    namePlaceholder: 'Full name (optional)',
    notesPlaceholder: 'Short note (e.g. wheelchair user, 2 people)',
    sosInstruction: 'Select hazard type to send a 1-click SOS signal:',
    sosPrefix: 'SOS',

    // Evacuation Route Card
    calculatingRoute: 'Calculating evacuation route...',
    rerouteBannerTitle: 'Automatic Alternative Evacuation Route Activated',
    rerouteRoadClosure:
      'Closed road ({roads}) detected — safe detour corridor computed automatically.',
    rerouteOccupancy90:
      '{name} reached {percent}% occupancy (≥90%) — automatically redirected to the next safe point.',
    rerouteAccessibility:
      'Special Care / Wheelchair mode is active — stairs-only passages and non-accessible shelters were excluded for a barrier-free route.',
    recommendedBadge: 'Recommended Assembly Point',
    recommendedShort: 'Recommended',
    walkMinutes: '~{min} min walk',
    currentOccupancy: 'Occupancy: {curr} / {cap} people',
    routeCorridor: 'Evacuation Route Corridor:',
    nearbyPointsTitle: 'Nearest Assembly Points ({count})',
    full90Tag: '≥90% Full',
    roadBlockedTag: 'Road Blocked',
    unreachable: 'Unreachable',

    // Map Legend & Popups
    legendOrigin: 'Your Position',
    legendRecommended: 'Recommended',
    legendOpen: 'Open Point',
    legendFullSos: 'Full (≥90%) / SOS',
    legendClosedRoad: 'Closed Road',
    legendInaccessibleRoad: 'Stairs (No Ramp)',
    legendRoute: 'Evacuation Route',
    popupYourLocation: 'Your Current Position',
    popupType: 'Type',
    popupOccupancy: 'Occupancy',
    popupDistance: 'Distance',
    popupMin: 'min',
    popupReason: 'Reason',
    popupCitizen: 'Citizen',
    popupBrigadeCode: 'Code',

    // Dispatcher Auth
    loginTitle: 'Secure Dispatcher Center Login',
    loginSubtitle:
      'Crisis command actions, road closures, and Red Alert execution are restricted to authorized dispatchers.',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g. dispatcher1',
    passwordLabel: 'Password',
    loginSubmit: 'Sign In to Dispatcher Panel',
    loginChecking: 'Verifying...',
    loginErrorFallback: 'Authentication failed',
    loginSecurityNote:
      'Session is secured with an HttpOnly JWT cookie. Unauthorized API requests are rejected.',

    // Dispatcher Dashboard
    simTitle: 'Quick Scenario Simulator:',
    sim4Sos: '4 SOS Cluster (500m)',
    simCloseRoad: 'Close Road',
    simSpike92: 'Set Occupancy 92%',
    simSpike97: 'Set Occupancy 97% (>95%)',
    simReset: 'Reset',
    redAlertTag: 'CRITICAL CRISIS ALGORITHM',
    redAlertTitle:
      'Red Alert: Dispatch additional rescue brigade and open new assembly point',
    redAlertExecuteBtn: 'Approve & Execute',
    closeBtn: 'Dismiss',
    executedLabel: 'Executed',
    executedSummary:
      'Brigade {brigade} dispatched and {shelter} opened.',

    // KPIs
    kpiActiveSos: 'Active SOS Signals',
    kpiPrioritySub: '{priority} Critical Priority #1 • {pending} pending',
    kpiActiveAlerts: 'Active Red Alerts',
    kpiCrisisAlgo: 'Crisis engine',
    kpiBrigades: 'Rescue Brigades',
    kpiBrigadesSub: '{count} available/standby',
    kpiOpenShelters: 'Open Assembly Points',
    kpiCrowdedSub: '{count} points ≥90%',
    kpiClosedRoads: 'Closed Roads',
    kpiAutoRouteSub: 'Auto-rerouting active',
    kpiSafeConfirmations: 'Safe Confirmations',
    kpiCitizenStatusSub: 'Citizen reports',

    // Dispatcher Lists
    zoneStatusTitle: 'District Risk Overview',
    zoneStatsLine: 'SOS: {sos} • Open points: {shelters} • Brigades: {brigades}',
    sosFeedTitle: 'Incoming SOS Signals ({count})',
    safeBadge: 'Marked Safe',
    assignedBrigade: 'Brigade',
    dispatchBrigadeBtn: 'Dispatch Brigade',
    tabShelters: 'Assembly Points ({count})',
    tabRoads: 'Roads ({count})',
    peopleUnit: 'people',
    openPointBtn: 'Open Point',
    brigadesTitle: 'Active & Reserve Rescue Brigades ({count})',

    // Toasts
    toastWelcome: 'Welcome, {name}',
    toastLoggedOut: 'Signed out of dispatcher session',
    toastSessionExpired:
      'Dispatcher session expired. Please sign in again.',
    toastRouteRecalculated:
      'Safety conditions updated — evacuation route recalculated',
    toastCoordPicked: 'New coordinate selected and route updated',
    toastGpsUnsupported:
      'Browser does not support GPS — please pick a point on the map',
    toastGpsSet: 'GPS location updated',
    toastGpsDenied:
      'GPS permission denied. You can select a district or click on the map.',
    toastSosSent: 'SOS signal ({hazard}) transmitted to dispatcher!',
    toastPrioritySosSent:
      'CRITICAL PRIORITY #1 SOS ({hazard}) sent! Accessible barrier-free route active.',
    toastSafeRecorded: 'Your safe status has been recorded!',
    toastPrioritySosArrived:
      'CRITICAL PRIORITY #1 SOS received: Mobility-impaired citizen!',
    toastAlertExecuted:
      'Red Alert executed: additional brigade dispatched and reserve point opened!',
    toastAlertDismissed: 'Alert dismissed',
    toastBrigadeDispatched: 'Rescue brigade dispatched',
    toastShelterUpdated: 'Assembly point updated',
    toastRoadUpdated: 'Road status updated',
    toastSimSosBurst: '4 SOS cluster signals simulated',
    toastSimRoadClosed: 'Road closure simulated',
    toastSimOccupancy: 'Assembly point occupancy set to {percent}%',
    toastSimReset: 'System reset to baseline state',
  },
};
