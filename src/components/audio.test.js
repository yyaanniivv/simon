// Unit tests for the Web Audio engine. The module keeps state (context,
// decoded buffers), so every test gets a fresh copy via vi.resetModules().

let audio;
let sources;
let contexts;

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.destination = { name: 'destination' };
    this.resume = vi.fn(() => Promise.resolve());
    contexts.push(this);
  }

  createBufferSource() {
    const source = {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    sources.push(source);
    return source;
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
  window.AudioContext = MockAudioContext;
  global.fetch = vi.fn(() =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) })
  );
  audio = await import('./audio');
});

afterEach(() => {
  vi.restoreAllMocks();
});

it('is silent before initialization', () => {
  expect(audio.playSound(1)).toBeNull();
});

it('decodes every sound once and starts a source on play', async () => {
  await audio.initSounds(urls);
  await audio.initSounds(urls); // second call must not create another context
  expect(contexts).toHaveLength(1);

  const source = audio.playSound(1);
  expect(source).not.toBeNull();
  expect(source.buffer).not.toBeNull();
  expect(source.connect).toHaveBeenCalledWith(contexts[0].destination);
  expect(source.start).toHaveBeenCalledTimes(1);
});

it('plays two sounds simultaneously with independent sources', async () => {
  await audio.initSounds(urls);

  const first = audio.playSound(1);
  const second = audio.playSound(2);

  expect(second).not.toBe(first);
  expect(first.buffer).not.toBe(second.buffer);
  expect(first.stop).not.toHaveBeenCalled(); // the first keeps playing
  expect(second.start).toHaveBeenCalledTimes(1);
});

it('returns null for unknown or empty types', async () => {
  await audio.initSounds(urls);
  expect(audio.playSound(9)).toBeNull();
  expect(audio.playSound(0)).toBeNull();
});

it('resumes a suspended context (autoplay policy)', async () => {
  await audio.initSounds(urls);
  contexts[0].state = 'suspended';

  audio.playSound(1);

  expect(contexts[0].resume).toHaveBeenCalledTimes(1);
});

it('stops a source, and is safe on null or repeated stops', async () => {
  await audio.initSounds(urls);
  const source = audio.playSound(1);
  source.stop
    .mockImplementationOnce(() => {})
    .mockImplementationOnce(() => {
      throw new Error('already stopped');
    });

  audio.stopSound(source);
  expect(() => audio.stopSound(source)).not.toThrow();
  expect(() => audio.stopSound(null)).not.toThrow();
});

it('stays silent without AudioContext support', async () => {
  delete window.AudioContext;
  delete window.webkitAudioContext;

  await audio.initSounds(urls);

  expect(contexts).toHaveLength(0);
  expect(audio.playSound(1)).toBeNull();
});

it('stays silent when decoding fails', async () => {
  global.fetch = vi.fn(() => Promise.reject(new Error('network down')));

  await audio.initSounds(urls);

  expect(audio.playSound(1)).toBeNull();
});
