import React, { useState, useEffect, useReducer } from 'react';
// import cn from 'classnames';

import Button from './Button';
import sound1 from './sounds/simonSound1.mp3';
import sound2 from './sounds/simonSound2.mp3';
import sound3 from './sounds/simonSound3.mp3';
import sound4 from './sounds/simonSound4.mp3';

const USER = 'user';
const SIMON = 'simon';
const FAILURE = 'failure';

// The sounds are not the same length - so we need to support the longest sound (4/blue)
const timer = 200;
const timerSimon = 450;
const timerChangePlayerTurn = 600;

const initialState = { topScore: 0, player: SIMON, userClicks: 0, simonClicks: [] };

function reducer(state, action) {
  switch (action.type) {
    case 'setTopScore':
      return { ...state, topScore: action.payload };
    case 'setUserClicks':
      return {
        ...state,
        userClicks: action.payload,
        player: USER,
      };
    case 'setSimonClicks':
      return {
        ...state,
        simonClicks: action.payload,
        player: SIMON,
      };
    case 'reset':
      return { ...state, player: FAILURE, userClicks: 0, simonClicks: [] }; //TODO initialState (init) funciton with TopScore/FAILURE as param?
    default:
      console.log('Undefined action:', JSON.stringify(action));
      throw new Error('Undefined action');
  }
}

function Board() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [clicked, setClicked] = useState(0);
  const [mute, setMute] = useState(true);

  // Using a named function, to add some context and better explain which effect this is.
  useEffect(deselectButton);

  function deselectButton() {
    playSound(clicked);
    setTimeout(() => setClicked(0), timer);
  }

  useEffect(() => {
    if (state.simonClicks.length > 0) {
      let i = 0;
      const intervalId = setInterval(() => {
        setClicked(state.simonClicks[i]);
        i++;
        if (i >= state.simonClicks.length) {
          clearInterval(intervalId);
          setTimeout(() => {
            dispatch({ type: 'setUserClicks', payload: 0 });
          }, timerChangePlayerTurn);
        }
      }, timerSimon);
    }
  }, [state.simonClicks]);

  function simonSays() {
    const next = Math.floor(Math.random() * 4 + 1);
    dispatch({ type: 'setSimonClicks', payload: state.simonClicks.concat(next) });
  }

  function userSays(index) {
    setClicked(index);

    if (index !== state.simonClicks[state.userClicks]) {
      reset();
    } else {
      dispatch({ type: 'setUserClicks', payload: state.userClicks + 1 });

      if (state.userClicks + 1 === state.simonClicks.length) {
        setTimeout(() => {
          simonSays();
        }, timerChangePlayerTurn);
      }
    }
  }

  function playSound(type) {
    // const playPromise = document.getElementById(`simon${type}`).play();
    // playPromise.then().catch();

    // OR sound = new Audio(mp3).play()
    if (!mute) {
      document.getElementById(`simon${type}`).play();
    }
  }

  function toggleMute() {
    return setMute(!mute);
  }

  function reset() {
    const numberOfMoves = state.simonClicks.length - 1;
    if (numberOfMoves > state.topScore) {
      dispatch({ type: 'setTopScore', payload: numberOfMoves });
    }
    dispatch({ type: 'reset' }); // TODO: should the reset calculate the topScore?
  }

  return (
    <>
      <div className="Board">
        {[1, 2, 3, 4].map((id) => (
          <Button
            key={id + clicked + state.player}
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
          {/* <div className={cn({mute: mute, speaker: !mute,})} onClick={() => toggleMute()} /> */}
          <audio id="simon1">
            <source src={sound1} type="audio/mpeg" />
          </audio>
          <audio id="simon2">
            <source src={sound2} type="audio/mpeg" />
          </audio>
          <audio id="simon3">
            <source src={sound3} type="audio/mpeg" />
          </audio>
          <audio id="simon4">
            <source src={sound4} type="audio/mpeg" />
          </audio>
        </div>
      </div>
    </>
  );
}

export default Board;
