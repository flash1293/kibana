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

import { createHashHistory, History } from 'history';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppBase } from 'kibana/public';
import { setStateToKbnUrl } from './kbn_url_storage';

export interface KbnUrlTracker {
  /**
   * Callback to invoke when the app is mounted
   */
  appMounted: () => void;
  /**
   * Callback to invoke when the app is unmounted
   */
  appUnMounted: () => void;
  /**
   * Unregistering the url tracker. This won't reset the current state of the nav link
   */
  stop: () => void;
}

/**
 * Listens to history changes and optionally to global state changes and updates the nav link url of
 * a given app to point to the last visited page within the app.
 *
 * This includes the following parts:
 * * When the app is currently active, the nav link points to the configurable default url of the app.
 * * When the app is not active the last visited url is set to the nav link.
 * * When a provided observable emits a new value, the state parameter in the url of the nav link is updated
 * as long as the app is not active.
 */
export function createKbnUrlTracker({
  baseUrl,
  defaultSubUrl,
  storageKey,
  stateParams,
  navLinkUpdater$,
  history,
  storage,
}: {
  /**
   * Base url of the current app. This will be used as a prefix for the
   * nav link in the side bar
   */
  baseUrl: string;
  /**
   * Default sub url for this app. If the app is currently active or no sub url is already stored in session storage and the app hasn't been visited yet, the nav link will be set to this url.
   */
  defaultSubUrl: string;
  /**
   * List of URL mapped states that should get updated even when the app is not currently active
   */
  stateParams: Array<{
    /**
     * Function that returns a flag whether to store the state directly in the URL or whether to reference them from session storage via a hash value
     */
    useHash: () => boolean;
    /**
     * Key of the query parameter containing the state
     */
    kbnUrlKey: string;
    /**
     * Observable providing updates to the state
     */
    stateUpdate$: Observable<unknown>;
  }>;
  /**
   * Key used to store the current sub url in session storage. This key should only be used for one active url tracker at any given ntime.
   */
  storageKey: string;
  /**
   * App updater subject passed into the application definition to change nav link url.
   */
  navLinkUpdater$: BehaviorSubject<(app: AppBase) => { activeUrl?: string } | undefined>;
  /**
   * History object to use to track url changes. If this isn't provided, a local history instance will be created.
   */
  history?: History;
  /**
   * Storage object to use to persist currently active url. If this isn't provided, the browser wide session storage instance will be used.
   */
  storage?: Storage;
}): KbnUrlTracker {
  const historyInstance = history || createHashHistory();
  const storageInstance = storage || sessionStorage;

  // local state storing current app status and active url
  let activeUrl: string = '';
  let appIsMounted = false;

  function setNavLink(hash: string) {
    navLinkUpdater$.next(() => ({ activeUrl: baseUrl + hash }));
  }

  // track current hash when within app
  const stopHistory = historyInstance.listen(location => {
    if (!appIsMounted) {
      return;
    }
    activeUrl = '#' + location.pathname + location.search;
    storageInstance.setItem(storageKey, activeUrl);
  });

  // propagate state updates when in other apps
  const subs = stateParams.map(({ stateUpdate$, kbnUrlKey, useHash }) =>
    stateUpdate$.subscribe(state => {
      if (appIsMounted) {
        return;
      }
      const updatedUrl = setStateToKbnUrl(
        kbnUrlKey,
        state,
        { useHash: useHash() },
        baseUrl + (activeUrl || defaultSubUrl)
      );
      // remove baseUrl prefix (just storing the sub url part)
      activeUrl = updatedUrl.substr(baseUrl.length);
      storageInstance.setItem(storageKey, activeUrl);
      setNavLink(activeUrl);
    })
  );

  // initialize nav link and internal state
  const storedUrl = storageInstance.getItem(storageKey);
  if (storedUrl) {
    activeUrl = storedUrl;
    setNavLink(storedUrl);
  }

  return {
    appMounted() {
      appIsMounted = true;
      setNavLink(defaultSubUrl);
    },
    appUnMounted() {
      appIsMounted = false;
      setNavLink(activeUrl);
    },
    stop() {
      stopHistory();
      subs.forEach(sub => sub.unsubscribe());
    },
  };
}
