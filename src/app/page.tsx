'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Plus,
  PlusCircle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { useAuction } from '@/context/AuctionContext';
import { CATEGORY_MAP } from '@/types/domain';
import { formatCLP, formatCountdown } from '@/lib/geo-and-pricing';
import { LiveAuctionArena } from '@/components/LiveAuctionArena';
import { MissionCreatorModal } from '@/components/MissionCreatorModal';
import { ProviderRadarAndAutopilot } from '@/components/ProviderRadarAndAutopilot';
import { EscrowOrderRoom } from '@/components/EscrowOrderRoom';
import { UserProfileAndAuthModal } from '@/components/UserProfileAndAuthModal';
import { CapybaraMascot } from '@/components/CapybaraMascot';

export default function AlToqueApp() {
  const {
    nowMs,
    user,
    missions,
    orders,
    notifications,
    activeMissionId,
    activeOrderId,
    setActiveMissionId,
    setActiveOrderId,
    switchRole,
    dismissNotification,
  } = useAuction();

  const [creatorOpen, setCreatorOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const poolMissionId = params.get('pool');
    if (poolMissionId) {
      const found = missions.find((m) => m.id === poolMissionId);
      if (found) {
        switchRole('buyer');
        setActiveOrderId(null);
        setActiveMissionId(found.id);
      }
    }
  }, [missions, setActiveMissionId, setActiveOrderId, switchRole]);

  const activeMission = useMemo(
    () =>
      missions.find((m) => m.id === activeMissionId) ||
      missions.find((m) => m.status === 'open') ||
      missions[0] ||
      null,
    [activeMissionId, missions]
  );

  const activeOrder = useMemo(
    () => orders.find((o) => o.id === activeOrderId) || null,
    [activeOrderId, orders]
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-28 text-[#2E1065]">
      {/* Toasts Flotantes Claros */}
      <div className="pointer-events-none fixed right-3 top-20 z-50 flex w-full max-w-sm flex-col gap-2 px-2 sm:right-5">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              onClick={() => dismissNotification(n.id)}
              className={`pointer-events-auto cursor-pointer rounded-2xl border bg-white p-3.5 shadow-xl ${
                n.type === 'extratime' || n.type === 'outbid'
                  ? 'border-[#FDBA74] text-[#9A3412]'
                  : n.type === 'escrow'
                  ? 'border-[#86EFAC] text-[#065F46]'
                  : 'border-[#DDD6FE] text-[#3B0764]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Bell className="mt-0.5 h-4 w-4 shrink-0 text-[#D946EF]" />
                <div>
                  <p className="text-xs font-black">{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#5B4E77]">{n.subtitle}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* =====================================================================
          TOP BAR: LOGO "AlToque" + CARPINCHO ASOMÁNDOSE + TOGGLE PILL
         ===================================================================== */}
      <header className="sticky top-0 z-40 border-b border-[#F1ECF8] bg-[#FAF9F6]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-end justify-between gap-2 px-4 pb-3 pt-3 sm:px-6">
          {/* Izquierda: Marca AlToque + Subtítulo */}
          <div className="pt-1">
            <div className="flex items-center tracking-tight">
              <span className="text-3xl font-black text-[#7C3AED] sm:text-4xl">
                Al
              </span>
              <span className="bg-gradient-to-r from-[#F97316] via-[#EC4899] to-[#D946EF] bg-clip-text text-3xl font-black text-transparent sm:text-4xl">
                Toque
              </span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-[#5B21B6]">
              Subastas inversas locales
            </p>
          </div>

          {/* Derecha: Mascota Carpincho Natural Asomándose sobre el Pill Toggle */}
          <div className="flex flex-col items-end">
            <CapybaraMascot
              variant="peeking"
              className="-mb-2 mr-3 h-11 w-16 select-none"
            />
            <div className="relative z-10 flex items-center rounded-full border border-[#3B0764]/20 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => {
                  switchRole('buyer');
                  setActiveOrderId(null);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  user.role_active === 'buyer'
                    ? 'bg-gradient-to-r from-[#9333EA] via-[#C026D3] to-[#D946EF] text-white shadow-sm'
                    : 'text-[#3B0764] hover:bg-[#FAF5FF]'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Comprador</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchRole('provider');
                  setActiveOrderId(null);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                  user.role_active === 'provider'
                    ? 'bg-gradient-to-r from-[#F97316] to-[#D946EF] text-white shadow-sm'
                    : 'text-[#3B0764] hover:bg-[#FAF5FF]'
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                <span>Proveedor</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          CONTENIDO PRINCIPAL CENTRADO
         ===================================================================== */}
      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-3.5 sm:px-6">
        {activeOrder ? (
          <EscrowOrderRoom
            order={activeOrder}
            onBack={() => setActiveOrderId(null)}
          />
        ) : user.role_active === 'buyer' ? (
          <>
            {/* SECCIÓN 2 (ACTION BAR): + Publicar Misión + Chips Deslizantes */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCreatorOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#7C3AED]/25 transition hover:brightness-105"
              >
                <Plus className="h-4 w-4 stroke-[2.6]" />
                <span>Publicar Misión</span>
              </button>

              {orders.map((ord) => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => setActiveOrderId(ord.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#86EFAC] bg-[#E6F9EE] px-3.5 py-2 text-xs font-extrabold text-[#047857] tabular-nums"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {ord.fulfillment_status === 'completed'
                    ? 'Orden Completada'
                    : `Escrow & QR (${formatCLP(ord.escrow_amount)})`}
                </button>
              ))}

              {missions
                .filter((m) => m.status === 'open')
                .map((m) => {
                  const rem = Math.max(
                    0,
                    Math.ceil((new Date(m.expires_at).getTime() - nowMs) / 1000)
                  );
                  const isCurrent = activeMission?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveMissionId(m.id)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition tabular-nums ${
                        isCurrent
                          ? 'border-[#DDD6FE] bg-white text-[#2E1065] shadow-sm'
                          : 'border-[#EFEAF6] bg-white/70 text-[#6B5B8C] hover:bg-white'
                      }`}
                    >
                      <span>{CATEGORY_MAP[m.category]?.emoji}</span>
                      <span className="max-w-[155px] truncate">{m.title}</span>
                      <span className="font-extrabold text-[#D946EF]">
                        {formatCountdown(rem)}
                      </span>
                    </button>
                  );
                })}
            </div>

            {activeMission ? (
              <LiveAuctionArena
                mission={activeMission}
                onOpenCreator={() => setCreatorOpen(true)}
                onOrderCreated={(orderId) => setActiveOrderId(orderId)}
              />
            ) : (
              <div className="altoque-card rounded-[28px] p-10 text-center">
                <p className="text-base font-black text-[#3B0764]">
                  No tienes misiones abiertas ahora mismo
                </p>
                <button
                  type="button"
                  onClick={() => setCreatorOpen(true)}
                  className="mt-4 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-6 py-3 text-xs font-extrabold uppercase text-white"
                >
                  + Publicar mi primera misión
                </button>
              </div>
            )}
          </>
        ) : (
          <ProviderRadarAndAutopilot
            onOpenOrder={(orderId) => setActiveOrderId(orderId)}
          />
        )}
      </main>

      {/* =====================================================================
          FLOATING NAVIGATION DOCK (SUAVE, BLANCO, REDONDEADO CON SOMBRA)
         ===================================================================== */}
      <div className="pointer-events-none fixed bottom-3 left-0 right-0 z-40 px-4">
        <nav className="altoque-dock-shadow pointer-events-auto mx-auto grid max-w-md grid-cols-4 rounded-[26px] border border-[#EFEAF6] bg-white/95 px-2 py-2 backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              switchRole('buyer');
              setActiveOrderId(null);
            }}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-extrabold transition ${
              user.role_active === 'buyer' && !activeOrder
                ? 'text-[#7C3AED]'
                : 'text-[#6B5B8C]'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span>Podio Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              switchRole('buyer');
              setCreatorOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-extrabold text-[#E11D48]"
          >
            <PlusCircle className="h-5 w-5 text-[#D946EF]" />
            <span>Pedir</span>
          </button>

          <button
            type="button"
            onClick={() => {
              switchRole('provider');
              setActiveOrderId(null);
            }}
            className={`flex flex-col items-center gap-0.5 py-1 text-[11px] font-extrabold transition ${
              user.role_active === 'provider' && !activeOrder
                ? 'text-[#F97316]'
                : 'text-[#6B5B8C]'
            }`}
          >
            <Store className="h-5 w-5" />
            <span>Modo Comercio</span>
          </button>

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-extrabold text-[#3B0764]"
          >
            <UserIcon className="h-5 w-5" />
            <span>Cuenta</span>
          </button>
        </nav>
      </div>

      {/* Modales */}
      <MissionCreatorModal
        isOpen={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        onCreated={(id) => {
          setActiveOrderId(null);
          setActiveMissionId(id);
        }}
      />

      <UserProfileAndAuthModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenOrder={(id) => setActiveOrderId(id)}
      />
    </div>
  );
}
