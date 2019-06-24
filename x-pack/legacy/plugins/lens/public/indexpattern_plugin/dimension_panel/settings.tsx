/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPopover,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSideNav,
  EuiCallOut,
  EuiFormRow,
  EuiFieldText,
  EuiLink,
} from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { IndexPatternDimensionPanelProps } from './dimension_panel';
import { operationDefinitionMap, getOperationDisplay } from '../operations';
import { hasField, deleteColumn, changeColumn } from '../state_helpers';
import { FieldSelect } from './field_select';

const operationPanels = getOperationDisplay();

function getOperationTypes(
  filteredColumns: IndexPatternColumn[],
  selectedColumn?: IndexPatternColumn
) {
  const columnsFromField = selectedColumn
    ? filteredColumns.filter(col => {
        return (
          (!hasField(selectedColumn) && !hasField(col)) ||
          (hasField(selectedColumn) &&
            hasField(col) &&
            col.sourceField === selectedColumn.sourceField)
        );
      })
    : filteredColumns;
  const possibleOperationTypes = filteredColumns.map(col => ({
    operationType: col.operationType,
    compatibleWithCurrentField: false,
  }));
  const validOperationTypes = columnsFromField.map(col => ({
    operationType: col.operationType,
    compatibleWithCurrentField: true,
  }));
  return _.uniq([...validOperationTypes, ...possibleOperationTypes], 'operationType');
}

export interface SettingsProps extends IndexPatternDimensionPanelProps {
  selectedColumn?: IndexPatternColumn;
  filteredColumns: IndexPatternColumn[];
}

export function Settings(props: SettingsProps) {
  const { selectedColumn, filteredColumns, state, columnId, setState } = props;
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [invalidOperationType, setInvalidOperationType] = useState<OperationType | null>(null);

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;

  const sideNavItems = [
    {
      name: '',
      id: '0',
      items: getOperationTypes(filteredColumns, selectedColumn).map(
        ({ operationType, compatibleWithCurrentField }) => ({
          name: operationPanels[operationType].displayName,
          id: operationType as string,
          className: classNames('lnsConfigPanel__operation', {
            'lnsConfigPanel__operation--selected': Boolean(
              invalidOperationType === operationType ||
                (!invalidOperationType &&
                  selectedColumn &&
                  selectedColumn.operationType === operationType)
            ),
            'lnsConfigPanel__operation--unsupported': !compatibleWithCurrentField,
          }),
          'data-test-subj': `lns-indexPatternDimension-${operationType}`,
          onClick() {
            if (!selectedColumn || !compatibleWithCurrentField) {
              setInvalidOperationType(operationType);
              return;
            }
            if (invalidOperationType) {
              setInvalidOperationType(null);
            }
            if (selectedColumn.operationType === operationType) {
              return;
            }
            const newColumn: IndexPatternColumn = filteredColumns.find(
              col =>
                col.operationType === operationType &&
                (!hasField(col) ||
                  !hasField(selectedColumn) ||
                  col.sourceField === selectedColumn.sourceField)
            )!;
            setState(changeColumn(state, columnId, newColumn));
          },
        })
      ),
    },
  ];

  return (
    <EuiPopover
      id={columnId}
      className="lnsConfigPanel__summaryPopover"
      anchorClassName="lnsConfigPanel__summaryPopoverAnchor"
      button={
        <EuiLink
          className="lnsConfigPanel__summaryLink"
          onClick={() => {
            setSettingsOpen(true);
          }}
          data-test-subj="indexPattern-configure-dimension"
        >
          {selectedColumn
            ? selectedColumn.label
            : i18n.translate('xpack.lens.indexPattern.configureDimensionLabel', {
                defaultMessage: 'Configure dimension',
              })}
        </EuiLink>
      }
      isOpen={isSettingsOpen}
      closePopover={() => {
        setSettingsOpen(false);
        setInvalidOperationType(null);
      }}
      anchorPosition="leftUp"
      withTitle
      panelPaddingSize="s"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          <FieldSelect
            filteredColumns={filteredColumns}
            selectedColumn={selectedColumn}
            invalidOperationType={invalidOperationType}
            onDeleteColumn={() => {
              setState(deleteColumn(state, columnId));
            }}
            onChangeColumn={column => {
              setState(changeColumn(state, columnId, column));
              setInvalidOperationType(null);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={null} className={classNames('lnsConfigPanel__summaryPopoverLeft')}>
              <EuiSideNav items={sideNavItems} />
            </EuiFlexItem>
            <EuiFlexItem grow={true} className="lnsConfigPanel__summaryPopoverRight">
              {invalidOperationType && selectedColumn && (
                <EuiCallOut
                  title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                    defaultMessage: 'Operation not applicable to field',
                  })}
                  color="danger"
                  iconType="cross"
                >
                  <p>
                    <FormattedMessage
                      id="xpack.lens.indexPattern.invalidOperationDescription"
                      defaultMessage="Please choose another field"
                    />
                  </p>
                </EuiCallOut>
              )}
              {!invalidOperationType && ParamEditor && (
                <ParamEditor state={state} setState={setState} columnId={columnId} />
              )}
              {!invalidOperationType && selectedColumn && (
                <EuiFormRow label="Label">
                  <EuiFieldText
                    value={selectedColumn.label}
                    onChange={e => {
                      setState(
                        changeColumn(state, columnId, {
                          ...selectedColumn,
                          label: e.target.value,
                        })
                      );
                    }}
                  />
                </EuiFormRow>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
}
