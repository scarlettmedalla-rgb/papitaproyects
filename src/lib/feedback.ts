'use client';

let soundEnabled = true;
let audioCtx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !soundEnabled) return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function triggerHaptic(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    switch (pattern) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(28);
        break;
      case 'heavy':
        navigator.vibrate([45, 30, 45]);
        break;
      case 'success':
        navigator.vibrate([20, 40, 65]);
        break;
      case 'warning':
        navigator.vibrate([50, 40, 50, 40, 80]);
        break;
    }
  } catch {
    // Ignore vibration errors on unsupported browsers
  }
}

function playTone(freq: number, durationSec: number, delaySec = 0, type: OscillatorType = 'sine', gainPeak = 0.08) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  } catch {
    // Ignore audio context autoplay blocks
  }
}

export function playBidChime() {
  triggerHaptic('light');
  playTone(587.33, 0.12, 0, 'triangle', 0.07);
  playTone(880, 0.18, 0.09, 'triangle', 0.08);
}

export function playRadarPing() {
  triggerHaptic('medium');
  playTone(659.25, 0.11, 0, 'sine', 0.08);
  playTone(987.77, 0.14, 0.1, 'sine', 0.09);
  playTone(1318.51, 0.22, 0.2, 'sine', 0.07);
}

export function playOutbidAlert() {
  triggerHaptic('warning');
  playTone(440, 0.14, 0, 'sawtooth', 0.05);
  playTone(349.23, 0.22, 0.12, 'sawtooth', 0.05);
}

export function playExtraTimeSiren() {
  triggerHaptic('heavy');
  playTone(523.25, 0.12, 0, 'triangle', 0.09);
  playTone(659.25, 0.12, 0.1, 'triangle', 0.09);
  playTone(783.99, 0.12, 0.2, 'triangle', 0.09);
  playTone(1046.5, 0.28, 0.3, 'triangle', 0.1);
}

export function playVictoryFanfare() {
  triggerHaptic('success');
  playTone(523.25, 0.14, 0, 'triangle', 0.09);
  playTone(659.25, 0.14, 0.11, 'triangle', 0.09);
  playTone(783.99, 0.14, 0.22, 'triangle', 0.09);
  playTone(1046.5, 0.38, 0.33, 'sine', 0.11);
}
