/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { kfetch } from 'ui/kfetch';
import { toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { StaticIndexPattern } from 'ui/index_patterns';
import { KibanaDatatable } from '../types';

export const graphData: ExpressionFunction<
  'lens_graph_data',
  never,
  { filters: string; childAgg: string },
  Promise<KibanaDatatable>
> = {
  name: 'lens_graph_data',
  type: 'kibana_datatable',
  help: 'A graph datasource',
  args: {
    filters: {
      types: ['string'],
      help: '',
    },
    childAgg: {
      types: ['string'],
      help: '',
    },
  },
  context: {
    types: [],
  },
  async fn(_context, { filters, childAgg }): Promise<KibanaDatatable> {
    const filterAggs = (JSON.parse(filters) as string[])
      .map(filter => ({
        [filter]: toElasticsearchQuery(
          fromKueryExpression(filter),
          (undefined as unknown) as StaticIndexPattern
        ),
      }))
      .reduce((a, c) => ({ ...a, ...c }), {});

    return {
      type: 'kibana_datatable',
      ...(await kfetch({
        pathname: '/api/graph/query',
        method: 'POST',
        body: JSON.stringify({
          index: 'kibana_sample_data_logs',
          filters: filterAggs,
          childAgg: JSON.parse(childAgg),
        }),
      })),
    };
  },
};
