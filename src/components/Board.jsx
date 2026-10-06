import React, { useState, useEffect, useReducer, useRef } from 'react';
import cn from 'classnames';

import Button from './Button';
import sound1 from './sounds/simonSound1.mp3';
import sound2 from './sounds/simonSound2.mp3';
import sound3 from './sounds/simonSound3.mp3';
import sound4 from './sounds/simonSound4.mp3';

const USER = 'user';
const SIMON = 'simon';
const FAILURE = 'failure';

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

// The sounds are not the same length - so we need to support the longest sound (4/blue)
const timer = 200;
const timerSimon = 450;
const timerChangePlayerTurn = 600;

const initialState = { topScore: 0, player: SIMON, userScore: 0, simonClicks: [] };

function reducer(state, action) {
  switch (action.type) {
    case 'setUserScore':
      return {
        ...state,
        userScore: action.payload,
        player: USER,
      };
    case 'setSimonClicks':
      return {
        ...state,
        simonClicks: action.payload,
        player: SIMON,
      };
    case 'userClick': {
      const { index } = action.payload;
      if (index !== state.simonClicks[state.userScore]) {
        // Wrong move: record the high score (completed rounds = clicks - 1) and fail
        const numberOfMoves = state.simonClicks.length - 1;
        return {
          ...state,
          player: FAILURE,
          userScore: 0,
          simonClicks: [],
          topScore: Math.max(state.topScore, numberOfMoves),
        };
      }
      return { ...state, userScore: state.userScore + 1, player: USER };
    }
    default:
      console.log('Undefined action:', JSON.stringify(action));
      throw new Error('Undefined action');
  }
}

// Exported for unit tests (PR C will move this into its own module)
export { reducer, initialState, timer, timerSimon, timerChangePlayerTurn };

function randomMove() {
  return Math.floor(Math.random() * 4 + 1);
}

function Board() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [clicked, setClicked] = useState(0);
  const [soundOn, setSoundOn] = useState(readSoundPref);

  const audioRefs = useRef({});
  // Lets the click effect read the latest soundOn without re-running (and replaying
  // the sound) when the toggle changes mid-highlight.
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  function playSound(type) {
    // type 0 means "nothing clicked"
    const audio = audioRefs.current[type];
    if (!soundOnRef.current || !type || !audio) {
      return;
    }
    const played = audio.play();
    if (played && typeof played.catch === 'function') {
      played.catch(() => {}); // ignore interrupted/blocked plays
    }
  }

  // Highlight the clicked button (with sound), then deselect it after a beat.
  useEffect(() => {
    if (!clicked) {
      return;
    }
    playSound(clicked);
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
      setClicked(state.simonClicks[i]);
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

  function userSays(index) {
    setClicked(index);
    dispatch({ type: 'userClick', payload: { index } });
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
            onClick={() => userSays(id)}
            clicked={clicked === id}
          />
        ))}
      </div>
      <div className="score">
        Score {state.simonClicks.length ? state.simonClicks.length - 1 : 0}
      </div>
      <div>High Score: {state.topScore}</div>
      <div className="controls">
        <div className="start" onClick={simonSays} />
        <div className="turn">
          Turn: <div className={`${state.player}-icon`} />
        </div>
        <div className="sound">
          <div
            className={cn({ mute: !soundOn, speaker: soundOn })}
            onClick={toggleSound}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleSound();
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={soundOn}
            aria-label="Toggle sound"
          />
          {[1, 2, 3, 4].map((id) => (
            <audio
              key={id}
              id={`simon${id}`}
              ref={(el) => {
                audioRefs.current[id] = el;
              }}
            >
              <source src={sounds[id]} type="audio/mpeg" />
            </audio>
          ))}
        </div>
      </div>
    </>
  );
}

export default Board;
