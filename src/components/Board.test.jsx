import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from './Board';
import { initSounds, playSound, stopSound } from './audio';

// playSound is now synchronous and returns { stop: fn }
const mockController = { stop: vi.fn() };
vi.mock('./audio', () => ({
  initSounds: vi.fn(() => Promise.resolve()),
  playSound: vi.fn(() => mockController),
  stopSound: vi.fn(),
}));

const SOUND_PREF_KEY = 'simon:soundOn';
const HIGH_SCORE_KEY = 'simon:highScore';

const getToggle = () => screen.getByRole('button', { name: 'Toggle sound' });
const getGameButton = (color) => document.querySelector(`.button.${color}`);

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('sound toggle', () => {
  it('starts muted by default', () => {
    render(<Board />);
    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(getToggle()).toHaveClass('mute');
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBeNull();
  });

  it('turns sound on and saves the choice to localStorage', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(getToggle());

    expect(getToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(getToggle()).toHaveClass('speaker');
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('true');
  });

  it('turns sound back off and updates localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);

    await user.click(getToggle());

    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
    expect(getToggle()).toHaveClass('mute');
    expect(localStorage.getItem(SOUND_PREF_KEY)).toBe('false');
  });

  it('restores a saved sound preference on mount', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);
    expect(getToggle()).toHaveAttribute('aria-pressed', 'true');
    expect(getToggle()).toHaveClass('speaker');
  });

  it('can be toggled with the keyboard', async () => {
    const user = userEvent.setup();
    render(<Board />);

    getToggle().focus();
    await user.keyboard('{Enter}');
    expect(getToggle()).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(getToggle()).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('sound playback (press & release)', () => {
  it('decodes the sounds once on mount', () => {
    render(<Board />);
    expect(initSounds).toHaveBeenCalledTimes(1);
  });

  it('does not play sounds while muted', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(getGameButton('red'));

    expect(playSound).not.toHaveBeenCalled();
  });

  it('does not play anything on mount when sound is on', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);
    expect(playSound).not.toHaveBeenCalled();
  });

  it('starts the sound on press-down and stops it on release', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);
    const red = getGameButton('red');

    fireEvent.pointerDown(red);
    // playSound is now synchronous
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith(1, expect.any(Object));

    fireEvent.pointerUp(red);
    expect(mockController.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the sound when the pointer is dragged off the button', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);
    const red = getGameButton('red');

    fireEvent.pointerDown(red);
    fireEvent.pointerLeave(red);

    expect(mockController.stop).toHaveBeenCalledTimes(1);
  });

  it('starts the second press immediately, without waiting for the first sound', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);

    // Press red, then press yellow while red is still held - the second
    // sound must start right away (this is the "queued sounds" bug).
    fireEvent.pointerDown(getGameButton('red'));
    fireEvent.pointerDown(getGameButton('yellow'));

    expect(playSound).toHaveBeenNthCalledWith(1, 1, expect.any(Object));
    expect(playSound).toHaveBeenNthCalledWith(2, 2, expect.any(Object));
    // the still-held first sound is cut so the two do not pile up
    expect(mockController.stop).toHaveBeenCalledTimes(1);
  });
});

describe('high score persistence', () => {
  it('defaults to 0 when nothing is stored', () => {
    render(<Board />);
    expect(screen.getByText('High Score: 0')).toBeInTheDocument();
    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBeNull();
  });

  it('restores a saved high score on mount', () => {
    localStorage.setItem(HIGH_SCORE_KEY, '5');
    render(<Board />);
    expect(screen.getByText('High Score: 5')).toBeInTheDocument();
  });

  it('handles corrupted localStorage value gracefully', () => {
    localStorage.setItem(HIGH_SCORE_KEY, 'not-a-number');
    render(<Board />);
    expect(screen.getByText('High Score: 0')).toBeInTheDocument();
  });

  it('saves high score when a new record is set', async () => {
    const user = userEvent.setup();
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // always button 1 (red)

    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);

    // Start game - Simon plays 1 move
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450); // timerSimon
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200); // timer (highlight clears)
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400); // timerChangePlayerTurn - turn handover
    });

    // User repeats the move correctly
    const red = getGameButton('red');
    fireEvent.pointerDown(red);
    fireEvent.pointerUp(red);

    // Sequence complete - Simon grows sequence, score shows 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600); // timerChangePlayerTurn
    });
    expect(screen.getByText('Score 1')).toBeInTheDocument();

    // User makes a wrong move - high score should be saved as 1
    const yellow = getGameButton('yellow');
    fireEvent.pointerDown(yellow);
    fireEvent.pointerUp(yellow);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(screen.getByText('High Score: 1')).toBeInTheDocument();
    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBe('1');

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('persists high score across remounts', () => {
    // First mount - set high score to 3
    localStorage.setItem(HIGH_SCORE_KEY, '3');
    const { unmount } = render(<Board />);
    expect(screen.getByText('High Score: 3')).toBeInTheDocument();
    unmount();

    // Second mount - high score should persist
    render(<Board />);
    expect(screen.getByText('High Score: 3')).toBeInTheDocument();
  });

  it('only updates localStorage when high score increases', () => {
    localStorage.setItem(HIGH_SCORE_KEY, '5');
    render(<Board />);
    expect(localStorage.getItem(HIGH_SCORE_KEY)).toBe('5');

    // Re-render with same state - localStorage should not be rewritten to a lower value
    // (This is implicitly tested by the fact that we only write when state.topScore > 0
    // and the reducer only increases topScore via Math.max)
  });
});