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

import { schema, TypeOf } from '@kbn/config-schema';
import { ConfigDeprecationProvider } from '@kbn/config';

export type KibanaConfigType = TypeOf<typeof config.schema>;

const deprecations: ConfigDeprecationProvider = () => [
  (settings, fromPath, log) => {
    const kibana = settings[fromPath];
    if (kibana?.index) {
      log(
        `"kibana.index" is deprecated. Multitenancy by changing "kibana.index" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details`
      );
    }
    return settings;
  },
];

export const config = {
  path: 'kibana',
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    index: schema.string({ defaultValue: '.kibana' }),
    autocompleteTerminateAfter: schema.duration({ defaultValue: 100000 }),
    autocompleteTimeout: schema.duration({ defaultValue: 1000 }),
  }),
  deprecations,
};
