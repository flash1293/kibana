/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField, Query } from '../../../common';
import { selectOperation, Suggestion, updateOperation, VisModel } from '../../../public';
import { getOperationSummary, OperationEditor } from '../../common/components/operation_editor';
import { removePrivateState } from './state_helpers';
import { XyChartVisModel } from './types';

export function XAxisEditor({
  operationId,
  visModel,
  onChangeVisModel,
  getSuggestions,
}: {
  operationId: string;
  visModel: XyChartVisModel;
  onChangeVisModel: (visModel: VisModel) => void;
  getSuggestions: (visModel: VisModel) => Suggestion[];
}) {
  const operation = selectOperation(operationId, visModel);

  if (!operation) {
    // TODO...
    return <span>N/A</span>;
  }

  return (
    <OperationEditor
      operation={operation}
      visModel={visModel}
      onOperationChange={newOperation => {
        onChangeVisModel(updateOperation(operationId, newOperation, visModel));
      }}
      allowedScale="ordinal"
      allowedCardinality="multi"
      defaultOperator={field => (field.type === 'date' ? 'date_histogram' : 'terms')}
      canDrop={(f: DatasourceField) => f.type === 'string' || f.type === 'date'}
      removable
      onOperationRemove={() => {
        const firstQuery = Object.values(visModel.queries)[0] as Query;
        const firstQueryKey = Object.keys(visModel.queries)[0];
        const xAxisOperation = selectOperation(visModel.private.xyChart.xAxis.columns[0], visModel);
        const extendedQueryState = {
          ...visModel,
          queries: {
            ...visModel.queries,
            [firstQueryKey]: {
              ...firstQuery,
              select: firstQuery.select.filter(
                currentOperation => currentOperation.id !== xAxisOperation!.id
              ),
            },
          },
        };
        const suggestion = getSuggestions(extendedQueryState).sort(
          ({ score: scoreA }, { score: scoreB }) => (scoreA < scoreB ? 1 : -1)
        )[0];

        onChangeVisModel({
          ...removePrivateState(suggestion.visModel),
          editorPlugin: suggestion.pluginName,
        });
      }}
    >
      {getOperationSummary(operation)}
    </OperationEditor>
  );
}
