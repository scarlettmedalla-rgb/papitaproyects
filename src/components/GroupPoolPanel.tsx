'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { Check, Copy, Plus, QrCode, Share2, Sparkles, UserPlus, Users } from 'lucide-react';
import { Bid, Mission } from '@/types/domain';
import { useAuction } from '@/context/AuctionContext';
import { formatCLP } from '@/lib/geo-and-pricing';

interface GroupPoolPanelProps {
  mission: Mission;
  missionBids: Bid[];
  activeGuestId: string | null;
  onSelectGuestId: (id: string) => void;
}

const GUEST_EMOJIS = ['🙌', '💃', '🎸', '🦊', '⚡', '🍕', '🦄', '🍻'];

export function GroupPoolPanel({
  mission,
  missionBids,
  activeGuestId,
  onSelectGuestId,
}: GroupPoolPanelProps) {
  const { poolMembers, joinOrContributePool, simulateFriendContribution } = useAuction();

  const members = useMemo(
    () => poolMembers.filter((m) => m.mission_id === mission.id),
    [poolMembers, mission.id]
  );

  const totalCollected = useMemo(
    () => members.reduce((sum, m) => sum + m.contribution_amount, 0),
    [members]
  );

  const progressPct = Math.min(
    100,
    Math.round((totalCollected / Math.max(1, mission.max_budget)) * 100)
  );

  const [showInviteQr, setShowInviteQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestEmoji, setGuestEmoji] = useState('🦊');
  const [addAmount, setAddAmount] = useState<number>(5000);
  const [showJoinForm, setShowJoinForm] = useState(false);

  const shareUrl =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? `${window.location.origin}/?pool=${mission.id}`
      : `https://altoque.app/?pool=${mission.id}`;

  useEffect(() => {
    if (!showInviteQr) return;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#5B21B6',
        light: '#FFFFFF',
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [showInviteQr, shareUrl]);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    const created = joinOrContributePool(
      mission.id,
      guestName.trim(),
      guestEmoji,
      addAmount
    );
    onSelectGuestId(created.id);
    setGuestName('');
    setShowJoinForm(false);
  };

  const currentMember =
    members.find((m) => m.id === activeGuestId) || members[0] || null;

  return (
    <div className="altoque-card rounded-[26px] p-4 sm:p-5">
      {/* Cabecera de la Vaquita */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F3E8FF] text-[#7C3AED]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-[#3B0764]">
                Vaquita Grupal en Vivo
              </h3>
              <span className="rounded-full bg-[#E6F9EE] px-2 py-0.5 text-[10px] font-extrabold text-[#047857] tabular-nums">
                {members.length} conectados
              </span>
            </div>
            <p className="text-[11px] text-[#6B5B8C]">
              Aportan sin registro largo, reaccionan y votan juntos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 rounded-full border border-[#DDD6FE] bg-[#FAF7FF] px-3 py-1.5 text-[11px] font-extrabold text-[#5B21B6] hover:bg-[#F3E8FF]"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#00C853]" /> Copiado
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-[#D946EF]" /> Link Sala
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowInviteQr((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-sm"
          >
            <QrCode className="h-3.5 w-3.5" /> QR Invitados
          </button>
        </div>
      </div>

      {/* QR para invitados */}
      {showInviteQr && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3.5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#EDE5FA] bg-[#FAF7FF] p-3.5 sm:flex-row"
        >
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs font-extrabold text-[#5B21B6]">
              Invita amigos al instante con QR
            </p>
            <p className="text-[11px] text-[#5B4E77]">
              Entran solo con su nombre y emoji favorito para sumar al pozo y votar la oferta ganadora.
            </p>
            <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-[#DDD6FE] bg-white px-2.5 py-1.5 text-[11px] text-[#4C1D95]">
              <span className="truncate">{shareUrl}</span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="ml-auto text-[#7C3AED]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Sala Vaquita Grupal"
              className="h-28 w-28 rounded-2xl border border-[#DDD6FE] bg-white p-1.5 shadow-sm"
            />
          )}
        </motion.div>
      )}

      {/* Barra de Meta Compartida */}
      <div className="mt-3.5">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-[#5B4E77]">
            Pozo Recaudado:{' '}
            <strong className="text-sm font-black text-[#047857] tabular-nums">
              {formatCLP(totalCollected)}
            </strong>{' '}
            <span className="text-[#7E7199] tabular-nums">
              / Meta {formatCLP(mission.max_budget)}
            </span>
          </span>
          <span
            className={`font-black tabular-nums ${
              totalCollected >= mission.max_budget ? 'text-[#047857]' : 'text-[#EA580C]'
            }`}
          >
            {progressPct}% {totalCollected >= mission.max_budget ? '¡Meta Lista! 🎉' : ''}
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-[#F3ECF9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#D946EF] to-[#00C853]"
          />
        </div>
      </div>

      {/* Miembros conectados */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {members.map((m) => {
          const votedBid = missionBids.find((b) => b.id === m.voted_bid_id);
          const isSelected = currentMember?.id === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectGuestId(m.id)}
              className={`flex items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-left transition ${
                isSelected
                  ? 'border-[#7C3AED] bg-[#F5F0FF] text-[#3B0764]'
                  : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#5B4E77] hover:border-[#DDD6FE]'
              }`}
            >
              <span className="text-sm">{m.avatar_emoji}</span>
              <div>
                <p className="text-[11px] font-extrabold leading-none">{m.guest_name}</p>
                <p className="mt-0.5 text-[10px] font-bold text-[#047857] tabular-nums">
                  {formatCLP(m.contribution_amount)}
                  {votedBid ? ` · Votó ${votedBid.provider_avatar}` : ''}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F3EEF8] pt-3">
        {currentMember && (
          <button
            type="button"
            onClick={() =>
              joinOrContributePool(
                mission.id,
                currentMember.guest_name,
                currentMember.avatar_emoji,
                3000,
                currentMember.id
              )
            }
            className="inline-flex items-center gap-1 rounded-full bg-[#E6F9EE] border border-[#86EFAC] px-3 py-1.5 text-xs font-extrabold text-[#047857] tabular-nums"
          >
            <Plus className="h-3.5 w-3.5" /> +$3.000 ({currentMember.guest_name.split(' ')[0]})
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowJoinForm((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs font-extrabold text-[#6D28D9]"
        >
          <UserPlus className="h-3.5 w-3.5" /> Unirme como Invitado
        </button>

        <button
          type="button"
          onClick={() => simulateFriendContribution(mission.id)}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#FFF0E5] px-3 py-1.5 text-[11px] font-extrabold text-[#C2410C]"
        >
          <Sparkles className="h-3.5 w-3.5" /> Simular Amigo +Voto
        </button>
      </div>

      {showJoinForm && (
        <form
          onSubmit={handleGuestSubmit}
          className="mt-3 flex flex-col gap-2 rounded-2xl border border-[#DDD6FE] bg-[#FAF7FF] p-3 sm:flex-row sm:items-center"
        >
          <div className="flex gap-1">
            {GUEST_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setGuestEmoji(em)}
                className={`h-7 w-7 rounded-lg text-sm ${
                  guestEmoji === em
                    ? 'bg-[#7C3AED] text-white ring-2 ring-[#C084FC]'
                    : 'bg-white border border-[#EFEAF6]'
                }`}
              >
                {em}
              </button>
            ))}
          </div>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Tu nombre o apodo..."
            className="flex-1 rounded-xl border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs text-[#2E1065] focus:border-[#7C3AED] focus:outline-none"
          />
          <input
            type="number"
            min={1000}
            step={500}
            value={addAmount}
            onChange={(e) => setAddAmount(Number(e.target.value))}
            className="w-24 rounded-xl border border-[#DDD6FE] bg-white px-2.5 py-1.5 text-xs font-extrabold text-[#047857] tabular-nums"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-3.5 py-1.5 text-xs font-extrabold text-white"
          >
            Entrar
          </button>
        </form>
      )}
    </div>
  );
}
