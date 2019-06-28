/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// ------------------------------------------------------------------------------------------
// This file contains all restful endpoints pertaining to query execution for viz-editor
// ------------------------------------------------------------------------------------------

import { Legacy } from 'kibana';

/**
 * Expose a RESTful endpoint that runs an Elasticsearch query based on our
 * query model, and returns a tabular result.
 */
export function route(server: Legacy.Server) {
  const { callWithRequest } = server.plugins.elasticsearch.createCluster('sql', {});

  server.route({
    path: `/api/graph/query`,
    method: 'POST',
    async handler(req) {
      const payload = req.payload as any;
      const result = await callWithRequest(req, 'transport.request', {
        path: `/${payload.index}/_search`,
        method: 'POST',
        body: {
          size: 0,
          aggs: {
            interactions: {
              adjacency_matrix: {
                filters: payload.filters,
              },
              aggs: (payload.childAggs as object[])
                .map((agg, index) => ({ [`value${index}`]: agg }))
                .reduce((a, b) => ({ ...a, ...b }), {}),
            },
          },
        },
      });

      return {
        columns: [
          { id: 'filterPair', name: 'filterPair' },
          ...(payload.childAggNames as string[]).map((aggName, index) => ({
            id: `value${index}`,
            name: aggName,
          })),
        ],
        rows: result.aggregations.interactions.buckets.map(
          (bucket: { key: string } & Record<string, { value: number }>) => ({
            filterPair: bucket.key.includes('&') ? bucket.key.split('&') : [bucket.key, bucket.key],
            ...(payload.childAggNames as string[])
              .map((_, index) => ({ [`value${index}`]: bucket[`value${index}`].value }))
              .reduce((a, b) => ({ ...a, ...b }), {}),
          })
        ),
      };
    },
  });
}