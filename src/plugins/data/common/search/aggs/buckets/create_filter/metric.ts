/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildExistsFilter } from '@kbn/es-query';
import { IMetricAggConfig } from '../../metrics/metric_agg_type';

export const createMetricFilter = (aggConfig: IMetricAggConfig, key: string) => {
  const indexPattern = aggConfig.getIndexPattern();
  if (aggConfig.getField()) {
    return buildExistsFilter(aggConfig.getField(), indexPattern.id!);
  } else {
    return { match_all: {} };
  }
};
