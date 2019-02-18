/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';

// TODO: Remove once typescript definitions are in EUI

declare module '@elastic/eui' {
  export const EuiBasicTable: React.SFC<any>;
}
