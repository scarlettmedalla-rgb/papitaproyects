'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, ChevronsRight, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '@/lib/feedback';

interface SlideToAcceptProps {
  label: string;
  sublabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
}

export function SlideToAccept({
  label,
  sublabel,
  onConfirm,
  disabled = false,
}: SlideToAcceptProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const x = useMotionValue(0);

  const progressOpacity = useTransform(x, [0, 180], [0.22, 0.95]);
  const textOpacity = useTransform(x, [0, 130], [1, 0.08]);

  const handleDragEnd = () => {
    if (disabled || confirmed) return;
    const width = containerRef.current?.offsetWidth ?? 280;
    const maxDrag = Math.max(120, width - 64);
    if (x.get() >= maxDrag * 0.72) {
      setConfirmed(true);
      triggerHaptic('success');
      x.set(maxDrag);
      window.setTimeout(() => {
        onConfirm();
      }, 180);
    } else {
      triggerHaptic('light');
      x.set(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative h-14 w-full select-none overflow-hidden rounded-2xl border transition-colors ${
        disabled
          ? 'border-purple-100 bg-[#F8F5FC] opacity-50'
          : confirmed
          ? 'border-[#00C853] bg-[#E6F9EE]'
          : 'border-[#DDD6FE] bg-[#FAF7FF] hover:border-[#C084FC]'
      }`}
    >
      {/* Relleno suave Sunset / Mint */}
      <motion.div
        style={{ opacity: progressOpacity }}
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#00C853]/25 via-[#D946EF]/15 to-transparent"
      />

      {/* Texto guía central */}
      <motion.div
        style={{ opacity: confirmed ? 1 : textOpacity }}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-14 text-center"
      >
        {confirmed ? (
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#047857]">
            <ShieldCheck className="h-4 w-4" />
            ¡Escudo AlToque Activado! Abriendo sala…
          </span>
        ) : (
          <>
            <span className="truncate max-w-full text-xs font-extrabold uppercase tracking-wide text-[#5B21B6] sm:text-sm">
              {label}
            </span>
            {sublabel && (
              <span className="truncate max-w-full text-[11px] font-medium text-[#6B5B8C] tabular-nums">
                {sublabel}
              </span>
            )}
          </>
        )}
      </motion.div>

      {/* Botón táctil deslizable */}
      {!disabled && (
        <motion.button
          type="button"
          aria-label={label}
          drag={confirmed ? false : 'x'}
          dragConstraints={containerRef}
          dragElastic={0.04}
          dragMomentum={false}
          style={{ x }}
          onDragStart={() => triggerHaptic('light')}
          onDragEnd={handleDragEnd}
          onDoubleClick={() => {
            if (!confirmed && !disabled) {
              setConfirmed(true);
              triggerHaptic('success');
              onConfirm();
            }
          }}
          title="Desliza hacia la derecha (o doble clic) para confirmar"
          className="relative z-10 m-1.5 flex h-11 w-12 cursor-grab items-center justify-center rounded-xl bg-gradient-to-br from-[#00C853] to-[#059669] text-white shadow-md shadow-[#00C853]/30 active:cursor-grabbing"
        >
          {confirmed ? (
            <Check className="h-5 w-5 stroke-[2.8]" />
          ) : (
            <ChevronsRight className="h-5 w-5 stroke-[2.6] animate-pulse" />
          )}
        </motion.button>
      )}
    </div>
  );
}
