import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from './Board';
import { timer, timerSimon, timerChangePlayerTurn } from './gameReducer';
import { playSound } from './audio';

vi.mock('./audio', () => ({
  initSounds: vi.fn(() => Promise.resolve()),
  playSound: vi.fn(() => ({ node: 'mock-source' })),
  stopSound: vi.fn(),
}));

const CLICKED_CLASSES = '.red-clicked, .yellow-clicked, .green-clicked, .blue-clicked';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Board (gameplay)', () => {
  it('shows the failure icon after a wrong click', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(document.querySelector('.button.red'));

    expect(document.querySelector('.failure-icon')).not.toBeNull();
    expect(screen.getByText('Score 0')).toBeInTheDocument();
  });

  it('plays the sound exactly once per click', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(screen.getByRole('button', { name: 'Toggle sound' }));
    await user.click(document.querySelector('.button.red'));

    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith(1);
  });

  it('simon plays the first move after start', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // every move is button 1 (red)
    localStorage.setItem('simon:soundOn', 'true');
    render(<Board />);

    // fireEvent (not userEvent) - it is synchronous, so fake timers stay in full control
    fireEvent.click(document.querySelector('.start'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(timerSimon);
    });
    expect(document.querySelectorAll(CLICKED_CLASSES)).toHaveLength(1);
    expect(document.querySelector('.red-clicked')).not.toBeNull();
    // the sound starts on the tick itself - no render/effect round-trip
    expect(playSound).toHaveBeenCalledWith(1);
  });

  it('plays a full round: simon shows a move, the user repeats it, score advances', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0); // every move is button 1 (red)
    render(<Board />);

    // Start the game - simon plays its single move, then hands over the turn.
    // Time is advanced in act-sized steps so React flushes the effects that
    // schedule each follow-up timeout before the clock moves past it.
    fireEvent.click(document.querySelector('.start'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(timerSimon); // simon highlights the move
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(timer); // highlight clears
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(timerChangePlayerTurn - timer); // turn handover
    });
    expect(document.querySelector('.user-icon')).not.toBeNull();

    // The user repeats the move (press & release). Grab the element first -
    // the press itself swaps the class to `red-clicked`.
    const red = document.querySelector('.button.red');
    fireEvent.pointerDown(red);
    fireEvent.pointerUp(red);

    // Sequence complete - simon grows the sequence after the pause, score shows 1
    await act(async () => {
      await vi.advanceTimersByTimeAsync(timerChangePlayerTurn);
    });
    expect(screen.getByText('Score 1')).toBeInTheDocument();
    expect(document.querySelector('.simon-icon')).not.toBeNull();

    // ...and replays both moves before returning the turn to the user
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * timerSimon);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(timerChangePlayerTurn);
    });
    expect(document.querySelector('.user-icon')).not.toBeNull();
  });
});
