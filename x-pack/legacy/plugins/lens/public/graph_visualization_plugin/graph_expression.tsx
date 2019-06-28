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
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { KibanaDatatable } from '../types';
import { RenderFunction } from './plugin';

const NODE_SCALE = 20;
const LINK_SCALE = 20;
const scaleFactor = 1.2;

export interface GraphChartProps {
  data: KibanaDatatable;
  args: { colorMap: string; linkColor: string; groupMap: string; annotations: string };
}

export interface GraphRender {
  type: 'render';
  as: 'lens_graph_chart_renderer';
  value: GraphChartProps;
}

export const graphChart: ExpressionFunction<
  'lens_graph_chart',
  KibanaDatatable,
  { colorMap: string; linkColor: string; groupMap: string; annotations: string },
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
    groupMap: {
      types: ['string'],
      help: '',
    },
    annotations: {
      types: ['string'],
      default: '{}',
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
  const groupMap = JSON.parse(args.groupMap);
  const annotations = JSON.parse(args.annotations);
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
          // @ts-ignore
          return d.id;
        })
      )
      .force('charge', d3.forceManyBody().strength(-100 * LINK_SCALE))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // @ts-ignore
    const graphLinksAndNodes = (data.rows as GraphRow[]).map(
      ({ filterPair: [source, target], value0, value1 }) => ({
        source,
        target,
        value: value0,
        tooltipValue: value1,
      })
    );

    const valueline = d3
      .line()
      .x(function(d) {
        return d[0];
      })
      .y(function(d) {
        return d[1];
      })
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
        // @ts-ignore
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

    const groupIds = d3
      .set(
        graph.nodes.map(function({ id }) {
          const matchingPrefix = Object.keys(colorMap).find(prefix => id.startsWith(prefix));
          if (matchingPrefix && groupMap[matchingPrefix]) {
            return matchingPrefix;
          }
          return '';
        })
      )
      .values()
      .map(function(groupId) {
        return {
          groupId,
          count: graph.nodes.filter(function({ id }) {
            const matchingPrefix = Object.keys(colorMap).find(prefix => id.startsWith(prefix));
            return matchingPrefix && matchingPrefix === groupId;
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
      // @ts-ignore
      .data(groupIds, function(d) {
        return d;
      })
      .enter()
      .append('g')
      .attr('class', 'path_placeholder')
      .append('path')
      // @ts-ignore
      .attr('stroke', function(d) {
        return 'bloack';
      })
      // @ts-ignore
      .attr('fill', function(d) {
        return colorMap[d];
      })
      .attr('style', 'opacity: 0.3');

    const polygonGenerator = function(groupId: string) {
      const nodecoords = node
        .filter(function(d) {
          return d.id.startsWith(groupId);
        })
        .data()
        // @ts-ignore
        .map(function(d) {
          // @ts-ignore
          return [d.x, d.y];
        });

      // @ts-ignore
      return d3.polygonHull(nodecoords);
    };

    function updateGroups() {
      groupIds.forEach(function(groupId) {
        // @ts-ignore
        let centroid;
        // @ts-ignore
        const path = paths
          // @ts-ignore
          .filter(function(d) {
            return d === groupId;
          })
          .attr('transform', 'scale(1) translate(0,0)')
          // @ts-ignore
          .attr('d', function(d) {
            const polygon = polygonGenerator(d);
            centroid = d3.polygonCentroid(polygon);

            // to scale the shape properly around its points:
            // move the 'g' element to the centroid point, translate
            // all the path around the center of the 'g' and then
            // we can scale the 'g' element properly
            return valueline(
              // @ts-ignore
              polygon.map(function(point) {
                // @ts-ignore
                return [point[0] - centroid[0], point[1] - centroid[1]];
              })
            );
          });

        // @ts-ignore
        d3.select(path.node().parentNode).attr(
          'transform',
          // @ts-ignore
          'translate(' + centroid[0] + ',' + centroid[1] + ') scale(' + scaleFactor + ')'
        );
      });
    }

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
                // @ts-ignore
                id={d3Data[index].target + '' + d3Data[index].source.id}
                button={mountpoint}
                isOpen={true}
                closePopover={() => {
                  ReactDOM.unmountComponentAtNode(mountpoint);
                  document
                    .querySelectorAll('[data-focus-lock-disabled="disabled"]')
                    .forEach(el2 => el2.remove());
                  anchor.remove();
                }}
                anchorPosition="upCenter"
              >
                <EuiText grow={false}>
                  <h2>
                    Intersection of{' '}
                    <EuiCode>{((d3Data[index].source as unknown) as { id: string }).id}</EuiCode>{' '}
                    and{' '}
                    <EuiCode>{((d3Data[index].target as unknown) as { id: string }).id}</EuiCode>
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
              .forEach(el2 => el2.remove());
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
        // @ts-ignore
        d.fx = null;
        // @ts-ignore
        d.fy = null;
      })
      .call(
        // @ts-ignore
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
        const mappedPrefix = Object.keys(colorMap).find(prefix => d.id.startsWith(prefix));
        const isGroupColor = mappedPrefix && groupMap[mappedPrefix];
        if (mappedPrefix && !isGroupColor) {
          return colorMap[mappedPrefix];
        }
        return 'gray';
      })
      .attr('stroke-width', '4px')
      .attr('stroke', d => {
        const mappedPrefix = Object.keys(annotations).find(prefix => d.id.startsWith(prefix));
        if (mappedPrefix) {
          return 'yellow';
        } else {
          return 'gray';
        }
      })
      .call(d => {
        const d3Data = d.data();
        const nodes = d.nodes();

        nodes.forEach((node2, index) => {
          let mountpoint: HTMLElement;
          let anchor: HTMLElement;
          const mappedPrefix = Object.keys(annotations).find(prefix =>
            d3Data[index].id.startsWith(prefix)
          );
          const annotation = mappedPrefix && annotations[mappedPrefix];

          node2.addEventListener('mouseover', () => {
            mountpoint = document.createElement('div');
            anchor = document.createElement('div');
            document.body.appendChild(anchor);
            anchor.appendChild(mountpoint);
            anchor.style.position = 'absolute';
            anchor.style.top =
              node2.getBoundingClientRect().top - node2.getBoundingClientRect().height / 2 + 'px';
            anchor.style.left =
              node2.getBoundingClientRect().left + node2.getBoundingClientRect().width / 2 + 'px';

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
                      .forEach(el2 => el2.remove());
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
                    {annotation && (
                      <>
                        <EuiDescriptionListTitle>Annotation</EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>{annotation}</EuiDescriptionListDescription>
                      </>
                    )}
                  </EuiDescriptionList>
                </EuiWrappingPopover>
              </>,
              mountpoint
            );
          });
          node2.addEventListener('mouseout', () => {
            if (mountpoint) {
              ReactDOM.unmountComponentAtNode(mountpoint);
              document
                .querySelectorAll('[data-focus-lock-disabled="disabled"]')
                .forEach(el2 => el2.remove());
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

    // @ts-ignore
    simulation.nodes(graph.nodes).on('tick', ticked);

    // @ts-ignore
    simulation.force('link')!.links(graph.links);

    function ticked() {
      link
        .attr('x1', function(d) {
          // @ts-ignore
          return d.source.x;
        })
        .attr('y1', function(d) {
          // @ts-ignore
          return d.source.y;
        })
        .attr('x2', function(d) {
          // @ts-ignore
          return d.target.x;
        })
        .attr('y2', function(d) {
          // @ts-ignore
          return d.target.y;
        });

      // @ts-ignore
      node.attr('transform', function(d) {
        // @ts-ignore
        return `translate(${d.x}, ${d.y})`;
      });

      updateGroups();
    }

    // @ts-ignore
    function dragstarted(d) {
      // @ts-ignore
      d3.select(this).classed('fixed', (d.fixed = true));
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    // @ts-ignore
    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    // @ts-ignore
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
