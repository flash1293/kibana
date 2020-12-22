/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unitSuffixesLong } from '../suffix_formatter';
import type { TimeScaleUnit } from '../time_scale';
import type { IndexPatternLayer } from '../types';
import type { IndexPatternColumn } from './definitions';

export const DEFAULT_TIME_SCALE = 's' as TimeScaleUnit;

export function adjustTimeScaleLabelSuffix(
  oldLabel: string,
  previousTimeScale: TimeScaleUnit | undefined,
  newTimeScale: TimeScaleUnit | undefined
) {
  let cleanedLabel = oldLabel;
  // remove added suffix if column had a time scale previously
  if (previousTimeScale) {
    const suffixPosition = oldLabel.lastIndexOf(` ${unitSuffixesLong[previousTimeScale]}`);
    if (suffixPosition !== -1) {
      cleanedLabel = oldLabel.substring(0, suffixPosition);
    }
  }
  if (!newTimeScale) {
    return cleanedLabel;
  }
  // add new suffix if column has a time scale now
  return `${cleanedLabel} ${unitSuffixesLong[newTimeScale]}`;
}

export function adjustTimeScaleOnOtherColumnChange<T extends IndexPatternColumn>(
  layer: IndexPatternLayer,
  thisColumnId: string,
  changedColumnId: string
): T {
  const columns = layer.columns;
  const column = columns[thisColumnId] as T;
  if (!column.timeScale) {
    return column;
  }
  const hasDateHistogram = Object.values(columns).some(
    (col) => col?.operationType === 'date_histogram'
  );
  if (hasDateHistogram) {
    return column;
  }
  if (column.customLabel) {
    return column;
  }
  return {
    ...column,
    timeScale: undefined,
    label: adjustTimeScaleLabelSuffix(column.label, column.timeScale, undefined),
  };
}
