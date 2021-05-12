/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { Query } from 'src/plugins/data/public';
import { search } from '../../../../../../src/plugins/data/public';
import { parseTimeShift } from '../../../../../../src/plugins/data/common';
import { IndexPatternColumn, operationDefinitionMap } from '../operations';
import { IndexPattern, IndexPatternLayer } from '../types';
import { IndexPatternDimensionEditorProps } from './dimension_panel';

// to do: get the language from uiSettings
export const defaultFilter: Query = {
  query: '',
  language: 'kuery',
};

export function setTimeShift(
  columnId: string,
  layer: IndexPatternLayer,
  timeShift: string | undefined
) {
  return {
    ...layer,
    columns: {
      ...layer.columns,
      [columnId]: {
        ...layer.columns[columnId],
        timeShift,
      },
    },
  };
}

const timeShiftOptions = [
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.hour', {
      defaultMessage: '1 hour (1h)',
    }),
    value: '1h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3hours', {
      defaultMessage: '3 hours (3h)',
    }),
    value: '3h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6hours', {
      defaultMessage: '6 hours (6h)',
    }),
    value: '6h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.12hours', {
      defaultMessage: '12 hours (12h)',
    }),
    value: '12h',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.day', {
      defaultMessage: '1 day (1d)',
    }),
    value: '1d',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.week', {
      defaultMessage: '1 week (1w)',
    }),
    value: '1w',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.month', {
      defaultMessage: '1 month (1M)',
    }),
    value: '1M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.3months', {
      defaultMessage: '3 months (3M)',
    }),
    value: '3M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.6months', {
      defaultMessage: '6 months (6M)',
    }),
    value: '6M',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.year', {
      defaultMessage: '1 year (1y)',
    }),
    value: '1y',
  },
  {
    label: i18n.translate('xpack.lens.indexPattern.timeShift.previous', {
      defaultMessage: 'Previous',
    }),
    value: 'previous',
  },
];

export function TimeShift({
  selectedColumn,
  columnId,
  layer,
  updateLayer,
  indexPattern,
  isFocused,
  activeData,
  layerId,
}: {
  selectedColumn: IndexPatternColumn;
  indexPattern: IndexPattern;
  columnId: string;
  layer: IndexPatternLayer;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  isFocused: boolean;
  activeData: IndexPatternDimensionEditorProps['activeData'];
  layerId: string;
}) {
  const [localValue, setLocalValue] = useState(selectedColumn.timeShift);
  useEffect(() => {
    setLocalValue(selectedColumn.timeShift);
  }, [selectedColumn.timeShift]);
  const selectedOperation = operationDefinitionMap[selectedColumn.operationType];
  if (!selectedOperation.shiftable || selectedColumn.timeShift === undefined) {
    return null;
  }

  let dateHistogramInterval: null | moment.Duration = null;
  const dateHistogramColumn = layer.columnOrder.find(
    (colId) => layer.columns[colId].operationType === 'date_histogram'
  );
  if (!dateHistogramColumn && !indexPattern.timeFieldName) {
    return null;
  }
  if (dateHistogramColumn && activeData && activeData[layerId] && activeData[layerId]) {
    const column = activeData[layerId].columns.find((col) => col.id === dateHistogramColumn);
    if (column) {
      dateHistogramInterval = search.aggs.parseInterval(
        search.aggs.getDateHistogramMetaDataByDatatableColumn(column)?.interval || ''
      );
    }
  }

  function isValueTooSmall(parsedValue: ReturnType<typeof parseTimeShift>) {
    return (
      dateHistogramInterval &&
      parsedValue &&
      typeof parsedValue === 'object' &&
      parsedValue.asMilliseconds() < dateHistogramInterval.asMilliseconds()
    );
  }

  function isValueNotMultiple(parsedValue: ReturnType<typeof parseTimeShift>) {
    return (
      dateHistogramInterval &&
      parsedValue &&
      typeof parsedValue === 'object' &&
      !Number.isInteger(parsedValue.asMilliseconds() / dateHistogramInterval.asMilliseconds())
    );
  }

  const parsedLocalValue = localValue && parseTimeShift(localValue);
  const isLocalValueInvalid = Boolean(parsedLocalValue === 'invalid');

  function getSelectedOption() {
    if (!localValue) return [];
    const goodPick = timeShiftOptions.filter(({ value }) => value === localValue);
    if (goodPick.length > 0) return goodPick;
    return [
      {
        value: localValue,
        label: localValue,
      },
    ];
  }

  return (
    <div
      ref={(r) => {
        if (r && isFocused) {
          const timeShiftInput = r.querySelector('[data-test-subj="comboBoxSearchInput"]');
          if (timeShiftInput instanceof HTMLInputElement) {
            timeShiftInput.focus();
          }
        }
      }}
    >
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.indexPattern.timeShift.label', {
          defaultMessage: 'Shift in time',
        })}
        helpText={i18n.translate('xpack.lens.indexPattern.timeShift.help', {
          defaultMessage: 'Time shift is specified by a number followed by a time unit',
        })}
        isInvalid={isLocalValueInvalid}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              data-test-subj="indexPattern-dimension-time-shift"
              placeholder={i18n.translate('xpack.lens.indexPattern.timeShiftPlaceholder', {
                defaultMessage: 'Time shift (e.g. 1d)',
              })}
              options={timeShiftOptions.filter(({ value }) => {
                const parsedValue = parseTimeShift(value);
                return (
                  parsedValue && !isValueTooSmall(parsedValue) && !isValueNotMultiple(parsedValue)
                );
              })}
              selectedOptions={getSelectedOption()}
              singleSelection={{ asPlainText: true }}
              isInvalid={isLocalValueInvalid}
              onCreateOption={(val) => {
                const parsedVal = parseTimeShift(val);
                if (parsedVal !== 'invalid') {
                  updateLayer(setTimeShift(columnId, layer, val));
                } else {
                  setLocalValue(val);
                }
              }}
              onChange={(choices) => {
                if (choices.length === 0) {
                  updateLayer(setTimeShift(columnId, layer, ''));
                  return;
                }

                const choice = choices[0].value as string;
                const parsedVal = parseTimeShift(choice);
                if (parsedVal !== 'invalid') {
                  updateLayer(setTimeShift(columnId, layer, choice));
                } else {
                  setLocalValue(choice);
                }
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              data-test-subj="indexPattern-time-shift-remove"
              color="danger"
              aria-label={i18n.translate('xpack.lens.timeShift.removeLabel', {
                defaultMessage: 'Remove time shift',
              })}
              onClick={() => {
                updateLayer(setTimeShift(columnId, layer, undefined));
              }}
              iconType="cross"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </div>
  );
}
