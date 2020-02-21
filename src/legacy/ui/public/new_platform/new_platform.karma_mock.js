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

import sinon from 'sinon';
import { getFieldFormatsRegistry } from '../../../../test_utils/public/stub_field_formats';
import { METRIC_TYPE } from '@kbn/analytics';
import { ComponentRegistry } from '../../../../../src/plugins/advanced_settings/public/';

const mockObservable = () => {
  return {
    subscribe: () => {},
    pipe: () => {
      return {
        subscribe: () => {},
      };
    },
  };
};

const mockComponent = () => {
  return null;
};

export const mockUiSettings = {
  get: item => {
    return mockUiSettings[item];
  },
  getUpdate$: () => ({
    subscribe: sinon.fake(),
  }),
  'query:allowLeadingWildcards': true,
  'query:queryString:options': {},
  'courier:ignoreFilterIfFieldNotInIndex': true,
  'dateFormat:tz': 'Browser',
  'format:defaultTypeMap': {},
};

const mockCore = {
  chrome: {},
  uiSettings: mockUiSettings,
  http: {
    basePath: {
      get: sinon.fake.returns(''),
    },
  },
};

let refreshInterval = undefined;
let isTimeRangeSelectorEnabled = true;
let isAutoRefreshSelectorEnabled = true;

export const npSetup = {
  core: mockCore,
  plugins: {
    advancedSettings: {
      component: {
        register: sinon.fake(),
        componentType: ComponentRegistry.componentType,
      },
    },
    usageCollection: {
      allowTrackUserAgent: sinon.fake(),
      reportUiStats: sinon.fake(),
      METRIC_TYPE,
    },
    embeddable: {
      registerEmbeddableFactory: sinon.fake(),
    },
    expressions: {
      registerFunction: sinon.fake(),
      registerRenderer: sinon.fake(),
      registerType: sinon.fake(),
      __LEGACY: {
        renderers: {
          register: () => undefined,
          get: () => null,
        },
        getExecutor: () => ({
          interpreter: {
            interpretAst: () => {},
          },
        }),
      },
    },
    data: {
      autocomplete: {
        addProvider: sinon.fake(),
        getProvider: sinon.fake(),
      },
      query: {
        filterManager: {
          getFetches$: sinon.fake(),
          getFilters: sinon.fake(),
          getAppFilters: sinon.fake(),
          getGlobalFilters: sinon.fake(),
          removeFilter: sinon.fake(),
          addFilters: sinon.fake(),
          setFilters: sinon.fake(),
          removeAll: sinon.fake(),
          getUpdates$: mockObservable,
        },
        timefilter: {
          timefilter: {
            getTime: sinon.fake(),
            getRefreshInterval: sinon.fake(),
            getTimeUpdate$: mockObservable,
            getRefreshIntervalUpdate$: mockObservable,
            getFetch$: mockObservable,
            getAutoRefreshFetch$: mockObservable,
            getEnabledUpdated$: mockObservable,
            getTimeUpdate$: mockObservable,
            getRefreshIntervalUpdate$: mockObservable,
            isTimeRangeSelectorEnabled: () => {
              return isTimeRangeSelectorEnabled;
            },
            isAutoRefreshSelectorEnabled: () => {
              return isAutoRefreshSelectorEnabled;
            },
            disableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = false;
            },
            enableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = true;
            },
            getRefreshInterval: () => {
              return refreshInterval;
            },
            setRefreshInterval: interval => {
              refreshInterval = interval;
            },
            enableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = true;
            },
            disableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = false;
            },
            getTime: sinon.fake(),
            setTime: sinon.fake(),
            getActiveBounds: sinon.fake(),
            getBounds: sinon.fake(),
            calculateBounds: sinon.fake(),
            createFilter: sinon.fake(),
          },
          history: sinon.fake(),
        },
        savedQueries: {
          saveQuery: sinon.fake(),
          getAllSavedQueries: sinon.fake(),
          findSavedQueries: sinon.fake(),
          getSavedQuery: sinon.fake(),
          deleteSavedQuery: sinon.fake(),
          getSavedQueryCount: sinon.fake(),
        },
      },
      __LEGACY: {
        esClient: {
          search: sinon.fake(),
          msearch: sinon.fake(),
        },
      },
      fieldFormats: getFieldFormatsRegistry(mockCore),
    },
    share: {
      register: () => {},
    },
    devTools: {
      register: () => {},
    },
    kibanaLegacy: {
      registerLegacyApp: () => {},
      forwardApp: () => {},
      config: {
        defaultAppId: 'home',
      },
    },
    inspector: {
      registerView: () => undefined,
      __LEGACY: {
        views: {
          register: () => undefined,
        },
      },
    },
    uiActions: {
      attachAction: sinon.fake(),
      registerAction: sinon.fake(),
      registerTrigger: sinon.fake(),
    },
    home: {
      featureCatalogue: {
        register: sinon.fake(),
      },
      environment: {
        update: sinon.fake(),
      },
      config: {
        disableWelcomeScreen: false,
      },
    },
    charts: {
      theme: {
        chartsTheme$: mockObservable,
        useChartsTheme: sinon.fake(),
      },
      colors: {
        seedColors: ['white', 'black'],
      },
    },
    management: {
      sections: {
        getSection: () => ({
          registerApp: sinon.fake(),
        }),
      },
    },
    discover: {
      docViews: {
        addDocView: sinon.fake(),
        setAngularInjectorGetter: sinon.fake(),
      },
    },
  },
};

export const npStart = {
  core: {
    chrome: {
      overlays: {
        openModal: sinon.fake(),
      },
    },
  },
  plugins: {
    management: {
      legacy: {
        getSection: () => ({
          register: sinon.fake(),
          deregister: sinon.fake(),
          hasItem: sinon.fake(),
        }),
      },
      sections: {
        getSection: () => ({
          registerApp: sinon.fake(),
        }),
      },
    },
    embeddable: {
      getEmbeddableFactory: sinon.fake(),
      getEmbeddableFactories: sinon.fake(),
      registerEmbeddableFactory: sinon.fake(),
    },
    expressions: {
      registerFunction: sinon.fake(),
      registerRenderer: sinon.fake(),
      registerType: sinon.fake(),
    },
    devTools: {
      getSortedDevTools: () => [],
    },
    kibanaLegacy: {
      getApps: () => [],
      getForwards: () => [],
      config: {
        defaultAppId: 'home',
      },
      dashboardConfig: {
        turnHideWriteControlsOn: sinon.fake(),
        getHideWriteControls: sinon.fake(),
      },
    },
    data: {
      autocomplete: {
        getProvider: sinon.fake(),
      },
      getSuggestions: sinon.fake(),
      indexPatterns: {
        get: sinon.spy(indexPatternId =>
          Promise.resolve({
            id: indexPatternId,
            isTimeNanosBased: () => false,
            popularizeField: () => {},
          })
        ),
      },
      ui: {
        IndexPatternSelect: mockComponent,
        SearchBar: mockComponent,
      },
      query: {
        filterManager: {
          getFetches$: sinon.fake(),
          getFilters: sinon.fake(),
          getAppFilters: sinon.fake(),
          getGlobalFilters: sinon.fake(),
          removeFilter: sinon.fake(),
          addFilters: sinon.fake(),
          setFilters: sinon.fake(),
          removeAll: sinon.fake(),
          getUpdates$: mockObservable,
        },
        timefilter: {
          timefilter: {
            getFetch$: mockObservable,
            getAutoRefreshFetch$: mockObservable,
            getEnabledUpdated$: mockObservable,
            getTimeUpdate$: mockObservable,
            getRefreshIntervalUpdate$: mockObservable,
            isTimeRangeSelectorEnabled: () => {
              return isTimeRangeSelectorEnabled;
            },
            isAutoRefreshSelectorEnabled: () => {
              return isAutoRefreshSelectorEnabled;
            },
            disableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = false;
            },
            enableAutoRefreshSelector: () => {
              isAutoRefreshSelectorEnabled = true;
            },
            getRefreshInterval: () => {
              return refreshInterval;
            },
            setRefreshInterval: interval => {
              refreshInterval = interval;
            },
            enableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = true;
            },
            disableTimeRangeSelector: () => {
              isTimeRangeSelectorEnabled = false;
            },
            getTime: sinon.fake(),
            setTime: sinon.fake(),
            getActiveBounds: sinon.fake(),
            getBounds: sinon.fake(),
            calculateBounds: sinon.fake(),
            createFilter: sinon.fake(),
          },
          history: sinon.fake(),
        },
      },
      search: {
        __LEGACY: {
          esClient: {
            search: sinon.fake(),
            msearch: sinon.fake(),
          },
        },
      },
      fieldFormats: getFieldFormatsRegistry(mockCore),
    },
    share: {
      toggleShareContextMenu: () => {},
    },
    inspector: {
      isAvailable: () => false,
      open: () => ({
        onClose: Promise.resolve(undefined),
        close: () => Promise.resolve(undefined),
      }),
    },
    uiActions: {
      attachAction: sinon.fake(),
      registerAction: sinon.fake(),
      registerTrigger: sinon.fake(),
      detachAction: sinon.fake(),
      executeTriggerActions: sinon.fake(),
      getTrigger: sinon.fake(),
      getTriggerActions: sinon.fake(),
      getTriggerCompatibleActions: sinon.fake(),
    },
    home: {
      featureCatalogue: {
        get: sinon.fake(),
        register: sinon.fake(),
      },
      environment: {
        get: sinon.fake(),
      },
      config: {
        disableWelcomeScreen: false,
      },
    },
    navigation: {
      ui: {
        TopNavMenu: mockComponent,
      },
    },
    charts: {
      theme: {
        chartsTheme$: mockObservable,
        useChartsTheme: sinon.fake(),
      },
    },
  },
};

export function __setup__(coreSetup) {
  npSetup.core = coreSetup;

  // no-op application register calls (this is overwritten to
  // bootstrap an LP plugin outside of tests)
  npSetup.core.application.register = () => {};
}

export function __start__(coreStart) {
  npStart.core = coreStart;
}
