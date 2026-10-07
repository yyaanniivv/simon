export const USER = 'user';
export const SIMON = 'simon';
export const FAILURE = 'failure';

export const initialState = { topScore: 0, player: SIMON, userScore: 0, simonClicks: [] };

// Simon's playback window must cover the longest sound (~300ms after trimming silence)
export const timer = 200;
export const timerSimon = 450;
export const timerChangePlayerTurn = 600;

export function reducer(state, action) {
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

// Returns a random move 1-4 (Simon's sequence generation)
export function randomMove() {
  return Math.floor(Math.random() * 4 + 1);
}