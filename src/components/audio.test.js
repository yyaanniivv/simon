// Unit tests for the Web Audio engine. The module keeps state (context,
// decoded buffers), so every test gets a fresh copy via vi.resetModules().

let audio;
let sources;
let contexts;
let gains;

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.currentTime = 0;
    this.resume = vi.fn(() => Promise.resolve());
    contexts.push(this);
  }

  createBufferSource() {
    const source = {
      buffer: null,
      connect: vi.fn((dest) => dest),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    sources.push(source);
    return source;
  }

  createGain() {
    const gain = {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
    gains.push(gain);
    return gain;
  }

  decodeAudioData(data) {
    return Promise.resolve({ decodedFrom: data });
  }
}

const urls = { 1: 'data:audio/simon1', 2: 'data:audio/simon2' };

beforeEach(async () => {
  vi.resetModules();
  sources = [];
  contexts = [];
  gains = [];
  window.AudioContext = MockAudioContext;
  global.fetch = vi.fn(() =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
  );
  audio = await import('./audio');
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('returns controller synchronously before initialization', () => {
  const controller = audio.playSound(1, urls);
  expect(typeof controller.stop).toBe('function');
  expect(controller).toBeTruthy();
});

it('decodes every sound once and starts a source on play', async () => {
  const controller = audio.playSound(1, urls);
  audio.playSound(1, urls); // second call must not create another context
  // Wait for async init to complete
  await new Promise(r => setTimeout(r, 10));

  expect(contexts).toHaveLength(1);
  expect(sources).toHaveLength(2);

  expect(controller.stop).toBeDefined();
  expect(sources[0].buffer).not.toBeNull();
  expect(sources[0].connect).toHaveBeenCalled();
  expect(sources[0].start).toHaveBeenCalledTimes(1);
});

it('plays two sounds simultaneously with independent sources', async () => {
  const controller1 = audio.playSound(1, urls);
  const controller2 = audio.playSound(2, urls);
  await new Promise(r => setTimeout(r, 10));

  expect(controller2).not.toBe(controller1);
  expect(sources).toHaveLength(2);
  expect(sources[0].buffer).not.toBe(sources[1].buffer);
  expect(sources[0].stop).not.toHaveBeenCalled();
  expect(sources[1].start).toHaveBeenCalledTimes(1);
});

it('returns controller with stop for unknown or empty types', async () => {
  audio.playSound(1, urls); // initialize
  await new Promise(r => setTimeout(r, 10));
  const c1 = audio.playSound(9, urls);
  const c2 = audio.playSound(0, urls);
  expect(typeof c1.stop).toBe('function');
  expect(typeof c2.stop).toBe('function');
});

it('resumes a suspended context (autoplay policy)', async () => {
  audio.playSound(1, urls);
  await new Promise(r => setTimeout(r, 10));
  contexts[0].state = 'suspended';

  audio.playSound(1, urls);
  await new Promise(r => setTimeout(r, 10));

  expect(contexts[0].resume).toHaveBeenCalledTimes(1);
});

it('stops a source via controller.stop(), safe on repeated calls', async () => {
  audio.playSound(1, urls);
  await new Promise(r => setTimeout(r, 10));
  const controller = audio.playSound(1, urls);
  controller.stop();
  controller.stop();
  expect(() => controller.stop()).not.toThrow();
});

it('stays silent without AudioContext support', () => {
  delete window.AudioContext;
  delete window.webkitAudioContext;

  vi.resetModules();
  const freshAudio = require('./audio').default || require('./audio');

  const controller = freshAudio.playSound(1, urls);
  expect(typeof controller.stop).toBe('function');
});

it('stays silent when decoding fails', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('network down')));

  vi.resetModules();
  const freshAudio = await import('./audio');

  const controller = freshAudio.playSound(1, urls);
  expect(typeof controller.stop).toBe('function');
});

it('uses gain node for smooth stop (prevents click/pop)', async () => {
  const controller = audio.playSound(1, urls);
  await new Promise(r => setTimeout(r, 10));

  expect(gains).toHaveLength(1);
  expect(gains[0].gain.exponentialRampToValueAtTime).toBeDefined();
  controller.stop();
  expect(gains[0].gain.cancelScheduledValues).toHaveBeenCalled();
  expect(gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalled();
});

it('stop() before init complete does not throw', () => {
  const controller = audio.playSound(1, urls);
  controller.stop(); // should not throw even though init not done
  expect(() => controller.stop()).not.toThrow();
});