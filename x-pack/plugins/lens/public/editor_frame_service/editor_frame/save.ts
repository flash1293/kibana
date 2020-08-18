/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { toExpression } from '@kbn/interpreter/target/common';
import { SavedObjectReference } from 'kibana/public';
import { EditorFrameState } from './state_management';
import { Datasource, Visualization, FramePublicAPI, DatasourceMetaData } from '../../types';
import { extractFilterReferences } from '../../persistence';
import { buildExpression } from './expression_helpers';
import { OnChangeProp } from './editor_frame';

export interface Props {
  activeDatasources: Record<string, Datasource>;
  state: EditorFrameState;
  visualization: Visualization;
  framePublicAPI: FramePublicAPI;
}

export function getSavedObjectFormat({
  activeDatasources,
  state,
  visualization,
  framePublicAPI,
}: Props): OnChangeProp {
  const datasourceStates: Record<string, unknown> = {};
  const references: SavedObjectReference[] = [];
  const indexPatternsByLayer: DatasourceMetaData['indexPatternsByLayer'] = [];
  Object.entries(activeDatasources).forEach(([id, datasource]) => {
    const { state: persistableState, savedObjectReferences } = datasource.getPersistableState(
      state.datasourceStates[id].state
    );
    datasourceStates[id] = persistableState;
    references.push(...savedObjectReferences);
    indexPatternsByLayer.push(
      ...datasource.getMetaData(state.datasourceStates[id].state).indexPatternsByLayer
    );
  });

  const { persistableFilters, references: filterReferences } = extractFilterReferences(
    framePublicAPI.filters
  );

  references.push(...filterReferences);

  const expression = buildExpression({
    visualization,
    visualizationState: state.visualization.state,
    datasourceMap: activeDatasources,
    datasourceStates: state.datasourceStates,
    framePublicAPI,
    removeDateRange: true,
  });

  return {
    doc: {
      id: state.persistedId,
      title: state.title,
      description: state.description,
      type: 'lens',
      visualizationType: state.visualization.activeId,
      expression: expression ? toExpression(expression) : null,
      state: {
        datasourceStates,
        visualization: state.visualization.state,
        query: framePublicAPI.query,
        filters: persistableFilters,
      },
      references,
    },
    indexPatternsByLayer,
    isSaveable: expression !== null,
  };
}
