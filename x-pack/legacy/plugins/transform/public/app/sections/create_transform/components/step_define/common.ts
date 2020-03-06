/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { EuiComboBoxOptionOption, EuiDataGridSorting } from '@elastic/eui';
import {
  IndexPattern,
  KBN_FIELD_TYPES,
} from '../../../../../../../../../../src/plugins/data/public';

import { getNestedProperty } from '../../../../../../common/utils/object_utils';

import {
  PreviewRequestBody,
  DropDownLabel,
  DropDownOption,
  EsFieldName,
  GroupByConfigWithUiSupport,
  PivotAggsConfigWithUiSupportDict,
  pivotAggsFieldSupport,
  PivotGroupByConfigWithUiSupportDict,
  pivotGroupByFieldSupport,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';

export interface Field {
  name: EsFieldName;
  type: KBN_FIELD_TYPES;
}

/**
 * Helper to sort an array of objects based on an EuiDataGrid sorting configuration.
 * `sortFn()` is recursive to support sorting on multiple columns.
 *
 * @param sortingColumns - The EUI data grid sorting configuration
 * @returns The sorting function which can be used with an array's sort() function.
 */
export const multiColumnSortFactory = (sortingColumns: EuiDataGridSorting['columns']) => {
  const isString = (arg: any): arg is string => {
    return typeof arg === 'string';
  };

  const sortFn = (a: any, b: any, sortingColumnIndex = 0): number => {
    const sort = sortingColumns[sortingColumnIndex];
    const aValue = getNestedProperty(a, sort.id, null);
    const bValue = getNestedProperty(b, sort.id, null);

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      if (aValue < bValue) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (isString(aValue) && isString(bValue)) {
      if (aValue.localeCompare(bValue) === -1) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue.localeCompare(bValue) === 1) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (sortingColumnIndex + 1 < sortingColumns.length) {
      return sortFn(a, b, sortingColumnIndex + 1);
    }

    return 0;
  };

  return sortFn;
};

function getDefaultGroupByConfig(
  aggName: string,
  dropDownName: string,
  fieldName: EsFieldName,
  groupByAgg: PIVOT_SUPPORTED_GROUP_BY_AGGS
): GroupByConfigWithUiSupport {
  switch (groupByAgg) {
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        interval: '10',
      };
    case PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM:
      return {
        agg: groupByAgg,
        aggName,
        dropDownName,
        field: fieldName,
        calendar_interval: '1m',
      };
  }
}

const illegalEsAggNameChars = /[[\]>]/g;

export function getPivotDropdownOptions(indexPattern: IndexPattern) {
  // The available group by options
  const groupByOptions: EuiComboBoxOptionOption[] = [];
  const groupByOptionsData: PivotGroupByConfigWithUiSupportDict = {};

  // The available aggregations
  const aggOptions: EuiComboBoxOptionOption[] = [];
  const aggOptionsData: PivotAggsConfigWithUiSupportDict = {};

  const ignoreFieldNames = ['_id', '_index', '_type'];
  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true && !ignoreFieldNames.includes(field.name))
    .map((field): Field => ({ name: field.name, type: field.type as KBN_FIELD_TYPES }));

  fields.forEach(field => {
    // Group by
    const availableGroupByAggs: [] = get(pivotGroupByFieldSupport, field.type);

    if (availableGroupByAggs !== undefined) {
      availableGroupByAggs.forEach(groupByAgg => {
        // Aggregation name for the group-by is the plain field name. Illegal characters will be removed.
        const aggName = field.name.replace(illegalEsAggNameChars, '').trim();
        // Option name in the dropdown for the group-by is in the form of `sum(fieldname)`.
        const dropDownName = `${groupByAgg}(${field.name})`;
        const groupByOption: DropDownLabel = { label: dropDownName };
        groupByOptions.push(groupByOption);
        groupByOptionsData[dropDownName] = getDefaultGroupByConfig(
          aggName,
          dropDownName,
          field.name,
          groupByAgg
        );
      });
    }

    // Aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    const availableAggs: [] = get(pivotAggsFieldSupport, field.type);

    if (availableAggs !== undefined) {
      availableAggs.forEach(agg => {
        // Aggregation name is formatted like `fieldname.sum`. Illegal characters will be removed.
        const aggName = `${field.name.replace(illegalEsAggNameChars, '').trim()}.${agg}`;
        // Option name in the dropdown for the aggregation is in the form of `sum(fieldname)`.
        const dropDownName = `${agg}(${field.name})`;
        aggOption.options.push({ label: dropDownName });
        aggOptionsData[dropDownName] = { agg, field: field.name, aggName, dropDownName };
      });
    }
    aggOptions.push(aggOption);
  });

  return {
    groupByOptions,
    groupByOptionsData,
    aggOptions,
    aggOptionsData,
  };
}

export const getPivotPreviewDevConsoleStatement = (request: PreviewRequestBody) => {
  return `POST _transform/_preview\n${JSON.stringify(request, null, 2)}\n`;
};
