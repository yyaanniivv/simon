// Web Audio engine.
//
// Why not <audio> elements: playback there was triggered from a post-render
// useEffect and every play() re-decoded the mp3, which added audible latency
// between press and sound and made rapid clicks sound queued. Here every sound
// is decoded once into an AudioBuffer at mount; playback creates a fresh
// AudioBufferSourceNode synchronously in the event handler - instant start,
// free overlapping, and it can be stopped mid-play (press & release behavior).

let ctx = null;
let ready = false;
const buffers = new Map();

export async function initSounds(soundUrls) {
  if (ctx) {
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    return; // ancient browser: the game still works, just silently
  }
  ctx = new AudioCtx();
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
    ready = false; // decode failed: stay silent rather than break the game
  }
}

export function playSound(type) {
  if (!ready || !type || !buffers.has(type)) {
    return null;
  }
  if (ctx.state === 'suspended') {
    // Autoplay policy: the context starts suspended until a user gesture.
    const resumed = ctx.resume();
    if (resumed && typeof resumed.catch === 'function') {
      resumed.catch(() => {});
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buffers.get(type);
  source.connect(ctx.destination);
  source.start();
  return source;
}

export function stopSound(source) {
  if (!source) {
    return;
  }
  try {
    source.stop();
  } catch {
    // already stopped or finished naturally - nothing to do
  }
}
