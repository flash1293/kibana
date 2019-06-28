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
  EuiCheckbox,
} from '@elastic/eui';
import { Visualization, VisualizationSuggestion, Operation } from '../types';
import { NativeRenderer } from '../native_renderer';

export interface State {
  colorMap: Array<[string, string]>;
  linkColor: string;
  groupMap: Array<[string, boolean]>;
  annotations: Array<[string, string]>;
}
export type PersistableState = State;

export const graphVisualization: Visualization<State, PersistableState> = {
  getSuggestions: ({ tables }) => {
    const suggestions: Array<VisualizationSuggestion<State>> = [];
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
          state: { colorMap: [], linkColor: '#69707D', groupMap: [], annotations: [] },
          previewIcon: 'graphApp',
        });
      }
    });
    return suggestions;
  },
  initialize(api, state) {
    return { colorMap: [], linkColor: '#69707D', groupMap: [], annotations: [] };
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
        <h4>Color settings</h4>
        {props.state.colorMap.map(([field, color], index) => {
          return (
            <EuiFlexGroup direction="column" key={index}>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow label={`Prefix`}>
                      <EuiFieldText
                        value={field}
                        onChange={e => {
                          props.setState({
                            ...props.state,
                            colorMap: props.state.colorMap.map((entry, updateIndex) => {
                              if (updateIndex === index) {
                                return [e.target.value, entry[1]];
                              } else {
                                return entry;
                              }
                            }) as Array<[string, string]>,
                            groupMap: props.state.groupMap.map((entry, updateIndex) => {
                              if (updateIndex === index) {
                                return [e.target.value, entry[1]];
                              } else {
                                return entry;
                              }
                            }) as Array<[string, boolean]>,
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
                            colorMap: props.state.colorMap.map((entry, updateIndex) => {
                              if (updateIndex === index) {
                                return [entry[0], value];
                              } else {
                                return entry;
                              }
                            }) as Array<[string, string]>,
                          });
                        }}
                        color={color}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label={`Show as group`}>
                  <EuiCheckbox
                    id={`group-${field}`}
                    checked={props.state.groupMap[index][1]}
                    onChange={e => {
                      props.setState({
                        ...props.state,
                        groupMap: props.state.groupMap.map((entry, updateIndex) => {
                          if (updateIndex === index) {
                            return [entry[0], !entry[1]];
                          } else {
                            return entry;
                          }
                        }) as Array<[string, boolean]>,
                      });
                    }}
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
              colorMap: [...props.state.colorMap, ['prefix', '#98A2B3']],
              groupMap: [...props.state.groupMap, ['prefix', false]],
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
        <h4>Annotations</h4>
        {props.state.annotations.map(([field, annotation], index) => {
          return (
            <EuiFlexGroup direction="row" key={index}>
              <EuiFlexItem>
                <EuiFormRow label="Filter">
                  <EuiFieldText
                    value={field}
                    onChange={e => {
                      props.setState({
                        ...props.state,
                        annotations: props.state.annotations.map((entry, updateIndex) => {
                          if (updateIndex === index) {
                            return [e.target.value, entry[1]];
                          } else {
                            return entry;
                          }
                        }) as Array<[string, string]>,
                      });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow label={`Annotation`}>
                  <EuiFieldText
                    value={annotation}
                    onChange={e => {
                      props.setState({
                        ...props.state,
                        annotations: props.state.annotations.map((entry, updateIndex) => {
                          if (updateIndex === index) {
                            return [entry[0], e.target.value];
                          } else {
                            return entry;
                          }
                        }) as Array<[string, string]>,
                      });
                    }}
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
              annotations: [...props.state.annotations, ['prefix', 'My annotation']],
            });
          }}
          size="s"
          iconSide="left"
          color="primary"
        />
      </div>,
      domElement
    );
  },

  toExpression: state =>
    `lens_graph_chart colorMap='${JSON.stringify(
      state.colorMap.reduce((o, [key, value]) => ({ ...o, [key]: value }), {})
    )}' groupMap='${JSON.stringify(
      state.groupMap.reduce((o, [key, value]) => ({ ...o, [key]: value }), {})
    )}' linkColor='${state.linkColor}' annotations='${JSON.stringify(
      state.annotations.reduce((o, [key, value]) => ({ ...o, [key]: value }), {})
    )}'`,
};
