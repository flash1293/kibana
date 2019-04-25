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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

import { triggerRegistry } from '../triggers';
import { HELLO_WORLD_ACTION } from '../__test__/actions/hello_world_action';

beforeAll(() => {
  triggerRegistry.reset();
});

afterAll(() => {
  triggerRegistry.reset();
});

test('TriggerRegistry adding and getting a new trigger', async () => {
  const testTrigger = {
    id: 'MYTRIGGER',
    title: 'My trigger',
    actionIds: ['123'],
  };
  triggerRegistry.registerTrigger(testTrigger);

  expect(triggerRegistry.getTrigger('MYTRIGGER')).toBe(testTrigger);
});

test('TriggerRegistry attach a trigger to an action', async () => {
  triggerRegistry.attachAction({ triggerId: 'MYTRIGGER', actionId: HELLO_WORLD_ACTION });
  const trigger = triggerRegistry.getTrigger('MYTRIGGER');
  expect(trigger).toBeDefined();
  if (trigger) {
    expect(trigger.actionIds).toEqual(['123', HELLO_WORLD_ACTION]);
  }
});

test('TriggerRegistry dettach a trigger from an action', async () => {
  triggerRegistry.detachAction({ triggerId: 'MYTRIGGER', actionId: HELLO_WORLD_ACTION });
  const trigger = triggerRegistry.getTrigger('MYTRIGGER');
  expect(trigger).toBeDefined();
  if (trigger) {
    expect(trigger.actionIds).toEqual(['123']);
  }
});

test('TriggerRegistry dettach an invalid trigger from an action throws an error', async () => {
  expect(() =>
    triggerRegistry.detachAction({ triggerId: 'i do not exist', actionId: HELLO_WORLD_ACTION })
  ).toThrowError();
});

test('TriggerRegistry attach an invalid trigger from an action throws an error', async () => {
  expect(() =>
    triggerRegistry.attachAction({ triggerId: 'i do not exist', actionId: HELLO_WORLD_ACTION })
  ).toThrowError();
});
