

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { initSearchRoute } from './search';
import { initExploreRoute } from './explore';

export function setupRoutes(setup: CoreSetup) {
  initSearchRoute(setup);
  initExploreRoute(setup);
}