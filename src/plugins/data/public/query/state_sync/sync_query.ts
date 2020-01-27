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

import { Subscription } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  createStateContainer,
  IKbnUrlStateStorage,
  syncState,
} from '../../../../kibana_utils/public';
import { COMPARE_ALL_OPTIONS, compareFilters } from '../filter_manager/lib/compare_filters';
import { esFilters, RefreshInterval, TimeRange } from '../../../common';
import { QueryStart } from '../query_service';

const GLOBAL_STATE_STORAGE_KEY = '_g';

interface QuerySyncState {
  time?: TimeRange;
  refreshInterval?: RefreshInterval;
  filters?: esFilters.Filter[];
}

/**
 * Helper utility to set up syncing between query services and url's '_g' query param
 */
export const syncQuery = (
  { timefilter: { timefilter }, filterManager }: QueryStart,
  urlStateStorage: IKbnUrlStateStorage
) => {
  const defaultState: QuerySyncState = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  // retrieve current state from `_g` url
  const initialStateFromUrl = urlStateStorage.get<QuerySyncState>(GLOBAL_STATE_STORAGE_KEY);

  // remember whether there were info in the URL
  const hasInheritedQueryFromUrl = Boolean(
    initialStateFromUrl && Object.keys(initialStateFromUrl).length
  );

  // prepare initial state, whatever was in URL takes precedences over current state in services
  const initialState: QuerySyncState = {
    ...defaultState,
    ...initialStateFromUrl,
  };

  // create state container, which will be used for syncing with syncState() util
  const filtersSyncStateContainer = createStateContainer(
    initialState,
    {
      setTime: (state: QuerySyncState) => (time: TimeRange) => ({ ...state, time }),
      setRefreshInterval: (state: QuerySyncState) => (refreshInterval: RefreshInterval) => ({
        ...state,
        refreshInterval,
      }),
      setFilters: (state: QuerySyncState) => (filters: esFilters.Filter[]) => ({
        ...state,
        filters,
      }),
    },
    {
      time: (state: QuerySyncState) => () => state.time,
      refreshInterval: (state: QuerySyncState) => () => state.refreshInterval,
      filters: (state: QuerySyncState) => () => state.filters,
    }
  );

  const subs: Subscription[] = [
    timefilter.getTimeUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setTime(timefilter.getTime());
    }),
    timefilter.getRefreshIntervalUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setRefreshInterval(timefilter.getRefreshInterval());
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()), // we need to track only global filters here
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = filtersSyncStateContainer.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        filtersSyncStateContainer.transitions.setFilters(newGlobalFilters);
      }),
    filtersSyncStateContainer.state$.subscribe(
      ({ time, filters: globalFilters, refreshInterval }) => {
        // cloneDeep is required because services are mutating passed objects
        // and state in state container is frozen

        if (time && !_.isEqual(time, timefilter.getTime())) {
          timefilter.setTime(_.cloneDeep(time));
        }

        if (refreshInterval && !_.isEqual(refreshInterval, timefilter.getRefreshInterval())) {
          timefilter.setRefreshInterval(_.cloneDeep(refreshInterval));
        }

        if (
          globalFilters &&
          !compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)
        ) {
          filterManager.setGlobalFilters(_.cloneDeep(globalFilters));
        }
      }
    ),
  ];

  // if there weren't any initial state in url,
  // then put _g key into url
  if (!initialStateFromUrl) {
    urlStateStorage.set<QuerySyncState>(GLOBAL_STATE_STORAGE_KEY, initialState, {
      replace: true,
    });
  }

  // trigger initial syncing from state container to services if needed
  filtersSyncStateContainer.set(initialState);

  const { start, stop } = syncState({
    stateStorage: urlStateStorage,
    stateContainer: {
      ...filtersSyncStateContainer,
      set: state => {
        if (state) {
          // syncState utils requires to handle incoming "null" value
          filtersSyncStateContainer.set(state);
        }
      },
    },
    storageKey: GLOBAL_STATE_STORAGE_KEY,
  });

  start();
  return {
    stop: () => {
      subs.forEach(s => s.unsubscribe());
      stop();
    },
    hasInheritedQueryFromUrl,
  };
};

export const getQueryObservable = (
  { timefilter: { timefilter }, filterManager }: QueryStart,
) => {
  const defaultState: QuerySyncState = {
    time: timefilter.getTime(),
    refreshInterval: timefilter.getRefreshInterval(),
    filters: filterManager.getGlobalFilters(),
  };

  // prepare initial state, whatever was in URL takes precedences over current state in services
  const initialState: QuerySyncState = {
    ...defaultState,
  };

  // create state container, which will be used for syncing with syncState() util
  const filtersSyncStateContainer = createStateContainer(
    initialState,
    {
      setTime: (state: QuerySyncState) => (time: TimeRange) => ({ ...state, time }),
      setRefreshInterval: (state: QuerySyncState) => (refreshInterval: RefreshInterval) => ({
        ...state,
        refreshInterval,
      }),
      setFilters: (state: QuerySyncState) => (filters: esFilters.Filter[]) => ({
        ...state,
        filters,
      }),
    },
    {
      time: (state: QuerySyncState) => () => state.time,
      refreshInterval: (state: QuerySyncState) => () => state.refreshInterval,
      filters: (state: QuerySyncState) => () => state.filters,
    }
  );

  const subs: Subscription[] = [
    timefilter.getTimeUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setTime(timefilter.getTime());
    }),
    timefilter.getRefreshIntervalUpdate$().subscribe(() => {
      filtersSyncStateContainer.transitions.setRefreshInterval(timefilter.getRefreshInterval());
    }),
    filterManager
      .getUpdates$()
      .pipe(
        map(() => filterManager.getGlobalFilters()), // we need to track only global filters here
        filter(newGlobalFilters => {
          // continue only if global filters changed
          // and ignore app state filters
          const oldGlobalFilters = filtersSyncStateContainer.get().filters;
          return (
            !oldGlobalFilters ||
            !compareFilters(newGlobalFilters, oldGlobalFilters, COMPARE_ALL_OPTIONS)
          );
        })
      )
      .subscribe(newGlobalFilters => {
        filtersSyncStateContainer.transitions.setFilters(newGlobalFilters);
      }),
    filtersSyncStateContainer.state$.subscribe(
      ({ time, filters: globalFilters, refreshInterval }) => {
        // cloneDeep is required because services are mutating passed objects
        // and state in state container is frozen

        if (time && !_.isEqual(time, timefilter.getTime())) {
          timefilter.setTime(_.cloneDeep(time));
        }

        if (refreshInterval && !_.isEqual(refreshInterval, timefilter.getRefreshInterval())) {
          timefilter.setRefreshInterval(_.cloneDeep(refreshInterval));
        }

        if (
          globalFilters &&
          !compareFilters(globalFilters, filterManager.getGlobalFilters(), COMPARE_ALL_OPTIONS)
        ) {
          filterManager.setGlobalFilters(_.cloneDeep(globalFilters));
        }
      }
    ),
  ];

  // trigger initial syncing from state container to services if needed
  filtersSyncStateContainer.set(initialState);

  return filtersSyncStateContainer.state$;
};
