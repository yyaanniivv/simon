import React from 'react';
import cn from 'classnames';
import './Button.css';

// sounds from: https://www.freecodecamp.org/forum/t/external-mp3-audio-files/18450/2

const typeMap = {
  1: {
    color: 'red',
    position: 'top-left',
  },
  2: {
    color: 'yellow',
    position: 'top-right',
  },
  3: {
    color: 'green',
    position: 'bottom-left',
  },
  4: {
    color: 'blue',
    position: 'bottom-right',
  },
};

function Button({ type, onPressStart, onPressEnd, clicked }) {
  const style = cn('button', {
    [`${typeMap[type].position}`]: true,
    [`${typeMap[type].color}`]: !clicked,
    [`${typeMap[type].color}-clicked`]: clicked,
  });

  // Pointer events (not click): the sound must start on press-down and stop
  // on release. pointerleave/cancel cover dragging off the button mid-press.
  return (
    <div
      className={style}
      onPointerDown={onPressStart}
      onPointerUp={onPressEnd}
      onPointerLeave={onPressEnd}
      onPointerCancel={onPressEnd}
    />
  );
}

export default Button;
