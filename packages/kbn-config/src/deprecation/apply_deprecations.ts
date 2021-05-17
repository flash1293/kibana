/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, unset } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { ConfigDeprecationWithContext, AddConfigDeprecation } from './types';

const noopAddDeprecationFactory: () => AddConfigDeprecation = () => () => undefined;
/**
 * Applies deprecations on given configuration and passes addDeprecation hook.
 * This hook is used for logging any deprecation warning using provided logger.
 * This hook is used for exposing deprecated configs that must be handled by the user before upgrading to next major.
 *
 * @internal
 */
export const applyDeprecations = (
  config: Record<string, any>,
  deprecations: ConfigDeprecationWithContext[],
  createAddDeprecation: (pluginId: string) => AddConfigDeprecation = noopAddDeprecationFactory
) => {
  const result = cloneDeep(config);
  deprecations.forEach(({ deprecation, path }) => {
    const commands = deprecation(result, path, createAddDeprecation(path));
    if (commands) {
      if (commands.set) {
        commands.set.forEach(function ({ path: commandPath, value }) {
          set(result, commandPath, value);
        });
      }
      if (commands.unset) {
        commands.unset.forEach(function ({ path: commandPath }) {
          unset(result, commandPath);
        });
      }
    }
  });
  return result;
};
