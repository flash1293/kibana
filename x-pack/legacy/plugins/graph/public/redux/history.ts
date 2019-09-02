/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type Reducer<TState> = (
  state: TState | undefined,
  action: {
    type: any;
  }
) => TState;

interface HistoryState<TState> {
  dirty: boolean;
  currentState?: TState;
  log: TState[];
}

// TODO build this with typescript-fsa-reducers and .default for the pass-through handler
export const createHistoryReducer = <TState>(
  reducer: Reducer<TState>,
  maxLogEntries: number = 100
): Reducer<HistoryState<TState>> => (
  state = {
    dirty: false,
    log: [],
  },
  action
) => {
  const updatedState = reducer(state.currentState, action);
  const didUpdate = state.dirty || state.currentState === updatedState;
  const newLog = didUpdate ? [...state.log, state.currentState].slice(0, maxLogEntries) : state.log;
  return {
    currentState: updatedState,
    dirty: state.dirty || didUpdate,
    log: newLog,
  };
};
