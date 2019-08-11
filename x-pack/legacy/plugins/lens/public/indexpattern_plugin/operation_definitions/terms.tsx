/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFormRow, EuiRange, EuiSelect } from '@elastic/eui';
import { TermsIndexPatternColumn, IndexPatternColumn } from '../indexpattern';
import { OperationDefinition } from '../operations';
import { updateColumnParam } from '../state_helpers';
import { DataType } from '../../types';

type PropType<C> = C extends React.ComponentType<infer P> ? P : unknown;

// Add ticks to EuiRange component props
const FixedEuiRange = (EuiRange as unknown) as React.ComponentType<
  PropType<typeof EuiRange> & {
    ticks?: Array<{
      label: string;
      value: number;
    }>;
  }
>;

function ofName(name: string) {
  return i18n.translate('xpack.lens.indexPattern.termsOf', {
    defaultMessage: 'Top Values of {name}',
    values: { name },
  });
}

function isSortableByColumn(column: IndexPatternColumn) {
  return !column.isBucketed && column.operationType !== 'filter_ratio';
}

const DEFAULT_SIZE = 3;

export const termsOperation: OperationDefinition<TermsIndexPatternColumn> = {
  type: 'terms',
  displayName: i18n.translate('xpack.lens.indexPattern.terms', {
    defaultMessage: 'Top Values',
  }),
  getPossibleOperationsForDocument: () => [],
  getPossibleOperationsForField: ({ aggregationRestrictions, aggregatable, type }) => {
    if (
      (type === 'string' || type === 'boolean') &&
      aggregatable &&
      (!aggregationRestrictions || aggregationRestrictions.terms)
    ) {
      return [
        {
          dataType: type,
          isBucketed: true,
        },
      ];
    }
    return [];
  },
  isTransferable: (column, newIndexPattern) => {
    const newField = newIndexPattern.fields.find(field => field.name === column.sourceField);

    return Boolean(
      newField &&
        newField.type === 'string' &&
        newField.aggregatable &&
        (!newField.aggregationRestrictions || newField.aggregationRestrictions.terms)
    );
  },
  buildColumn({ suggestedPriority, columns, field }) {
    if (!field) {
      throw new Error('Invariant error: terms operation requires field');
    }
    const existingMetricColumn = Object.entries(columns)
      .filter(([_columnId, column]) => column && isSortableByColumn(column))
      .map(([id]) => id)[0];

    return {
      label: ofName(field.name),
      dataType: field.type as DataType,
      operationType: 'terms',
      suggestedPriority,
      sourceField: field.name,
      isBucketed: true,
      params: {
        size: DEFAULT_SIZE,
        orderBy: existingMetricColumn
          ? { type: 'column', columnId: existingMetricColumn }
          : { type: 'alphabetical' },
        orderDirection: existingMetricColumn ? 'desc' : 'asc',
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
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
      otherBucket: false,
      otherBucketLabel: 'Other',
      missingBucket: false,
      missingBucketLabel: 'Missing',
    },
  }),
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
  paramEditor: ({ state, setState, columnId: currentColumnId, layerId }) => {
    const currentColumn = state.layers[layerId].columns[currentColumnId] as TermsIndexPatternColumn;
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
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.size', {
            defaultMessage: 'Number of values',
          })}
        >
          <FixedEuiRange
            min={1}
            max={20}
            step={1}
            value={currentColumn.params.size}
            showInput
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setState(
                updateColumnParam(state, layerId, currentColumn, 'size', Number(e.target.value))
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.size', {
              defaultMessage: 'Number of values',
            })}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
            defaultMessage: 'Order by',
          })}
        >
          <EuiSelect
            data-test-subj="indexPattern-terms-orderBy"
            options={orderOptions}
            value={toValue(currentColumn.params.orderBy)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setState(
                updateColumnParam(
                  state,
                  layerId,
                  currentColumn,
                  'orderBy',
                  fromValue(e.target.value)
                )
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
        >
          <EuiSelect
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
                updateColumnParam(state, layerId, currentColumn, 'orderDirection', e.target
                  .value as 'asc' | 'desc')
              )
            }
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.orderBy', {
              defaultMessage: 'Order by',
            })}
          />
        </EuiFormRow>
      </EuiForm>
    );
  },
};
