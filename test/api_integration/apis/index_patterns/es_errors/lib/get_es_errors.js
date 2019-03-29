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

import expect from '@kbn/expect';

export async function getIndexNotFoundError(es) {
  try {
    await es.indices.get({
      index: 'SHOULD NOT EXIST'
    });
  } catch (err) {
    expect(err).to.have.property('status', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.indices.get() call to fail');
}

export async function getDocNotFoundError(es) {
  try {
    await es.get({
      index: 'basic_index',
      type: 'type',
      id: '1234'
    });
  } catch (err) {
    expect(err).to.have.property('status', 404); // sanity check
    return err;
  }

  throw new Error('Expected es.get() call to fail');
}
