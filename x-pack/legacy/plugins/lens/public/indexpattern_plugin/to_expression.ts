/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { IndexPatternPrivateState, IndexPatternColumn, AdjacencyIndexPatternColumn } from './indexpattern';
import { operationDefinitionMap, OperationDefinition } from './operations';

function getAggForColumn(col: IndexPatternColumn) {
  switch (col.operationType) {
    case 'count':
      return { value_count: { field: '_id' } };
    case 'avg':
    case 'sum':
    case 'min':
    case 'max':
      return {
        [col.operationType]: {
          field: col.sourceField,
        },
      };
    default:
      throw new Error('that wont work');
  }
}

export function toExpression(state: IndexPatternPrivateState) {
  if (state.columnOrder.length === 0) {
    return null;
  }

  function getEsAggsConfig<C extends IndexPatternColumn>(column: C, columnId: string) {
    // Typescript is not smart enough to infer that definitionMap[C['operationType']] is always OperationDefinition<C>,
    // but this is made sure by the typing of the operation map
    const operationDefinition = (operationDefinitionMap[
      column.operationType
    ] as unknown) as OperationDefinition<C>;
    return operationDefinition.toEsAggsConfig(column, columnId);
  }

  const columnEntries = state.columnOrder.map(
    colId => [colId, state.columns[colId]] as [string, IndexPatternColumn]
  );

  const sortedColumns = columnEntries.map(([_id, col]) => col);
    const hasAdjacencyOperation = sortedColumns.some(col => col.operationType === 'adjacency');
    if (hasAdjacencyOperation) {
      const [firstColumn, ...otherColumns] = sortedColumns;
      const childAgg = otherColumns.map(col => getAggForColumn(col));
      return `lens_graph_data filters='${JSON.stringify(
        (firstColumn as AdjacencyIndexPatternColumn).params.filters
      )}' childAggs='${JSON.stringify(childAgg)}' childAggNames='${JSON.stringify(otherColumns.map(col => col.label))}'`;
    }

  if (columnEntries.length) {
    const aggs = columnEntries.map(([colId, col]) => {
      return getEsAggsConfig(col, colId);
    });

    const idMap = columnEntries.reduce(
      (currentIdMap, [colId], index) => {
        return {
          ...currentIdMap,
          [`col-${index}-${colId}`]: colId,
        };
      },
      {} as Record<string, string>
    );

    return `esaggs
      index="${state.currentIndexPatternId}"
      metricsAtAllLevels=false
      partialRows=false
      aggConfigs='${JSON.stringify(aggs)}' | lens_rename_columns idMap='${JSON.stringify(idMap)}'`;
  }

  return null;
}
