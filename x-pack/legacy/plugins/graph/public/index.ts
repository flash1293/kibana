/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// legacy imports currently necessary to power Graph
// for a cutover all of these have to be resolved
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';
import 'uiExports/autocompleteProviders';
import 'ui/autoload/all';
import chrome from 'ui/chrome';
import { IPrivate } from 'ui/private';
import { fatalError } from 'ui/notify';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { Storage } from 'ui/storage';
// @ts-ignore
import { SavedObjectsClientProvider } from 'ui/saved_objects';
// @ts-ignore
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';

import { npSetup, npStart } from 'ui/new_platform';
import { start as data } from '../../../../../src/legacy/core_plugins/data/public/legacy';
import { GraphPlugin } from './plugin';

// @ts-ignore
import { SavedWorkspacesProvider } from './angular/services/saved_workspaces';
import { LegacyAngularInjectedDependencies } from './render_app';

/**
 * Get dependencies relying on the global angular context.
 * They also have to get resolved together with the legacy imports above
 */
async function getAngularInjectedDependencies(): Promise<LegacyAngularInjectedDependencies> {
  const injector = await chrome.dangerouslyGetActiveInjector();

  const Private = injector.get<IPrivate>('Private');

  return {
    $http: injector.get('$http'),
    confirmModal: injector.get('confirmModal'),
    savedObjectRegistry: Private(SavedObjectRegistryProvider),
    kbnBaseUrl: injector.get('kbnBaseUrl'),
    savedGraphWorkspaces: Private(SavedWorkspacesProvider),
    savedObjectsClient: Private(SavedObjectsClientProvider),
  };
}

(async () => {
  const instance = new GraphPlugin();
  instance.setup(npSetup.core, {
    __LEGACY: {
      xpackInfo,
      Storage,
      fatalError,
    },
  });
  instance.start(npStart.core, {
    data,
    npData: npStart.plugins.data,
    __LEGACY: {
      angularDependencies: await getAngularInjectedDependencies(),
    },
  });
})();
