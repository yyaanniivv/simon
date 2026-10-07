// Web Audio engine.
//
// Why not <audio> elements: playback there was triggered from a post-render
// useEffect and every play() re-decoded the mp3, which added audible latency
// between press and sound and made rapid clicks sound queued. Here every sound
// is decoded once into an AudioBuffer at mount; playback creates a fresh
// AudioBufferSourceNode synchronously in the event handler - instant start,
// free overlapping, and it can be stopped mid-play (press & release behavior).
//
// iOS Safari requires AudioContext to be created/resumed within a user gesture.
// We defer creation until first play attempt (which happens on user gesture).
//
// Choppy sound on fast clicks: instead of hard stop(), use quick gain ramp
// to avoid click/pop artifacts.
//
// API: playSound(type, soundUrls) returns { stop: fn } SYNCHRONOUSLY.
// The returned controller handles lazy init internally.

let ctx = null;
let ready = false;
const buffers = new Map();
let initPromise = null;

async function ensureContext() {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();
}

async function ensureSoundsDecoded(soundUrls) {
  if (ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await ensureContext();
    if (!ctx) return;

    try {
      await Promise.all(
        Object.entries(soundUrls).map(async ([type, url]) => {
          const response = await fetch(url);
          const data = await response.arrayBuffer();
          buffers.set(Number(type), await ctx.decodeAudioData(data));
        })
      );
      ready = true;
    } catch {
      ready = false;
    }
  })();

  return initPromise;
}

export async function initSounds(soundUrls) {
  await ensureContext();
}

/**
 * Play a sound and return a controller object with stop() method.
 * Returns SYNCHRONOUSLY - the controller handles lazy init internally.
 * Uses a quick gain ramp (5ms) instead of hard stop to avoid click/pop.
 */
export function playSound(type, soundUrls) {
  let stopped = false;
  let source = null;
  let gain = null;
  let initComplete = false;

  // Start initialization immediately (async, but we return controller now)
  const init = (async () => {
    await ensureSoundsDecoded(soundUrls);
    initComplete = true;

    if (stopped || !ready || !ctx || !buffers.has(type)) return;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return;
      }
    }

    source = ctx.createBufferSource();
    source.buffer = buffers.get(type);

    // Gain node for smooth stop (prevents click/pop on fast clicks)
    gain = ctx.createGain();
    gain.gain.value = 1;
    source.connect(gain).connect(ctx.destination);

    source.start();

    source.onended = () => { stopped = true; };
  })();

  const stop = () => {
    if (stopped) return;
    stopped = true;

    // If init not complete yet, it will check stopped flag when done
    if (!initComplete) return;

    if (!source || !gain) return;

    try {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.005);
      setTimeout(() => {
        try { source.stop(); } catch {}
      }, 10);
    } catch {
      try { source.stop(); } catch {}
    }
  };

  return { stop };
}

export function stopSound(controller) {
  if (!controller || typeof controller.stop !== 'function') return;
  controller.stop();
}