/* global performance */
// @flow

import raf from 'raf';

import { DROP_FRAMES_ACCELERATED } from './constants/grid';
import { getPlayer } from './reducers/game';
import { getCurGame } from './reducers/cur-game';
import { getCurUserId } from './reducers/cur-user';

import type { UserId, User, GameId } from './types/state';
import type { Action, AsyncAction, Dispatch, GetState } from './types/actions';

const now =
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? () => performance.now()
    : () => Date.now();

const FPS = 60;
const frameDuration = 1000 / FPS;

// This changes too fast (60fps) to keep it in the store's state
let yProgress = 0;

export function auth(userId: UserId, userName: string): Action {
  return {
    type: 'AUTH',
    payload: { userId, userName }
  };
}

export function createGame(gameId: GameId, user: User): Action {
  return {
    type: 'CREATE_GAME',
    payload: {
      gameId,
      user
    }
  };
}

export function joinGame(gameId: GameId, user: User): Action {
  return {
    type: 'JOIN_GAME',
    payload: {
      gameId,
      user
    }
  };
}

export function playerReady(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'PLAYER_READY',
    payload: {
      userId,
      gameId
    }
  }));
}

export function stopGame(): AsyncAction {
  return () => {
    cancelFrame();
  };
}

export function advanceGame(drop: (rows: number) => any): AsyncAction {
  return (dispatch: Dispatch, getState: GetState) => {
    cancelFrame();

    scheduleFrame(frames => {
      const state = getState();
      const userId = getCurUserId(state);
      const game = getCurGame(state);
      const { status, dropFrames } = game;
      const player = getPlayer(game, userId);
      const { dropAcceleration } = player;

      // Stop animation when game ended
      if (status === 'OVER') {
        return;
      }

      const framesPerDrop = dropAcceleration
        ? DROP_FRAMES_ACCELERATED
        : dropFrames;

      yProgress += frames / framesPerDrop;

      if (yProgress > 1) {
        const rows = Math.floor(yProgress);
        drop(rows);

        yProgress %= 1;
      }

      dispatch(advanceGame(drop));
    });
  };
}

export function drop(rows: number): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'DROP',
    payload: {
      userId,
      gameId,
      rows
    }
  }));
}

export function moveLeft(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'MOVE_LEFT',
    payload: {
      userId,
      gameId
    }
  }));
}

export function moveRight(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'MOVE_RIGHT',
    payload: {
      userId,
      gameId
    }
  }));
}

export function rotate(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'ROTATE',
    payload: {
      userId,
      gameId
    }
  }));
}

export function enableAcceleration(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'ENABLE_ACCELERATION',
    payload: {
      userId,
      gameId
    }
  }));
}

export function disableAcceleration(): AsyncAction {
  return decorateAction(({ userId, gameId }) => ({
    type: 'DISABLE_ACCELERATION',
    payload: {
      userId,
      gameId
    }
  }));
}

let animationHandle;
let timeBegin;

function cancelFrame() {
  raf.cancel(animationHandle);
}

function scheduleFrame(cb) {
  timeBegin = now();
  animationHandle = raf(() => {
    const timeEnd = now();
    cb((timeEnd - timeBegin) / frameDuration);
  });
}

function decorateAction(fn: ({ gameId: GameId, userId: UserId }) => Action) {
  return (dispatch: Dispatch, getState: GetState): Action => {
    const state = getState();
    const userId = getCurUserId(state);
    const gameId = getCurGame(state).id;

    return dispatch(fn({ userId, gameId }));
  };
}
