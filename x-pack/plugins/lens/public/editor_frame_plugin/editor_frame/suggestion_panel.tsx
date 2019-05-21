/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Action } from './state_management';
import { Datasource, Visualization, DatasourcePublicAPI } from '../../types';
import { getSuggestions, toSwitchAction } from './suggestion_helpers';

interface SuggestionPanelProps {
  activeDatasource: Datasource;
  datasourceState: unknown;
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  activeVisualizationState: unknown;
  datasourcePublicAPI: DatasourcePublicAPI;
  dispatch: (action: Action) => void;
}

export function SuggestionPanel({
  activeDatasource,
  datasourceState,
  activeVisualizationId,
  visualizationMap,
  activeVisualizationState,
  datasourcePublicAPI,
  dispatch,
}: SuggestionPanelProps) {
  const datasourceSuggestions = activeDatasource.getDatasourceSuggestionsFromCurrentState(
    datasourceState
  );

  const suggestions = getSuggestions(
    datasourceSuggestions,
    visualizationMap,
    activeVisualizationId,
    activeVisualizationState,
    datasourcePublicAPI
  );

  return (
    <>
      {/* TODO: I18N */}
      <h2>Suggestions</h2>
      {suggestions.map((suggestion, index) => {
        return (
          <button
            key={index}
            data-test-subj="suggestion"
            onClick={() => {
              dispatch(toSwitchAction(suggestion));
            }}
          >
            {suggestion.title}
          </button>
        );
      })}
    </>
  );
}
