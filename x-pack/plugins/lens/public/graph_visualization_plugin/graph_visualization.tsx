/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButton,
  EuiColorPicker,
} from '@elastic/eui';
import { Visualization, VisualizationSuggestion, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

export type State = { colorMap: Record<string, string>; linkColor: string };
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
          state: { colorMap: {}, linkColor: '#69707D' },
        });
      }
    });
    return suggestions;
  },
  initialize(api, state) {
    return { colorMap: {}, linkColor: '#69707D' };
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
        {Object.entries(props.state.colorMap).map(([field, color]) => {
          return (
            <EuiFlexGroup key={color}>
              <EuiFlexItem>
                <EuiFormRow label={`Prefix`}>
                  <EuiFieldText
                    value={field}
                    onChange={e => {
                      props.setState({
                        ...props.state,
                        colorMap: Object.entries(props.state.colorMap)
                          .filter(([key, _]) => key !== field)
                          .concat([[e.target.value, props.state.colorMap[field]]])
                          .map(([key, val]) => ({ [key]: val }))
                          .reduce((a, b) => ({ ...a, ...b }), {}),
                      });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label={`Color`}>
                  <EuiColorPicker
                    onChange={value => {
                      props.setState({
                        ...props.state,
                        colorMap: {
                          ...props.state.colorMap,
                          [field]: value,
                        },
                      });
                    }}
                    color={color}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
        <EuiButton
          iconType="plusInCircle"
          fill
          fullWidth
          onClick={() => {
            props.setState({
              ...props.state,
              colorMap: {
                ...props.state.colorMap,
                prefix: '#98A2B3',
              },
            });
          }}
          size="s"
          iconSide="left"
          color="primary"
        />
        <EuiFormRow label={`Edge color`}>
          <EuiColorPicker
            onChange={value => {
              props.setState({
                ...props.state,
                linkColor: value,
              });
            }}
            color={props.state.linkColor}
          />
        </EuiFormRow>
      </div>,
      domElement
    );
  },

  toExpression: state => `lens_graph_chart colorMap='${JSON.stringify(state.colorMap)}' linkColor='${state.linkColor}'`,
};
