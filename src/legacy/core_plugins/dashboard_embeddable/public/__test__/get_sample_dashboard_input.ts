/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { QueryLanguageType, ViewMode } from 'plugins/embeddable_api/index';
import { DashboardContainerInput, DashboardPanelState } from '../embeddable';

export function getSampleDashboardInput(
  overrides?: Partial<DashboardContainerInput>
): DashboardContainerInput {
  return {
    id: '123',
    filters: [],
    useMargins: false,
    isFullScreenMode: false,
    title: 'My Dashboard',
    customization: {},
    query: {
      language: QueryLanguageType.KUERY,
      query: 'hi',
    },
    timeRange: {
      to: 'now',
      from: 'now-15m',
    },
    viewMode: ViewMode.VIEW,
    panels: {},
    ...overrides,
  };
}

export function getSampleDashboardPanel(
  overrides: Partial<DashboardPanelState> & { embeddableId: string; type: string }
): DashboardPanelState {
  return {
    gridData: {
      h: 15,
      w: 15,
      x: 0,
      y: 0,
      i: overrides.embeddableId,
    },
    embeddableId: overrides.embeddableId,
    type: overrides.type,
    explicitInput: overrides.explicitInput || {},
    ...overrides,
  };
}
