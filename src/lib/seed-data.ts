import {
  AutoBidRule,
  Bid,
  GroupPoolMember,
  Mission,
  ProviderProfile,
  User,
} from '@/types/domain';
import { calculateDistanceKm, computeBidValueScore } from '@/lib/geo-and-pricing';

export const BASE_LAT = -33.4372;
export const BASE_LNG = -70.6506;

export const INITIAL_USER: User = {
  id: 'user-main-01',
  name: 'Carlos Mendoza',
  email: 'carlos@pideycompite.app',
  phone: '+56 9 8421 9034',
  avatar_url: '🧑‍💻',
  role_active: 'buyer',
  rating_avg: 4.94,
  wallet_balance: 145000,
  saved_addresses: [
    {
      id: 'addr-1',
      label: 'Casa · Providencia',
      street: 'Av. Providencia 1840, Depto 704',
      lat: BASE_LAT,
      lng: BASE_LNG,
    },
    {
      id: 'addr-2',
      label: 'Oficina · Las Condes',
      street: 'Av. Apoquindo 3910, Piso 11',
      lat: -33.4165,
      lng: -70.5934,
    },
    {
      id: 'addr-3',
      label: 'Taller Familiar · Ñuñoa',
      street: 'Av. Irarrázaval 2850',
      lat: -33.4541,
      lng: -70.6042,
    },
  ],
  payment_methods: [
    { id: 'pm-1', brand: 'PidePay Escrow Instantáneo', last4: 'SALDO', isDefault: true },
    { id: 'pm-2', brand: 'Visa Signature', last4: '4829', isDefault: false },
    { id: 'pm-3', brand: 'Mastercard Débito', last4: '9012', isDefault: false },
  ],
  created_at: new Date().toISOString(),
};

export const USER_PROVIDER_PROFILE: ProviderProfile = {
  user_id: 'user-main-01',
  business_name: 'Soluciones & Express Mendoza',
  avatar_emoji: '🚀',
  tagline: 'Servicio multimarca, delivery rápido y soporte técnico certificado',
  categories: ['comida', 'gasfiteria', 'electricidad', 'repuestos'],
  lat: BASE_LAT + 0.0045,
  lng: BASE_LNG - 0.0038,
  coverage_radius_km: 8,
  is_online: true,
  verified_status: 'verified',
  balance: 84500,
  rating_avg: 4.92,
  completed_orders_count: 37,
  total_bids_count: 94,
  is_bot: false,
};

// 5 Negocios Locales Simulados con coordenadas cercanas y personalidades de puja distintas
export const SIMULATED_PROVIDERS: ProviderProfile[] = [
  {
    user_id: 'bot-prov-1',
    business_name: 'La Burguesía Smash & Grill',
    avatar_emoji: '🍔',
    tagline: 'Smash burgers artesanales, pizzas al horno y combos grupales en minutos',
    categories: ['comida', 'farmacia'],
    lat: BASE_LAT + 0.0082,
    lng: BASE_LNG + 0.0061,
    coverage_radius_km: 7,
    is_online: true,
    verified_status: 'verified',
    balance: 412000,
    rating_avg: 4.93,
    completed_orders_count: 318,
    total_bids_count: 640,
    is_bot: true,
  },
  {
    user_id: 'bot-prov-2',
    business_name: 'Maestro Don Héctor 24/7',
    avatar_emoji: '🔧',
    tagline: 'Gasfitería certificada, detección de fugas y urgencias domiciliarias',
    categories: ['gasfiteria', 'electricidad', 'repuestos'],
    lat: BASE_LAT - 0.0124,
    lng: BASE_LNG + 0.0095,
    coverage_radius_km: 12,
    is_online: true,
    verified_status: 'verified',
    balance: 685000,
    rating_avg: 4.96,
    completed_orders_count: 204,
    total_bids_count: 410,
    is_bot: true,
  },
  {
    user_id: 'bot-prov-3',
    business_name: 'FarmaExpress & Market 20m',
    avatar_emoji: '💊',
    tagline: 'Botiquín, salud, bebidas y conveniencia con moto propia ultrarrápida',
    categories: ['farmacia', 'comida', 'repuestos'],
    lat: BASE_LAT - 0.0055,
    lng: BASE_LNG - 0.0062,
    coverage_radius_km: 6,
    is_online: true,
    verified_status: 'verified',
    balance: 298000,
    rating_avg: 4.86,
    completed_orders_count: 512,
    total_bids_count: 980,
    is_bot: true,
  },
  {
    user_id: 'bot-prov-4',
    business_name: 'ElectroFix & Ferretería Pro',
    avatar_emoji: '⚡',
    tagline: 'Instaladores SEC, tableros, cerraduras y repuestos a domicilio',
    categories: ['electricidad', 'gasfiteria', 'repuestos', 'mecanica'],
    lat: BASE_LAT + 0.0175,
    lng: BASE_LNG - 0.014,
    coverage_radius_km: 15,
    is_online: true,
    verified_status: 'verified',
    balance: 520000,
    rating_avg: 4.81,
    completed_orders_count: 167,
    total_bids_count: 390,
    is_bot: true,
  },
  {
    user_id: 'bot-prov-5',
    business_name: 'RutaRápida Auxilio & Delivery',
    avatar_emoji: '🏎️',
    tagline: 'Auxilio mecánico móvil, baterías, repuestos y despachos relámpago',
    categories: ['mecanica', 'repuestos', 'comida', 'farmacia'],
    lat: BASE_LAT - 0.021,
    lng: BASE_LNG + 0.018,
    coverage_radius_km: 18,
    is_online: true,
    verified_status: 'verified',
    balance: 470000,
    rating_avg: 4.89,
    completed_orders_count: 245,
    total_bids_count: 530,
    is_bot: true,
  },
];

export const INITIAL_AUTO_BID_RULES: AutoBidRule[] = [
  // Regla activa de demostración del propio usuario proveedor (editable en Panel Piloto Automático)
  {
    id: 'rule-user-1',
    provider_id: 'user-main-01',
    category: 'gasfiteria',
    max_distance_km: 6,
    min_budget: 20000,
    discount_percent: 0, // Mantiene presupuesto del cliente y gana con Cartas de Beneficio
    default_benefits: ['garantia_30_dias', 'atencion_prioritaria'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 7,
    is_active: true,
  },
  // Reglas de Piloto Automático de los 5 negocios locales (responden en los primeros 10s)
  {
    id: 'rule-bot-1',
    provider_id: 'bot-prov-1',
    category: 'comida',
    max_distance_km: 7,
    min_budget: 10000,
    discount_percent: 0,
    default_benefits: ['envio_gratis', 'producto_extra'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 3,
    is_active: true,
  },
  {
    id: 'rule-bot-2',
    provider_id: 'bot-prov-2',
    category: 'gasfiteria',
    max_distance_km: 12,
    min_budget: 18000,
    discount_percent: 4,
    default_benefits: ['garantia_30_dias', 'atencion_prioritaria'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 4,
    is_active: true,
  },
  {
    id: 'rule-bot-3',
    provider_id: 'bot-prov-3',
    category: 'all',
    max_distance_km: 6,
    min_budget: 8000,
    discount_percent: 3,
    default_benefits: ['llego_20_min', 'envio_gratis'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 5,
    is_active: true,
  },
  {
    id: 'rule-bot-4',
    provider_id: 'bot-prov-4',
    category: 'all',
    max_distance_km: 15,
    min_budget: 14000,
    discount_percent: 7,
    default_benefits: ['garantia_30_dias'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 6,
    is_active: true,
  },
  {
    id: 'rule-bot-5',
    provider_id: 'bot-prov-5',
    category: 'all',
    max_distance_km: 18,
    min_budget: 10000,
    discount_percent: 6,
    default_benefits: ['envio_gratis', 'atencion_prioritaria'],
    time_window_start: '00:00',
    time_window_end: '23:59',
    delay_seconds: 8,
    is_active: true,
  },
];

export function createInitialSeedAuction(): {
  missions: Mission[];
  bids: Bid[];
  poolMembers: GroupPoolMember[];
} {
  const now = Date.now();
  const demoMissionId = 'mission-live-demo-01';
  const radarMissionId = 'mission-radar-demo-02';
  const radarMissionId2 = 'mission-radar-demo-03';

  const demoMission: Mission = {
    id: demoMissionId,
    buyer_id: 'user-main-01',
    buyer_name: 'Carlos Mendoza',
    buyer_rating: 4.94,
    title: 'Combo 4 Smash Burgers Dobles + Papas & Bebidas',
    description:
      'Cena para ver el partido con amigos. Buscamos 4 hamburguesas dobles recién hechas, papas grandes con cheddar y bebidas frías.',
    category: 'comida',
    urgency_tags: ['Caliente recién hecho', 'Para compartir', 'Sin demora'],
    address_label: 'Casa · Av. Providencia 1840',
    mode: 'flash',
    duration_seconds: 300,
    expires_at: new Date(now + 265 * 1000).toISOString(),
    max_budget: 28000,
    lat: BASE_LAT,
    lng: BASE_LNG,
    is_group_pool: true,
    status: 'open',
    extra_time_extensions: 0,
    created_at: new Date(now - 35 * 1000).toISOString(),
  };

  // Dos misiones adicionales de vecinos en el radio para que el Proveedor tenga oportunidades inmediatas en su Radar
  const neighborMission1: Mission = {
    id: radarMissionId,
    buyer_id: 'buyer-neighbor-01',
    buyer_name: 'Valentina Soto',
    buyer_rating: 4.97,
    title: 'Urgencia: Fuga en flexible bajo lavaplatos cocina',
    description:
      'Empezó a gotear fuerte el flexible de agua caliente debajo del lavaplatos. Necesito técnico con repuesto y teflón hoy.',
    category: 'gasfiteria',
    urgency_tags: ['Fuga activa', 'Traer repuestos', 'Con garantía'],
    address_label: 'Pedro de Valdivia 920 · A 1.4 km',
    mode: 'scheduled',
    duration_seconds: 1800,
    expires_at: new Date(now + 1520 * 1000).toISOString(),
    max_budget: 35000,
    lat: BASE_LAT + 0.0068,
    lng: BASE_LNG + 0.0042,
    is_group_pool: false,
    status: 'open',
    extra_time_extensions: 0,
    created_at: new Date(now - 90 * 1000).toISOString(),
  };

  const neighborMission2: Mission = {
    id: radarMissionId2,
    buyer_id: 'buyer-neighbor-02',
    buyer_name: 'Matías Riquelme',
    buyer_rating: 4.88,
    title: 'Instalación enchufe doble reforzado + revisión automático',
    description:
      'Necesito instalar un enchufe de 16A para aire acondicionado portátil y revisar por qué baja el automático de la sala.',
    category: 'electricidad',
    urgency_tags: ['Técnico SEC', 'Traer materiales'],
    address_label: 'Manuel Montt 455 · A 1.8 km',
    mode: 'scheduled',
    duration_seconds: 2700,
    expires_at: new Date(now + 2400 * 1000).toISOString(),
    max_budget: 32000,
    lat: BASE_LAT - 0.0079,
    lng: BASE_LNG + 0.0085,
    is_group_pool: false,
    status: 'open',
    extra_time_extensions: 0,
    created_at: new Date(now - 60 * 1000).toISOString(),
  };

  const p1 = SIMULATED_PROVIDERS[0];
  const p3 = SIMULATED_PROVIDERS[2];
  const p5 = SIMULATED_PROVIDERS[4];
  const p2 = SIMULATED_PROVIDERS[1];
  const p4 = SIMULATED_PROVIDERS[3];

  const d1 = calculateDistanceKm(demoMission.lat, demoMission.lng, p1.lat, p1.lng);
  const d3 = calculateDistanceKm(demoMission.lat, demoMission.lng, p3.lat, p3.lng);
  const d5 = calculateDistanceKm(demoMission.lat, demoMission.lng, p5.lat, p5.lng);

  const bid1Cards = ['envio_gratis', 'producto_extra', 'atencion_prioritaria'] as const;
  const bid1Score = computeBidValueScore({
    maxBudget: 28000,
    bidAmount: 27500,
    benefitCards: [...bid1Cards],
    providerRating: p1.rating_avg,
    etaMinutes: 22,
    distanceKm: d1,
  }).score;

  const bid2Cards = ['llego_20_min', 'envio_gratis'] as const;
  const bid2Score = computeBidValueScore({
    maxBudget: 28000,
    bidAmount: 25900,
    benefitCards: [...bid2Cards],
    providerRating: p3.rating_avg,
    etaMinutes: 18,
    distanceKm: d3,
  }).score;

  const bid3Cards = ['envio_gratis'] as const;
  const bid3Score = computeBidValueScore({
    maxBudget: 28000,
    bidAmount: 24800,
    benefitCards: [...bid3Cards],
    providerRating: p5.rating_avg,
    etaMinutes: 27,
    distanceKm: d5,
  }).score;

  const d2Neighbor = calculateDistanceKm(neighborMission1.lat, neighborMission1.lng, p2.lat, p2.lng);
  const d4Neighbor = calculateDistanceKm(neighborMission1.lat, neighborMission1.lng, p4.lat, p4.lng);

  const neighborBid1: Bid = {
    id: 'bid-seed-n1',
    mission_id: radarMissionId,
    provider_id: p2.user_id,
    provider_name: p2.business_name,
    provider_avatar: p2.avatar_emoji,
    provider_rating: p2.rating_avg,
    provider_verified: true,
    distance_km: d2Neighbor,
    amount: 33500,
    benefit_cards: ['garantia_30_dias', 'atencion_prioritaria'],
    eta_minutes: 28,
    is_auto_bid: true,
    value_score: computeBidValueScore({
      maxBudget: 35000,
      bidAmount: 33500,
      benefitCards: ['garantia_30_dias', 'atencion_prioritaria'],
      providerRating: p2.rating_avg,
      etaMinutes: 28,
      distanceKm: d2Neighbor,
    }).score,
    note: 'Llevo flexibles mallados acero inoxidable y sello garantizado.',
    created_at: new Date(now - 65 * 1000).toISOString(),
    updated_at: new Date(now - 65 * 1000).toISOString(),
  };

  const neighborBid2: Bid = {
    id: 'bid-seed-n2',
    mission_id: radarMissionId,
    provider_id: p4.user_id,
    provider_name: p4.business_name,
    provider_avatar: p4.avatar_emoji,
    provider_rating: p4.rating_avg,
    provider_verified: true,
    distance_km: d4Neighbor,
    amount: 32000,
    benefit_cards: ['garantia_30_dias'],
    eta_minutes: 35,
    is_auto_bid: true,
    value_score: computeBidValueScore({
      maxBudget: 35000,
      bidAmount: 32000,
      benefitCards: ['garantia_30_dias'],
      providerRating: p4.rating_avg,
      etaMinutes: 35,
      distanceKm: d4Neighbor,
    }).score,
    created_at: new Date(now - 50 * 1000).toISOString(),
    updated_at: new Date(now - 50 * 1000).toISOString(),
  };

  const bids: Bid[] = [
    {
      id: 'bid-seed-1',
      mission_id: demoMissionId,
      provider_id: p1.user_id,
      provider_name: p1.business_name,
      provider_avatar: p1.avatar_emoji,
      provider_rating: p1.rating_avg,
      provider_verified: true,
      distance_km: d1,
      amount: 27500,
      benefit_cards: [...bid1Cards],
      eta_minutes: 22,
      is_auto_bid: true,
      value_score: bid1Score,
      note: 'Incluye porción de aros de cebolla + 4 salsas caseras de regalo.',
      created_at: new Date(now - 28 * 1000).toISOString(),
      updated_at: new Date(now - 28 * 1000).toISOString(),
    },
    {
      id: 'bid-seed-2',
      mission_id: demoMissionId,
      provider_id: p3.user_id,
      provider_name: p3.business_name,
      provider_avatar: p3.avatar_emoji,
      provider_rating: p3.rating_avg,
      provider_verified: true,
      distance_km: d3,
      amount: 25900,
      benefit_cards: [...bid2Cards],
      eta_minutes: 18,
      is_auto_bid: true,
      value_score: bid2Score,
      note: 'Salimos de inmediato con repartidor exclusivo.',
      created_at: new Date(now - 21 * 1000).toISOString(),
      updated_at: new Date(now - 21 * 1000).toISOString(),
    },
    {
      id: 'bid-seed-3',
      mission_id: demoMissionId,
      provider_id: p5.user_id,
      provider_name: p5.business_name,
      provider_avatar: p5.avatar_emoji,
      provider_rating: p5.rating_avg,
      provider_verified: false,
      distance_km: d5,
      amount: 24800,
      benefit_cards: [...bid3Cards],
      eta_minutes: 27,
      is_auto_bid: false,
      value_score: bid3Score,
      note: 'Mejor precio directo sin recargo por distancia.',
      created_at: new Date(now - 14 * 1000).toISOString(),
      updated_at: new Date(now - 14 * 1000).toISOString(),
    },
    neighborBid1,
    neighborBid2,
  ];

  const poolMembers: GroupPoolMember[] = [
    {
      id: 'pool-m-1',
      mission_id: demoMissionId,
      guest_name: 'Carlos (Anfitrión)',
      avatar_emoji: '🧑‍💻',
      contribution_amount: 10000,
      voted_bid_id: 'bid-seed-1',
      is_host: true,
    },
    {
      id: 'pool-m-2',
      mission_id: demoMissionId,
      guest_name: 'Sofi Morales',
      avatar_emoji: '💃',
      contribution_amount: 7000,
      voted_bid_id: 'bid-seed-1',
    },
    {
      id: 'pool-m-3',
      mission_id: demoMissionId,
      guest_name: 'Diego Vega',
      avatar_emoji: '🎸',
      contribution_amount: 6500,
      voted_bid_id: 'bid-seed-2',
    },
  ];

  return {
    missions: [demoMission, neighborMission1, neighborMission2],
    bids,
    poolMembers,
  };
}
