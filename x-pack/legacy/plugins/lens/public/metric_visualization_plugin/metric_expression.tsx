/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { MetricConfig } from './types';
import { LensMultiTable } from '../types';
import { RenderFunction } from './plugin';
import { AutoScale } from './auto_scale';

export interface MetricChartProps {
  data: LensMultiTable;
  args: MetricConfig;
}

export interface MetricRender {
  type: 'render';
  as: 'lens_metric_chart_renderer';
  value: MetricChartProps;
}

export const metricChart: ExpressionFunction<
  'lens_metric_chart',
  LensMultiTable,
  MetricConfig,
  MetricRender
> = ({
  name: 'lens_metric_chart',
  type: 'render',
  help: 'A metric chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
  },
  context: {
    types: ['lens_multitable'],
  },
  fn(data: LensMultiTable, args: MetricChartProps) {
    return {
      type: 'render',
      as: 'lens_metric_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently don't support custom type args. As soon as they do, this can be removed
} as unknown) as ExpressionFunction<
  'lens_metric_chart',
  LensMultiTable,
  MetricConfig,
  MetricRender
>;

export const getMetricChartRenderer = (
  formatFactory: FormatFactory
): RenderFunction<MetricChartProps> => ({
  name: 'lens_metric_chart_renderer',
  displayName: 'Metric Chart',
  help: 'Metric Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: MetricChartProps, _handlers: unknown) => {
    ReactDOM.render(<MetricChart {...config} formatFactory={formatFactory} />, domNode);
  },
});

export function MetricChart({
  data,
  args,
  formatFactory,
}: MetricChartProps & { formatFactory: FormatFactory }) {
  const { title, accessor } = args;
  let value = '-';
  const firstTable = Object.values(data.tables)[0];

  if (firstTable) {
    const column = firstTable.columns[0];
    const row = firstTable.rows[0];
    if (row[accessor]) {
      value =
        column && column.formatHint
          ? formatFactory(column.formatHint).convert(row[accessor])
          : Number(Number(row[accessor]).toFixed(3)).toString();
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '100%',
        maxHeight: '100%',
        textAlign: 'center',
      }}
    >
      <AutoScale>
        <div style={{ fontSize: '60pt', fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: '24pt' }}>{title}</div>
      </AutoScale>
    </div>
  );
}
