/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';
import { kfetch } from 'ui/kfetch';

import { throwErrors, createPlainError } from '../../../../../common/runtime_types';

import {
  LOG_ENTRIES_SUMMARY_PATH,
  LogEntriesSummaryRequest,
  logEntriesSummaryRequestRT,
  logEntriesSummaryResponseRT,
} from '../../../../../common/http_api';

export const fetchLogSummary = async (requestArgs: LogEntriesSummaryRequest) => {
  const response = await kfetch({
    method: 'POST',
    pathname: LOG_ENTRIES_SUMMARY_PATH,
    body: JSON.stringify(logEntriesSummaryRequestRT.encode(requestArgs)),
  });

  return pipe(
    logEntriesSummaryResponseRT.decode(response),
    fold(throwErrors(createPlainError), identity)
  );
};
