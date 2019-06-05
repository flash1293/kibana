/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { KibanaDatatable } from '../types';

export const graphData: ExpressionFunction<'lens_graph_data', never, {}, KibanaDatatable> = {
  name: 'lens_graph_data',
  type: 'kibana_datatable',
  help: 'A graph datasource',
  args: {},
  context: {
    types: [],
  },
  fn(): KibanaDatatable {
    return {
      type: 'kibana_datatable',
      columns: [{ id: 'filterPair', name: 'filterPair' }, { id: 'value', name: 'value' }],
      rows: [
        {
          filterPair: ['A', 'A'],
          value: 2,
        },
        {
          filterPair: ['B', 'B'],
          value: 4,
        },
        {
          filterPair: ['C', 'C'],
          value: 1,
        },
        {
          filterPair: ['A', 'B'],
          value: 2,
        },
        {
          filterPair: ['B', 'C'],
          value: 3,
        },
        {
          filterPair: ['C', 'A'],
          value: 1,
        },
      ],
    };
  },
};
