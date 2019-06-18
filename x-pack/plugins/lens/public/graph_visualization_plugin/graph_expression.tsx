/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as d3 from 'd3';
import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import {
  EuiIconTip,
  EuiPopover,
  EuiWrappingPopover,
  EuiCode,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiText,
} from '@elastic/eui';
import { ExpressionFunction } from '../../../../../src/legacy/core_plugins/interpreter/public';
import { KibanaDatatable } from '../types';
import { RenderFunction } from './plugin';

const NODE_SCALE = 20;
const LINK_SCALE = 20;

export interface GraphChartProps {
  data: KibanaDatatable;
  args: {};
}

export interface GraphRender {
  type: 'render';
  as: 'lens_graph_chart_renderer';
  value: GraphChartProps;
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
  fn(data, args) {
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

export const graphChartRenderer: RenderFunction<GraphChartProps> = {
  name: 'lens_graph_chart_renderer',
  displayName: 'Graph Chart',
  help: 'Graph Chart Renderer',
  validate: () => {},
  reuseDomNode: true,
  render: async (domNode: Element, config: GraphChartProps, _handlers: unknown) => {
    ReactDOM.render(<GraphChart {...config} />, domNode);
  },
};

interface GraphRow {
  filterPair: [string, string];
  value0: number;
  value1: number;
}

export function GraphChart({ data, args }: GraphChartProps) {
  const elementRef = useRef<SVGSVGElement | null>(null);
  function renderD3(el: SVGSVGElement) {
    const svg = d3.select(el),
      width = +svg.attr('width'),
      height = +svg.attr('height');

    svg.selectAll('g').remove();

    const simulation = d3
      .forceSimulation()
      .force(
        'link',
        d3.forceLink().id(function(d) {
          return d.id;
        })
      )
      .force('charge', d3.forceManyBody().strength(-100 * LINK_SCALE))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const graphLinksAndNodes = (data.rows as GraphRow[]).map(
      ({ filterPair: [source, target], value0, value1 }) => ({
        source,
        target,
        value: value0,
        tooltipValue: value1,
      })
    );

    const nodeWeights = graphLinksAndNodes.reduce(
      (weightMap, { source, target, value }) =>
        source === target ? { ...weightMap, [source]: value } : weightMap,
      {} as Record<string, number>
    );

    const tooltipWeights = graphLinksAndNodes.reduce(
      (weightMap, { source, target, tooltipValue }) =>
        source === target ? { ...weightMap, [source]: tooltipValue } : weightMap,
      {} as Record<string, number>
    );

    const graph = {
      nodes: _.uniq(
        (data.rows as GraphRow[])
          .map(({ filterPair }) => filterPair)
          .reduce((a, b) => [...a, ...b], [] as string[])
      ).map(id => ({ id, value: nodeWeights[id], tooltipValue: tooltipWeights[id] })),
      links: graphLinksAndNodes.filter(({ source, target }) => source !== target),
    };

    const maxValue = Math.max.apply(undefined, data.rows.map(row => row.value0 as number));
    const maxLinkValue = Math.max.apply(
      undefined,
      data.rows
        .filter(row => (row.filterPair as string[])[0] !== (row.filterPair as string[])[1])
        .map(row => row.value0 as number)
    );

    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke', 'red')
      .attr('stroke-width', d => (d.value / maxLinkValue) * LINK_SCALE);

    link.call(d => {
      const d3Data = d.data();
      const nodes = d.nodes();

      nodes.forEach((node, index) => {
        let mountpoint: HTMLElement;
        let anchor: HTMLElement;
        node.addEventListener('mouseover', () => {
          mountpoint = document.createElement('div');
          anchor = document.createElement('div');
          document.body.appendChild(anchor);
          anchor.appendChild(mountpoint);
          anchor.style.position = 'absolute';
          anchor.style.top = node.getBoundingClientRect().top + 'px';
          anchor.style.left = node.getBoundingClientRect().left + 'px';

          ReactDOM.render(
            <>
              <EuiWrappingPopover
                id={d3Data[index].target + '' + d3Data[index].source.id}
                button={mountpoint}
                isOpen={true}
                closePopover={() => {
                  ReactDOM.unmountComponentAtNode(mountpoint);
                  document
                    .querySelectorAll('[data-focus-lock-disabled="disabled"]')
                    .forEach(el => el.remove());
                  anchor.remove();
                }}
                anchorPosition="upCenter"
              >
                <EuiText grow={false}>
                  <h2>
                    Intersection of <EuiCode>{d3Data[index].source.id}</EuiCode> and{' '}
                    <EuiCode>{d3Data[index].target.id}</EuiCode>
                  </h2>
                </EuiText>
                <EuiDescriptionList>
                  <EuiDescriptionListTitle>{data.columns[1].name}</EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {d3Data[index].value}
                  </EuiDescriptionListDescription>
                  {data.columns[2] && (
                    <>
                      <EuiDescriptionListTitle>{data.columns[2].name}</EuiDescriptionListTitle>
                      <EuiDescriptionListDescription>
                        {d3Data[index].tooltipValue}
                      </EuiDescriptionListDescription>
                    </>
                  )}
                </EuiDescriptionList>
              </EuiWrappingPopover>
            </>,
            mountpoint
          );
        });
        node.addEventListener('mouseout', () => {
          if (mountpoint) {
            ReactDOM.unmountComponentAtNode(mountpoint);
            document
              .querySelectorAll('[data-focus-lock-disabled="disabled"]')
              .forEach(el => el.remove());
            anchor.remove();
          }
        });
      });
    });

    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(graph.nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    node
      .append('circle')
      .attr('r', ({ value }) => (value / maxValue) * NODE_SCALE + 3)
      .attr('fill', 'gray')
      .call(d => {
        const d3Data = d.data();
        const nodes = d.nodes();

        nodes.forEach((node, index) => {
          let mountpoint: HTMLElement;
          let anchor: HTMLElement;
          node.addEventListener('mouseover', () => {
            mountpoint = document.createElement('div');
            anchor = document.createElement('div');
            document.body.appendChild(anchor);
            anchor.appendChild(mountpoint);
            anchor.style.position = 'absolute';
            anchor.style.top = node.getBoundingClientRect().top + 'px';
            anchor.style.left = node.getBoundingClientRect().left + 'px';

            ReactDOM.render(
              <>
                <EuiWrappingPopover
                  id={d3Data[index].id}
                  button={mountpoint}
                  isOpen={true}
                  closePopover={() => {
                    ReactDOM.unmountComponentAtNode(mountpoint);
                    document
                      .querySelectorAll('[data-focus-lock-disabled="disabled"]')
                      .forEach(el => el.remove());
                    anchor.remove();
                  }}
                  anchorPosition="upCenter"
                >
                  <EuiText grow={false}>
                    <h2>
                      Node <EuiCode>{d3Data[index].id}</EuiCode>
                    </h2>
                  </EuiText>
                  <EuiDescriptionList>
                    <EuiDescriptionListTitle>{data.columns[1].name}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      {d3Data[index].value}
                    </EuiDescriptionListDescription>
                    {data.columns[2] && (
                      <>
                        <EuiDescriptionListTitle>{data.columns[2].name}</EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>
                          {d3Data[index].tooltipValue}
                        </EuiDescriptionListDescription>
                      </>
                    )}
                  </EuiDescriptionList>
                </EuiWrappingPopover>
              </>,
              mountpoint
            );
          });
          node.addEventListener('mouseout', () => {
            if (mountpoint) {
              ReactDOM.unmountComponentAtNode(mountpoint);
              document
                .querySelectorAll('[data-focus-lock-disabled="disabled"]')
                .forEach(el => el.remove());
              anchor.remove();
            }
          });
        });
      });

    node.append('text').text(({ id }) => id);

    simulation.nodes(graph.nodes).on('tick', ticked);

    simulation.force('link')!.links(graph.links);

    console.log('data flushed');

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

      node.attr('transform', function(d) {
        return `translate(${d.x}, ${d.y})`;
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
      width={1000}
      height={800}
      ref={el => {
        if (el) {
          elementRef.current = el;
          renderD3(el);
        }
      }}
    />
  );
}
