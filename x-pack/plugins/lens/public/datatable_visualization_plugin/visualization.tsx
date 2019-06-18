/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import {
  EuiButtonIcon,
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import {
  SuggestionRequest,
  Visualization,
  VisualizationProps,
  VisualizationSuggestion,
} from '../types';
import { NativeRenderer } from '../native_renderer';

export interface DatatableVisualizationState {
  columns: Array<{
    id: string;
    label: string;
  }>;
}

export function DatatableConfigPanel(props: VisualizationProps<DatatableVisualizationState>) {
  const { state, datasource, setState } = props;

  return (
    <div>
      <EuiForm className="lnsConfigPanel">
        {state.columns.map(({ id, label }, index) => (
          <>
            <EuiFormRow
              key={id}
              label={i18n.translate('xpack.lens.datatable.columnLabel', {
                defaultMessage: 'Column',
              })}
            >
              <EuiFieldText
                value={label || ''}
                onChange={e => {
                  const newColumns = [...state.columns];
                  newColumns[index] = { ...newColumns[index], label: e.target.value };
                  setState({
                    ...state,
                    columns: newColumns,
                  });
                }}
                placeholder={i18n.translate('xpack.lens.datatable.columnTitlePlaceholder', {
                  defaultMessage: 'Title',
                })}
                aria-label={i18n.translate('xpack.lens.datatable.columnTitlePlaceholder', {
                  defaultMessage: 'Title',
                })}
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiFlexGroup>
                <EuiFlexItem grow={true}>
                  <NativeRenderer
                    data-test-subj="lnsDatatable_xDimensionPanel"
                    render={datasource.renderDimensionPanel}
                    nativeProps={{
                      columnId: id,
                      dragDropContext: props.dragDropContext,
                      filterOperations: () => true,
                    }}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="s"
                    color="warning"
                    data-test-subj={`lns_datasourceDimensionPanel_remove_${id}`}
                    iconType="trash"
                    onClick={() => {
                      datasource.removeColumnInTableSpec(id);
                      const newColumns = [...state.columns];
                      newColumns.splice(index);
                      setState({
                        ...state,
                        columns: newColumns,
                      });
                    }}
                    aria-label={i18n.translate('xpack.lens.datasource.removeColumnAriaLabel', {
                      defaultMessage: 'Remove',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </>
        ))}

        <div>
          <EuiButton
            data-test-subj="lnsDatatable_yDimensionPanel_add"
            onClick={() => {
              const newColumns = [...state.columns];
              newColumns.push({
                id: datasource.generateColumnId(),
                label: '',
              });
              setState({
                ...state,
                columns: newColumns,
              });
            }}
            iconType="plusInCircle"
          />
        </div>
      </EuiForm>
    </div>
  );
}

export const datatableVisualization: Visualization<
  DatatableVisualizationState,
  DatatableVisualizationState
> = {
  initialize(datasource, state) {
    return (
      state || {
        columns: [
          {
            id: datasource.generateColumnId(),
            label: '',
          },
        ],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions({
    tables,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    return tables.map(table => {
      const title = 'Table: ' + table.columns.map(col => col.operation.label).join(' & ');

      return {
        title,
        score: 1,
        datasourceSuggestionId: table.datasourceSuggestionId,
        state: {
          columns: table.columns.map(col => ({
            id: col.columnId,
            label: col.operation.label,
          })),
        },
      };
    });
  },

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <DatatableConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  toExpression: state => ({
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_datatable',
        arguments: {
          columns: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'lens_datatable_columns',
                  arguments: {
                    columnIds: state.columns.map(({ id }) => id),
                    labels: state.columns.map(({ label }) => label),
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  }),
};
