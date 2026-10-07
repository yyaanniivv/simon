import { describe, it, expect, vi } from 'vitest';
import {
  reducer,
  initialState,
  timer,
  timerSimon,
  timerChangePlayerTurn,
  randomMove,
  USER,
  SIMON,
  FAILURE,
} from './gameReducer';

describe('gameReducer (pure game logic)', () => {
  const gameInProgress = {
    topScore: 2,
    player: USER,
    userScore: 1,
    simonClicks: [1, 2, 3],
  };

  it('advances the score on a correct click', () => {
    const next = reducer(gameInProgress, { type: 'userClick', payload: { index: 2 } });
    expect(next.userScore).toBe(2);
    expect(next.player).toBe(USER);
    expect(next.simonClicks).toEqual([1, 2, 3]);
  });

  it('fails, clears the round and records the high score on a wrong click', () => {
    const next = reducer(gameInProgress, { type: 'userClick', payload: { index: 4 } });
    expect(next.player).toBe(FAILURE);
    expect(next.userScore).toBe(0);
    expect(next.simonClicks).toEqual([]);
    // completed rounds = simonClicks.length - 1 = 2, ties existing topScore
    expect(next.topScore).toBe(2);
  });

  it('raises the high score but never lowers it', () => {
    const deepRun = { ...gameInProgress, topScore: 0, simonClicks: [1, 2, 3, 4, 5] };
    const next = reducer(deepRun, { type: 'userClick', payload: { index: 9 } });
    expect(next.topScore).toBe(4);
  });

  it('setSimonClicks hands the turn to simon, setUserScore to the user', () => {
    expect(reducer(initialState, { type: 'setSimonClicks', payload: [1] }).player).toBe(SIMON);
    expect(reducer(initialState, { type: 'setUserScore', payload: 0 }).player).toBe(USER);
  });

  it('throws on an undefined action', () => {
    expect(() => reducer(initialState, { type: 'nope' })).toThrow('Undefined action');
  });

  it('exports timer constants', () => {
    expect(timer).toBe(200);
    expect(timerSimon).toBe(450);
    expect(timerChangePlayerTurn).toBe(600);
  });

  it('exports player constants', () => {
    expect(USER).toBe('user');
    expect(SIMON).toBe('simon');
    expect(FAILURE).toBe('failure');
  });

  it('initialState has expected defaults', () => {
    expect(initialState).toEqual({ topScore: 0, player: SIMON, userScore: 0, simonClicks: [] });
  });
});

describe('randomMove (sequence generation)', () => {
  it('returns a number between 1 and 4 inclusive', () => {
    // Test many times to catch edge cases
    for (let i = 0; i < 1000; i++) {
      const move = randomMove();
      expect(move).toBeGreaterThanOrEqual(1);
      expect(move).toBeLessThanOrEqual(4);
      expect(Number.isInteger(move)).toBe(true);
    }
  });

  it('produces different values over many calls (not stuck on one value)', () => {
    const moves = new Set();
    for (let i = 0; i < 100; i++) {
      moves.add(randomMove());
    }
    // Should see at least 3 different values in 100 calls (extremely unlikely to fail)
    expect(moves.size).toBeGreaterThanOrEqual(3);
  });

  it('is deterministic when Math.random is mocked', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // Always returns 0 -> move 1
    expect(randomMove()).toBe(1);
    expect(randomMove()).toBe(1);
    expect(randomMove()).toBe(1);
    vi.restoreAllMocks();
  });

  it('maps Math.random ranges to correct buttons', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);   // 0 * 4 + 1 = 1
    expect(randomMove()).toBe(1);
    vi.spyOn(Math, 'random').mockReturnValue(0.249); // 0.996 + 1 = 1 (floor)
    expect(randomMove()).toBe(1);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);  // 1.0 + 1 = 2 (floor)
    expect(randomMove()).toBe(2);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);   // 2.0 + 1 = 3
    expect(randomMove()).toBe(3);
    vi.spyOn(Math, 'random').mockReturnValue(0.75);  // 3.0 + 1 = 4
    expect(randomMove()).toBe(4);
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // 3.996 + 1 = 4 (floor)
    expect(randomMove()).toBe(4);
    vi.restoreAllMocks();
  });
});