export type UserRole = 'buyer' | 'provider';
export type MissionMode = 'flash' | 'scheduled';
export type MissionStatus = 'open' | 'locked' | 'completed' | 'cancelled';
export type FulfillmentStatus = 'preparing' | 'on_the_way' | 'at_doorstep' | 'completed';
export type VerifiedStatus = 'pending' | 'verified' | 'rejected';

export type CategoryId =
  | 'comida'
  | 'gasfiteria'
  | 'electricidad'
  | 'farmacia'
  | 'mecanica'
  | 'repuestos';

export type BenefitCardId =
  | 'envio_gratis'
  | 'llego_20_min'
  | 'producto_extra'
  | 'garantia_30_dias'
  | 'atencion_prioritaria';

export interface BenefitCardDef {
  id: BenefitCardId;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  scoreBonus: number;
  perceivedValue: number;
  accentClass: string;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  emoji: string;
  defaultMode: MissionMode;
  suggestedMin: number;
  suggestedIdeal: number;
  suggestedMax: number;
  urgencySuggestions: string[];
  placeholder: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  street: string;
  lat: number;
  lng: number;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string;
  role_active: UserRole;
  rating_avg: number;
  saved_addresses: SavedAddress[];
  payment_methods: PaymentMethod[];
  wallet_balance: number;
  created_at: string;
}

export interface ProviderProfile {
  user_id: string;
  business_name: string;
  avatar_emoji: string;
  tagline: string;
  categories: CategoryId[];
  lat: number;
  lng: number;
  coverage_radius_km: number;
  is_online: boolean;
  verified_status: VerifiedStatus;
  balance: number;
  rating_avg: number;
  completed_orders_count: number;
  total_bids_count: number;
  is_bot?: boolean;
}

export interface AutoBidRule {
  id: string;
  provider_id: string;
  category: CategoryId | 'all';
  max_distance_km: number;
  min_budget: number;
  discount_percent: number;
  default_benefits: BenefitCardId[];
  time_window_start: string;
  time_window_end: string;
  delay_seconds: number;
  is_active: boolean;
}

export interface Mission {
  id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_rating: number;
  title: string;
  description: string;
  category: CategoryId;
  urgency_tags: string[];
  media_url?: string;
  address_label: string;
  mode: MissionMode;
  duration_seconds: number;
  expires_at: string;
  max_budget: number;
  lat: number;
  lng: number;
  is_group_pool: boolean;
  status: MissionStatus;
  extra_time_extensions: number;
  last_extended_at?: string;
  created_at: string;
}

export interface GroupPoolMember {
  id: string;
  mission_id: string;
  guest_name: string;
  avatar_emoji: string;
  contribution_amount: number;
  voted_bid_id: string | null;
  is_host?: boolean;
}

export interface Bid {
  id: string;
  mission_id: string;
  provider_id: string;
  provider_name: string;
  provider_avatar: string;
  provider_rating: number;
  provider_verified: boolean;
  distance_km: number;
  amount: number;
  benefit_cards: BenefitCardId[];
  eta_minutes: number;
  is_auto_bid: boolean;
  value_score: number;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  mission_id: string;
  winning_bid_id: string;
  buyer_id: string;
  provider_id: string;
  escrow_amount: number;
  benefit_cards: BenefitCardId[];
  eta_minutes: number;
  qr_token: string;
  fulfillment_status: FulfillmentStatus;
  completed_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  reviewer_id: string;
  target_id: string;
  stars: number;
  tags: string[];
  comment: string;
  created_at: string;
}

export interface FloatingReaction {
  id: string;
  mission_id: string;
  bid_id: string;
  emoji: string;
  sender_name: string;
  created_at: number;
}

export interface RadarNotification {
  id: string;
  title: string;
  subtitle: string;
  type: 'mission' | 'bid' | 'outbid' | 'extratime' | 'escrow' | 'autopilot';
  created_at: number;
}

export const BENEFIT_CARDS: BenefitCardDef[] = [
  {
    id: 'envio_gratis',
    label: 'Envío Gratis',
    shortLabel: 'Envío $0',
    emoji: '🛵',
    description: 'Despacho o visita a domicilio sin costo adicional',
    scoreBonus: 13,
    perceivedValue: 3500,
    accentClass: 'bg-[#E6F9EE] text-[#047857] border-[#86EFAC]',
  },
  {
    id: 'llego_20_min',
    label: 'Llego en 20 min',
    shortLabel: 'En 20 min',
    emoji: '⚡',
    description: 'Compromiso de llegada express prioritaria',
    scoreBonus: 14,
    perceivedValue: 4000,
    accentClass: 'bg-[#FFF0E5] text-[#C2410C] border-[#FDBA74]',
  },
  {
    id: 'producto_extra',
    label: 'Producto Extra de Regalo',
    shortLabel: 'Extra Regalo',
    emoji: '🎁',
    description: 'Incluye bebida, postre, insumo o cortesía sin cargo',
    scoreBonus: 12,
    perceivedValue: 3800,
    accentClass: 'bg-[#FDF2F8] text-[#BE185D] border-[#F9A8D4]',
  },
  {
    id: 'garantia_30_dias',
    label: 'Garantía 30 Días',
    shortLabel: 'Garantía 30d',
    emoji: '🛡️',
    description: 'Respaldo técnico garantizado por 30 días',
    scoreBonus: 13,
    perceivedValue: 5000,
    accentClass: 'bg-[#F3E8FF] text-[#6D28D9] border-[#D8B4FE]',
  },
  {
    id: 'atencion_prioritaria',
    label: 'Atención Prioritaria',
    shortLabel: 'VIP Prioritario',
    emoji: '👑',
    description: 'Tu pedido pasa al primer lugar de preparación/salida',
    scoreBonus: 10,
    perceivedValue: 2500,
    accentClass: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
  },
];

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'comida',
    name: 'Comida & Delivery',
    emoji: '🍔',
    defaultMode: 'flash',
    suggestedMin: 12000,
    suggestedIdeal: 18500,
    suggestedMax: 28000,
    urgencySuggestions: ['Caliente recién hecho', 'Para compartir', 'Sin demora', 'Bebida fría'],
    placeholder: 'Ej: 3 hamburguesas dobles smash con papas rústicas y salsas...',
  },
  {
    id: 'gasfiteria',
    name: 'Gasfitería',
    emoji: '🔧',
    defaultMode: 'scheduled',
    suggestedMin: 22000,
    suggestedIdeal: 32000,
    suggestedMax: 48000,
    urgencySuggestions: ['Fuga activa', 'Traer repuestos', 'Urgencia hoy', 'Con garantía'],
    placeholder: 'Ej: Fuga de agua bajo el lavaplatos de la cocina, necesito cambio de sifón...',
  },
  {
    id: 'electricidad',
    name: 'Electricidad',
    emoji: '⚡',
    defaultMode: 'scheduled',
    suggestedMin: 20000,
    suggestedIdeal: 30000,
    suggestedMax: 45000,
    urgencySuggestions: ['Corte parcial', 'Técnico SEC', 'Traer materiales', 'Revisión tablero'],
    placeholder: 'Ej: El automático diferencial salta al encender el horno eléctrico...',
  },
  {
    id: 'farmacia',
    name: 'Farmacia & Salud',
    emoji: '💊',
    defaultMode: 'flash',
    suggestedMin: 8500,
    suggestedIdeal: 14000,
    suggestedMax: 24000,
    urgencySuggestions: ['Urgente', 'Termómetro / Botiquín', 'Entrega discreta', 'Boleta reembolso'],
    placeholder: 'Ej: Kit antigripal adulto, paracetamol 1g, suero hidratante y termómetro digital...',
  },
  {
    id: 'mecanica',
    name: 'Mecánica & Auxilio',
    emoji: '🚗',
    defaultMode: 'scheduled',
    suggestedMin: 18000,
    suggestedIdeal: 28000,
    suggestedMax: 45000,
    urgencySuggestions: ['Batería descargada', 'Neumático pinchado', 'A domicilio', 'Scanner OBD2'],
    placeholder: 'Ej: Mi auto no parte en el estacionamiento, necesito puente de batería o cambio...',
  },
  {
    id: 'repuestos',
    name: 'Repuestos & Ferretería',
    emoji: '🧰',
    defaultMode: 'flash',
    suggestedMin: 10000,
    suggestedIdeal: 16500,
    suggestedMax: 30000,
    urgencySuggestions: ['Despacho express', 'Medida exacta', 'Factura empresa', 'Original o alternativo'],
    placeholder: 'Ej: Cerradura pomo acceso principal + cilindro seguridad 60mm con 3 llaves...',
  },
];

export const BENEFIT_MAP: Record<BenefitCardId, BenefitCardDef> = Object.fromEntries(
  BENEFIT_CARDS.map((b) => [b.id, b])
) as Record<BenefitCardId, BenefitCardDef>;

export const CATEGORY_MAP: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, CategoryDef>;
