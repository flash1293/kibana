/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiLink,
  EuiFormRow,
  EuiSelect,
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonIcon,
  EuiText,
  EuiPopover,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { StateSetter } from '../../types';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { mergeLayer } from '../state_helpers';
import { unitSuffixesLong } from '../suffix_formatter';
import { TimeScaleUnit } from '../time_scale';
import { IndexPatternPrivateState } from '../types';

const DEFAULT_TIME_SCALE = 'm' as const;

export function TimeScaling({
  selectedColumn,
  columnId,
  layerId,
  state,
  setState,
}: {
  selectedColumn: IndexPatternColumn;
  columnId: string;
  layerId: string;
  state: IndexPatternPrivateState;
  setState: StateSetter<IndexPatternPrivateState>;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const layer = state.layers[layerId];
  const hasDateHistogram = layer.columnOrder.some(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (
    !selectedOperation.timeScalingMode ||
    selectedOperation.timeScalingMode === 'disabled' ||
    !hasDateHistogram
  ) {
    return null;
  }

  if (!selectedColumn.timeScale) {
    return (
      <EuiText textAlign="right">
        <EuiSpacer size="s" />
        <EuiPopover
          ownFocus
          button={
            <EuiButtonEmpty
              size="xs"
              iconType="arrowDown"
              iconSide="right"
              data-test-subj="indexPattern-time-scaling-popover"
              onClick={() => {
                setPopoverOpen(true);
              }}
            >
              {i18n.translate('xpack.lens.indexPattern.timeScale.advancedSettings', {
                defaultMessage: 'Add advanced options',
              })}
            </EuiButtonEmpty>
          }
          isOpen={popoverOpen}
          closePopover={() => {
            setPopoverOpen(false);
          }}
        >
          <EuiText size="s">
            <EuiLink
              data-test-subj="indexPattern-time-scaling-enable"
              color="text"
              onClick={() => {
                setState(
                  mergeLayer({
                    state,
                    layerId,
                    newLayer: {
                      ...state.layers[layerId],
                      columns: {
                        ...state.layers[layerId].columns,
                        [columnId]: {
                          ...selectedColumn,
                          timeScale: DEFAULT_TIME_SCALE,
                        },
                      },
                    },
                  })
                );
              }}
            >
              {i18n.translate('xpack.lens.indexPattern.timeScale.enableTimeScale', {
                defaultMessage: 'Show as rate',
              })}
            </EuiLink>
          </EuiText>
        </EuiPopover>
      </EuiText>
    );
  }

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.indexPattern.timeScale.label', {
        defaultMessage: 'Normalize by unit',
      })}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem>
          <EuiSelect
            compressed
            options={Object.entries(unitSuffixesLong).map(([unit, text]) => ({
              value: unit,
              text,
            }))}
            data-test-subj="indexPattern-time-scaling-unit"
            value={selectedColumn.timeScale}
            onChange={(e) => {
              setState(
                mergeLayer({
                  state,
                  layerId,
                  newLayer: {
                    ...state.layers[layerId],
                    columns: {
                      ...state.layers[layerId].columns,
                      [columnId]: {
                        ...selectedColumn,
                        timeScale: e.target.value as TimeScaleUnit,
                      },
                    },
                  },
                })
              );
            }}
          />
        </EuiFlexItem>
        {selectedOperation.timeScalingMode === 'optional' && (
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="indexPattern-time-scaling-remove"
              color="danger"
              aria-label={i18n.translate('xpack.lens.timeScale.removeLabel', {
                defaultMessage: 'Remove normalizing by unit',
              })}
              onClick={() => {
                setState(
                  mergeLayer({
                    state,
                    layerId,
                    newLayer: {
                      ...state.layers[layerId],
                      columns: {
                        ...state.layers[layerId].columns,
                        [columnId]: {
                          ...selectedColumn,
                          timeScale: undefined,
                        },
                      },
                    },
                  })
                );
              }}
              iconType="cross"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
