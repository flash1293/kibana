/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Visualization } from '../types';

export type State = undefined;
export type PersistableState = State;

export const graphVisualization: Visualization<State, PersistableState> = {
  getSuggestions: () => [],

  initialize(state) {
    return state;
  },

  getPersistableState(state) {
    return state;
  },

  renderConfigPanel: (domElement, props) => {
    render(
      <div>
        Graph Visualization
        <p>No settings here yet</p>
      </div>,
      domElement
    );
  },

  toExpression: state => 'lens_graph_chart',
};
