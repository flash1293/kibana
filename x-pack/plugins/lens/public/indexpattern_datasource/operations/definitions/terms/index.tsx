/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSelect, EuiSwitch } from '@elastic/eui';
import { EuiSwitchEvent } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { IndexPatternColumn } from '../../../indexpattern';
import { updateColumnParam } from '../../../state_helpers';
import { DataType } from '../../../../types';
import { OperationDefinition } from '../index';
import { FieldBasedIndexPatternColumn } from '../column_types';
import { ValuesRangeInput } from './values_range_input';

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top values of {name}',
    values: { name },
  });
}

function isSortableByColumn(column: IndexPatternColumn) {
  return !column.isBucketed;
}

const DEFAULT_SIZE = 3;
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    orderBy: { type: 'alphabetical' } | { type: 'column'; columnId: string };
    orderDirection: 'asc' | 'desc';
    otherBucket?: boolean;
  };
}

export const termsOperation: OperationDefinition<TermsIndexPatternColumn, 'field'> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top values',
  }),
  priority: 3, // Higher than any metric
  input: 'field',
  getPossibleOperationForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      supportedTypes.has(type) &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.terms)
    ) {
      return { dataType: type as DataType, isBucketed: true, scale: 'ordinal' };
    }
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find((field) => field.name === column.sourceField);

    return Boolean(
      newField &&
        supportedTypes.has(newField.type) &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms) &&
        (!column.params.otherBucket || !newIndexPattern.hasRestrictions)
    );
  },
  buildColumn({ suggestedPriority, columns, field, indexPattern }) {
    const existingMetricColumn = Object.entries(columns)
      .filter(([_columnId, column]) => column && isSortableByColumn(column))
      .map(([id]) => id)[0];

    return {
      label: ofName(field.displayName),
      dataType: field.type as DataType,
      operationType: 'terms',
      scale: 'ordinal',
      suggestedPriority,
      sourceField: field.name,
      isBucketed: true,
      params: {
        size: DEFAULT_SIZE,
        orderBy: existingMetricColumn
          ? { type: 'column', columnId: existingMetricColumn }
          : { type: 'alphabetical' },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
        otherBucket: !indexPattern.hasRestrictions,
      },
    };
  },
  toEsAggsConfig: (column, columnId, _indexPattern) => {
    return {
      id: columnId,
      enabled: true,
      type: 'terms',
      schema: 'segment',
      params: {
        field: column.sourceField,
        orderBy:
          column.params.orderBy.type === 'alphabetical' ? '_key' : column.params.orderBy.columnId,
        order: column.params.orderDirection,
        size: column.params.size,
        otherBucket: Boolean(column.params.otherBucket),
        otherBucketLabel: i18n.translate('xpack.lens.indexPattern.terms.otherLabel', {
          defaultMessage: 'Other',
        }),
        missingBucket: false,
        missingBucketLabel: 'Missing',
      },
    };
  },
  onFieldChange: (oldColumn, indexPattern, field) => {
    return {
      ...oldColumn,
      label: ofName(field.displayName),
      sourceField: field.name,
    };
  },
  onOtherColumnChanged: (currentColumn, columns) => {
    if (currentColumn.params.orderBy.type === 'column') {
      // check whether the column is still there and still a metric
      const columnSortedBy = columns[currentColumn.params.orderBy.columnId];
      if (!columnSortedBy || !isSortableByColumn(columnSortedBy)) {
        return {
          ...currentColumn,
          params: {
            ...currentColumn.params,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          },
        };
      }
    }
    return currentColumn;
  },
  paramEditor: ({ state, setState, currentColumn, layerId }) => {
    const indexPattern = currentColumn && state.indexPatterns[state.layers[layerId].indexPatternId];
    const hasRestrictions = indexPattern.hasRestrictions;
    const SEPARATOR = '$$$';
    function toValue(orderBy: TermsIndexPatternColumn['params']['orderBy']) {
      if (orderBy.type === 'alphabetical') {
        return orderBy.type;
      }
      return `${orderBy.type}${SEPARATOR}${orderBy.columnId}`;
    }

    function fromValue(value: string): TermsIndexPatternColumn['params']['orderBy'] {
      if (value === 'alphabetical') {
        return { type: 'alphabetical' };
      }
      const parts = value.split(SEPARATOR);
      return {
        type: 'column',
        columnId: parts[1],
      };
    }

    const orderOptions = Object.entries(state.layers[layerId].columns)
      .filter(([_columnId, column]) => isSortableByColumn(column))
      .map(([columnId, column]) => {
        return {
          value: toValue({ type: 'column', columnId }),
          text: column.label,
        };
      });
    orderOptions.push({
      value: toValue({ type: 'alphabetical' }),
      text: i18n.translate('xpack.lens.indexPattern.terms.orderAlphabetical', {
        defaultMessage: 'Alphabetical',
      }),
    });
    return (
      <>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.size', {
            defaultMessage: 'Number of values',
          })}
          display="columnCompressed"
          fullWidth
        >
          <ValuesRangeInput
            value={currentColumn.params.size}
            onChange={(value) => {
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'size',
                  value,
                })
              );
            }}
          />
        </EuiFormRow>
        {!hasRestrictions && (
          <EuiFormRow
            label={i18n.translate('xpack.lens.indexPattern.terms.otherBucketLabel', {
              defaultMessage: 'Other values',
            })}
            display="columnCompressed"
            fullWidth
          >
            <>
              <EuiSpacer size="s" />
              <EuiSwitch
                label={i18n.translate('xpack.lens.indexPattern.terms.otherBucketDescription', {
                  defaultMessage: 'Show separately',
                })}
                compressed
                data-test-subj="indexPattern-terms-other-bucket"
                checked={Boolean(currentColumn.params.otherBucket)}
                onChange={(e: EuiSwitchEvent) =>
                  setState(
                    updateColumnParam({
                      state,
                      layerId,
                      currentColumn,
                      paramName: 'otherBucket',
                      value: e.target.checked,
                    })
                  )
                }
              />
            </>
          </EuiFormRow>
        )}
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
            defaultMessage: 'Order by',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderBy"
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'orderBy',
                  value: fromValue(e.target.value),
                })
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderDirection', {
            defaultMessage: 'Order direction',
          })}
          display="columnCompressed"
          fullWidth
        >
          <EuiSelect
            compressed
            data-test-subj="indexPattern-terms-orderDirection"
            options={[
              {
                value: 'asc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderAscending', {
                  defaultMessage: 'Ascending',
                }),
              },
              {
                value: 'desc',
                text: i18n.translate('xpack.lens.indexPattern.terms.orderDescending', {
                  defaultMessage: 'Descending',
                }),
              },
            ]}
            value={currentColumn.params.orderDirection}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setState(
                updateColumnParam({
                  state,
                  layerId,
                  currentColumn,
                  paramName: 'orderDirection',
                  value: e.target.value as 'asc' | 'desc',
                })
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
      </>
    );
  },
};
