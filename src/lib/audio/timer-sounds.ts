// Pure Web Audio lib — no React, no external deps.
// All play* functions are best-effort: they never throw.

interface WindowWithWebkit extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// ---------- AudioContext singleton ----------

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;

  const win = window as WindowWithWebkit;
  const Ctor = window.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) return null;

  _ctx = new Ctor();
  return _ctx;
}

// Mobile browsers suspend the AudioContext until a user gesture has fired.
// The caller already clicked "Start", so resume() should unblock immediately.
function resumeCtx(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    // Fire-and-forget — we don't need to await it to schedule nodes.
    ctx.resume().catch(() => undefined);
  }
}

// ---------- Mute state ----------

const MUTE_KEY = "blackline:timer-sounds-muted";

let _muted = false;

// Read persisted preference at module load time (SSR-safe).
(() => {
  if (typeof window === "undefined") return;
  try {
    _muted = localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    // localStorage blocked (e.g. private mode with strict settings) — ignore.
  }
})();

export function setMuted(muted: boolean): void {
  _muted = muted;
  try {
    localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    // Silently ignore storage errors.
  }
}

export function isMuted(): boolean {
  return _muted;
}

// ---------- Low-level helpers ----------

// Build a gain node that ramps to silence at `endTime`.
// exponentialRampToValueAtTime requires a value > 0, so we ramp to 0.0001.
function makeGain(ctx: AudioContext, level: number, endTime: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(level, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  gain.connect(ctx.destination);
  return gain;
}

// Play a single sine tone. `start` is relative to ctx.currentTime.
function playTone(
  ctx: AudioContext,
  frequency: number,
  durationSec: number,
  gainLevel: number,
  startOffsetSec = 0,
): void {
  const start = ctx.currentTime + startOffsetSec;
  const end = start + durationSec;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);

  const gain = makeGain(ctx, gainLevel, end);
  osc.connect(gain);
  osc.start(start);
  osc.stop(end);
}

// Play a swept sine (frequency glides from `freqStart` to `freqEnd`).
function playSweep(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  gainLevel: number,
  startOffsetSec = 0,
): void {
  const start = ctx.currentTime + startOffsetSec;
  const end = start + durationSec;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freqStart, start);
  osc.frequency.linearRampToValueAtTime(freqEnd, end);

  const gain = makeGain(ctx, gainLevel, end);
  osc.connect(gain);
  osc.start(start);
  osc.stop(end);
}

// ---------- Public sound functions ----------

// Short beep for the 3-2-1 countdown seconds.
export function playTick(): void {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx(ctx);
  try {
    playTone(ctx, 1200, 0.05, 0.25);
  } catch {
    // Best-effort.
  }
}

// Ascending sweep for the "GO!" moment — longer and more prominent than a tick.
export function playGo(): void {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx(ctx);
  try {
    playSweep(ctx, 880, 1320, 0.3, 0.4);
  } catch {
    // Best-effort.
  }
}

// Two sequential beeps when rest countdown reaches zero.
export function playRestEnd(): void {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx(ctx);
  try {
    // First beep at 660 Hz, second at 880 Hz, separated by 60 ms.
    playTone(ctx, 660, 0.2, 0.35, 0);
    playTone(ctx, 880, 0.2, 0.35, 0.26); // 200ms + 60ms gap
  } catch {
    // Best-effort.
  }
}

// Short ascending 3-note arpeggio (C5 → E5 → G5) for routine completion.
// Notes overlap slightly (spaced 200 ms apart, each 200 ms long) for a warmer feel.
export function playRoutineComplete(): void {
  if (_muted) return;
  const ctx = getCtx();
  if (!ctx) return;
  resumeCtx(ctx);
  try {
    playTone(ctx, 523, 0.2, 0.35, 0);      // C5
    playTone(ctx, 659, 0.2, 0.35, 0.2);    // E5
    playTone(ctx, 784, 0.25, 0.35, 0.4);   // G5 — slightly longer tail
  } catch {
    // Best-effort.
  }
}

// ---------- Vibration helper ----------

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate(pattern);
  } catch {
    // navigator.vibrate may be absent or blocked — silently ignore.
  }
}
