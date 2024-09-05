/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

export function EntityOverviewHeader({ children }: { children: React.ReactNode }) {
  return <EuiFlexGroup direction="row">{children}</EuiFlexGroup>;
}
