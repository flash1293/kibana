/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { AggFunctionsMapping } from 'src/plugins/data/public';
import useDebounce from 'react-use/lib/useDebounce';
import { buildExpressionFunction } from '../../../../../../../src/plugins/expressions/public';
import { OperationDefinition } from './index';
import { getInvalidFieldMessage } from './helpers';
import { FieldBasedIndexPatternColumn } from './column_types';

export interface PercentileIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'percentile';
  params: {
    percentile: number;
    format?: {
      id: string;
      params?: {
        decimals: number;
      };
    };
  };
}

function ofName(name: string, percentile: number) {
  return i18n.translate('xpack.lens.indexPattern.percentileOf', {
    defaultMessage:
      '{percentile, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} percentile of {name}',
    values: { name, percentile },
  });
}

const DEFAULT_PERCENTILE_VALUE = 95;

export const percentileOperation: OperationDefinition<PercentileIndexPatternColumn, 'field'> = {
  type: 'percentile',
  displayName: i18n.translate('xpack.lens.indexPattern.percentile', {
    defaultMessage: 'Percentile',
  }),
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type: fieldType }) => {
    if (fieldType === 'number' && aggregatable && !aggregationRestrictions) {
      return {
        dataType: 'number',
        isBucketed: false,
        scale: 'ratio',
      };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.getFieldByName(column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'number' &&
        newField.aggregatable &&
        !newField.aggregationRestrictions
    );
  },
  getDefaultLabel: (column, indexPattern, columns) =>
    ofName(indexPattern.getFieldByName(column.sourceField)!.displayName, column.params.percentile),
  buildColumn: ({ field, previousColumn }) => {
    const existingFormat =
      previousColumn?.params && 'format' in previousColumn?.params
        ? previousColumn?.params?.format
        : undefined;
    const existingPercentileParam =
      previousColumn?.operationType === 'percentile' && previousColumn?.params.percentile;
    const newPercentileParam = existingPercentileParam || DEFAULT_PERCENTILE_VALUE;
    return {
      label: ofName(field.displayName, newPercentileParam),
      dataType: 'number',
      operationType: 'percentile',
      sourceField: field.name,
      isBucketed: false,
      scale: 'ratio',
      params: {
        format: existingFormat,
        percentile: newPercentileParam,
      },
    };
  },
  onFieldChange: (oldColumn, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName, oldColumn.params.percentile),
      sourceField: field.name,
    };
  },
  toEsAggsFn: (column, columnId, _indexPattern) => {
    return buildExpressionFunction<AggFunctionsMapping['aggPercentiles']>('aggPercentiles', {
      id: columnId,
      enabled: true,
      schema: 'metric',
      field: column.sourceField,
      percents: [column.params.percentile],
    }).toAst();
  },
  getEsAggsSuffix: (column) => {
    const value = column.params.percentile;
    return `.${value}`;
  },
  getErrorMessage: (layer, columnId, indexPattern) =>
    getInvalidFieldMessage(layer.columns[columnId] as FieldBasedIndexPatternColumn, indexPattern),
  paramEditor: function PercentileParamEditor({
    layer,
    updateLayer,
    currentColumn,
    columnId,
    indexPattern,
  }) {
    const [inputValue, setInputValue] = useState(String(currentColumn.params.percentile));

    const inputValueAsNumber = Number(inputValue);
    // an input is value if it's not an empty string, parses to a valid number, is between 0 and 100 (inclusive)
    // and is an integer
    const inputValueIsValid =
      inputValue !== '' &&
      !Number.isNaN(inputValueAsNumber) &&
      inputValueAsNumber >= 0 &&
      inputValueAsNumber <= 100 &&
      inputValueAsNumber % 1 === 0;

    useDebounce(
      () => {
        if (!inputValueIsValid) return;
        updateLayer({
          ...layer,
          columns: {
            ...layer.columns,
            [columnId]: {
              ...currentColumn,
              label: currentColumn.customLabel
                ? currentColumn.label
                : ofName(
                    indexPattern.getFieldByName(currentColumn.sourceField)?.displayName ||
                      currentColumn.sourceField,
                    inputValueAsNumber
                  ),
              params: {
                ...currentColumn.params,
                percentile: inputValueAsNumber,
              },
            },
          },
        });
      },
      256,
      [inputValue]
    );

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = String(e.target.value);
      setInputValue(val);
    }, []);
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.percentile.percentileValue', {
            defaultMessage: 'Percentile',
          })}
          data-test-subj="lns-indexPattern-percentile-form"
          display="columnCompressed"
          fullWidth
          isInvalid={!inputValueIsValid}
          error={
            !inputValueIsValid &&
            i18n.translate('xpack.lens.indexPattern.percentile.errorMessage', {
              defaultMessage: 'Percentile has to be an integer between 0 and 100',
            })
          }
        >
          <EuiFieldNumber
            data-test-subj="lns-indexPattern-percentile-input"
            compressed
            value={inputValue}
            min={0}
            max={100}
            onChange={handleInputChange}
          />
        </EuiFormRow>
      </>
    );
  },
};
