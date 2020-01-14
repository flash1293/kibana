/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SurrDocType, EsHitRecordList, EsHitRecord } from '../context';
import { convertIsoToNanosAsStr } from './date_conversion';

export type EsQuerySearchAfter = [string | number, string | number];

/**
 * Get the searchAfter query value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched, the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
export function getEsQuerySearchAfter(
  type: SurrDocType,
  documents: EsHitRecordList,
  timeFieldName: string,
  anchor: EsHitRecord,
  nanoSeconds: string,
  useNewFieldsApi?: boolean
): EsQuerySearchAfter {
  if (documents.length) {
    // already surrounding docs -> first or last record  is used
    const afterTimeRecIdx = type === 'successors' && documents.length ? documents.length - 1 : 0;
    const afterTimeDoc = documents[afterTimeRecIdx];
    const afterTimeValue = nanoSeconds
      ? convertIsoToNanosAsStr(afterTimeDoc.fields[timeFieldName][0])
      : afterTimeDoc.sort[0];
    return [afterTimeValue, afterTimeDoc.sort[1]];
  }
  // if data_nanos adapt timestamp value for sorting, since numeric value was rounded by browser
  // ES search_after also works when number is provided as string
  return [
    nanoSeconds ? convertIsoToNanosAsStr(anchor.fields[timeFieldName][0]) : anchor.sort[0],
    anchor.sort[1],
  ];
}
