/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getInitialState, reducer } from './state_management';
import { EditorFrameProps } from '.';
import { Datasource, Visualization } from '../../types';

describe('editor_frame state management', () => {
  describe('initialization', () => {
    let props: EditorFrameProps;

    beforeEach(() => {
      props = {
        datasourceMap: { testDatasource: ({} as unknown) as Datasource },
        visualizationMap: { testVis: ({ initialize: jest.fn() } as unknown) as Visualization },
        initialDatasource: 'testDatasource',
        initialVisualization: 'testVis',
      };
    });

    it('should store initial datasource and visualization', () => {
      const initialState = getInitialState(props);
      expect(initialState.datasource.activeId).toEqual('testDatasource');
      expect(initialState.visualization.activeId).toEqual('testVis');
    });

    it('should initialize visualization', () => {
      const initialVisState = {};
      props.visualizationMap.testVis.initialize = jest.fn(() => initialVisState);

      const initialState = getInitialState(props);

      expect(initialState.visualization.stateMap.testVis).toBe(initialVisState);
      expect(props.visualizationMap.testVis.initialize).toHaveBeenCalled();
    });

    it('should not initialize visualization if no initial visualization is passed in', () => {
      const initialState = getInitialState({ ...props, initialVisualization: null });

      expect(initialState.visualization.stateMap).toEqual({});
      expect(props.visualizationMap.testVis.initialize).not.toHaveBeenCalled();
    });
  });

  describe('state update', () => {
    it('should update the corresponding visualization state on update', () => {
      const newVisState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          visualization: {
            activeId: 'testVis',
            stateMap: {
              testVis: {},
            },
          },
        },
        {
          type: 'UPDATE_VISUALIZATION_STATE',
          newState: newVisState,
        }
      );

      expect(newState.visualization.stateMap).toEqual({
        testVis: newVisState,
      });
    });

    it('should update the datasource state on update', () => {
      const newDatasourceState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          visualization: {
            activeId: 'testVis',
            stateMap: {
              testVis: {},
            },
          },
        },
        {
          type: 'UPDATE_DATASOURCE_STATE',
          newState: newDatasourceState,
        }
      );

      expect(newState.datasource.state).toBe(newDatasourceState);
    });

    it('should should switch active visualization but dont loose old state', () => {
      const testVisState = {};
      const newVisState = {};
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          visualization: {
            activeId: 'testVis',
            stateMap: {
              testVis: testVisState,
            },
          },
        },
        {
          type: 'SWITCH_VISUALIZATION',
          newVisualizationId: 'testVis2',
          initialState: newVisState,
        }
      );

      expect(newState.visualization.stateMap.testVis).toBe(testVisState);
      expect(newState.visualization.stateMap.testVis2).toBe(newVisState);
    });

    it('should should switch active datasource and purge visualization state', () => {
      const newState = reducer(
        {
          datasource: {
            activeId: 'testDatasource',
            state: {},
            isLoading: false,
          },
          visualization: {
            activeId: 'testVis',
            stateMap: {
              testVis: {},
            },
          },
        },
        {
          type: 'SWITCH_DATASOURCE',
          newDatasourceId: 'testDatasource2',
        }
      );

      expect(newState.visualization.stateMap).toEqual({});
      expect(newState.visualization.activeId).toBe(null);
      expect(newState.datasource.activeId).toBe('testDatasource2');
      expect(newState.datasource.state).toBe(null);
    });
  });
});
