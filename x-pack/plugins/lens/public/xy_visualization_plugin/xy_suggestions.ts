/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { partition } from 'lodash';
import { Position } from '@elastic/charts';
import { XYArgs } from './xy_expression';
import { SuggestionRequest, VisualizationSuggestion, TableColumn, TableSuggestion } from '../types';

/**
 * Generate suggestions for the xy chart.
 *
 * @param opts
 */
export function getSuggestions(
  opts: SuggestionRequest<XYArgs>
): Array<VisualizationSuggestion<XYArgs>> {
  return opts.tables
    .filter(
      ({ isMultiRow, columns }) =>
        // We only render line charts for multi-row queries. We require at least
        // two columns: one for x and at least one for y, and y columns must be numeric.
        isMultiRow && columns.length > 1 && columns.find(col => col.operation.dataType === 'number')
    )
    .map(table => getSuggestionForColumns(table));
}

function getSuggestionForColumns(table: TableSuggestion): VisualizationSuggestion<XYArgs> {
  const [buckets, values] = partition(
    prioritizeColumns(table.columns),
    col => col.operation.isBucketed
  );

  if (buckets.length >= 1) {
    const [x, splitBy] = buckets;
    return getSuggestion(table.datasourceSuggestionId, x, values, splitBy);
  } else {
    const [x, ...yValues] = values;
    return getSuggestion(table.datasourceSuggestionId, x, yValues);
  }
}

// This shuffles columns around so that the left-most column defualts to:
// date, string, boolean, then number, in that priority. We then use this
// order to pluck out the x column, and the split / stack column.
function prioritizeColumns(columns: TableColumn[]) {
  const columnSortOrder = {
    date: 0,
    string: 1,
    boolean: 2,
    number: 3,
  };

  return [...columns].sort(
    (a, b) => columnSortOrder[a.operation.dataType] - columnSortOrder[b.operation.dataType]
  );
}

function getSuggestion(
  datasourceSuggestionId: number,
  xValue: TableColumn,
  yValues: TableColumn[],
  splitBy?: TableColumn
): VisualizationSuggestion<XYArgs> {
  const yTitle = yValues.map(col => col.operation.label).join(' & ');
  const xTitle = xValue.operation.label;
  const isDate = xValue.operation.dataType === 'date';

  // TODO: Localize the title, label, etc
  const preposition = isDate ? 'over' : 'of';
  const title = `${yTitle} ${preposition} ${xTitle}`;
  return {
    title,
    score: 1,
    datasourceSuggestionId,
    state: {
      title,
      legend: { isVisible: true, position: Position.Right },
      seriesType: isDate ? 'line' : 'bar',
      splitSeriesAccessors: splitBy && isDate ? [splitBy.columnId] : [],
      stackAccessors: splitBy && !isDate ? [splitBy.columnId] : [],
      x: {
        accessor: xValue.columnId,
        position: Position.Bottom,
        showGridlines: false,
        title: xTitle,
      },
      y: {
        accessors: yValues.map(col => col.columnId),
        position: Position.Left,
        showGridlines: false,
        title: yTitle,
      },
    },
  };
}
