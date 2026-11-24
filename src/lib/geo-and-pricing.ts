import {
  BENEFIT_MAP,
  BenefitCardId,
  CATEGORIES,
  CATEGORY_MAP,
  CategoryId,
  MissionMode,
} from '@/types/domain';

export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(0.2, Math.round(R * c * 10) / 10);
}

export function computeBidValueScore(params: {
  maxBudget: number;
  bidAmount: number;
  benefitCards: BenefitCardId[];
  providerRating: number;
  etaMinutes: number;
  distanceKm: number;
}): {
  score: number;
  savingsAmount: number;
  perceivedExtraValue: number;
  totalEffectiveSaving: number;
} {
  const { maxBudget, bidAmount, benefitCards, providerRating, etaMinutes, distanceKm } = params;

  const savingsAmount = Math.max(0, maxBudget - bidAmount);
  const savingsRatio = maxBudget > 0 ? (maxBudget - bidAmount) / maxBudget : 0;

  // Penalize slightly if above max budget, reward strongly for savings without forcing extreme price cuts
  const priceScore = savingsRatio >= 0 ? savingsRatio * 95 : savingsRatio * 140;

  // Benefit cards allow maintaining client budget while still climbing to #1 on the Podium
  const benefitBonus = benefitCards.reduce((sum, id) => sum + (BENEFIT_MAP[id]?.scoreBonus ?? 10), 0);
  const perceivedExtraValue = benefitCards.reduce(
    (sum, id) => sum + (BENEFIT_MAP[id]?.perceivedValue ?? 2500),
    0
  );

  const ratingBonus = providerRating * 6.5;
  const etaBonus = Math.max(0, (55 - etaMinutes) * 0.28);
  const proximityBonus = Math.max(0, (8 - distanceKm) * 0.8);

  const rawScore = 50 + priceScore + benefitBonus + ratingBonus + etaBonus + proximityBonus;
  const score = Math.round(Math.max(10, rawScore) * 10) / 10;

  return {
    score,
    savingsAmount,
    perceivedExtraValue,
    totalEffectiveSaving: savingsAmount + perceivedExtraValue,
  };
}

export interface FairPriceAdvice {
  min: number;
  ideal: number;
  max: number;
  status: 'low' | 'competitive' | 'magnet';
  statusLabel: string;
  explanation: string;
}

export function getFairPriceAdvice(
  category: CategoryId,
  mode: MissionMode,
  urgencyCount: number,
  currentBudget: number
): FairPriceAdvice {
  const def = CATEGORY_MAP[category] || CATEGORIES[0];
  const urgencyMultiplier = 1 + Math.min(3, urgencyCount) * 0.06;
  const modeMultiplier = mode === 'flash' ? 1.05 : 1.0;

  const min = Math.round((def.suggestedMin * urgencyMultiplier * modeMultiplier) / 500) * 500;
  const ideal = Math.round((def.suggestedIdeal * urgencyMultiplier * modeMultiplier) / 500) * 500;
  const max = Math.round((def.suggestedMax * urgencyMultiplier * modeMultiplier) / 500) * 500;

  if (currentBudget < min) {
    return {
      min,
      ideal,
      max,
      status: 'low',
      statusLabel: 'Presupuesto bajo — riesgo de pocas pujas',
      explanation: `En tu zona, pedidos similares en ${def.name} parten desde ${formatCLP(min)}. Sube al rango sugerido para activar el Piloto Automático de más comercios.`,
    };
  }
  if (currentBudget >= ideal * 1.12) {
    return {
      min,
      ideal,
      max,
      status: 'magnet',
      statusLabel: 'Oferta Imán — máxima competencia y Cartas Extra',
      explanation: `Excelente tope. Los comercios competirán bajando precio o sumando hasta 3 Cartas de Beneficio gratis.`,
    };
  }
  return {
    min,
    ideal,
    max,
    status: 'competitive',
    statusLabel: 'Precio Justo — alta tasa de respuesta en <10s',
    explanation: `Rango local óptimo (${formatCLP(min)} – ${formatCLP(max)}) según tarifas verificadas en tu radio.`,
  };
}

export interface ParsedVoiceMission {
  title: string;
  description: string;
  category: CategoryId;
  mode: MissionMode;
  suggestedBudget: number;
  urgencyTags: string[];
  isGroupPool: boolean;
}

export function parseVoiceTranscriptToMission(transcript: string): ParsedVoiceMission {
  const clean = transcript.trim();
  const lower = clean.toLowerCase();

  let category: CategoryId = 'comida';
  if (/(fuga|agua|cañer|lavaplatos|baño|llave|sif[oó]n|gasfit|destap|calefont)/.test(lower)) {
    category = 'gasfiteria';
  } else if (/(enchufe|luz|tablero|autom[aá]tico|corto|el[eé]ctric|cable|l[aá]mpara)/.test(lower)) {
    category = 'electricidad';
  } else if (/(remedio|farmacia|paracetamol|jarabe|term[oó]metro|receta|salud|pastilla|pañal)/.test(lower)) {
    category = 'farmacia';
  } else if (/(bater[ií]a|auto|neum[aá]tico|rueda|mec[aá]nic|pane|arranca|aceite)/.test(lower)) {
    category = 'mecanica';
  } else if (/(cerradura|taladro|tornillo|ferreter|repuesto|pintura|llave inglesa|candado)/.test(lower)) {
    category = 'repuestos';
  } else {
    category = 'comida';
  }

  const catDef = CATEGORY_MAP[category];
  let mode: MissionMode = catDef.defaultMode;
  if (/(ahora ya|inmediat|5 min|hambre|r[aá]pido|rel[aá]mpago|express)/.test(lower) && category !== 'gasfiteria') {
    mode = 'flash';
  } else if (/(tarde|programad|mañana|domicilio|revisar|instal)/.test(lower) && category !== 'comida') {
    mode = 'scheduled';
  }

  // Extract budget if user mentioned numbers like "25 mil", "25000", "$18.000"
  let suggestedBudget = catDef.suggestedIdeal;
  const milMatch = lower.match(/(\d{1,3})\s*mil/);
  const fullNumberMatch = lower.replace(/\./g, '').match(/(\d{4,6})/);
  if (milMatch) {
    suggestedBudget = parseInt(milMatch[1], 10) * 1000;
  } else if (fullNumberMatch) {
    const parsed = parseInt(fullNumberMatch[1], 10);
    if (parsed >= 4000 && parsed <= 500000) suggestedBudget = parsed;
  }

  const urgencyTags: string[] = [];
  if (/(urgent|fuga|emergencia|ahora)/.test(lower)) urgencyTags.push('Urgente hoy');
  if (/(garant[ií]a|seguro)/.test(lower)) urgencyTags.push('Con garantía');
  if (/(amigos|compartir|oficina|grupo|vaquita|entre todos)/.test(lower)) urgencyTags.push('Para compartir');
  if (urgencyTags.length === 0) {
    urgencyTags.push(catDef.urgencySuggestions[0]);
  }

  const isGroupPool = /(amigos|compartir|vaquita|grupo|entre todos|oficina)/.test(lower);

  const words = clean.split(/\s+/);
  const shortTitle =
    words.length <= 7
      ? clean.charAt(0).toUpperCase() + clean.slice(1)
      : words.slice(0, 7).join(' ').replace(/[,.]+$/, '') + '…';

  return {
    title: shortTitle,
    description: clean.charAt(0).toUpperCase() + clean.slice(1),
    category,
    mode,
    suggestedBudget,
    urgencyTags,
    isGroupPool,
  };
}

export function formatCLP(amount: number): string {
  const rounded = Math.round(amount);
  return '$' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatCountdown(remainingSeconds: number): string {
  const safe = Math.max(0, Math.floor(remainingSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
