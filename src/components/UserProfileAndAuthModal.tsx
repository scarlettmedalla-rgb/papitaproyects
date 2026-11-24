'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CreditCard,
  History,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  ShieldCheck,
  Star,
  UserCheck,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { useAuction } from '@/context/AuctionContext';
import { formatCLP } from '@/lib/geo-and-pricing';

interface UserProfileAndAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}

const AVATARS = ['🧑‍💻', '👩‍🚀', '🧔', '👩‍🔧', '🦸', '🦊'];

export function UserProfileAndAuthModal({
  isOpen,
  onClose,
  onOpenOrder,
}: UserProfileAndAuthModalProps) {
  const {
    user,
    userProvider,
    missions,
    orders,
    soundOn,
    toggleSound,
    resetDemoData,
    updateUserProfile,
    switchRole,
  } = useAuction();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [avatar, setAvatar] = useState(user.avatar_url);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name: name.trim() || user.name,
      email: email.trim() || user.email,
      phone: phone.trim() || user.phone,
      avatar_url: avatar,
    });
    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#2E1065]/35 backdrop-blur-sm sm:items-center sm:p-4"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] border border-[#EDE5FA] bg-[#FAF9F6] shadow-2xl sm:rounded-[32px]"
          >
            <div className="flex items-center justify-between border-b border-[#EFEAF6] bg-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{user.avatar_url}</span>
                <div>
                  <h2 className="text-base font-black text-[#3B0764]">
                    Mi Cuenta · AlToque
                  </h2>
                  <p className="text-xs font-semibold text-[#6B5B8C] tabular-nums">
                    Reputación {user.rating_avg.toFixed(2)} ★ · Cuenta Unificada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#EFEAF6] bg-[#FAF9F6] p-2 text-[#5B4E77]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* Preferencias rápidas */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#DDD6FE] bg-white py-2 text-xs font-extrabold text-[#5B21B6]"
                >
                  {soundOn ? (
                    <>
                      <Volume2 className="h-4 w-4 text-[#00C853]" /> Sonido Activo
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 text-[#9A8EB5]" /> Silenciado
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoData();
                    onClose();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#FDBA74] bg-[#FFF0E5] py-2 text-xs font-extrabold text-[#C2410C]"
                >
                  <RotateCcw className="h-4 w-4" /> Reiniciar Demo
                </button>
              </div>

              {/* Alternador de Rol */}
              <div className="grid grid-cols-2 gap-1.5 rounded-full border border-[#DDD6FE] bg-white p-1">
                <button
                  type="button"
                  onClick={() => switchRole('buyer')}
                  className={`rounded-full py-2 text-xs font-extrabold transition ${
                    user.role_active === 'buyer'
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#D946EF] text-white'
                      : 'text-[#5B4E77]'
                  }`}
                >
                  🛍️ Comprador
                </button>
                <button
                  type="button"
                  onClick={() => switchRole('provider')}
                  className={`rounded-full py-2 text-xs font-extrabold transition ${
                    user.role_active === 'provider'
                      ? 'bg-gradient-to-r from-[#F97316] to-[#D946EF] text-white'
                      : 'text-[#5B4E77]'
                  }`}
                >
                  🏪 Proveedor
                </button>
              </div>

              {/* Formulario Perfil */}
              <form onSubmit={handleSave} className="altoque-card space-y-3 rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#3B0764]">
                    <UserCheck className="h-4 w-4 text-[#7C3AED]" /> Datos Personales
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F9EE] px-2.5 py-0.5 text-[10px] font-extrabold text-[#047857]">
                    <ShieldCheck className="h-3 w-3" /> Verificado
                  </span>
                </div>

                <div className="flex gap-1.5">
                  {AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`h-9 w-9 rounded-xl text-lg ${
                        avatar === av
                          ? 'bg-[#7C3AED] text-white ring-2 ring-[#C084FC]'
                          : 'bg-[#FAF9F6] border border-[#EFEAF6]'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-2 text-xs font-bold text-[#2E1065]"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8E80A8]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] py-2 pl-8 pr-3 text-xs text-[#2E1065]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8E80A8]" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] py-2 pl-8 pr-3 text-xs text-[#2E1065] tabular-nums"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] py-2.5 text-xs font-extrabold text-white"
                >
                  {savedBanner ? '✓ Guardado' : 'Guardar Cambios'}
                </button>
              </form>

              {/* Saldos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="altoque-card rounded-3xl p-3.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#6B5B8C]">
                    <Wallet className="h-3.5 w-3.5 text-[#7C3AED]" /> Billetera Cliente
                  </span>
                  <p className="mt-1 text-lg font-black text-[#3B0764] tabular-nums">
                    {formatCLP(user.wallet_balance)}
                  </p>
                </div>
                <div className="rounded-3xl border border-[#86EFAC] bg-[#E6F9EE] p-3.5">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#065F46]">
                    <Star className="h-3.5 w-3.5 text-[#00C853]" /> Saldo Comercio
                  </span>
                  <p className="mt-1 text-lg font-black text-[#047857] tabular-nums">
                    {formatCLP(userProvider.balance)}
                  </p>
                </div>
              </div>

              {/* Direcciones y Pagos */}
              <div className="altoque-card space-y-2 rounded-3xl p-4">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#3B0764]">
                  <CreditCard className="h-4 w-4 text-[#D946EF]" /> Métodos de Pago
                </p>
                {user.payment_methods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between rounded-xl border border-[#EFEAF6] bg-[#FAF9F6] px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-[#2E1065]">
                      {pm.brand} · {pm.last4}
                    </span>
                    {pm.isDefault && (
                      <span className="rounded-full bg-[#E6F9EE] px-2 py-0.5 text-[10px] font-extrabold text-[#047857]">
                        Activo
                      </span>
                    )}
                  </div>
                ))}

                <p className="flex items-center gap-1.5 pt-2 text-xs font-extrabold text-[#3B0764]">
                  <MapPin className="h-4 w-4 text-[#F97316]" /> Direcciones Guardadas
                </p>
                {user.saved_addresses.map((ad) => (
                  <div
                    key={ad.id}
                    className="rounded-xl border border-[#EFEAF6] bg-[#FAF9F6] px-3 py-2 text-xs text-[#4A3E63]"
                  >
                    <strong>{ad.label}:</strong> {ad.street}
                  </div>
                ))}
              </div>

              {/* Historial */}
              <div className="altoque-card space-y-2 rounded-3xl p-4">
                <p className="flex items-center gap-1.5 text-xs font-extrabold text-[#3B0764]">
                  <History className="h-4 w-4 text-[#00C853]" /> Órdenes ({orders.length}) · Misiones ({missions.length})
                </p>
                {orders.map((ord) => (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => {
                      onOpenOrder(ord.id);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-[#EFEAF6] bg-[#FAF9F6] px-3 py-2 text-left text-xs font-bold text-[#2E1065]"
                  >
                    <span>
                      Orden #{ord.id.slice(-5).toUpperCase()} ·{' '}
                      {ord.fulfillment_status === 'completed' ? '✅ Completada' : '🛡️ En Escrow'}
                    </span>
                    <span className="font-black text-[#047857] tabular-nums">
                      {formatCLP(ord.escrow_amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
