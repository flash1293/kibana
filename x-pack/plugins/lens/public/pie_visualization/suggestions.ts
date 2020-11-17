/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SuggestionRequest, VisualizationSuggestion } from '../types';
import { PieVisualizationState } from './types';
import { CHART_NAMES, MAX_PIE_BUCKETS, MAX_TREEMAP_BUCKETS } from './constants';

function shouldReject({ table, keptLayerIds }: SuggestionRequest<PieVisualizationState>) {
  return (
    keptLayerIds.length > 1 ||
    (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
    table.changeType === 'reorder'
  );
}

export function suggestions({
  table,
  state,
  keptLayerIds,
  mainPalette,
}: SuggestionRequest<PieVisualizationState>): Array<
  VisualizationSuggestion<PieVisualizationState>
> {
  if (shouldReject({ table, state, keptLayerIds })) {
    return [];
  }

  const [groups, metrics] = partition(table.columns, (col) => col.operation.isBucketed);

  if (metrics.length > 1 || groups.length > Math.max(MAX_PIE_BUCKETS, MAX_TREEMAP_BUCKETS)) {
    return [];
  }

  const incompleteConfiguration = metrics.length === 0 || groups.length === 0;
  const metricColumnId = metrics.length > 0 ? metrics[0].columnId : undefined;

  const results: Array<VisualizationSuggestion<PieVisualizationState>> = [];

  if (groups.length <= MAX_PIE_BUCKETS) {
    let newShape: PieVisualizationState['shape'] = 'donut';
    if (groups.length !== 1) {
      newShape = 'pie';
    }

    const baseSuggestion: VisualizationSuggestion<PieVisualizationState> = {
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: 'As {chartName}',
        values: { chartName: CHART_NAMES[newShape].label },
        description: 'chartName is already translated',
      }),
      score: state && state.shape !== 'treemap' ? 0.6 : 0.4,
      state: {
        shape: newShape,
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
              },
        ],
      },
      previewIcon: 'bullseye',
      // dont show suggestions for same type
      hide: table.changeType === 'reduced' || (state && state.shape !== 'treemap'),
    };

    results.push(baseSuggestion);
    results.push({
      ...baseSuggestion,
      title: i18n.translate('xpack.lens.pie.suggestionLabel', {
        defaultMessage: 'As {chartName}',
        values: { chartName: CHART_NAMES[newShape === 'pie' ? 'donut' : 'pie'].label },
        description: 'chartName is already translated',
      }),
      score: 0.1,
      state: {
        ...baseSuggestion.state,
        shape: newShape === 'pie' ? 'donut' : 'pie',
      },
      hide: true,
    });
  }

  if (groups.length <= MAX_TREEMAP_BUCKETS) {
    results.push({
      title: i18n.translate('xpack.lens.pie.treemapSuggestionLabel', {
        defaultMessage: 'As Treemap',
      }),
      // Use a higher score when currently active, to prevent chart type switching
      // on the user unintentionally
      score: state?.shape === 'treemap' ? 0.7 : 0.5,
      state: {
        shape: 'treemap',
        palette: mainPalette || state?.palette,
        layers: [
          state?.layers[0]
            ? {
                ...state.layers[0],
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                categoryDisplay:
                  state.layers[0].categoryDisplay === 'inside'
                    ? 'default'
                    : state.layers[0].categoryDisplay,
              }
            : {
                layerId: table.layerId,
                groups: groups.map((col) => col.columnId),
                metric: metricColumnId,
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
              },
        ],
      },
      previewIcon: 'bullseye',
      // hide treemap suggestions from bottom bar, but keep them for chart switcher
      hide: table.changeType === 'reduced' || !state || (state && state.shape === 'treemap'),
    });
  }

  return [...results]
    .sort((a, b) => a.score - b.score)
    .map((suggestion) => ({
      ...suggestion,
      hide:
        incompleteConfiguration ||
        table.columns.some((col) => col.operation.scale === 'interval') || // Histograms are not good for pie
        suggestion.hide,
    }));
}
