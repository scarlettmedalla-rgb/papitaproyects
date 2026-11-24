'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Lock,
  MessageSquare,
  PackageCheck,
  QrCode,
  ScanLine,
  Send,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { BENEFIT_MAP, FulfillmentStatus, Order } from '@/types/domain';
import { useAuction } from '@/context/AuctionContext';
import { formatCLP } from '@/lib/geo-and-pricing';

interface EscrowOrderRoomProps {
  order: Order;
  onBack: () => void;
}

const STEPS: Array<{ id: FulfillmentStatus; label: string; icon: React.ReactNode }> = [
  { id: 'preparing', label: 'Preparando', icon: <PackageCheck className="h-4 w-4" /> },
  { id: 'on_the_way', label: 'En camino', icon: <Truck className="h-4 w-4" /> },
  { id: 'at_doorstep', label: 'En puerta', icon: <QrCode className="h-4 w-4" /> },
  { id: 'completed', label: 'QR Liberado', icon: <CheckCircle2 className="h-4 w-4" /> },
];

const QUICK_REVIEW_TAGS = [
  'Llegó rapidísimo',
  'Cumplió Cartas de Beneficio',
  'Excelente trato',
  'Calidad impecable',
  '100% Recomendado',
];

function createDeliverySampleSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    <rect width="600" height="340" rx="24" fill="url(#g)"/>
    <circle cx="300" cy="135" r="54" fill="rgba(255,255,255,0.22)"/>
    <text x="300" y="154" font-size="54" text-anchor="middle">📦</text>
    <text x="300" y="235" font-family="sans-serif" font-weight="bold" font-size="22" fill="#FFFFFF" text-anchor="middle">Pedido Verificado y Listo</text>
    <text x="300" y="268" font-family="sans-serif" font-size="14" fill="#FDF4FF" text-anchor="middle">Evidencia enviada en vivo · AlToque</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function EscrowOrderRoom({ order, onBack }: EscrowOrderRoomProps) {
  const {
    user,
    missions,
    allProviders,
    messages,
    reviews,
    updateOrderFulfillmentStatus,
    sendOrderMessage,
    verifyQrAndCompleteOrder,
    submitReview,
  } = useAuction();

  const mission = missions.find((m) => m.id === order.mission_id);
  const provider = allProviders.find((p) => p.user_id === order.provider_id);

  const orderMessages = useMemo(
    () => messages.filter((m) => m.order_id === order.id),
    [messages, order.id]
  );

  const existingReview = useMemo(
    () => reviews.find((r) => r.order_id === order.id),
    [reviews, order.id]
  );

  const [qrImage, setQrImage] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Llegó rapidísimo',
    'Cumplió Cartas de Beneficio',
  ]);
  const [reviewComment, setReviewComment] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    QRCode.toDataURL(order.qr_token, {
      width: 240,
      margin: 1,
      color: {
        dark: '#4C1D95',
        light: '#FFFFFF',
      },
    })
      .then(setQrImage)
      .catch(() => {});
  }, [order.qr_token]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const currentStepIdx = STEPS.findIndex((s) => s.id === order.fulfillment_status);

  const handleScanAndVerify = (tokenToVerify: string) => {
    const ok = verifyQrAndCompleteOrder(order.id, tokenToVerify);
    if (ok) {
      setScanError('');
      stopCameraScanner();
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } else {
      setScanError('Código QR no coincide. Verifica el código mostrado en pantalla.');
    }
  };

  const startCameraScanner = async () => {
    setScanError('');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setScanError('Cámara no disponible; usa el botón de Escaneo Instantáneo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setScanError('Sin acceso a cámara; puedes validar con Escaneo Instantáneo.');
    }
  };

  const stopCameraScanner = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendOrderMessage(order.id, chatInput);
    setChatInput('');
  };

  const handleChatPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        sendOrderMessage(order.id, 'Adjunto foto en vivo 📸', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    submitReview(order.id, stars, selectedTags, reviewComment);
  };

  return (
    <div className="space-y-4">
      {/* Cabecera Escudo Escrow */}
      <div className="altoque-card flex flex-wrap items-center justify-between gap-3 rounded-[28px] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-[#EFEAF6] bg-[#FAF9F6] p-2.5 text-[#3B0764] hover:bg-[#F3E8FF]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F9EE] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#047857]">
              <Lock className="h-3 w-3" /> Escudo Escrow AlToque
            </span>
            <h2 className="mt-1 text-base font-black text-[#3B0764]">
              {mission?.title || 'Sala de Ejecución'}
            </h2>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B5B8C]">
            {order.fulfillment_status === 'completed'
              ? 'Pago Liberado'
              : 'Retenido en Escrow'}
          </p>
          <p className="text-xl font-black text-[#047857] tabular-nums">
            {formatCLP(order.escrow_amount)}
          </p>
        </div>
      </div>

      {/* Stepper de Progreso */}
      <div className="altoque-card rounded-[28px] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-[#3B0764]">
            Progreso en Vivo · {provider?.avatar_emoji} {provider?.business_name}
          </p>
          {order.fulfillment_status !== 'completed' && (
            <div className="flex flex-wrap gap-1.5">
              {(['preparing', 'on_the_way', 'at_doorstep'] as FulfillmentStatus[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => updateOrderFulfillmentStatus(order.id, st)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                      order.fulfillment_status === st
                        ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#6D28D9]'
                        : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                    }`}
                  >
                    {st === 'preparing'
                      ? '1. Preparando'
                      : st === 'on_the_way'
                      ? '2. En camino'
                      : '3. En puerta'}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {STEPS.map((step, idx) => {
            const done = idx <= currentStepIdx;
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center rounded-2xl border p-2.5 text-center transition ${
                  done
                    ? 'border-[#86EFAC] bg-[#E6F9EE] text-[#047857]'
                    : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#9A8EB5]'
                }`}
              >
                {step.icon}
                <span className="mt-1 text-[10px] font-extrabold leading-tight">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {order.benefit_cards.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#F3EEF8] pt-3">
            <span className="text-[11px] font-bold text-[#6B5B8C]">
              Beneficios incluidos:
            </span>
            {order.benefit_cards.map((cid) => (
              <span
                key={cid}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold ${
                  BENEFIT_MAP[cid]?.accentClass || ''
                }`}
              >
                {BENEFIT_MAP[cid]?.emoji} {BENEFIT_MAP[cid]?.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Calificación Mutua al Completar */}
      {order.fulfillment_status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[28px] border border-[#86EFAC] bg-[#E6F9EE] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00C853] text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#065F46]">
                ¡Trato hecho! QR Validado y Pago Liberado
              </h3>
              <p className="text-xs font-semibold text-[#047857] tabular-nums">
                Toqui celebra tu cierre · {formatCLP(order.escrow_amount)} acreditados a {provider?.business_name}.
              </p>
            </div>
          </div>

          {existingReview ? (
            <div className="mt-4 rounded-2xl bg-white p-4">
              <p className="text-xs font-black text-[#D97706]">
                {'★'.repeat(existingReview.stars)} ¡Gracias por calificar!
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {existingReview.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-[#F3E8FF] px-2.5 py-0.5 text-[11px] font-bold text-[#6D28D9]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="mt-4 space-y-3 rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wider text-[#3B0764]">
                Califica tu experiencia
              </p>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setStars(n)}>
                    <Star
                      className={`h-8 w-8 ${
                        n <= stars
                          ? 'fill-[#F59E0B] text-[#F59E0B]'
                          : 'text-[#E5DEEF]'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {QUICK_REVIEW_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((x) => x !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${
                        active
                          ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#6D28D9]'
                          : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>

              <input
                type="text"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Comentario opcional..."
                className="w-full rounded-xl border border-[#E5DEEF] bg-[#FAF9F6] px-3.5 py-2 text-xs text-[#2E1065]"
              />

              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF] px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white"
              >
                Enviar Calificación
              </button>
            </form>
          )}
        </motion.div>
      )}

      {/* Chat + QR */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="altoque-card flex flex-col rounded-[28px] p-4 sm:p-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#F3EEF8] pb-3">
            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#3B0764]">
              <MessageSquare className="h-4 w-4 text-[#D946EF]" />
              Chat en Vivo
            </span>
            <button
              type="button"
              onClick={() =>
                sendOrderMessage(
                  order.id,
                  'Foto de avance verificada 📦',
                  createDeliverySampleSvg()
                )
              }
              className="rounded-full bg-[#FFF0E5] px-3 py-1 text-[11px] font-extrabold text-[#C2410C]"
            >
              + Foto Avance
            </button>
          </div>

          <div className="my-3 max-h-72 min-h-[190px] flex-1 space-y-2.5 overflow-y-auto pr-1">
            {orderMessages.map((msg) => {
              const isMine = msg.sender_role === user.role_active;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      isMine
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#D946EF] text-white'
                        : 'border border-[#EFEAF6] bg-[#FAF9F6] text-[#2E1065]'
                    }`}
                  >
                    <p className="mb-0.5 text-[10px] font-extrabold opacity-80">
                      {msg.sender_name}
                    </p>
                    {msg.content && <p>{msg.content}</p>}
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Adjunto"
                        className="mt-2 max-h-36 rounded-xl object-cover"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-1">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handleChatPhoto}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="rounded-2xl border border-[#E5DEEF] bg-[#FAF9F6] p-2.5 text-[#7C3AED]"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 rounded-2xl border border-[#E5DEEF] bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-[#2E1065] focus:border-[#7C3AED] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#D946EF] p-2.5 text-white"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Validación QR */}
        <div className="altoque-card rounded-[28px] p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[#7C3AED]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#3B0764]">
              Validación con Código QR
            </h3>
          </div>

          <div className="mt-3 flex flex-col items-center rounded-3xl border border-[#EDE5FA] bg-[#FAF7FF] p-4 text-center">
            <span className="text-[11px] font-semibold text-[#5B4E77]">
              Muestra o escanea este QR único al entregar:
            </span>
            {qrImage && (
              <img
                src={qrImage}
                alt="QR de liberación"
                className="mt-2.5 h-40 w-40 rounded-2xl border border-[#DDD6FE] bg-white p-2 shadow-sm"
              />
            )}
            <code className="mt-2 rounded-full bg-white border border-[#DDD6FE] px-3 py-1 text-xs font-extrabold text-[#6D28D9] tabular-nums">
              {order.qr_token}
            </code>
          </div>

          {order.fulfillment_status !== 'completed' && (
            <div className="mt-3 space-y-2">
              {cameraActive ? (
                <div className="space-y-2">
                  <video
                    ref={videoRef}
                    className="h-36 w-full rounded-2xl border border-[#7C3AED] bg-black object-cover"
                    muted
                    playsInline
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleScanAndVerify(order.qr_token)}
                      className="flex-1 rounded-full bg-[#00C853] py-2 text-xs font-black text-white"
                    >
                      Capturar QR
                    </button>
                    <button
                      type="button"
                      onClick={stopCameraScanner}
                      className="rounded-full border border-[#E5DEEF] bg-white px-3 py-2 text-xs font-bold text-[#5B4E77]"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleScanAndVerify(order.qr_token)}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#00C853] py-3 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-[#00C853]/25"
                  >
                    <ScanLine className="h-4 w-4" />
                    Escanear QR y Liberar Pago
                  </button>

                  <button
                    type="button"
                    onClick={startCameraScanner}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full border border-[#DDD6FE] bg-white py-2 text-xs font-extrabold text-[#5B21B6]"
                  >
                    <Camera className="h-3.5 w-3.5 text-[#D946EF]" />
                    Abrir Lector de Cámara
                  </button>
                </>
              )}

              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="Token QR manual..."
                  className="flex-1 rounded-full border border-[#E5DEEF] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#2E1065]"
                />
                <button
                  type="button"
                  onClick={() => handleScanAndVerify(manualTokenInput)}
                  className="rounded-full bg-[#F3E8FF] px-3.5 py-1.5 text-xs font-extrabold text-[#6D28D9]"
                >
                  Validar
                </button>
              </div>

              {scanError && (
                <p className="text-[11px] font-bold text-[#E11D48]">{scanError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
