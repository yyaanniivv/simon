import React, { useState, useEffect, useReducer, useRef } from 'react';
import cn from 'classnames';

import Button from './Button';
import { initSounds, playSound as startSound, stopSound } from './audio';
import sound1 from './sounds/simonSound1.wav';
import sound2 from './sounds/simonSound2.wav';
import sound3 from './sounds/simonSound3.wav';
import sound4 from './sounds/simonSound4.wav';
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

const sounds = { 1: sound1, 2: sound2, 3: sound3, 4: sound4 };

const SOUND_PREF_KEY = 'simon:soundOn';

// Sound starts OFF (muted); the user opts in and the choice is remembered.
function readSoundPref() {
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) === 'true';
  } catch {
    return false; // localStorage unavailable (e.g. private browsing)
  }
}

function Board() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [clicked, setClicked] = useState(0);
  const [soundOn, setSoundOn] = useState(readSoundPref);

  // The sound node started by the current press, so release can stop it.
  const userSourceRef = useRef(null);
  // Lets event handlers and effects read the latest soundOn synchronously.
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  // Decode all sounds once, up front, so playback later is instant.
  useEffect(() => {
    initSounds(sounds);
  }, []);

  // Stop a held sound if the component unmounts mid-press.
  useEffect(() => () => stopSound(userSourceRef.current), []);

  // Highlight the clicked button, then deselect it after a beat.
  // (Sound is NOT played here - it starts synchronously in the press handler.)
  useEffect(() => {
    if (!clicked) {
      return;
    }
    const timeoutId = setTimeout(() => setClicked(0), timer);
    return () => clearTimeout(timeoutId);
  }, [clicked]);

  // Play Simon's sequence, then hand the turn over to the user.
  useEffect(() => {
    if (state.simonClicks.length === 0) {
      return;
    }
    let i = 0;
    let timeoutId;
    const intervalId = setInterval(() => {
      const move = state.simonClicks[i];
      setClicked(move);
      if (soundOnRef.current) {
        startSound(move, sounds); // Simon's sounds play in full - no stop
      }
      i++;
      if (i >= state.simonClicks.length) {
        clearInterval(intervalId);
        timeoutId = setTimeout(() => {
          dispatch({ type: 'setUserScore', payload: 0 });
        }, timerChangePlayerTurn);
      }
    }, timerSimon);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [state.simonClicks]);

  // The user repeated the whole sequence - Simon adds the next move after a pause.
  useEffect(() => {
    const sequenceComplete =
      state.player === USER &&
      state.simonClicks.length > 0 &&
      state.userScore === state.simonClicks.length;
    if (!sequenceComplete) {
      return;
    }
    const timeoutId = setTimeout(() => {
      dispatch({
        type: 'setSimonClicks',
        payload: state.simonClicks.concat(randomMove()),
      });
    }, timerChangePlayerTurn);
    return () => clearTimeout(timeoutId);
  }, [state.player, state.userScore, state.simonClicks]);

  function simonSays() {
    dispatch({
      type: 'setSimonClicks',
      payload: state.simonClicks.concat(randomMove()),
    });
  }

  // Press: the sound starts synchronously with the pointer event - no React
  // render/effect round-trip, no decode delay - so it is heard the instant
  // the button goes down, even while a previous sound is still playing.
  function userPress(index) {
    setClicked(index);
    dispatch({ type: 'userClick', payload: { index } });
    if (userSourceRef.current) {
      userSourceRef.current.stop();
    }
    userSourceRef.current = soundOnRef.current ? startSound(index, sounds) : { stop: () => {} };
  }

  // Release (or drag off / cancel): cut the sound immediately.
  function userRelease() {
    if (userSourceRef.current) {
      userSourceRef.current.stop();
    }
    userSourceRef.current = null;
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch {
      // ignore write failures (e.g. private browsing) - sound still toggles in-session
    }
  }

  return (
    <>
      <div className="Board">
        {[1, 2, 3, 4].map((id) => (
          <Button
            key={id}
            type={id}
            onPressStart={() => userPress(id)}
            onPressEnd={userRelease}
            clicked={clicked === id}
          />
        ))}
      </div>
      <div className="score">
        Score {state.simonClicks.length ? state.simonClicks.length - 1 : 0}
      </div>
      <div className="high-score">High Score: {state.topScore}</div>
      <div className="controls">
        <button className="start" onClick={simonSays} aria-label="Start game" />
        <div className="turn">
          <span>Turn</span>
          <div className={`turn-icon ${state.player}-icon`} aria-hidden="true" />
        </div>
        <button
          className={cn('sound-toggle', { mute: !soundOn, speaker: soundOn })}
          onClick={toggleSound}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleSound();
            }
          }}
          aria-pressed={soundOn}
          aria-label="Toggle sound"
        />
      </div>
    </>
  );
}

export default Board;
