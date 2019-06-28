/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiFormControlLayout,
  EuiFlexItem,
  EuiFlexGroup,
} from '@elastic/eui';
import { IndexPatternField, FiltersIndexPatternColumn } from '../indexpattern';
import { DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';
import { updateColumnParam } from '../state_helpers';

export const filtersOperation: OperationDefinition<FiltersIndexPatternColumn> = {
  type: 'filters',
  displayName: i18n.translate('xpack.lens.indexPattern.filters', {
    defaultMessage: 'Filters',
  }),
  isApplicableWithoutField: true,
  isApplicableForField: ({ aggregationRestrictions, type }) => {
    return false;
  },
  buildColumn(
    operationId: string,
    suggestedOrder?: DimensionPriority,
    field?: IndexPatternField
  ): FiltersIndexPatternColumn {
    return {
      operationId,
      label: i18n.translate('xpack.lens.indexPattern.filters', {
        defaultMessage: 'Filters',
      }),
      dataType: 'string',
      operationType: 'filters',
      suggestedOrder,
      isBucketed: true,
      params: {
        filters: [],
      },
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'filters',
    schema: 'segment',
    params: {
      filters: column.params.filters
        .filter(f => !!f.query)
        .map(({ query, label }) => ({
          input: { query, language: 'kuery' },
          label: label || query,
        })),
    },
  }),
  inlineOptions: ({ state, setState, columnId: currentColumnId }) => {
    const currentColumn = state.columns[currentColumnId] as FiltersIndexPatternColumn;
    return (
      <>
        {currentColumn.params.filters.map((filter, index) => (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label={`Filter ${index}`}>
                <EuiFormControlLayout
                  clear={{
                    onClick: () => {
                      const newFilters = [...currentColumn.params.filters];
                      newFilters.splice(index, 1);
                      setState(updateColumnParam(state, currentColumn, 'filters', newFilters));
                    },
                  }}
                >
                  <input
                    type="text"
                    value={filter.query}
                    onChange={e => {
                      const newFilters = [...currentColumn.params.filters];
                      newFilters[index] = { ...newFilters[index], query: e.target.value };
                      setState(updateColumnParam(state, currentColumn, 'filters', newFilters));
                    }}
                    className="euiFieldText"
                  />
                </EuiFormControlLayout>
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label={`Label ${index}`}>
                <EuiFieldText
                  value={filter.label}
                  onChange={e => {
                    const newFilters = [...currentColumn.params.filters];
                    newFilters[index] = { ...newFilters[index], label: e.target.value };
                    setState(updateColumnParam(state, currentColumn, 'filters', newFilters));
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        ))}
        <EuiButton
          iconType="plusInCircle"
          fill
          fullWidth
          onClick={() => {
            setState(
              updateColumnParam(state, currentColumn, 'filters', [
                ...currentColumn.params.filters,
                { query: '', label: '' },
              ])
            );
          }}
          size="s"
          iconSide="left"
          color="primary"
        />
      </>
    );
  },
};
