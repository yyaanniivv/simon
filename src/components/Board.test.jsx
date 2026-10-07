import React from 'react';
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