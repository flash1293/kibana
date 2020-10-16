/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toExpression as toExpressionString } from '@kbn/interpreter/common';
import { ChartsPluginStart } from 'src/plugins/charts/public';
import { SavedLensInput } from '../../../functions/external/saved_lens';

export function toExpression(input: SavedLensInput, charts: ChartsPluginStart): string {
  const expressionParts = [] as string[];

  expressionParts.push('savedLens');

  expressionParts.push(`id="${input.id}"`);

  if (input.title !== undefined) {
    expressionParts.push(`title="${input.title}"`);
  }

  if (input.timeRange) {
    expressionParts.push(
      `timerange={timerange from="${input.timeRange.from}" to="${input.timeRange.to}"}`
    );
  }

  // TODO pass charts plugin down here so we can build a proper expression
  if (input.palette) {
    expressionParts.push(
      `palette={${toExpressionString(
        charts.palettes[input.palette.name].toExpression(input.palette.params)
      )}}`
    );
  }

  return expressionParts.join(' ');
}
