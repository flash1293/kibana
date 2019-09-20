/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';

export async function initSearchRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: '/api/graph/searchProxy',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object({
          index: schema.string(),
          body: schema.object({}),
        }),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const includeFrozen = await req.getUiSettingsService().get('search:includeFrozen');

      try {
        return res.ok({
          body: await requestClient.callAsCurrentUser('search', {
            index: req.payload.index,
            body: req.payload.body,
            queryParams: {
                rest_total_hints_as_int: true,
                ignore_throttled: !includeFrozen,
            }
          }),
        });
      } catch (e) {
        if (e.status === 404) {
          return res.notFound();
        }
        if (e.isBoom) {
          if (e.output.statusCode === 404) {
            return res.notFound();
          }
          return res.internalError(e.output.message);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}
