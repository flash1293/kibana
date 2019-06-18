/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiFormRow } from '@elastic/eui';
import { Visualization, VisualizationSuggestion, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

export type State = undefined;
export type PersistableState = State;

export const graphVisualization: Visualization<State, PersistableState> = {
  getSuggestions: ({ tables }) => {
    const suggestions: VisualizationSuggestion<State>[] = [];
    tables.forEach(table => {
      if (
        table.isMultiRow &&
        table.columns.length === 2 &&
        table.columns[0].operation.dataType === 'filterPair'
      ) {
        suggestions.push({
          datasourceSuggestionId: table.datasourceSuggestionId,
          score: 0.5,
          title: 'Correlations between filters as graph',
          state: undefined,
        });
      }
    });
    return suggestions;
  },
  initialize(api, state) {
    return state;
  },

  getPersistableState(state) {
    return state;
  },

  renderConfigPanel: (domElement, props) => {
    render(
      <div>
        Graph Visualization
        <EuiFormRow label="Nodes">
          <NativeRenderer
            render={props.datasource.renderDimensionPanel}
            nativeProps={{
              dragDropContext: props.dragDropContext,
              columnId: 'filterPair',
              filterOperations: (op: Operation) => op.dataType === 'filterPair',
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Size of nodes">
          <NativeRenderer
            render={props.datasource.renderDimensionPanel}
            nativeProps={{
              dragDropContext: props.dragDropContext,
              columnId: 'value0',
              filterOperations: (op: Operation) => !op.isBucketed && op.dataType === 'number',
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Additional tooltip information">
          <NativeRenderer
            render={props.datasource.renderDimensionPanel}
            nativeProps={{
              dragDropContext: props.dragDropContext,
              columnId: 'value1',
              filterOperations: (op: Operation) => !op.isBucketed && op.dataType === 'number',
            }}
          />
        </EuiFormRow>
      </div>,
      domElement
    );
  },

  toExpression: state => 'lens_graph_chart',
};
