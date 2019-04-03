/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { DatasourceField, SelectOperation } from '../../../common';
import { Draggable } from '../../common/components/draggable';
import { getOperationSummary } from '../../common/components/operation_editor';
import { selectColumn, updateColumn, VisModel } from '../../common/lib';

export function XAxisEditor({
  col,
  visModel,
  onChangeVisModel,
}: {
  col: string;
  visModel: any;
  onChangeVisModel: (visModel: VisModel) => void;
}) {
  const onDropField = (field: DatasourceField) => {
    const operation: SelectOperation =
      field.type === 'date'
        ? { operation: 'date_histogram', argument: { field: field.name, interval: '1m' } }
        : { operation: 'column', argument: { field: field.name } };

    onChangeVisModel(updateColumn(col, operation, visModel));
  };

  return (
    <Draggable
      canHandleDrop={(f: DatasourceField) => f && (f.type === 'string' || f.type === 'date')}
      onDrop={onDropField}
    >
      {getOperationSummary(selectColumn(col, visModel))}
    </Draggable>
  );
}
