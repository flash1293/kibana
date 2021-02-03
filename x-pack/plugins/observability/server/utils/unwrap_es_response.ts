/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { UnwrapPromise } from '@kbn/utility-types';

export function unwrapEsResponse<T extends Promise<{ body: any }>>(
  responsePromise: T
): Promise<UnwrapPromise<T>['body']> {
  return responsePromise.then((res) => res.body);
}
