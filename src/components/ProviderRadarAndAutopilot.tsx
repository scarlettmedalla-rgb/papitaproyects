'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Power,
  Radar,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';
import {
  BENEFIT_CARDS,
  BENEFIT_MAP,
  BenefitCardId,
  CATEGORIES,
  CATEGORY_MAP,
  CategoryId,
  Mission,
} from '@/types/domain';
import { useAuction } from '@/context/AuctionContext';
import {
  calculateDistanceKm,
  computeBidValueScore,
  formatCLP,
  formatCountdown,
} from '@/lib/geo-and-pricing';
import { triggerHaptic } from '@/lib/feedback';

interface ProviderRadarAndAutopilotProps {
  onOpenOrder: (orderId: string) => void;
}

export function ProviderRadarAndAutopilot({
  onOpenOrder,
}: ProviderRadarAndAutopilotProps) {
  const {
    nowMs,
    userProvider,
    missions,
    bids,
    orders,
    autoBidRules,
    updateProviderProfile,
    withdrawProviderBalance,
    submitOrUpdateBid,
    spawnSimulatedRadarMission,
    saveAutoBidRule,
    toggleAutoBidRule,
    deleteAutoBidRule,
  } = useAuction();

  const [subTab, setSubTab] = useState<'radar' | 'autopilot' | 'dashboard'>('radar');

  const radarMissions = useMemo(() => {
    return missions
      .filter((m) => m.status === 'open')
      .map((m) => {
        const distKm = calculateDistanceKm(
          m.lat,
          m.lng,
          userProvider.lat,
          userProvider.lng
        );
        return { mission: m, distKm };
      })
      .filter(
        ({ mission, distKm }) =>
          distKm <= userProvider.coverage_radius_km &&
          userProvider.categories.includes(mission.category)
      )
      .sort(
        (a, b) =>
          new Date(b.mission.created_at).getTime() -
          new Date(a.mission.created_at).getTime()
      );
  }, [
    missions,
    userProvider.categories,
    userProvider.coverage_radius_km,
    userProvider.lat,
    userProvider.lng,
  ]);

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    radarMissions[0]?.mission.id ?? null
  );

  const activeRadarItem =
    radarMissions.find((r) => r.mission.id === selectedMissionId) ||
    radarMissions[0] ||
    null;

  const [bidAmount, setBidAmount] = useState<number>(26000);
  const [selectedCards, setSelectedCards] = useState<BenefitCardId[]>([
    'envio_gratis',
    'atencion_prioritaria',
  ]);
  const [etaMinutes, setEtaMinutes] = useState<number>(20);
  const [bidNote, setBidNote] = useState<string>('');

  const selectRadarMission = (m: Mission) => {
    triggerHaptic('light');
    setSelectedMissionId(m.id);
    const myExisting = bids.find(
      (b) => b.mission_id === m.id && b.provider_id === userProvider.user_id
    );
    if (myExisting) {
      setBidAmount(myExisting.amount);
      setSelectedCards(myExisting.benefit_cards);
      setEtaMinutes(myExisting.eta_minutes);
      setBidNote(myExisting.note || '');
    } else {
      setBidAmount(m.max_budget);
      setSelectedCards(['envio_gratis', 'atencion_prioritaria']);
      setEtaMinutes(20);
      setBidNote('Disponibilidad inmediata y respaldo garantizado.');
    }
  };

  const [ruleCategory, setRuleCategory] = useState<CategoryId | 'all'>('all');
  const [ruleMaxDist, setRuleMaxDist] = useState<number>(6);
  const [ruleMinBudget, setRuleMinBudget] = useState<number>(12000);
  const [ruleDiscount, setRuleDiscount] = useState<number>(0);
  const [ruleBenefits, setRuleBenefits] = useState<BenefitCardId[]>(['envio_gratis']);
  const [ruleDelay, setRuleDelay] = useState<number>(6);
  const [ruleStart, setRuleStart] = useState<string>('08:00');
  const [ruleEnd, setRuleEnd] = useState<string>('23:30');

  const userRules = useMemo(
    () => autoBidRules.filter((r) => r.provider_id === userProvider.user_id),
    [autoBidRules, userProvider.user_id]
  );

  const providerOrders = useMemo(
    () => orders.filter((o) => o.provider_id === userProvider.user_id),
    [orders, userProvider.user_id]
  );

  const toggleBenefitSelection = (
    cardId: BenefitCardId,
    list: BenefitCardId[],
    setter: React.Dispatch<React.SetStateAction<BenefitCardId[]>>
  ) => {
    triggerHaptic('light');
    if (list.includes(cardId)) {
      setter(list.filter((c) => c !== cardId));
    } else if (list.length < 3) {
      setter([...list, cardId]);
    }
  };

  const handleQuickBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRadarItem || !userProvider.is_online) return;
    submitOrUpdateBid({
      mission_id: activeRadarItem.mission.id,
      provider_id: userProvider.user_id,
      amount: bidAmount,
      benefit_cards: selectedCards,
      eta_minutes: etaMinutes,
      is_auto_bid: false,
      note: bidNote || 'Listos para atender tu pedido al toque.',
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    saveAutoBidRule({
      provider_id: userProvider.user_id,
      category: ruleCategory,
      max_distance_km: ruleMaxDist,
      min_budget: ruleMinBudget,
      discount_percent: ruleDiscount,
      default_benefits: ruleBenefits,
      time_window_start: ruleStart,
      time_window_end: ruleEnd,
      delay_seconds: ruleDelay,
      is_active: true,
    });
  };

  const conversionRate =
    userProvider.total_bids_count > 0
      ? Math.round(
          (userProvider.completed_orders_count / userProvider.total_bids_count) * 100
        )
      : 0;

  const selectedMissionSortedBids = useMemo(() => {
    if (!activeRadarItem) return [];
    return bids
      .filter((b) => b.mission_id === activeRadarItem.mission.id)
      .sort((a, b) => b.value_score - a.value_score);
  }, [activeRadarItem, bids]);

  const myRankIndex = selectedMissionSortedBids.findIndex(
    (b) => b.provider_id === userProvider.user_id
  );

  const previewScore = activeRadarItem
    ? computeBidValueScore({
        maxBudget: activeRadarItem.mission.max_budget,
        bidAmount,
        benefitCards: selectedCards,
        providerRating: userProvider.rating_avg,
        etaMinutes,
        distanceKm: activeRadarItem.distKm,
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Cabecera Comercial Clara Sunset */}
      <div className="altoque-card rounded-[28px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F3E8FF] to-[#FFF0E5] text-2xl border border-[#E9D5FF]">
              {userProvider.avatar_emoji}
              <span
                className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full ring-2 ring-white ${
                  userProvider.is_online ? 'bg-[#00C853]' : 'bg-[#9A8EB5]'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-[#3B0764]">
                  {userProvider.business_name}
                </h2>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E6F9EE] px-2 py-0.5 text-[10px] font-extrabold text-[#047857]">
                  <ShieldCheck className="h-3 w-3" /> Verificado
                </span>
              </div>
              <p className="text-xs font-semibold text-[#5B4E77] tabular-nums">
                ⭐ {userProvider.rating_avg.toFixed(2)} · Saldo disponible:{' '}
                <strong className="font-black text-[#047857]">
                  {formatCLP(userProvider.balance)}
                </strong>
              </p>
            </div>
          </div>

          {/* Interruptor Maestro En Línea / Pausado */}
          <button
            type="button"
            onClick={() =>
              updateProviderProfile({ is_online: !userProvider.is_online })
            }
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
              userProvider.is_online
                ? 'border-[#86EFAC] bg-[#E6F9EE] text-[#065F46]'
                : 'border-[#FDBA74] bg-[#FFF0E5] text-[#C2410C]'
            }`}
          >
            <Power className="h-4 w-4" />
            {userProvider.is_online ? 'En Línea · Activo' : 'Pausado'}
          </button>
        </div>

        {/* Radio KM y Categorías */}
        <div className="mt-4 grid gap-3 border-t border-[#F3EEF8] pt-3.5 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#4A3E63]">
                Radio de Cobertura Local:
              </span>
              <span className="font-black text-[#7C3AED] tabular-nums">
                {userProvider.coverage_radius_km} km
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={userProvider.coverage_radius_km}
              onChange={(e) =>
                updateProviderProfile({
                  coverage_radius_km: Number(e.target.value),
                })
              }
              className="mt-1.5 w-full accent-[#7C3AED]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const enabled = userProvider.categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const next = enabled
                      ? userProvider.categories.filter((c) => c !== cat.id)
                      : [...userProvider.categories, cat.id];
                    if (next.length > 0) {
                      updateProviderProfile({ categories: next });
                    }
                  }}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-extrabold transition ${
                    enabled
                      ? 'border-[#D8B4FE] bg-[#F3E8FF] text-[#6D28D9]'
                      : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#8E80A8]'
                  }`}
                >
                  {cat.emoji} {cat.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-pestañas */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-full bg-[#F5F0FA] p-1">
          <button
            type="button"
            onClick={() => setSubTab('radar')}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition ${
              subTab === 'radar'
                ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white shadow-sm'
                : 'text-[#5B4E77] hover:text-[#3B0764]'
            }`}
          >
            <Radar className="h-4 w-4" /> Radar ({radarMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('autopilot')}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition ${
              subTab === 'autopilot'
                ? 'bg-gradient-to-r from-[#F97316] to-[#D946EF] text-white shadow-sm'
                : 'text-[#5B4E77] hover:text-[#3B0764]'
            }`}
          >
            <Bot className="h-4 w-4" /> Auto-Puja ({userRules.filter((r) => r.is_active).length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-extrabold transition ${
              subTab === 'dashboard'
                ? 'bg-[#00C853] text-white shadow-sm'
                : 'text-[#5B4E77] hover:text-[#3B0764]'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Métricas
          </button>
        </div>
      </div>

      {/* Órdenes Activas */}
      {providerOrders.filter((o) => o.fulfillment_status !== 'completed').length > 0 && (
        <div className="rounded-3xl border border-[#86EFAC] bg-[#E6F9EE] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-[#065F46]">
            🎉 Órdenes ganadas listas para entrega y escaneo QR
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {providerOrders
              .filter((o) => o.fulfillment_status !== 'completed')
              .map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => onOpenOrder(ord.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#00C853] px-4 py-1.5 text-xs font-black text-white shadow-sm tabular-nums"
                >
                  Abrir Sala & Escanear QR · {formatCLP(ord.escrow_amount)}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: RADAR */}
      {subTab === 'radar' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-5">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#3B0764]">
                <Activity className="h-4 w-4 text-[#00C853]" />
                Oportunidades ({userProvider.coverage_radius_km} km)
              </span>
              <button
                type="button"
                onClick={() => {
                  const m = spawnSimulatedRadarMission();
                  selectRadarMission(m);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[#FFF0E5] border border-[#FDBA74] px-3 py-1 text-[11px] font-extrabold text-[#C2410C]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Simular Alerta
              </button>
            </div>

            {radarMissions.length === 0 ? (
              <div className="altoque-card rounded-3xl p-6 text-center">
                <p className="text-sm font-extrabold text-[#3B0764]">
                  Sin misiones en este radio
                </p>
                <p className="mt-1 text-xs text-[#6B5B8C]">
                  Amplía tu radio o toca &ldquo;Simular Alerta&rdquo; para probar una oportunidad entrante.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {radarMissions.map(({ mission, distKm }) => {
                  const rem = Math.max(
                    0,
                    Math.ceil((new Date(mission.expires_at).getTime() - nowMs) / 1000)
                  );
                  const isSel = activeRadarItem?.mission.id === mission.id;
                  const myBid = bids.find(
                    (b) =>
                      b.mission_id === mission.id &&
                      b.provider_id === userProvider.user_id
                  );
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => selectRadarMission(mission)}
                      className={`w-full rounded-3xl border bg-white p-4 text-left transition ${
                        isSel
                          ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/15 shadow-md'
                          : 'border-[#EFEAF6] shadow-sm hover:border-[#D8B4FE]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="rounded-full bg-[#FFF0E5] px-2.5 py-0.5 font-extrabold text-[#C2410C]">
                          {CATEGORY_MAP[mission.category]?.emoji}{' '}
                          {CATEGORY_MAP[mission.category]?.name}
                        </span>
                        <span className="font-extrabold text-[#D946EF] tabular-nums">
                          ⏱️ {formatCountdown(rem)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-black text-[#2E1065] line-clamp-1">
                        {mission.title}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs tabular-nums">
                        <span className="font-medium text-[#5B4E77]">
                          📍 {distKm.toFixed(1)} km · {mission.buyer_name.split(' ')[0]}
                        </span>
                        <span className="font-black text-[#047857]">
                          Tope {formatCLP(mission.max_budget)}
                        </span>
                      </div>
                      {myBid && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E6F9EE] px-2.5 py-0.5 text-[10px] font-extrabold text-[#047857] tabular-nums">
                          ✓ Tu oferta activa: {formatCLP(myBid.amount)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Consola de Puja Rápida */}
          <div className="lg:col-span-7">
            {activeRadarItem ? (
              <form
                onSubmit={handleQuickBidSubmit}
                className="altoque-card space-y-4 rounded-[28px] p-5"
              >
                {myRankIndex === 0 ? (
                  <motion.div
                    initial={{ scale: 0.97 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-3 rounded-2xl border border-[#86EFAC] bg-[#E6F9EE] p-3.5 text-[#065F46]"
                  >
                    <Trophy className="h-6 w-6 shrink-0 text-[#00C853]" />
                    <div>
                      <p className="text-sm font-black">
                        🏆 ¡Vas en 1er lugar del Podio!
                      </p>
                      <p className="text-xs">
                        Tu oferta lidera frente al cliente.
                      </p>
                    </div>
                  </motion.div>
                ) : myRankIndex > 0 ? (
                  <motion.div
                    initial={{ scale: 0.97 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-3 rounded-2xl border border-[#FDBA74] bg-[#FFF0E5] p-3.5 text-[#9A3412]"
                  >
                    <AlertCircle className="h-6 w-6 shrink-0 text-[#F97316]" />
                    <div>
                      <p className="text-sm font-black tabular-nums">
                        ⚠️ Te superaron — Vas en #{myRankIndex + 1} lugar
                      </p>
                      <p className="text-xs">
                        Líder: <strong>{selectedMissionSortedBids[0]?.provider_name}</strong>. Suma una Carta de Beneficio o mejora tu precio.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-3 text-xs font-semibold text-[#5B21B6]">
                    🎯 <strong>Puja en 1 toque:</strong> Mantén el presupuesto del cliente activando Cartas de Beneficio o aplica descuento rápido.
                  </div>
                )}

                <div className="rounded-2xl bg-[#FAF9F6] border border-[#EFEAF6] p-3.5">
                  <div className="flex items-center justify-between text-xs text-[#6B5B8C]">
                    <span>
                      Cliente: <strong className="text-[#2E1065]">{activeRadarItem.mission.buyer_name}</strong>
                    </span>
                    <span className="font-bold text-[#7C3AED] tabular-nums">
                      📍 {activeRadarItem.distKm} km
                    </span>
                  </div>
                  <h3 className="mt-1 text-base font-black text-[#3B0764]">
                    {activeRadarItem.mission.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5B4E77]">
                    {activeRadarItem.mission.description}
                  </p>
                </div>

                {/* Precio */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                      Tu Precio Ofertado
                    </label>
                    <span className="text-2xl font-black text-[#047857] tabular-nums">
                      {formatCLP(bidAmount)}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBidAmount(activeRadarItem.mission.max_budget)}
                      className="rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] py-2 text-xs font-extrabold text-[#5B21B6] tabular-nums"
                    >
                      Mantener Tope
                      <span className="block text-[10px] opacity-80">
                        {formatCLP(activeRadarItem.mission.max_budget)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBidAmount(
                          Math.round((activeRadarItem.mission.max_budget * 0.95) / 100) *
                            100
                        )
                      }
                      className="rounded-2xl border border-[#86EFAC] bg-[#E6F9EE] py-2 text-xs font-extrabold text-[#047857] tabular-nums"
                    >
                      -5% Precio
                      <span className="block text-[10px] opacity-85">
                        {formatCLP(
                          Math.round((activeRadarItem.mission.max_budget * 0.95) / 100) *
                            100
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBidAmount(
                          Math.round((activeRadarItem.mission.max_budget * 0.9) / 100) *
                            100
                        )
                      }
                      className="rounded-2xl border border-[#FDBA74] bg-[#FFF0E5] py-2 text-xs font-extrabold text-[#C2410C] tabular-nums"
                    >
                      -10% Precio
                      <span className="block text-[10px] opacity-85">
                        {formatCLP(
                          Math.round((activeRadarItem.mission.max_budget * 0.9) / 100) *
                            100
                        )}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Cartas de Beneficio */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-[#4A3E63]">
                      Cartas de Beneficio
                    </label>
                    <span className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[11px] font-extrabold text-[#6D28D9] tabular-nums">
                      {selectedCards.length}/3 activas
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BENEFIT_CARDS.map((card) => {
                      const active = selectedCards.includes(card.id);
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            toggleBenefitSelection(card.id, selectedCards, setSelectedCards)
                          }
                          className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${
                            active
                              ? card.accentClass
                              : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                          }`}
                        >
                          <span className="text-lg">{card.emoji}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-extrabold">{card.label}</p>
                            <p className="truncate text-[10px] opacity-80">
                              +{card.scoreBonus} pts en Podio
                            </p>
                          </div>
                          {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ETA y Nota */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                      Llegada Estimada (ETA)
                    </label>
                    <div className="flex gap-1.5">
                      {[15, 20, 30, 45].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setEtaMinutes(m)}
                          className={`flex-1 rounded-xl border py-2 text-xs font-extrabold tabular-nums ${
                            etaMinutes === m
                              ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#6D28D9]'
                              : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                      Nota al Cliente
                    </label>
                    <input
                      type="text"
                      value={bidNote}
                      onChange={(e) => setBidNote(e.target.value)}
                      placeholder="Ej: Salimos al toque..."
                      className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-medium text-[#2E1065]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!userProvider.is_online}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#D946EF] to-[#F97316] py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-md transition hover:brightness-105 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  {myRankIndex >= 0 ? 'Mejorar mi Puja' : 'Lanzar Puja en Vivo'} ·{' '}
                  <span className="tabular-nums">
                    {formatCLP(bidAmount)} ({previewScore?.score.toFixed(0)} pts)
                  </span>
                </button>
              </form>
            ) : (
              <div className="altoque-card flex h-60 items-center justify-center rounded-3xl p-6 text-center text-sm text-[#6B5B8C]">
                Selecciona una misión del Radar para enviar tu oferta en vivo.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PILOTO AUTOMÁTICO */}
      {subTab === 'autopilot' && (
        <div className="grid gap-4 lg:grid-cols-12">
          <form
            onSubmit={handleCreateRule}
            className="altoque-card space-y-3.5 rounded-[28px] p-5 lg:col-span-6"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#3B0764]">
                  Nueva Regla de Piloto Automático
                </h3>
                <p className="text-[11px] text-[#6B5B8C]">
                  Responde en los primeros 10s automáticamente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6B5B8C]">
                  Categoría
                </label>
                <select
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value as CategoryId | 'all')}
                  className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-bold text-[#2E1065]"
                >
                  <option value="all">🌐 Todas</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6B5B8C]">
                  Radio Máx (km)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={ruleMaxDist}
                  onChange={(e) => setRuleMaxDist(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-bold text-[#2E1065] tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6B5B8C]">
                  Presupuesto Mínimo
                </label>
                <input
                  type="number"
                  step={1000}
                  min={3000}
                  value={ruleMinBudget}
                  onChange={(e) => setRuleMinBudget(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-extrabold text-[#047857] tabular-nums"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#6B5B8C]">
                  Descuento (%)
                </label>
                <select
                  value={ruleDiscount}
                  onChange={(e) => setRuleDiscount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-bold text-[#2E1065] tabular-nums"
                >
                  <option value={0}>0% (Igualar cliente)</option>
                  <option value={3}>-3%</option>
                  <option value={5}>-5%</option>
                  <option value={10}>-10%</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="time"
                value={ruleStart}
                onChange={(e) => setRuleStart(e.target.value)}
                className="rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-bold text-[#2E1065] tabular-nums"
              />
              <input
                type="time"
                value={ruleEnd}
                onChange={(e) => setRuleEnd(e.target.value)}
                className="rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-bold text-[#2E1065] tabular-nums"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={ruleDelay}
                onChange={(e) => setRuleDelay(Number(e.target.value))}
                className="rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-2.5 py-1.5 text-xs font-extrabold text-[#C2410C] tabular-nums"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {BENEFIT_CARDS.map((card) => {
                const active = ruleBenefits.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() =>
                      toggleBenefitSelection(card.id, ruleBenefits, setRuleBenefits)
                    }
                    className={`rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                      active
                        ? card.accentClass
                        : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                    }`}
                  >
                    {card.emoji} {card.shortLabel}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm"
            >
              <Plus className="h-4 w-4" /> Guardar Regla Automática
            </button>
          </form>

          <div className="space-y-3 lg:col-span-6">
            <h3 className="px-1 text-xs font-black uppercase tracking-wider text-[#3B0764]">
              Reglas Configuradas ({userRules.length})
            </h3>
            {userRules.map((rule) => (
              <div
                key={rule.id}
                className={`altoque-card rounded-3xl p-4 transition ${
                  rule.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#3B0764]">
                    {rule.category === 'all'
                      ? '🌐 Todas mis categorías'
                      : `${CATEGORY_MAP[rule.category]?.emoji} ${
                          CATEGORY_MAP[rule.category]?.name
                        }`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleAutoBidRule(rule.id)}
                      className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${
                        rule.is_active
                          ? 'bg-[#E6F9EE] text-[#047857]'
                          : 'bg-[#F3EEF8] text-[#6B5B8C]'
                      }`}
                    >
                      {rule.is_active ? '● Activa' : 'Pausada'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteAutoBidRule(rule.id)}
                      className="rounded-full bg-[#FFF1F2] p-1.5 text-[#E11D48]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-semibold text-[#5B4E77] tabular-nums">
                  <span>📍 Radio ≤ {rule.max_distance_km} km</span>
                  <span>💰 Mín ≥ {formatCLP(rule.min_budget)}</span>
                  <span>
                    🏷️ {rule.discount_percent === 0 ? 'Iguala tope' : `-${rule.discount_percent}%`}
                  </span>
                  <span>
                    <Clock className="mr-1 inline h-3 w-3 text-[#F97316]" />
                    En {rule.delay_seconds}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MÉTRICAS */}
      {subTab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="altoque-card rounded-3xl p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B5B8C]">
                <CheckCircle2 className="h-4 w-4 text-[#00C853]" /> Ventas Cerradas
              </span>
              <p className="mt-2 text-2xl font-black text-[#3B0764] tabular-nums">
                {userProvider.completed_orders_count}
              </p>
            </div>

            <div className="altoque-card rounded-3xl p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B5B8C]">
                <TrendingUp className="h-4 w-4 text-[#D946EF]" /> Conversión
              </span>
              <p className="mt-2 text-2xl font-black text-[#7C3AED] tabular-nums">
                {conversionRate}%
              </p>
            </div>

            <div className="altoque-card rounded-3xl p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B5B8C]">
                <Star className="h-4 w-4 text-[#F97316]" /> Reputación
              </span>
              <p className="mt-2 text-2xl font-black text-[#EA580C] tabular-nums">
                {userProvider.rating_avg.toFixed(2)} ★
              </p>
            </div>

            <div className="rounded-3xl border border-[#86EFAC] bg-[#E6F9EE] p-4">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#065F46]">
                <Wallet className="h-4 w-4" /> Saldo Disponible
              </span>
              <p className="mt-2 text-2xl font-black text-[#047857] tabular-nums">
                {formatCLP(userProvider.balance)}
              </p>
            </div>
          </div>

          <div className="altoque-card flex flex-col items-start justify-between gap-3 rounded-[28px] p-5 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-black text-[#3B0764]">
                Retiro Instantáneo de Pagos Liberados por QR
              </h3>
              <p className="mt-0.5 text-xs text-[#5B4E77]">
                Al escanear el código QR del comprador se libera el 100% del monto retenido en Escrow.
              </p>
            </div>
            <button
              type="button"
              disabled={userProvider.balance <= 0}
              onClick={withdrawProviderBalance}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#00C853] px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm disabled:opacity-40 tabular-nums"
            >
              <DollarSign className="h-4 w-4" />
              Retirar {formatCLP(userProvider.balance)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
