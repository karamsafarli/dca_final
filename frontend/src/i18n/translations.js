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
    assistanceNoAccessibleTitle: 'Maneəsiz (panduslu) marşrut tapılmadı',
    assistanceNoAccessibleBody:
      'Hazırda heç bir açıq toplanış məntəqəsinə əlil arabası ilə keçilə bilən yol yoxdur. Olduğunuz yerdə təhlükəsiz qalın və tibbi nəqliyyat tələb edin.',
    assistanceNoReachableTitle: 'Əlçatan toplanış məntəqəsi yoxdur',
    assistanceNoReachableBody:
      'Bütün yollar bağlıdır və ya məntəqələr əlçatan deyil. Olduğunuz yerdə təhlükəsiz qalın və xilasetmə tələb edin.',
    assistanceRequestBtn: 'Tibbi nəqliyyat / xilasetmə tələb et (Prioritet SOS)',
    assistanceSosNote: 'Maneəsiz/əlçatan marşrut tapılmadı — nəqliyyatla təxliyə tələb olunur',
    rerouteAllHigh: 'Bütün yaxın məntəqələr 90%-dən doludur — ən az dolu məntəqə seçildi.',
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
    redAlertMsgCapacity:
      '{point} doluluğu {percent}%-ə çatdı (95% kritik həddi keçdi). Dərhal ehtiyat tutum tələb olunur.',
    redAlertMsgCluster:
      '{zone} üzrə son 5 dəqiqədə {count} fərqli vətəndaşdan SOS siqnalı qeydə alındı (500 m radius / eyni zona). Dərhal müdaxilə tələb olunur!',
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

    // Routing provider resilience (Challenge Drop #2)
    routingOfflineTitle: 'Oflayn / Ehtiyat marşrut rejimində işləyir',
    routingModeFALLBACK_CACHE:
      'Xarici xəritə və marşrut xidməti əlçatan deyil. Bu ünvan üçün son keşlənmiş marşrut göstərilir ({time} saxlanılıb).',
    routingModeFALLBACK_LOCAL_GRAPH:
      'Xarici xəritə və marşrut xidməti əlçatan deyil. Marşrut yerli ehtiyat yol bazası üzrə hesablanıb.',
    routingModeFALLBACK_STRAIGHT_LINE:
      'Xarici xəritə və marşrut xidməti əlçatan deyil. Məsafələr statik koordinat matrisi üzrə (düz xətt) təxmini hesablanıb.',
    routingReasonEXTERNAL_UNAVAILABLE: 'Səbəb: xidmət HTTP 503 qaytarır',
    routingReasonEXTERNAL_TIMEOUT: 'Səbəb: cavab müddəti 5 saniyəni keçdi',
    routingReasonCIRCUIT_OPEN: 'Səbəb: qoruyucu mexanizm (circuit breaker) aktivdir',
    routingReasonEXTERNAL_UNREACHABLE: 'Səbəb: xidmətə qoşulmaq mümkün deyil',
    routingReasonINVALID_RESPONSE: 'Səbəb: xidmət yanlış cavab qaytardı',
    routingReasonEXTERNAL_ERROR: 'Səbəb: xidmət xətası',
    routingOfflineFooter:
      'Təxliyə xidməti dayanmır. Xidmət bərpa olunduqda sistem avtomatik onlayn rejimə qayıdacaq.',
    toastRoutingOffline: 'Xarici marşrut xidməti əlçatan deyil — ehtiyat marşrut rejiminə keçildi.',
    toastRoutingOnline: 'Xarici marşrut xidməti bərpa olundu — onlayn rejim.',
    routingApiLabel: 'Marşrut API',
    routingApiOnline: 'Onlayn',
    routingApiDegraded: 'Ehtiyat rejim',
    simRoutingDown: 'API: 503',
    simRoutingSlow: 'API: >5 san',
    simRoutingHealthy: 'API: Bərpa et',
    toastSimRoutingDOWN: 'Simulyasiya: xarici marşrut API-si HTTP 503 qaytarır.',
    toastSimRoutingSLOW: 'Simulyasiya: xarici marşrut API-si 5 saniyədən gec cavab verir.',
    toastSimRoutingHEALTHY: 'Simulyasiya: xarici marşrut API-si bərpa olundu.',

    // API error codes (backend returns `code`, UI translates it)
    errors: {
      VALIDATION_ERROR: 'Daxil edilən məlumat yanlışdır.',
      ROUTE_NOT_FOUND: 'Sorğu ünvanı tapılmadı.',
      NOT_FOUND: 'Məlumat tapılmadı.',
      INTERNAL_ERROR: 'Serverdə gözlənilməz xəta baş verdi.',
      NETWORK_ERROR: 'Serverlə əlaqə yoxdur. İnternet bağlantınızı yoxlayın.',
      AUTH_REQUIRED: 'Dispetçer autentifikasiyası tələb olunur.',
      SESSION_INVALID: 'Sessiya etibarsızdır və ya hesab deaktiv edilib.',
      RATE_LIMITED: 'Çox sayda cəhd. Bir neçə dəqiqə sonra yenidən cəhd edin.',
      INVALID_CREDENTIALS: 'İstifadəçi adı və ya şifrə yanlışdır.',
      LOCATION_REQUIRED: 'Rayon və ya koordinat seçilməlidir.',
      SOS_NOT_FOUND: 'SOS siqnalı tapılmadı.',
      SOS_ACCESS_DENIED: 'Bu SOS siqnalını yeniləmək icazəniz yoxdur.',
      SOS_ALREADY_RESOLVED: 'Bu SOS artıq bağlanıb.',
      BRIGADE_NOT_FOUND: 'Briqada tapılmadı.',
      BRIGADE_BUSY: 'Bu briqada artıq başqa tapşırıqdadır.',
      NO_BRIGADE_AVAILABLE: 'Hazırda boş xilasetmə briqadası yoxdur.',
      ALERT_NOT_FOUND: 'Həyəcan siqnalı tapılmadı.',
      ALERT_DISMISSED: 'Bağlanmış həyəcan icra edilə bilməz.',
      ALERT_NOT_ACTIVE: 'Yalnız aktiv həyəcan bağlana bilər.',
      ROAD_NOT_FOUND: 'Yol seqmenti tapılmadı.',
      ASSEMBLY_POINT_NOT_FOUND: 'Toplanış məntəqəsi tapılmadı.',
      ZONE_NOT_FOUND: 'Zona tapılmadı.',
      ROUTING_API_CONTROL_FAILED: 'Simulyasiya olunmuş marşrut API-sinə qoşulmaq mümkün olmadı.',
      FORBIDDEN: 'Rolunuz bu əməliyyata icazə vermir.',
    },

    // Citizen status hero & mobile action bar
    heroLabel: 'Hara getməli',
    heroMeta: '{distance} · ~{min} dəq piyada · {percent}% dolu',
    heroShowMap: 'Marşrutu xəritədə göstər',
    heroLoading: 'Ən təhlükəsiz məntəqə hesablanır…',
    mobileSos: 'SOS göndər',
    mobileRoute: 'Marşrut',
    actionBarLabel: 'Sürətli əməliyyatlar',

    demoScenariosToggle: 'Demo ssenariləri (münsiflər üçün simulyasiya)',

    // App shells (role-based navigation) & theme
    brandShort: 'Bakı Təxliyə',
    operatorLink: 'Operator girişi',
    consoleTitle: 'Dispetçer konsolu',
    openCitizenView: 'Vətəndaş görünüşü',
    backToCitizen: 'Vətəndaş tətbiqinə qayıt',
    themeLabel: 'Mövzu',
    themeLight: 'Açıq',
    themeDark: 'Tünd',
    themeSystem: 'Sistem',
    languageLabel: 'Dil',
    connectionLive: 'Canlı bağlantı',
    connectionLost: 'Bağlantı bərpa olunur…',
    operatorMenu: 'Operator menyusu',
    activeAlertsLabel: '{count} aktiv həyəcan',

    sosCardHint: 'Təhlükə növünə toxunun — siqnal dərhal dispetçerə çatır.',
    optionalDetails: 'Əlavə məlumat (istəyə bağlı)',
    profileLabel: 'Profil',
    routeDetailsTitle: 'Marşrut təfərrüatları',
    nearbyPointsShort: 'Yaxın məntəqələr',
    recommendedPill: 'Tövsiyə olunan',

    distanceLabel: 'Məsafə',
    walkLabel: 'Piyada',
    minutesShort: 'dəq',
    occupancyLabel: 'Doluluq',
    simGroupCrisis: 'Böhran',
    simGroupRouting: 'Marşrut API',

    // Challenge Drop #3: flood protection & RBAC
    kpiSosLatency: 'SOS API gecikməsi',
    kpiSosLatencySub: 'orta · hədəf < 300 ms',
    toastSosBurst: '{count} yeni SOS siqnalı daxil oldu',
    toastPriorityBurst: '{count} Prioritet #1 SOS daxil oldu',
    readOnlyMode: 'Yalnız baxış rejimi: rolunuz ({role}) əməliyyat icra etməyə icazə vermir.',
    toastSosDuplicate: 'SOS siqnalınız artıq qəbul edilib — təkrar göndərmək lazım deyil.',
    roles: { OBSERVER: 'Müşahidəçi', DISPATCHER: 'Dispetçer', COMMANDER: 'Komandir' },

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
    assistanceNoAccessibleTitle: 'No step-free (ramp) route available',
    assistanceNoAccessibleBody:
      'No open assembly point can currently be reached by wheelchair. Stay where you are if it is safe and request medical transport.',
    assistanceNoReachableTitle: 'No reachable assembly point',
    assistanceNoReachableBody:
      'All roads are closed or no point can be reached. Stay where you are if it is safe and request rescue.',
    assistanceRequestBtn: 'Request medical transport / rescue (Priority SOS)',
    assistanceSosNote: 'No step-free/reachable route found — transport evacuation required',
    rerouteAllHigh: 'All nearby points are above 90% — the least crowded one was chosen.',
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
    redAlertMsgCapacity:
      '{point} occupancy reached {percent}% (above the 95% critical threshold). Reserve capacity is needed immediately.',
    redAlertMsgCluster:
      'SOS signals from {count} different citizens in {zone} within 5 minutes (500 m radius / same zone). Immediate response required!',
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

    // Routing provider resilience (Challenge Drop #2)
    routingOfflineTitle: 'Running in offline / backup route mode',
    routingModeFALLBACK_CACHE:
      'The external map & routing service is unavailable. Showing the last cached route for this location (saved {time}).',
    routingModeFALLBACK_LOCAL_GRAPH:
      'The external map & routing service is unavailable. Your route was calculated from the local backup road database.',
    routingModeFALLBACK_STRAIGHT_LINE:
      'The external map & routing service is unavailable. Distances are estimated from the static coordinate matrix (straight line).',
    routingReasonEXTERNAL_UNAVAILABLE: 'Reason: the service returns HTTP 503',
    routingReasonEXTERNAL_TIMEOUT: 'Reason: response time exceeded 5 seconds',
    routingReasonCIRCUIT_OPEN: 'Reason: circuit breaker is open',
    routingReasonEXTERNAL_UNREACHABLE: 'Reason: the service cannot be reached',
    routingReasonINVALID_RESPONSE: 'Reason: the service returned an invalid response',
    routingReasonEXTERNAL_ERROR: 'Reason: service error',
    routingOfflineFooter:
      'Evacuation guidance continues. The system switches back to online mode automatically once the service recovers.',
    toastRoutingOffline: 'External routing service unavailable — switched to backup route mode.',
    toastRoutingOnline: 'External routing service restored — back online.',
    routingApiLabel: 'Routing API',
    routingApiOnline: 'Online',
    routingApiDegraded: 'Backup mode',
    simRoutingDown: 'API: 503',
    simRoutingSlow: 'API: >5 s',
    simRoutingHealthy: 'API: Restore',
    toastSimRoutingDOWN: 'Simulation: external routing API now returns HTTP 503.',
    toastSimRoutingSLOW: 'Simulation: external routing API now responds after 5+ seconds.',
    toastSimRoutingHEALTHY: 'Simulation: external routing API restored.',

    // API error codes (backend returns `code`, UI translates it)
    errors: {
      VALIDATION_ERROR: 'The submitted data is invalid.',
      ROUTE_NOT_FOUND: 'Request address not found.',
      NOT_FOUND: 'Not found.',
      INTERNAL_ERROR: 'An unexpected server error occurred.',
      NETWORK_ERROR: 'Cannot reach the server. Check your internet connection.',
      AUTH_REQUIRED: 'Dispatcher authentication required.',
      SESSION_INVALID: 'Session is invalid or the account is deactivated.',
      RATE_LIMITED: 'Too many attempts. Try again in a few minutes.',
      INVALID_CREDENTIALS: 'Invalid username or password.',
      LOCATION_REQUIRED: 'Select a district or a coordinate.',
      SOS_NOT_FOUND: 'SOS signal not found.',
      SOS_ACCESS_DENIED: 'You are not allowed to update this SOS.',
      SOS_ALREADY_RESOLVED: 'This SOS is already resolved.',
      BRIGADE_NOT_FOUND: 'Brigade not found.',
      BRIGADE_BUSY: 'This brigade is already on another mission.',
      NO_BRIGADE_AVAILABLE: 'No rescue brigade is available right now.',
      ALERT_NOT_FOUND: 'Alert not found.',
      ALERT_DISMISSED: 'A dismissed alert cannot be executed.',
      ALERT_NOT_ACTIVE: 'Only active alerts can be dismissed.',
      ROAD_NOT_FOUND: 'Road segment not found.',
      ASSEMBLY_POINT_NOT_FOUND: 'Assembly point not found.',
      ZONE_NOT_FOUND: 'Zone not found.',
      ROUTING_API_CONTROL_FAILED: 'Could not reach the simulated routing API.',
      FORBIDDEN: 'Your role does not allow this action.',
    },

    // Citizen status hero & mobile action bar
    heroLabel: 'Where to go',
    heroMeta: '{distance} · ~{min} min walk · {percent}% full',
    heroShowMap: 'Show route on map',
    heroLoading: 'Finding the safest assembly point…',
    mobileSos: 'Send SOS',
    mobileRoute: 'Route',
    actionBarLabel: 'Quick actions',

    demoScenariosToggle: 'Demo scenarios (simulation for the jury)',

    // App shells (role-based navigation) & theme
    brandShort: 'Baku Evacuation',
    operatorLink: 'Operator sign-in',
    consoleTitle: 'Dispatch console',
    openCitizenView: 'Citizen view',
    backToCitizen: 'Back to the citizen app',
    themeLabel: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    languageLabel: 'Language',
    connectionLive: 'Live connection',
    connectionLost: 'Reconnecting…',
    operatorMenu: 'Operator menu',
    activeAlertsLabel: '{count} active alerts',

    sosCardHint: 'Tap the hazard type — the signal reaches a dispatcher immediately.',
    optionalDetails: 'Additional details (optional)',
    profileLabel: 'Profile',
    routeDetailsTitle: 'Route details',
    nearbyPointsShort: 'Nearby points',
    recommendedPill: 'Recommended',

    distanceLabel: 'Distance',
    walkLabel: 'Walk',
    minutesShort: 'min',
    occupancyLabel: 'Occupancy',
    simGroupCrisis: 'Crisis',
    simGroupRouting: 'Routing API',

    // Challenge Drop #3: flood protection & RBAC
    kpiSosLatency: 'SOS API latency',
    kpiSosLatencySub: 'mean · target < 300 ms',
    toastSosBurst: '{count} new SOS signals received',
    toastPriorityBurst: '{count} Priority #1 SOS received',
    readOnlyMode: 'Read-only mode: your role ({role}) cannot perform operations.',
    toastSosDuplicate: 'Your SOS has already been received — no need to send it again.',
    roles: { OBSERVER: 'Observer', DISPATCHER: 'Dispatcher', COMMANDER: 'Commander' },

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
