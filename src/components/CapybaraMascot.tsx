'use client';

import React from 'react';

interface CapybaraMascotProps {
  variant?: 'peeking' | 'pointing';
  className?: string;
}

export function CapybaraMascot({
  variant = 'pointing',
  className = '',
}: CapybaraMascotProps) {
  if (variant === 'peeking') {
    return (
      <svg
        viewBox="0 0 120 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Mascota Carpincho AlToque"
      >
        {/* Orejitas redondeadas */}
        <ellipse cx="38" cy="20" rx="9" ry="11" transform="rotate(-18 38 20)" fill="#8B5733" stroke="#4A2B16" strokeWidth="3.2" />
        <ellipse cx="86" cy="18" rx="9" ry="11" transform="rotate(16 86 18)" fill="#8B5733" stroke="#4A2B16" strokeWidth="3.2" />
        <ellipse cx="85" cy="19" rx="4.5" ry="6" transform="rotate(16 85 19)" fill="#6E4124" />

        {/* Cuerpo y cabeza gordita sin ropa */}
        <path
          d="M24 78C24 44 35 16 62 16C89 16 98 43 99 78H24Z"
          fill="#B98055"
          stroke="#4A2B16"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />

        {/* Hocico característico de carpincho */}
        <rect
          x="28"
          y="29"
          width="34"
          height="28"
          rx="14"
          fill="#8E5835"
          stroke="#4A2B16"
          strokeWidth="3"
        />
        {/* Fosas nasales y sonrisa tierna */}
        <ellipse cx="38" cy="39" rx="2.4" ry="3.2" fill="#3B2110" />
        <ellipse cx="49" cy="39" rx="2.4" ry="3.2" fill="#3B2110" />
        <path d="M43.5 43V49" stroke="#3B2110" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M38 49.5C40.5 52 46.5 52 49 49.5" stroke="#3B2110" strokeWidth="2.6" strokeLinecap="round" />

        {/* Ojito amigable y mejilla cálida */}
        <ellipse cx="72" cy="34" rx="4.2" ry="4.8" fill="#2D190C" />
        <circle cx="73.4" cy="32.4" r="1.5" fill="#FFFFFF" />
        <ellipse cx="76" cy="44" rx="5.5" ry="3" fill="#E88D72" opacity="0.55" />

        {/* Patitas apoyadas asomándose */}
        <ellipse cx="30" cy="76" rx="11" ry="7.5" fill="#9E6740" stroke="#4A2B16" strokeWidth="3.2" />
        <ellipse cx="84" cy="76" rx="11" ry="7.5" fill="#9E6740" stroke="#4A2B16" strokeWidth="3.2" />
      </svg>
    );
  }

  // Variant: 'pointing' — Carpincho bípedo gordito en forma de pera señalando la burbuja de tip
  return (
    <svg
      viewBox="0 0 128 136"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mascota Carpincho AlToque dando un consejo"
    >
      {/* Sombra suave en el suelo */}
      <ellipse cx="56" cy="128" rx="34" ry="6" fill="#7C3AED" opacity="0.1" />

      {/* Orejitas */}
      <ellipse cx="32" cy="22" rx="8.5" ry="10.5" transform="rotate(-20 32 22)" fill="#8B5733" stroke="#4A2B16" strokeWidth="3.2" />
      <ellipse cx="72" cy="19" rx="8.5" ry="10.5" transform="rotate(14 72 19)" fill="#8B5733" stroke="#4A2B16" strokeWidth="3.2" />

      {/* Bracito derecho extendido apuntando al consejo */}
      <path
        d="M80 74C92 71 103 65 111 59C115 56 120 60 117 65C112 73 99 82 84 86Z"
        fill="#AC7349"
        stroke="#4A2B16"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Cuerpo gordito en forma de pera sobre patitas cortas */}
      <path
        d="M30 56C22 73 20 96 26 112C31 123 42 125 56 125C70 125 83 122 87 110C92 94 87 72 78 56C72 46 36 46 30 56Z"
        fill="#B98055"
        stroke="#4A2B16"
        strokeWidth="3.4"
      />

      {/* Pancita suave más clara */}
      <ellipse cx="58" cy="94" rx="20" ry="23" fill="#CFA07A" opacity="0.65" />

      {/* Patitas cortas inferiores */}
      <ellipse cx="40" cy="123" rx="11" ry="6.5" fill="#8E5835" stroke="#4A2B16" strokeWidth="3.2" />
      <ellipse cx="72" cy="123" rx="11" ry="6.5" fill="#8E5835" stroke="#4A2B16" strokeWidth="3.2" />

      {/* Bracito izquierdo descansando */}
      <path
        d="M30 72C22 80 21 92 28 97C33 100 39 95 38 87"
        fill="#AC7349"
        stroke="#4A2B16"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Cabeza redondeada */}
      <path
        d="M27 40C27 23 40 14 58 14C77 14 89 25 89 41C89 56 77 64 58 64C39 64 27 55 27 40Z"
        fill="#BE865B"
        stroke="#4A2B16"
        strokeWidth="3.4"
      />

      {/* Hocico grande mirando hacia la derecha */}
      <rect
        x="56"
        y="26"
        width="34"
        height="27"
        rx="13.5"
        fill="#8E5835"
        stroke="#4A2B16"
        strokeWidth="3"
      />
      <ellipse cx="68" cy="35.5" rx="2.3" ry="3.1" fill="#3B2110" />
      <ellipse cx="79" cy="35.5" rx="2.3" ry="3.1" fill="#3B2110" />
      <path d="M73.5 39.5V45" stroke="#3B2110" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M68 45.5C71 48.2 76.5 48.2 79.5 45.5" stroke="#3B2110" strokeWidth="2.5" strokeLinecap="round" />

      {/* Ojito tierno y mejilla */}
      <ellipse cx="46" cy="33" rx="4.2" ry="4.8" fill="#2D190C" />
      <circle cx="47.4" cy="31.3" r="1.5" fill="#FFFFFF" />
      <ellipse cx="42" cy="43" rx="5.5" ry="3" fill="#E88D72" opacity="0.6" />
    </svg>
  );
}
