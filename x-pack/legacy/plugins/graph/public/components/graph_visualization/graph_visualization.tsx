/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { isColorDark, hexToRgb } from '@elastic/eui';
import { WorkspaceNode, WorkspaceEdge } from '../../types';
import { makeNodeId } from '../../services/persistence';

/*
 * The layouting algorithm sets a few extra properties on
 * node objects to handle grouping. This will be moved to
 * a separate data structure when the layouting is migrated
 */

export interface GroupAwareWorkspaceNode extends WorkspaceNode {
  kx: number;
  ky: number;
  numChildren: number;
}

export interface GroupAwareWorkspaceEdge extends WorkspaceEdge {
  topTarget: GroupAwareWorkspaceNode;
  topSrc: GroupAwareWorkspaceNode;
}

export interface GraphVisualizationProps {
  nodes?: GroupAwareWorkspaceNode[];
  edges?: GroupAwareWorkspaceEdge[];
  edgeClick: (edge: GroupAwareWorkspaceEdge) => void;
  nodeClick: (node: GroupAwareWorkspaceNode, e: React.MouseEvent<Element, MouseEvent>) => void;
}

function registerZooming(element: SVGSVGElement) {
  const blockScroll = function() {
    (d3.event as Event).preventDefault();
  };
  d3.select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(
      d3.behavior.zoom().on('zoom', () => {
        const event = d3.event as ZoomEvent;
        d3.select(element)
          .select('g')
          .attr('transform', 'translate(' + event.translate + ')' + 'scale(' + event.scale + ')')
          .attr('style', 'stroke-width: ' + 1 / event.scale);
      })
    );
}

export function GraphVisualization({
  nodes,
  edges,
  edgeClick,
  nodeClick,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="gphGraph"
      width="100%"
      height="100%"
      pointerEvents="all"
      id="graphSvg"
      ref={element => {
        if (element && svgRoot.current !== element) {
          svgRoot.current = element;
          registerZooming(element);
        }
      }}
    >
      <g>
        <g>
          {edges &&
            edges.map(edge => (
              <line
                key={`${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
                  edge.target.data.field,
                  edge.target.data.term
                )}`}
                x1={edge.topSrc.kx}
                y1={edge.topSrc.ky}
                x2={edge.topTarget.kx}
                y2={edge.topTarget.ky}
                onClick={() => {
                  edgeClick(edge);
                }}
                className={classNames('gphEdge', {
                  'gphEdge--selected': edge.isSelected,
                  'gphEdge--inferred': edge.inferred,
                })}
                style={{ strokeWidth: edge.width }}
                strokeLinecap="round"
              />
            ))}
        </g>
        {nodes &&
          nodes
            .filter(node => !node.parent)
            .map(node => (
              <g
                key={makeNodeId(node.data.field, node.data.term)}
                onClick={e => {
                  nodeClick(node, e);
                }}
                onMouseDown={e => {
                  // avoid selecting text when selecting nodes
                  if (e.ctrlKey || e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                className="gphNode"
              >
                <circle
                  cx={0}
                  cy={0}
                  r={node.scaledSize}
                  className={classNames('gphNode__circle', {
                    'gphNode__circle--selected': node.isSelected,
                  })}
                  style={{ fill: node.color, transform: `translate(${node.kx}px, ${node.ky}px)` }}
                />
                {node.icon && (
                  <text
                    className={classNames('fa gphNode__text', {
                      'gphNode__text--inverse': isColorDark(...hexToRgb(node.color)),
                    })}
                    textAnchor="middle"
                    x={0}
                    y={0}
                    style={{ transform: `translate(${node.kx}px, ${node.ky + 5}px)` }}
                  >
                    {node.icon.code}
                  </text>
                )}

                {node.label.length < 30 && (
                  <text
                    className="gphNode__label"
                    textAnchor="middle"
                    x={0}
                    y={0}
                    style={{ transform: `translate(${node.kx}px, ${node.ky + 22}px)` }}
                  >
                    {node.label}
                  </text>
                )}
                {node.label.length >= 30 && (
                  <foreignObject
                    width="100"
                    height="20"
                    x={0}
                    y={0}
                    style={{ transform: `translate(${node.kx - 50}px, ${node.ky + 15}px)` }}
                  >
                    <p className="gphNode__label gphNode__label--html gphNoUserSelect">
                      {node.label}
                    </p>
                  </foreignObject>
                )}

                {node.numChildren > 0 && (
                  <g>
                    <circle
                      r="5"
                      className="gphNode__markerCircle"
                      transform="translate(10,10)"
                      cx={0}
                      cy={0}
                      style={{ transform: `translate(${node.kx + 10}px, ${node.ky + 10}px)` }}
                    />
                    <text
                      className="gphNode__markerText"
                      textAnchor="middle"
                      x={0}
                      y={0}
                      style={{ transform: `translate(${node.kx + 10}px, ${node.ky + 12}px)` }}
                    >
                      {node.numChildren}
                    </text>
                  </g>
                )}
              </g>
            ))}
      </g>
    </svg>
  );
}
