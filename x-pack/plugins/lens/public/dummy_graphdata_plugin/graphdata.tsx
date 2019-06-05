/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { Datasource } from '..';

export function getGraphDatasource(): Datasource<undefined, undefined> {
  return {
    initialize: () => Promise.resolve(undefined),
    toExpression: () => 'lens_graph_data',
    renderDataPanel: el => {
      render(
        <p>This is the Graph datasource. It just emits the same data table all the time for now</p>,
        el
      );
    },
    getDatasourceSuggestionsForField: () => [],
    getDatasourceSuggestionsFromCurrentState: () => [],
    getPersistableState: () => undefined,
    getPublicAPI: () => ({
      renderDimensionPanel(el) {
        render(<p>There is no dimension panel for now</p>, el);
      },
      duplicateColumn: () => [],
      getOperationForColumnId: () => null,
      getTableSpec: () => [],
      moveColumnTo: () => {},
      removeColumnInTableSpec: () => [],
    }),
  };
}
