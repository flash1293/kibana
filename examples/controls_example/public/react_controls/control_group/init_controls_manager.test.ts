/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultControlApi } from '../types';
import { initControlsManager } from './init_controls_manager';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('delta'),
}));

describe('PresentationContainer api', () => {
  test('addNewPanel should add control at end of controls', async () => {
    const controlsManager = initControlsManager({
      alpha: { type: 'whatever', order: 0 },
      bravo: { type: 'whatever', order: 1 },
      charlie: { type: 'whatever', order: 2 },
    });
    const addNewPanelPromise = controlsManager.api.addNewPanel({
      panelType: 'whatever',
      initialState: {},
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await addNewPanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'bravo',
      'charlie',
      'delta',
    ]);
  });

  test('removePanel should remove control', () => {
    const controlsManager = initControlsManager({
      alpha: { type: 'whatever', order: 0 },
      bravo: { type: 'whatever', order: 1 },
      charlie: { type: 'whatever', order: 2 },
    });
    controlsManager.api.removePanel('bravo');
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'charlie',
    ]);
  });

  test('replacePanel should replace control', async () => {
    const controlsManager = initControlsManager({
      alpha: { type: 'whatever', order: 0 },
      bravo: { type: 'whatever', order: 1 },
      charlie: { type: 'whatever', order: 2 },
    });
    const replacePanelPromise = controlsManager.api.replacePanel('bravo', {
      panelType: 'whatever',
      initialState: {},
    });
    controlsManager.setControlApi('delta', {} as unknown as DefaultControlApi);
    await replacePanelPromise;
    expect(controlsManager.controlsInOrder$.value.map((element) => element.id)).toEqual([
      'alpha',
      'delta',
      'charlie',
    ]);
  });

  describe('untilInitialized', () => {
    test('should not resolve until all controls are initialized', async () => {
      const controlsManager = initControlsManager({
        alpha: { type: 'whatever', order: 0 },
        bravo: { type: 'whatever', order: 1 },
      });
      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(false);

      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });

    test('should resolve when all control already initialized ', async () => {
      const controlsManager = initControlsManager({
        alpha: { type: 'whatever', order: 0 },
        bravo: { type: 'whatever', order: 1 },
      });
      controlsManager.setControlApi('alpha', {} as unknown as DefaultControlApi);
      controlsManager.setControlApi('bravo', {} as unknown as DefaultControlApi);

      let isDone = false;
      controlsManager.api.untilInitialized().then(() => {
        isDone = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(isDone).toBe(true);
    });
  });
});
