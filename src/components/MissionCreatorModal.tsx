'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  LocateFixed,
  Mic,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP, CategoryId, MissionMode } from '@/types/domain';
import {
  formatCLP,
  getFairPriceAdvice,
  parseVoiceTranscriptToMission,
} from '@/lib/geo-and-pricing';
import { useAuction } from '@/context/AuctionContext';
import { triggerHaptic } from '@/lib/feedback';

interface MissionCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (missionId: string) => void;
}

const VOICE_PRESETS = [
  {
    label: '🍔 Cena amigos (Vaquita)',
    transcript:
      'Necesito 4 hamburguesas smash dobles con papas cheddar y bebidas frías para compartir con amigos en grupo ahora rápido, pagamos hasta 29 mil',
  },
  {
    label: '🔧 Fuga urgente cocina',
    transcript:
      'Urgente necesito un gasfitero hoy porque tengo una fuga de agua debajo del lavaplatos con garantía, presupuesto 34 mil',
  },
  {
    label: '💊 Botiquín express',
    transcript:
      'Necesito rápido de farmacia kit antigripal adulto, paracetamol y termómetro digital express por 15 mil',
  },
];

function createSampleSvgDataUrl(title: string, emoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7C3AED"/>
        <stop offset="55%" stop-color="#D946EF"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" rx="28" fill="url(#bg)"/>
    <circle cx="320" cy="145" r="58" fill="rgba(255,255,255,0.22)"/>
    <text x="320" y="166" font-size="64" text-anchor="middle">${emoji}</text>
    <text x="320" y="255" font-family="sans-serif" font-weight="bold" font-size="24" fill="#FFFFFF" text-anchor="middle">${title}</text>
    <text x="320" y="290" font-family="sans-serif" font-size="15" fill="#FDF4FF" text-anchor="middle">Referencia adjunta · AlToque</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function MissionCreatorModal({
  isOpen,
  onClose,
  onCreated,
}: MissionCreatorModalProps) {
  const { user, createMission, updateUserLocation } = useAuction();

  const [category, setCategory] = useState<CategoryId>('comida');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgencyTags, setUrgencyTags] = useState<string[]>(['Caliente recién hecho']);
  const [mode, setMode] = useState<MissionMode>('flash');
  const [scheduledMinutes, setScheduledMinutes] = useState<number>(45);
  const [turboDemoClock, setTurboDemoClock] = useState<boolean>(false);
  const [maxBudget, setMaxBudget] = useState<number>(18500);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    user.saved_addresses[0]?.id || 'addr-1'
  );
  const [isGroupPool, setIsGroupPool] = useState<boolean>(false);
  const [hostContribution, setHostContribution] = useState<number>(8000);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedAddress = useMemo(
    () =>
      user.saved_addresses.find((a) => a.id === selectedAddressId) ||
      user.saved_addresses[0],
    [selectedAddressId, user.saved_addresses]
  );

  const fairPrice = useMemo(
    () => getFairPriceAdvice(category, mode, urgencyTags.length, maxBudget),
    [category, mode, urgencyTags.length, maxBudget]
  );

  useEffect(() => {
    const def = CATEGORY_MAP[category];
    setMode(def.defaultMode);
    setMaxBudget(def.suggestedIdeal);
    setUrgencyTags([def.urgencySuggestions[0]]);
  }, [category]);

  const applyParsedVoice = (rawText: string) => {
    setVoiceTranscript(rawText);
    const parsed = parseVoiceTranscriptToMission(rawText);
    setCategory(parsed.category);
    setTitle(parsed.title);
    setDescription(parsed.description);
    setMode(parsed.mode);
    setMaxBudget(parsed.suggestedBudget);
    setUrgencyTags(parsed.urgencyTags);
    setIsGroupPool(parsed.isGroupPool);
    if (parsed.isGroupPool) {
      setHostContribution(Math.round(parsed.suggestedBudget * 0.35));
    }
    triggerHaptic('success');
  };

  const startVoiceCapture = () => {
    triggerHaptic('medium');
    setIsRecordingVoice(true);

    const SpeechRec =
      typeof window !== 'undefined'
        ? (
            window as unknown as {
              SpeechRecognition?: new () => unknown;
              webkitSpeechRecognition?: new () => unknown;
            }
          ).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => unknown })
            .webkitSpeechRecognition
        : undefined;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec() as {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onerror: () => void;
          onend: () => void;
          start: () => void;
          stop: () => void;
        };
        rec.lang = 'es-CL';
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (event) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          if (text.trim()) {
            applyParsedVoice(text);
          }
        };
        rec.onerror = () => setIsRecordingVoice(false);
        rec.onend = () => setIsRecordingVoice(false);
        recognitionRef.current = rec;
        rec.start();
        return;
      } catch {
        // Fallback below
      }
    }

    window.setTimeout(() => {
      setIsRecordingVoice(false);
      applyParsedVoice(VOICE_PRESETS[0].transcript);
    }, 1000);
  };

  const stopVoiceCapture = () => {
    setIsRecordingVoice(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
        triggerHaptic('light');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseCurrentGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setGpsLoading(true);
    triggerHaptic('light');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateUserLocation(
          pos.coords.latitude,
          pos.coords.longitude,
          'Ubicación GPS en Vivo'
        );
        setSelectedAddressId('addr-gps');
        setGpsLoading(false);
      },
      () => {
        updateUserLocation(-33.4372, -70.6506, 'Ubicación GPS Verificada (Providencia)');
        setSelectedAddressId('addr-gps');
        setGpsLoading(false);
      },
      { timeout: 5000 }
    );
  };

  const toggleUrgencyTag = (tag: string) => {
    triggerHaptic('light');
    setUrgencyTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catDef = CATEGORY_MAP[category];
    const finalTitle =
      title.trim() || `${catDef.name}: Pedido en ${selectedAddress?.label || 'mi zona'}`;
    const finalDesc =
      description.trim() ||
      `Solicito propuestas verificadas con disponibilidad rápida para ${catDef.name.toLowerCase()}.`;

    const durationSeconds =
      mode === 'flash'
        ? turboDemoClock
          ? 45
          : 300
        : scheduledMinutes * 60;

    const created = createMission({
      title: finalTitle,
      description: finalDesc,
      category,
      urgency_tags: urgencyTags,
      media_url: mediaUrl,
      address_label: selectedAddress
        ? `${selectedAddress.label} (${selectedAddress.street})`
        : 'Ubicación GPS actual',
      mode,
      duration_seconds: durationSeconds,
      max_budget: maxBudget,
      lat: selectedAddress?.lat ?? -33.4372,
      lng: selectedAddress?.lng ?? -70.6506,
      is_group_pool: isGroupPool,
      host_initial_contribution: isGroupPool ? hostContribution : undefined,
    });

    onCreated?.(created.id);
    onClose();
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
            initial={{ y: 60, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[32px] border border-[#EDE5FA] bg-[#FAF9F6] shadow-2xl sm:rounded-[32px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EFEAF6] bg-white px-5 py-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8FF] px-3 py-0.5 text-[11px] font-extrabold text-[#7C3AED]">
                  <Sparkles className="h-3 w-3" /> Creación Multimodal AlToque
                </span>
                <h2 className="mt-1 text-lg font-black text-[#3B0764]">
                  Publicar Nueva Misión en Vivo
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[#EFEAF6] bg-[#FAF9F6] p-2 text-[#5B4E77] hover:bg-[#F3E8FF] hover:text-[#3B0764]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-5">
              {/* 1. Dictado por Voz */}
              <div className="altoque-card rounded-3xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#7C3AED]">
                      Dictado Inteligente por Voz
                    </p>
                    <p className="text-xs text-[#5B4E77]">
                      Mantén presionado para hablar y autocompletar tu pedido.
                    </p>
                  </div>
                  <button
                    type="button"
                    onMouseDown={startVoiceCapture}
                    onMouseUp={stopVoiceCapture}
                    onTouchStart={startVoiceCapture}
                    onTouchEnd={stopVoiceCapture}
                    className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition ${
                      isRecordingVoice
                        ? 'animate-pulse bg-[#E11D48]'
                        : 'bg-gradient-to-r from-[#7C3AED] via-[#D946EF] to-[#F97316]'
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                    {isRecordingVoice ? 'Escuchando… Suelta al terminar' : 'Mantén para Hablar'}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {VOICE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyParsedVoice(preset.transcript)}
                      className="rounded-full border border-[#E5DEEF] bg-[#FAF7FF] px-3 py-1 text-[11px] font-bold text-[#5B21B6] hover:bg-[#F3E8FF]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {voiceTranscript && (
                  <p className="mt-2.5 rounded-2xl border border-[#86EFAC] bg-[#E6F9EE] px-3 py-2 text-xs font-semibold text-[#065F46]">
                    🎙️ Transcripción: <span className="italic">&ldquo;{voiceTranscript}&rdquo;</span>
                  </p>
                )}
              </div>

              {/* 2. Categorías */}
              <div>
                <label className="mb-2 block text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                  Categoría
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setCategory(cat.id);
                        }}
                        className={`flex flex-col items-center rounded-2xl border p-2.5 text-center transition ${
                          active
                            ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#3B0764] shadow-sm'
                            : 'border-[#EFEAF6] bg-white text-[#5B4E77] hover:border-[#DDD6FE]'
                        }`}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="mt-1 text-[11px] font-extrabold leading-tight">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Título, Descripción y Foto */}
              <div className="altoque-card space-y-3 rounded-3xl p-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={`Ej: ${CATEGORY_MAP[category].name} al toque`}
                  className="w-full rounded-2xl border border-[#E5DEEF] bg-[#FAF9F6] px-3.5 py-2.5 text-sm font-bold text-[#2E1065] placeholder-[#9A8EB5] focus:border-[#7C3AED] focus:bg-white focus:outline-none"
                />
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={CATEGORY_MAP[category].placeholder}
                  className="w-full rounded-2xl border border-[#E5DEEF] bg-[#FAF9F6] px-3.5 py-2 text-sm text-[#4A3E63] placeholder-[#9A8EB5] focus:border-[#7C3AED] focus:bg-white focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_MAP[category].urgencySuggestions.map((tag) => {
                    const selected = urgencyTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleUrgencyTag(tag)}
                        className={`rounded-full border px-3 py-1 text-[11px] font-extrabold transition ${
                          selected
                            ? 'border-[#FDBA74] bg-[#FFF0E5] text-[#C2410C]'
                            : 'border-[#EFEAF6] bg-[#FAF9F6] text-[#6B5B8C]'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Foto nativa */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F3EEF8] pt-3">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#4A3E63]">
                    <Camera className="h-4 w-4 text-[#D946EF]" />
                    Foto de referencia
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-full border border-[#DDD6FE] bg-[#FAF7FF] px-3 py-1 text-[11px] font-extrabold text-[#6D28D9]"
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Cámara / Galería
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMediaUrl(
                          createSampleSvgDataUrl(
                            `${CATEGORY_MAP[category].name}`,
                            CATEGORY_MAP[category].emoji
                          )
                        )
                      }
                      className="rounded-full bg-[#FFF0E5] px-3 py-1 text-[11px] font-extrabold text-[#C2410C]"
                    >
                      Foto Demo
                    </button>
                  </div>
                </div>

                {mediaUrl && (
                  <div className="relative overflow-hidden rounded-2xl border border-[#DDD6FE]">
                    <img src={mediaUrl} alt="Adjunto" className="h-28 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setMediaUrl(undefined)}
                      className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-[#E11D48] shadow"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Doble Velocidad de Reloj */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('flash')}
                  className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                    mode === 'flash'
                      ? 'border-[#F97316] bg-[#FFF0E5]'
                      : 'border-[#EFEAF6] bg-white'
                  }`}
                >
                  <span className="flex items-center gap-1 text-xs font-black text-[#C2410C]">
                    <Zap className="h-4 w-4" /> Relámpago (5 min)
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#5B4E77]">
                    Comida, delivery o compras inmediatas.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('scheduled')}
                  className={`flex flex-col rounded-2xl border p-3 text-left transition ${
                    mode === 'scheduled'
                      ? 'border-[#7C3AED] bg-[#F3E8FF]'
                      : 'border-[#EFEAF6] bg-white'
                  }`}
                >
                  <span className="flex items-center gap-1 text-xs font-black text-[#6D28D9]">
                    <Clock className="h-4 w-4" /> Programado (30–60m)
                  </span>
                  <span className="mt-0.5 text-[11px] text-[#5B4E77]">
                    Servicios técnicos a domicilio.
                  </span>
                </button>
              </div>

              {mode === 'flash' ? (
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-[#EFEAF6] bg-white px-3.5 py-2 text-xs font-semibold text-[#4A3E63]">
                  <span>⚡ Modo Demo Rápido (45s para probar cierre y +30s)</span>
                  <input
                    type="checkbox"
                    checked={turboDemoClock}
                    onChange={(e) => setTurboDemoClock(e.target.checked)}
                    className="h-4 w-4 accent-[#F97316]"
                  />
                </label>
              ) : (
                <div className="flex gap-2">
                  {[30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setScheduledMinutes(mins)}
                      className={`flex-1 rounded-xl border py-1.5 text-xs font-extrabold tabular-nums ${
                        scheduledMinutes === mins
                          ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#6D28D9]'
                          : 'border-[#EFEAF6] bg-white text-[#6B5B8C]'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              )}

              {/* 5. Presupuesto + Asistente de Precio Justo */}
              <div className="altoque-card rounded-3xl p-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                    Presupuesto Tope Cliente
                  </label>
                  <span className="text-xl font-black text-[#047857] tabular-nums">
                    {formatCLP(maxBudget)}
                  </span>
                </div>

                <input
                  type="range"
                  min={5000}
                  max={80000}
                  step={500}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="mt-3 w-full accent-[#7C3AED]"
                />

                <div
                  className={`mt-3 rounded-2xl border p-3 text-xs ${
                    fairPrice.status === 'low'
                      ? 'border-[#FDBA74] bg-[#FFF0E5] text-[#9A3412]'
                      : fairPrice.status === 'magnet'
                      ? 'border-[#86EFAC] bg-[#E6F9EE] text-[#065F46]'
                      : 'border-[#DDD6FE] bg-[#FAF7FF] text-[#5B21B6]'
                  }`}
                >
                  <p className="font-extrabold">💡 {fairPrice.statusLabel}</p>
                  <p className="mt-0.5 text-[11px] opacity-90">{fairPrice.explanation}</p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMaxBudget(fairPrice.min)}
                      className="flex-1 rounded-xl bg-white/80 py-1 text-[11px] font-extrabold tabular-nums shadow-sm"
                    >
                      Mín {formatCLP(fairPrice.min)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxBudget(fairPrice.ideal)}
                      className="flex-1 rounded-xl bg-[#7C3AED] py-1 text-[11px] font-extrabold text-white tabular-nums shadow-sm"
                    >
                      Ideal {formatCLP(fairPrice.ideal)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaxBudget(fairPrice.max)}
                      className="flex-1 rounded-xl bg-white/80 py-1 text-[11px] font-extrabold tabular-nums shadow-sm"
                    >
                      Imán {formatCLP(fairPrice.max)}
                    </button>
                  </div>
                </div>
              </div>

              {/* 6. GPS y Vaquita Grupal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#6B5B8C]">
                    Dirección de Entrega / Servicio
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-[#7C3AED]"
                  >
                    <LocateFixed className="h-3.5 w-3.5" />
                    {gpsLoading ? 'Sincronizando GPS…' : 'Usar mi GPS actual'}
                  </button>
                </div>
                <select
                  value={selectedAddressId}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5DEEF] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2E1065]"
                >
                  {user.saved_addresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      📍 {addr.label} — {addr.street}
                    </option>
                  ))}
                </select>

                <div className="altoque-card rounded-2xl p-3.5">
                  <label className="flex cursor-pointer items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F9EE] text-[#047857]">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#3B0764]">
                          Modo &ldquo;Vaquita Grupal&rdquo;
                        </p>
                        <p className="text-[11px] text-[#6B5B8C]">
                          Junta el pozo con amigos por QR y voten juntos.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isGroupPool}
                      onChange={(e) => setIsGroupPool(e.target.checked)}
                      className="h-5 w-5 accent-[#00C853]"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#D946EF] to-[#F97316] py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-[#D946EF]/30 transition hover:brightness-105"
              >
                <CheckCircle2 className="h-5 w-5" />
                Lanzar Subasta AlToque ({formatCLP(maxBudget)})
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
