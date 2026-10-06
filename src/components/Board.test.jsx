import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Board from './Board';

const SOUND_PREF_KEY = 'simon:soundOn';

const getToggle = () => screen.getByRole('button', { name: 'Toggle sound' });
const getGameButton = (color) => document.querySelector(`.button.${color}`);

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  vi.restoreAllMocks();
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

describe('sound playback', () => {
  it('does not play sounds while muted', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(getGameButton('red'));

    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('plays the matching sound when unmuted', async () => {
    const user = userEvent.setup();
    render(<Board />);

    await user.click(getToggle());
    await user.click(getGameButton('red'));

    const play = HTMLMediaElement.prototype.play;
    expect(play).toHaveBeenCalled();
    expect(play.mock.instances).toContain(document.getElementById('simon1'));
  });

  it('does not try to play anything on mount when sound is on', () => {
    localStorage.setItem(SOUND_PREF_KEY, 'true');
    render(<Board />);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
