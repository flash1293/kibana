/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import ReactDOM from 'react-dom';
import { scaleLinear } from 'd3-scale';
import { Chart, Goal } from '@elastic/charts';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions/public';
import { GaugeConfig } from './types';
import { FormatFactory, LensMultiTable } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { EmptyPlaceholder } from '../shared_components';

export interface GaugeChartProps {
  data: LensMultiTable;
  args: GaugeConfig;
}

export interface GaugeRender {
  type: 'render';
  as: 'lens_gauge_chart_renderer';
  value: GaugeChartProps;
}

export const gaugeChart: ExpressionFunctionDefinition<
  'lens_gauge_chart',
  LensMultiTable,
  Omit<GaugeConfig, 'layerId'>,
  GaugeRender
> = {
  name: 'lens_gauge_chart',
  type: 'render',
  help: 'A gauge chart',
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    gaugeTitle: {
      types: ['string'],
      help: 'The title of the gauge shown.',
    },
    accessor: {
      types: ['string'],
      help: 'The column whose value is being displayed',
    },
    target: {
      types: ['number'],
      help: '',
    },
    min: {
      types: ['number'],
      help: '',
    },
    max: {
      types: ['number'],
      help: '',
    },
    type: {
      types: ['string'],
      help: '',
    },
    subTitle: {
      types: ['string'],
      help: '',
    },
    mode: {
      types: ['string'],
      options: ['reduced', 'full'],
      default: 'full',
      help:
        'The display mode of the chart - reduced will only show the gauge itself without min size',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_gauge_chart_renderer',
      value: {
        data,
        args,
      },
    } as GaugeRender;
  },
};

export const getGaugeChartRenderer = (
  formatFactory: Promise<FormatFactory>
): ExpressionRenderDefinition<GaugeChartProps> => ({
  name: 'lens_gauge_chart_renderer',
  displayName: 'Gauge chart',
  help: 'Gauge chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: GaugeChartProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const resolvedFormatFactory = await formatFactory;
    ReactDOM.render(
      <I18nProvider>
        <GaugeChart {...config} formatFactory={resolvedFormatFactory} />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

export function GaugeChart({
  data,
  args,
  formatFactory,
}: GaugeChartProps & { formatFactory: FormatFactory }) {
  const {
    gaugeTitle,
    title,
    description,
    accessor,
    mode,
    target,
    max: maxConfig,
    min: minConfig,
    type,
    subTitle,
  } = args;
  const firstTable = Object.values(data.tables)[0];
  if (!accessor) {
    return (
      <VisualizationContainer
        reportTitle={title}
        reportDescription={description}
        className="lnsGaugeExpression__container"
      />
    );
  }

  if (!firstTable) {
    return <EmptyPlaceholder icon="visGauge" />;
  }

  const column = firstTable.columns[0];
  const row = firstTable.rows[0];

  // NOTE: Cardinality and Sum never receives "null" as value, but always 0, even for empty dataset.
  // Mind falsy values here as 0!
  const shouldShowResults = row[accessor] != null;

  if (!shouldShowResults) {
    return <EmptyPlaceholder icon="visGauge" />;
  }

  const numberValue = Number(row[accessor]);

  const formatter = column.meta?.params ? formatFactory(column.meta?.params) : undefined;

  const value =
    column && formatter
      ? formatter.convert(row[accessor])
      : Number(Number(row[accessor]).toFixed(3)).toString();

  const min = Math.min(numberValue, minConfig ?? 0);
  const max = Math.max(maxConfig ?? Math.round(Math.abs(numberValue) * 1.5), numberValue);

  const ticks = scaleLinear().domain([min, max]).nice().ticks(5);

  return (
    <VisualizationContainer
      reportTitle={title}
      reportDescription={description}
      className="lnsGaugeExpression__container"
    >
      <Chart>
        <Goal
          id="spec_1"
          subtype={type}
          base={min}
          target={target ?? numberValue}
          actual={numberValue}
          bands={[]}
          ticks={ticks}
          tickValueFormatter={({ value: tickValue }) =>
            formatter ? formatter.convert(tickValue) : String(tickValue)
          }
          labelMajor={gaugeTitle}
          labelMinor={subTitle}
          centralMajor={value}
          centralMinor=" "
          config={{ angleStart: Math.PI, angleEnd: 0 }}
        />
      </Chart>
    </VisualizationContainer>
  );
}
