/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExpressionFunction, ExpressionAstFunction } from '@kbn/expressions-plugin/common';
import { AggregateQuery } from '../../query';
import { EssqlExpressionFunctionDefinition } from './essql';

export const aggregateQueryToAst = (
  query: AggregateQuery,
  timeField?: string
): undefined | ExpressionAstFunction => {
  if ('sql' in query) {
    return buildExpressionFunction<EssqlExpressionFunctionDefinition>('essql', {
      query: query.sql,
      timeField,
    }).toAst();
  }
  if ('esql' in query) {
    return buildExpressionFunction<EssqlExpressionFunctionDefinition>('esql', {
      query: query.esql,
    }).toAst();
  }
};
