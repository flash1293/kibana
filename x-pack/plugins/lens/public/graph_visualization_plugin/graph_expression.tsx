/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as d3 from 'd3';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { ExpressionFunction } from '../../../../../src/legacy/core_plugins/interpreter/public';
import { KibanaDatatable } from '../types';
import { RenderFunction } from './plugin';

export interface XYChartProps {
  data: KibanaDatatable;
  args: {};
}

export interface GraphRender {
  type: 'render';
  as: 'lens_graph_chart_renderer';
  value: XYChartProps;
}

export const graphChart: ExpressionFunction<
  'lens_graph_chart',
  KibanaDatatable,
  {},
  GraphRender
> = {
  name: 'lens_graph_chart',
  type: 'render',
  help: 'A graph chart',
  args: {},
  context: {
    types: ['kibana_datatable'],
  },
  fn(data: KibanaDatatable, args: {}) {
    return {
      type: 'render',
      as: 'lens_graph_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
  // TODO the typings currently; don't support custom type args. As soon as they do, this can be removed
};

export const graphChartRenderer: RenderFunction<XYChartProps> = {
  name: 'lens_graph_chart_renderer',
  displayName: 'Graph Chart',
  help: 'Graph Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: XYChartProps, _handlers: unknown) => {
    ReactDOM.render(<GraphChart {...config} />, domNode);
  },
};

interface GraphRow {
  filterPair: [string, string];
  value: number;
}

export function GraphChart({ data, args }: XYChartProps) {
  const elementRef = useRef<SVGSVGElement | null>(null);
  function renderD3(el: SVGSVGElement) {
    debugger;
    const svg = d3.select(el),
      width = +svg.attr('width'),
      height = +svg.attr('height');

    const simulation = d3
      .forceSimulation()
      .force(
        'link',
        d3.forceLink().id(function(d) {
          return d.id;
        })
      )
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2));

      const graphLinksAndNodes = (data.rows as GraphRow[]).map(({ filterPair: [source, target], value }) => ({
        source,
        target,
        value,
      }));

      const nodeWeights = graphLinksAndNodes.reduce((weightMap, { source, target, value }) => source === target ? {...weightMap, [source]: value } : weightMap, {} as Record<string, number>);

    const graph = {
      nodes: _.uniq(
        (data.rows as GraphRow[])
          .map(({ filterPair }) => filterPair)
          .reduce((a, b) => [...a, ...b], [] as string[])
      ).map(id => ({ id, value: nodeWeights[id] })),
      links: graphLinksAndNodes.filter(({ source, target }) => source !== target)
    };

    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke', 'red')
      .attr('stroke-width', (d) => d.value);

    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('circle')
      .attr('r', ({ value }) => value + 3)
      .attr('title', (d) => d.id)
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    node.append('title').text(function(d) {
      return d.id;
    });

    simulation.nodes(graph.nodes).on('tick', ticked);

    simulation.force('link')!.links(graph.links);

    function ticked() {
      link
        .attr('x1', function(d) {
          return d.source.x;
        })
        .attr('y1', function(d) {
          return d.source.y;
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y2', function(d) {
          return d.target.y;
        });

      node
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        });
    }

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  return (
    <svg
      width={500}
      height={500}
      ref={el => {
        elementRef.current = el;
        renderD3(el!);
      }}
    />
  );
}
