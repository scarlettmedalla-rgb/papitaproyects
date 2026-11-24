'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bot,
  Clock,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { BENEFIT_MAP, Bid, CATEGORY_MAP, Mission } from '@/types/domain';
import { useAuction } from '@/context/AuctionContext';
import { computeBidValueScore, formatCLP, formatCountdown } from '@/lib/geo-and-pricing';
import { GroupPoolPanel } from './GroupPoolPanel';
import { SlideToAccept } from './SlideToAccept';
import { CapybaraMascot } from './CapybaraMascot';

interface LiveAuctionArenaProps {
  mission: Mission;
  onOpenCreator: () => void;
  onOrderCreated: (orderId: string) => void;
}

const REACTION_EMOJIS = ['🔥', '😍', '⚡', '🎁', '👏'];

export function LiveAuctionArena({
  mission,
  onOpenCreator,
  onOrderCreated,
}: LiveAuctionArenaProps) {
  const {
    nowMs,
    bids,
    poolMembers,
    reactions,
    botsEnabled,
    setBotsEnabled,
    triggerInstantBotBid,
    jumpClockToLast10Seconds,
    voteForBid,
    sendReaction,
    acceptBidAndLockEscrow,
  } = useAuction();

  const missionBids = useMemo(
    () =>
      bids
        .filter((b) => b.mission_id === mission.id)
        .sort((a, b) => b.value_score - a.value_score),
    [bids, mission.id]
  );

  const missionPoolMembers = useMemo(
    () => poolMembers.filter((m) => m.mission_id === mission.id),
    [poolMembers, mission.id]
  );

  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(
    missionPoolMembers[0]?.id ?? null
  );
  const [selectedBidIdForAccept, setSelectedBidIdForAccept] = useState<string | null>(
    null
  );

  const activeVoterId = selectedGuestId || missionPoolMembers[0]?.id || null;

  const expiresMs = new Date(mission.expires_at).getTime();
  const remainingSec = Math.max(0, Math.ceil((expiresMs - nowMs) / 1000));
  const totalSec = Math.max(mission.duration_seconds, remainingSec);
  const timePct = Math.min(100, Math.max(0, (remainingSec / totalSec) * 100));

  const isUrgent = remainingSec <= 30 && remainingSec > 0;

  const top3Bids = missionBids.slice(0, 3);
  const otherBids = missionBids.slice(3);
  const targetAcceptBid: Bid | undefined =
    missionBids.find((b) => b.id === selectedBidIdForAccept) || top3Bids[0];

  const handleConfirmWinningBid = (bid: Bid) => {
    const order = acceptBidAndLockEscrow(mission.id, bid.id);
    if (order) {
      onOrderCreated(order.id);
    }
  };

  const categoryDef = CATEGORY_MAP[mission.category];

  return (
    <div className="space-y-4">
      {/* =====================================================================
          SECCIÓN 3: TARJETA PRINCIPAL DE MISIÓN (ESPACIOSA, CLARA Y CÁLIDA)
         ===================================================================== */}
      <div className="altoque-card rounded-[28px] p-5 sm:p-6">
        {/* Etiquetas superiores en tonos Sunset suaves */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0E5] px-3 py-1 text-xs font-extrabold text-[#B45309]">
            <span>{categoryDef?.emoji}</span>
            <span>{categoryDef?.name}</span>
          </span>

          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-extrabold text-[#B45309]">
            {mission.mode === 'flash' ? (
              <>
                <Zap className="h-3.5 w-3.5 fill-[#F59E0B] text-[#D97706]" />
                <span>Relámpago</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                <span>Programado</span>
              </>
            )}
          </span>

          {mission.extra_time_extensions > 0 && (
            <motion.span
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-1 rounded-full bg-[#FDF2F8] border border-[#F9A8D4] px-3 py-1 text-xs font-extrabold text-[#BE185D] tabular-nums"
            >
              ⏱️ +30s Extra ×{mission.extra_time_extensions}
            </motion.span>
          )}
        </div>

        {/* Título en Violeta Profundo */}
        <h1 className="mt-3.5 text-xl font-black leading-snug tracking-tight text-[#3B0764] sm:text-2xl">
          {mission.title}
        </h1>

        {/* Descripción legible en gris-púrpura oscuro natural */}
        <p className="mt-2 text-sm leading-relaxed text-[#4A3E63]">
          {mission.description}
        </p>

        {/* Foto adjunta si existe */}
        {mission.media_url && (
          <div className="mt-3.5 overflow-hidden rounded-2xl border border-[#EFEAF6]">
            <img
              src={mission.media_url}
              alt={mission.title}
              className="h-36 w-full object-cover"
            />
          </div>
        )}

        {/* Ubicación y Presupuesto Tope */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#4A3E63]">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span>{mission.address_label}</span>
          </span>
          <span className="tabular-nums text-[#3B0764]">
            💰 Tope cliente: <strong className="font-black">{formatCLP(mission.max_budget)}</strong>
          </span>
        </div>

        {/* Bloque Gradiente Sunset: CIERRE EN VIVO + Temporizador Tabular */}
        <div
          className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3.5 text-white shadow-md transition-all ${
            isUrgent
              ? 'bg-gradient-to-r from-[#EA580C] via-[#E11D48] to-[#BE185D] animate-pulse shadow-[#E11D48]/25'
              : 'bg-gradient-to-r from-[#F97316] via-[#EC4899] to-[#D946EF] shadow-[#EC4899]/25'
          }`}
        >
          <div>
            <span className="text-xs font-black uppercase tracking-wider sm:text-sm">
              {remainingSec > 0 ? 'CIERRE EN VIVO' : 'SUBASTA FINALIZADA'}
            </span>
            {remainingSec <= 15 && remainingSec > 0 && (
              <p className="text-[10px] font-semibold text-white/90">
                Puja en últimos 10s suma +30s extra
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Timer className="h-5 w-5 opacity-95" />
            <span className="text-2xl font-black tracking-tight tabular-nums sm:text-3xl">
              {formatCountdown(remainingSec)}
            </span>
          </div>
        </div>

        {/* Barra de progreso suave bicolor (Violeta a Naranja Sunset) */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#F3ECF9]">
          <motion.div
            animate={{ width: `${timePct}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#D946EF] to-[#F97316]"
          />
        </div>
      </div>

      {/* =====================================================================
          MASCOTA CARPINCHO + BURBUJA DE TIP EN VIVO + BOTONES PILL
         ===================================================================== */}
      <div className="px-1">
        <div className="flex items-center gap-3">
          <CapybaraMascot variant="pointing" className="h-24 w-24 shrink-0" />
          <div className="relative flex-1 rounded-2xl border border-[#EDE5FA] bg-white px-4 py-3 shadow-sm">
            {/* Triangulito de diálogo */}
            <span
              aria-hidden="true"
              className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-[#EDE5FA] bg-white"
            />
            <p className="relative text-xs font-medium leading-snug text-[#4C1D95] sm:text-sm">
              <strong className="font-black text-[#6D28D9]">¡Tip AlToque!</strong>{' '}
              {missionBids.length > 0
                ? `¡Hay ${missionBids.length} ofertas compitiendo en camino! Toca una tarjeta para compararla.`
                : '¡Alertando negocios locales! En segundos verás llegar las primeras pujas.'}
            </p>
          </div>
        </div>

        {/* Insignia Verde Menta y Botones Secundarios Contorneados */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBotsEnabled(!botsEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition ${
              botsEnabled
                ? 'border-[#86EFAC] bg-[#E6F9EE] text-[#065F46]'
                : 'border-[#E5DEEF] bg-white text-[#6B5B8C]'
            }`}
          >
            <span>🤖</span>
            <span>Bots en Vivo: {botsEnabled ? 'ACTIVOS' : 'PAUSADOS'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerInstantBotBid(mission.id)}
            disabled={mission.status !== 'open' || remainingSec <= 0}
            className="inline-flex items-center gap-1 rounded-full border border-[#C4B5FD] bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#5B21B6] shadow-sm transition hover:bg-[#F5F0FF] disabled:opacity-40"
          >
            Simular Contra-Oferta
          </button>

          <button
            type="button"
            onClick={() => jumpClockToLast10Seconds(mission.id)}
            disabled={mission.status !== 'open'}
            className="inline-flex items-center gap-1 rounded-full border border-[#FDBA74] bg-white px-3 py-1.5 text-xs font-extrabold text-[#C2410C] shadow-sm transition hover:bg-[#FFF7ED] disabled:opacity-40"
          >
            ⚡ Últimos 10s (+30s)
          </button>

          <button
            type="button"
            onClick={onOpenCreator}
            className="inline-flex items-center gap-1 rounded-full border border-[#D8B4FE] bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#7C3AED] shadow-sm transition hover:bg-[#FAF5FF]"
          >
            <Plus className="h-3.5 w-3.5" /> Nueva Misión
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODO VAQUITA GRUPAL EN VIVO
         ===================================================================== */}
      {mission.is_group_pool && (
        <GroupPoolPanel
          mission={mission}
          missionBids={missionBids}
          activeGuestId={activeVoterId}
          onSelectGuestId={setSelectedGuestId}
        />
      )}

      {/* =====================================================================
          PODIO TOP 3 GAMIFICADO EN TEMA CLARO SUNSET
         ===================================================================== */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#F97316]" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#3B0764]">
              Podio Top 3 en Vivo ({missionBids.length})
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-[#6B5B8C]">
            Precio + Cartas de Beneficio + ★
          </span>
        </div>

        {top3Bids.length === 0 ? (
          <div className="altoque-card flex flex-col items-center justify-center rounded-[26px] p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C3AED]">
              <Sparkles className="h-7 w-7 animate-spin" />
            </div>
            <p className="mt-3 text-sm font-extrabold text-[#3B0764]">
              Conectando con comercios verificados en tu radio…
            </p>
            <p className="mt-1 max-w-sm text-xs text-[#6B5B8C]">
              El Piloto Automático responde en los primeros 10 segundos para evitar salas vacías.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {top3Bids.map((bid, idx) => {
                const rank = idx + 1;
                const isFirst = rank === 1;
                const isSelected = (targetAcceptBid?.id ?? '') === bid.id;
                const breakdown = computeBidValueScore({
                  maxBudget: mission.max_budget,
                  bidAmount: bid.amount,
                  benefitCards: bid.benefit_cards,
                  providerRating: bid.provider_rating,
                  etaMinutes: bid.eta_minutes,
                  distanceKm: bid.distance_km,
                });

                const votesForThisBid = missionPoolMembers.filter(
                  (m) => m.voted_bid_id === bid.id
                );
                const hasActiveMemberVoted =
                  activeVoterId != null &&
                  votesForThisBid.some((m) => m.id === activeVoterId);

                const bidReactions = reactions.filter((r) => r.bid_id === bid.id);

                const rankBadge =
                  rank === 1
                    ? 'bg-gradient-to-br from-[#00C853] to-[#059669] text-white shadow-sm'
                    : rank === 2
                    ? 'bg-gradient-to-br from-[#7C3AED] to-[#D946EF] text-white'
                    : 'bg-gradient-to-br from-[#F97316] to-[#EA580C] text-white';

                return (
                  <motion.div
                    key={bid.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    onClick={() => setSelectedBidIdForAccept(bid.id)}
                    className={`relative cursor-pointer overflow-hidden rounded-[26px] border bg-white p-4 transition-all ${
                      isFirst
                        ? 'border-[#00C853] ring-2 ring-[#00C853]/15 shadow-[0_12px_30px_-8px_rgba(0,200,83,0.18)]'
                        : isSelected
                        ? 'border-[#D946EF] ring-2 ring-[#D946EF]/15 shadow-md'
                        : 'border-[#EFEAF6] shadow-sm hover:border-[#D8B4FE]'
                    }`}
                  >
                    {/* Emojis flotantes sincronizados */}
                    <div className="pointer-events-none absolute right-6 top-2 z-20 flex gap-2">
                      <AnimatePresence>
                        {bidReactions.map((r) => (
                          <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 26, scale: 0.6 }}
                            animate={{ opacity: 1, y: -16, scale: 1.25 }}
                            exit={{ opacity: 0, y: -44, scale: 0.9 }}
                            transition={{ duration: 1.8, ease: 'easeOut' }}
                            className="flex flex-col items-center"
                          >
                            <span className="text-2xl drop-shadow">{r.emoji}</span>
                            <span className="rounded-full bg-[#3B0764] px-1.5 text-[9px] font-bold text-white">
                              {r.sender_name}
                            </span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF0E5] via-[#FDF2F8] to-[#F3E8FF] text-2xl border border-[#EDE5FA]">
                            {bid.provider_avatar}
                          </div>
                          <span
                            className={`absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black tabular-nums ${rankBadge}`}
                          >
                            #{rank}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-sm font-black text-[#2E1065] sm:text-base">
                              {bid.provider_name}
                            </h3>
                            {bid.provider_verified && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E6F9EE] px-2 py-0.5 text-[10px] font-extrabold text-[#047857]">
                                <ShieldCheck className="h-3 w-3" /> Verificado
                              </span>
                            )}
                            {bid.is_auto_bid && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                                <Bot className="h-3 w-3" /> Auto-Puja
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#5B4E77] tabular-nums">
                            <span className="inline-flex items-center gap-0.5 font-extrabold text-[#D97706]">
                              <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                              {bid.provider_rating.toFixed(2)}
                            </span>
                            <span>📍 {bid.distance_km.toFixed(1)} km</span>
                            <span className="font-extrabold text-[#047857]">
                              ⚡ {bid.eta_minutes} min
                            </span>
                            <span className="rounded-full bg-[#F5F0FF] px-2 py-0.5 text-[10px] font-bold text-[#6D28D9]">
                              {bid.value_score.toFixed(0)} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Precio Ofertado + Ahorro */}
                      <div className="text-right">
                        <motion.p
                          key={bid.amount}
                          initial={{ scale: 1.14, color: '#00C853' }}
                          animate={{ scale: 1, color: isFirst ? '#047857' : '#3B0764' }}
                          className="text-xl font-black tracking-tight tabular-nums sm:text-2xl"
                        >
                          {formatCLP(bid.amount)}
                        </motion.p>
                        {breakdown.savingsAmount > 0 ? (
                          <span className="inline-block rounded-full bg-[#E6F9EE] px-2 py-0.5 text-[10px] font-extrabold text-[#047857] tabular-nums">
                            Ahorras {formatCLP(breakdown.savingsAmount)}
                          </span>
                        ) : (
                          <span className="inline-block rounded-full bg-[#FDF2F8] px-2 py-0.5 text-[10px] font-extrabold text-[#BE185D] tabular-nums">
                            +{formatCLP(breakdown.perceivedExtraValue)} en Beneficios
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cartas de Beneficio Activadas */}
                    {bid.benefit_cards.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bid.benefit_cards.map((cardId) => {
                          const def = BENEFIT_MAP[cardId];
                          if (!def) return null;
                          return (
                            <span
                              key={cardId}
                              title={def.description}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-extrabold ${def.accentClass}`}
                            >
                              <span>{def.emoji}</span>
                              <span>{def.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {bid.note && (
                      <p className="mt-2 text-xs text-[#6B5B8C] italic">
                        &ldquo;{bid.note}&rdquo;
                      </p>
                    )}

                    {/* Reacciones y Voto Grupal */}
                    <div
                      className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#F3EEF8] pt-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {REACTION_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => sendReaction(mission.id, bid.id, em)}
                            className="rounded-xl border border-[#EFEAF6] bg-[#FAF8FC] px-2 py-1 text-xs transition hover:scale-110 hover:border-[#D8B4FE] active:scale-95"
                          >
                            {em}
                          </button>
                        ))}
                      </div>

                      {mission.is_group_pool && activeVoterId && (
                        <button
                          type="button"
                          onClick={() => voteForBid(mission.id, activeVoterId, bid.id)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums transition ${
                            hasActiveMemberVoted
                              ? 'border-[#00C853] bg-[#E6F9EE] text-[#047857]'
                              : 'border-[#DDD6FE] bg-[#FAF7FF] text-[#5B21B6] hover:bg-[#F3E8FF]'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          Votar ({votesForThisBid.length})
                          {votesForThisBid.length > 0 && (
                            <span className="ml-0.5">
                              {votesForThisBid.map((v) => v.avatar_emoji).join('')}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Otras ofertas fuera del Top 3 */}
        {otherBids.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="px-1 text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
              Más comercios compitiendo ({otherBids.length})
            </p>
            {otherBids.map((bid, i) => (
              <div
                key={bid.id}
                onClick={() => setSelectedBidIdForAccept(bid.id)}
                className="altoque-card flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 hover:border-[#D8B4FE]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-extrabold text-[#7C3AED] tabular-nums">
                    #{i + 4}
                  </span>
                  <span className="text-lg">{bid.provider_avatar}</span>
                  <div>
                    <p className="text-xs font-extrabold text-[#2E1065]">
                      {bid.provider_name}
                    </p>
                    <p className="text-[11px] text-[#6B5B8C] tabular-nums">
                      {bid.distance_km.toFixed(1)} km · {bid.eta_minutes} min ·{' '}
                      {bid.benefit_cards.length} cartas
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-[#3B0764] tabular-nums">
                  {formatCLP(bid.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================================
          RESUMEN INFERIOR DE OFERTA SELECCIONADA + CIERRE DESLIZANTE
         ===================================================================== */}
      {targetAcceptBid && mission.status === 'open' && (
        <div className="rounded-[28px] border border-[#FDE6D8] bg-[#FFF8F1] p-3.5 shadow-sm">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-[#F5ECE4]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#D946EF] text-white shadow-sm">
              <Store className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold text-[#2E1065] sm:text-sm tabular-nums">
                Seleccionada: {targetAcceptBid.provider_name} -{' '}
                <span className="text-[#047857]">{formatCLP(targetAcceptBid.amount)}</span>
              </p>
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">
                {targetAcceptBid.provider_name.toUpperCase()} · LLEGA EN{' '}
                {targetAcceptBid.eta_minutes} MIN
              </p>
            </div>
          </div>

          <SlideToAccept
            label={`Desliza para aceptar a ${targetAcceptBid.provider_name}`}
            sublabel={`Escudo Escrow · ${targetAcceptBid.benefit_cards.length} Cartas de Beneficio incluidas`}
            onConfirm={() => handleConfirmWinningBid(targetAcceptBid)}
          />
        </div>
      )}
    </div>
  );
}
