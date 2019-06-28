/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Datasource, DatasourceDimensionPanelProps } from '..';

interface InternalState {
  filters: string[];
  childAgg: string;
}

const DimensionPanel = ({
  state,
  setState,
  columnId,
}: DatasourceDimensionPanelProps & {
  state: InternalState;
  setState: (newState: InternalState) => void;
}) => {
  return <></>;
};

export function getGraphDatasource(): Datasource<InternalState, InternalState> {
  return {
    initialize: () =>
      Promise.resolve({
        filters: [
          'geo.src: CN',
          'geo.src: IN',
          'geo.src: US',
          'extension: gz',
          'extension: css',
          'extension: zip',
        ],
        childAgg: `{ "value_count": { "field": "_id" } }`,
      }),
    toExpression: ({ filters, childAgg }) =>
      `lens_graph_data filters='${JSON.stringify(filters)}' childAgg='${childAgg}'`,
    renderDataPanel: el => {
      render(
        <p>This is the Graph datasource. It just emits the same data table all the time for now</p>,
        el
      );
    },
    getDatasourceSuggestionsForField: () => [],
    getDatasourceSuggestionsFromCurrentState: () => [],
    getPersistableState: state => state,
    getPublicAPI: (state, setState) => ({
      renderDimensionPanel(el, props) {
        render(<DimensionPanel {...props} state={state} setState={setState} />, el);
      },
      duplicateColumn: () => [],
      getOperationForColumnId: () => null,
      generateColumnId: () => 'adsasd',
      getTableSpec: () => [],
      moveColumnTo: () => {},
      removeColumnInTableSpec: () => [],
    }),
  };
}
