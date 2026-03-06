/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@elastic/eui';

/**
 * Detects if a search query matches "Where is Elky" (case-insensitive, whitespace-trimmed)
 */
export function isElkyQuery(query: Query | undefined): boolean {
  const queryText = query?.text?.trim().toLowerCase();
  return queryText === 'where is elky';
}
