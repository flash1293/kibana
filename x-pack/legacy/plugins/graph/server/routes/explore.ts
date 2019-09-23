/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import { get } from 'lodash';

export async function initExploreRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: '/api/graph/graphExplore',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object({
          index: schema.string(),
          query: schema.object({}),
        }),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      try {
        return res.ok({
          body: (await requestClient.callAsCurrentUser('transport.request', {
            path: '/' + encodeURIComponent(req.body.index) + '/_graph/explore',
            body: req.body.query,
            method: 'POST',
            query: {},
          })) as Promise<object>,
        });
      } catch (error) {
        // Extract known reasons for bad choice of field
        const relevantCause = (get(error, 'body.error.root_cause', []) as Array<{
          reason: string;
          type: string;
        }>).find(cause => {
          return (
            cause.reason.includes('Fielddata is disabled on text fields') ||
            cause.reason.includes('No support for examining floating point') ||
            cause.reason.includes('Sample diversifying key must be a single valued-field') ||
            cause.reason.includes('Failed to parse query') ||
            cause.type == 'parsing_exception'
          );
        });

        if (relevantCause) {
          throw Boom.badRequest(relevantCause.reason);
        }

        throw Boom.boomify(error);
      }
    }
  );
}
