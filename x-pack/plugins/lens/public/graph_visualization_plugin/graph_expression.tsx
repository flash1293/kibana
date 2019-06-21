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
const scaleFactor = 1.2;

export interface GraphChartProps {
  data: KibanaDatatable;
  args: { colorMap: string; linkColor: string };
}

export interface GraphRender {
  type: 'render';
  as: 'lens_graph_chart_renderer';
  value: GraphChartProps;
}

export const graphChart: ExpressionFunction<
  'lens_graph_chart',
  KibanaDatatable,
  { colorMap: string; linkColor: string },
  GraphRender
> = {
  name: 'lens_graph_chart',
  type: 'render',
  help: 'A graph chart',
  args: {
    colorMap: {
      types: ['string'],
      help: '',
    },
    linkColor: {
      types: ['string'],
      help: '',
    },
  },
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
  const colorMap = JSON.parse(args.colorMap);
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

    const valueline = d3.line()
    .x(function(d) { return d[0]; })
    .y(function(d) { return d[1]; })
    .curve(d3.curveCatmullRomClosed);
 

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
      .attr('stroke', args.linkColor)
      .attr('stroke-width', d => (d.value / maxLinkValue) * LINK_SCALE);

    link.call(d => {
      const d3Data = d.data();
      const nodes = d.nodes();

      nodes.forEach((node, index) => {
        let mountpoint: HTMLElement;
        let anchor: HTMLElement;
        node.addEventListener('mouseover', e => {
          mountpoint = document.createElement('div');
          anchor = document.createElement('div');
          document.body.appendChild(anchor);
          anchor.appendChild(mountpoint);
          anchor.style.position = 'absolute';
          anchor.style.top = e.clientY - 30 + 'px';
          anchor.style.left = e.clientX + 'px';

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
      .on('dblclick', d => {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      })
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
      .attr('fill', d => {
        const mappedColor = Object.entries(colorMap).find(([prefix, color]) =>
          d.id.startsWith(prefix)
        );
        return mappedColor ? mappedColor[1] : 'gray';
      })
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
            anchor.style.top =
              node.getBoundingClientRect().top - node.getBoundingClientRect().height / 2 + 'px';
            anchor.style.left =
              node.getBoundingClientRect().left + node.getBoundingClientRect().width / 2 + 'px';

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

    node
      .append('foreignObject')
      .attr('width', 100)
      .attr('height', 20)
      .attr('transform', d => `translate(-50,${(d.value / maxValue) * NODE_SCALE + 3})`)
      .attr('style', 'pointer-events: none')
      .append('xhtml:div')
      .attr(
        'style',
        `
    max-width: 100%;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
    word-wrap: normal !important;
    text-align: center;
    font-size: 12px;
    `
      )
      .text(({ id }) => id);

    const groupIds = d3
      .set(
        graph.nodes.map(function({ id }) {
          const matchingPrefix = Object.keys(colorMap).find(prefix => id.startsWith(prefix));
          return matchingPrefix || '';
        })
      )
      .values()
      .map(function(groupId) {
        return {
          groupId,
          count: graph.nodes.filter(function({ id }) {
            const matchingPrefix = Object.keys(colorMap).find(prefix => id.startsWith(prefix));
            return matchingPrefix && matchingPrefix == groupId;
          }).length,
        };
      })
      .filter(function(group) {
        return group.count > 2;
      })
      .map(function(group) {
        return group.groupId;
      });

    const paths = svg
      .append('g')
      .selectAll('.path_placeholder')
      .data(groupIds, function(d) {
        return d;
      })
      .enter()
      .append('g')
      .attr('class', 'path_placeholder')
      .append('path')
      .attr('stroke', function(d) {
        return 'bloack';
      })
      .attr('fill', function(d) {
        return colorMap[d];
      });

      var polygonGenerator = function(groupId: string) {
        var node_coords = node
          .filter(function(d) { return d.id.startsWith(groupId); })
          .data()
          .map(function(d) { return [d.x, d.y]; });
          
        return d3.polygonHull(node_coords);
      };
      
      
      
      function updateGroups() {
        groupIds.forEach(function(groupId) {
          var path = paths.filter(function(d) { return d == groupId;})
            .attr('transform', 'scale(1) translate(0,0)')
            .attr('d', function(d) {
              const polygon = polygonGenerator(d);          
              const centroid = d3.polygonCentroid(polygon);
      
              // to scale the shape properly around its points:
              // move the 'g' element to the centroid point, translate
              // all the path around the center of the 'g' and then
              // we can scale the 'g' element properly
              return valueline(
                polygon.map(function(point) {
                  return [  point[0] - centroid[0], point[1] - centroid[1] ];
                })
              );
            });
      
          d3.select(path.node().parentNode).attr('transform', 'translate('  + centroid[0] + ',' + (centroid[1]) + ') scale(' + scaleFactor + ')');
        });
      }
      

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

      updateGroups();

    }

    function dragstarted(d) {
      d3.select(this).classed('fixed', (d.fixed = true));
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
      // d.fx = null;
      // d.fy = null;
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
