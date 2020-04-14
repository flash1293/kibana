/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useSprings, animated, useSpring } from 'react-spring';
import { connect, Provider } from 'react-redux';
import { debounce } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import {
  isColorDark,
  hexToRgb,
  EuiPopover,
  EuiButtonIcon,
  EuiRange,
  EuiFormRow,
  EuiListGroup,
  EuiIcon,
  EuiToolTip,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import { WorkspaceNode, WorkspaceEdge, WorkspaceField, UrlTemplate } from '../../types';
import { makeNodeId } from '../../services/persistence';
import {
  GraphState,
  metaDataSelector,
  selectedFieldsSelector,
  templatesSelector,
  updateMetaData,
} from '../../state_management';
import { urlTemplateRegex } from '../../helpers/url_template';
import { LegacyIcon } from '../legacy_icon';
import { VennDiagram } from '../venn_diagram';
import { NodeIcon } from '../edit_nodes_panel';

/*
 * The layouting algorithm sets a few extra properties on
 * node objects to handle grouping. This will be moved to
 * a separate data structure when the layouting is migrated
 */

function GraphNode({
  node,
  nodeClick,
  minDocCount,
  topVertex,
  popoverForceClosed,
  setForceClosedPopover,
  setShowDrilldown,
  clientWorkspace,
  mode,
  dataMode,
  editMode,
  showDrilldown,
  urlTemplates,
  setHoveredNode,
}: {
  node: any;
  nodeClick: any;
  minDocCount: any;
  topVertex: any;
  popoverForceClosed: any;
  setForceClosedPopover: any;
  setShowDrilldown: any;
  clientWorkspace: any;
  mode: any;
  dataMode: any;
  editMode: any;
  showDrilldown: any;
  urlTemplates: any;
  setHoveredNode: any;
}) {
  const nodeSpring = useSpring({
    x: node.kx,
    y: node.ky,
  });
  return (
    <g
      key={makeNodeId(node.data.field, node.data.term)}
      onClick={e => {
        e.stopPropagation();
        nodeClick(node, e);
      }}
      onMouseDown={e => {
        // avoid selecting text when selecting nodes
        if (e.ctrlKey || e.shiftKey) {
          e.preventDefault();
        }
      }}
      onMouseEnter={() => {
        setHoveredNode(node);
      }}
      onMouseLeave={() => {
        setHoveredNode(undefined);
      }}
      className="gphNode"
      style={{
        opacity: (node as any).doc_count > 0 && (node as any).doc_count >= minDocCount ? 1 : 0.5,
      }}
    >
      {topVertex && topVertex.id === node.id && (
        <animated.foreignObject
          width="10"
          height="10"
          transform="translate(0,-35)"
          style={{ opacity: 1, position: 'absolute', zIndex: 999 }}
          x={nodeSpring.x}
          y={nodeSpring.y}
        >
          <EuiPopover
            className="gphVisualizationPopover"
            anchorPosition="upCenter"
            button={<span />}
            isOpen={!popoverForceClosed}
            onClick={e => {
              e.stopPropagation();
            }}
            hasArrow={clientWorkspace.selectedNodes.length === 1}
            closePopover={() => {
              setForceClosedPopover(true);
              setShowDrilldown(false);
              // clientWorkspace.selectNone();
              // notifyAngular();
            }}
          >
            <div className="gphVisualizationPopover__description">
              <EuiText size="s">
                <p>
                  {' '}
                  {clientWorkspace.selectedNodes.length}{' '}
                  {clientWorkspace.selectedNodes.length === 1 ? 'vertex' : 'vertices'} selected
                </p>
              </EuiText>
            </div>

            <EuiToolTip
              position="top"
              content="Add data"
              anchorClassName="gphVisualizationToolTipAnchor"
              delay="long"
            >
              <EuiButtonIcon
                color="text"
                className="gphVisualizationPopover__button"
                aria-label="add data"
                iconType="graphApp"
                disabled={mode === 'data'}
                onClick={() => {
                  dataMode();
                }}
              />
            </EuiToolTip>
            <EuiToolTip
              position="top"
              content="Edit"
              anchorClassName="gphVisualizationToolTipAnchor"
            >
              <EuiButtonIcon
                color="text"
                className="gphVisualizationPopover__button"
                aria-label="edit"
                iconType="pencil"
                disabled={mode === 'edit'}
                onClick={() => {
                  editMode();
                }}
              />
            </EuiToolTip>
            <EuiToolTip
              position="top"
              content={
                clientWorkspace.selectedNodes.length === 1 &&
                !clientWorkspace.selectedNodes[0].numChildren === 0
                  ? 'Ungroup'
                  : 'Group'
              }
              anchorClassName="gphVisualizationToolTipAnchor"
            >
              <EuiButtonIcon
                color="text"
                className="gphVisualizationPopover__button"
                aria-label="group"
                iconType="submodule"
                disabled={
                  clientWorkspace.selectedNodes.length === 1 &&
                  clientWorkspace.selectedNodes[0].numChildren === 0
                }
                onClick={() => {
                  setForceClosedPopover(true);
                  editMode();
                  if (clientWorkspace.selectedNodes.length === 1) {
                    clientWorkspace.ungroup(clientWorkspace.selectedNodes[0]);
                  } else {
                    clientWorkspace.groupSelections(
                      clientWorkspace.selectedNodes[clientWorkspace.selectedNodes.length - 1]
                    );
                  }
                }}
              />
            </EuiToolTip>
            <EuiToolTip
              position="top"
              content="Drilldown"
              anchorClassName="gphVisualizationToolTipAnchor"
            >
              <EuiButtonIcon
                color="text"
                className="gphVisualizationPopover__button"
                aria-label="drilldown"
                iconType="documents"
                onClick={e => {
                  e.stopPropagation();
                  setShowDrilldown(!showDrilldown);
                }}
              />
            </EuiToolTip>
            <EuiToolTip
              position="top"
              content="Delete selection"
              anchorClassName="gphVisualizationToolTipAnchor"
            >
              <EuiButtonIcon
                color="text"
                className="gphVisualizationPopover__button"
                aria-label="remove"
                iconType="trash"
                onClick={() => {
                  clientWorkspace.deleteSelection();
                }}
              />
            </EuiToolTip>
            {showDrilldown && (
              <EuiListGroup
                listItems={urlTemplates.map(template => ({
                  label: template.description,
                  icon: template.icon ? (
                    <LegacyIcon icon={template.icon} />
                  ) : (
                    <EuiIcon type="document" />
                  ),
                  size: 's',
                  onClick: () => {
                    const url = template.url;
                    const newUrl = url.replace(
                      urlTemplateRegex,
                      template.encoder.encode(clientWorkspace)
                    );
                    window.open(newUrl, '_blank');
                  },
                }))}
              />
            )}
          </EuiPopover>
        </animated.foreignObject>
      )}
      <animated.circle
        cx={nodeSpring.x}
        cy={nodeSpring.y}
        r={node.scaledSize}
        className={classNames('gphNode__circle', {
          'gphNode__circle--selected': node.isSelected,
        })}
        style={{ fill: node.color }}
      />
      {node.icon && (
        <animated.text
          className={classNames('fa gphNode__text', {
            'gphNode__text--inverse': isColorDark(...hexToRgb(node.color)),
          })}
          transform="translate(0,5)"
          textAnchor="middle"
          x={nodeSpring.x}
          y={nodeSpring.y}
        >
          {node.icon.code}
        </animated.text>
      )}

      {node.label.length < 30 && (
        <animated.text
          className="gphNode__label"
          textAnchor="middle"
          transform="translate(0,22)"
          x={nodeSpring.x}
          y={nodeSpring.y}
        >
          {node.label}
        </animated.text>
      )}
      {node.label.length >= 30 && (
        <animated.foreignObject
          width="100"
          height="20"
          transform="translate(-50,15)"
          x={nodeSpring.x}
          y={nodeSpring.y}
        >
          <p className="gphNode__label gphNode__label--html gphNoUserSelect">{node.label}</p>
        </animated.foreignObject>
      )}

      {node.numChildren > 0 && (
        <g>
          <animated.circle
            r="5"
            className="gphNode__markerCircle"
            transform="translate(10,10)"
            cx={nodeSpring.x}
            cy={nodeSpring.y}
          />
          <animated.text
            className="gphNode__markerText"
            textAnchor="middle"
            transform="translate(10,12)"
            x={nodeSpring.x}
            y={nodeSpring.y}
          >
            {node.numChildren + 1}
          </animated.text>
        </g>
      )}
    </g>
  );
}

function GraphEdge({
  selectedEdge,
  edge,
  popoverForceClosed,
  setForceClosedPopover,
  setShowDrilldown,
  setSelectedEdge,
  edgeSummary,
  maxDocCount,
}: {
  selectedEdge: any;
  edge: any;
  popoverForceClosed: any;
  setForceClosedPopover: any;
  setShowDrilldown: any;
  setSelectedEdge: any;
  edgeSummary: any;
  maxDocCount: any;
}) {
  const edgeSpring = useSpring({
    x1: edge.topSrc.kx,
    x2: edge.topTarget.kx,
    y1: edge.topSrc.ky,
    y2: edge.topTarget.ky,
  });
  const introSpring = useSpring({ from: { opacity: 0 }, to: { opacity: 1 } });
  return (
    <>
      {selectedEdge === edge && (
        <foreignObject
          width="10"
          height="10"
          transform="translate(0,-35)"
          style={{ opacity: 1, position: 'absolute', zIndex: 999 }}
          x={(edge.topSrc.kx + edge.topTarget.kx) / 2}
          y={(edge.topSrc.ky + edge.topTarget.ky) / 2}
        >
          <EuiPopover
            className="gphVisualizationPopover"
            anchorPosition="upCenter"
            button={<span />}
            isOpen={!popoverForceClosed}
            onClick={e => {
              e.stopPropagation();
            }}
            closePopover={() => {
              setForceClosedPopover(true);
              setShowDrilldown(false);
              setSelectedEdge(undefined);
            }}
          >
            <div className="gphVisualizationPopover__description">
              <EuiText size="s">
                <h4>Connection summary</h4>
              </EuiText>
            </div>

            {edgeSummary ? (
              <div className="gphVisualizationPopover__edgeSummary">
                <VennDiagram
                  leftValue={edgeSummary.v1}
                  rightValue={edgeSummary.v2}
                  overlap={edgeSummary.overlap}
                />
                <EuiText className="gphVisualizationPopover__edgeSummaryText" size="s">
                  <span>{edgeSummary.v1}</span>
                  <span className="gphVisualizationPopover__edgeSummaryOverlap">
                    ({edgeSummary.overlap})
                  </span>
                  <span>{edgeSummary.v2}</span>
                </EuiText>
                <EuiText className="gphVisualizationPopover__fieldTerm" size="xs">
                  <span>
                    {edge.topSrc.data.field}: {edge.topSrc.data.term}
                  </span>
                  <span>
                    {edge.topTarget.data.field}: {edge.topTarget.data.term}
                  </span>
                </EuiText>
              </div>
            ) : (
              'loading...'
            )}
          </EuiPopover>
        </foreignObject>
      )}
      <animated.line
        key={`${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
          edge.target.data.field,
          edge.target.data.term
        )}`}
        x1={edgeSpring.x1}
        y1={edgeSpring.y1}
        x2={edgeSpring.x2}
        y2={edgeSpring.y2}
        onClick={() => {
          setSelectedEdge(edge);
          setForceClosedPopover(false);
        }}
        className={classNames('gphEdge', {
          'gphEdge--selected': edge.isSelected,
        })}
        style={{
          strokeWidth: Math.max(2, ((edge as any).doc_count / maxDocCount) * 5),
          ...introSpring,
        }}
        strokeLinecap="round"
      />
    </>
  );
}

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
  maxDocCount: number;
  clientWorkspace: any;
  notifyAngular: () => void;
  fields: WorkspaceField[];
  urlTemplates: UrlTemplate[];
  mode: string;
  dataMode: () => void;
  editMode: () => void;
}

let zoom: any;
let d3el: any;
function registerZooming(element: SVGSVGElement) {
  const blockScroll = function() {
    (d3.event as Event).preventDefault();
  };
  zoom = d3.behavior.zoom().on('zoom', () => {
    const event = d3.event as ZoomEvent;
    d3.select(element)
      .select('g')
      .attr('transform', 'translate(' + event.translate + ')' + 'scale(' + event.scale + ')')
      .attr('style', 'stroke-width: ' + 1 / event.scale);
  });
  d3el = d3
    .select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(zoom);
}

const updateLayout = debounce((clientWorkspace: any, count: any) => {
  clientWorkspace.minShownDocCount = count;
  clientWorkspace.mergeGraph({ edges: [] });
}, 300);

function GraphVisualizationComponent({
  nodes,
  edges,
  edgeClick,
  nodeClick,
  maxDocCount,
  clientWorkspace,
  fields,
  urlTemplates,
  mode,
  dataMode,
  editMode,
  notifyAngular,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [popoverForceClosed, setForceClosedPopover] = useState(false);
  const [minDocCount, setMinDocCount] = useState(0);
  const [showDrilldown, setShowDrilldown] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<any>(undefined);
  const [edgeSummary, setEdgeSummary] = useState<any>(undefined);
  const [refresher, setRefresher] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<undefined | WorkspaceNode>(undefined);

  useEffect(() => {
    if (!selectedEdge) return;
    clientWorkspace.getAllIntersections(
      ([mc]: any) => {
        setEdgeSummary({
          v1: mc.v1,
          v2: mc.v2,
          overlap: mc.overlap,
        });
      },
      [selectedEdge.topSrc, selectedEdge.topTarget]
    );
  }, [selectedEdge]);

  const selectedFieldIds = useMemo(() => {
    const ids = new Set<string>();
    fields.forEach(field => {
      if (field.hopSize > 0) {
        ids.add(field.name);
      }
    });
    return ids;
  }, [fields]);

  const selectedNodesId = (clientWorkspace && clientWorkspace.selectedNodes
    ? clientWorkspace.selectedNodes
    : []
  )
    .map(node => node.id)
    .join(',');

  useEffect(() => {
    // reset query when user interacts with graph
    setForceClosedPopover(false);
  }, [selectedNodesId]);

  function getTopMostSelectedVertex() {
    let maxVertex: any = undefined;
    if (
      clientWorkspace &&
      clientWorkspace.selectedNodes &&
      clientWorkspace.selectedNodes.length > 0
    ) {
      clientWorkspace.selectedNodes.forEach((node: any) => {
        if (!maxVertex || node.y < maxVertex.y) {
          maxVertex = node;
        }
      });
    }
    return maxVertex;
  }

  const topVertex = getTopMostSelectedVertex();

  const filteredEdges = edges
    ? edges.filter(
        edge =>
          (edge as any).doc_count >= minDocCount &&
          !edge.topSrc.parent &&
          !edge.topTarget.parent &&
          (selectedFieldIds.has(edge.topSrc.data.field) || edge.topSrc.data.alwaysKeep) &&
          (selectedFieldIds.has(edge.topTarget.data.field) || edge.topSrc.data.alwaysKeep)
      )
    : [];
  const filteredNodes = nodes
    ? nodes.filter(
        node => !node.parent && (selectedFieldIds.has(node.data.field) || node.data.alwaysKeep)
      )
    : [];

  return (
    <>
      <div className="gphVisualization__toolbar">
        <EuiFlexGroup
          responsive={false}
          direction="column"
          alignItems="flexStart"
          gutterSize="none"
          className="gphVisualization__toolbarButtonGroup"
        >
          <EuiFlexItem>
            <EuiToolTip position="right" content="Zoom in">
              <EuiButtonIcon
                color="text"
                iconType="plusInCircleFilled"
                aria-label="filter connections"
                onClick={() => {
                  d3el.call(zoom.event); // https://github.com/mbostock/d3/issues/2387

                  // Record the coordinates (in data space) of the center (in screen space).
                  zoom.scale(zoom.scale() * 1.1);

                  d3el
                    .transition()
                    .duration(300)
                    .call(zoom.event);
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip position="right" content="Zoom out">
              <EuiButtonIcon
                color="text"
                iconType="minusInCircleFilled"
                aria-label="filter connections"
                onClick={() => {
                  d3el.call(zoom.event); // https://github.com/mbostock/d3/issues/2387

                  // Record the coordinates (in data space) of the center (in screen space).
                  zoom.scale(zoom.scale() * 0.9);

                  d3el
                    .transition()
                    .duration(300)
                    .call(zoom.event);
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup responsive={false} direction="column" alignItems="flexStart" gutterSize="s">
          <EuiFlexItem>
            <EuiToolTip position="right" content="Center workspace">
              <EuiButtonIcon
                className="gphVisualization__toolbarButton"
                color="text"
                iconType="crosshairs"
                aria-label="filter connections"
                onClick={() => {
                  d3el.call(zoom.event); // https://github.com/mbostock/d3/issues/2387

                  // Record the coordinates (in data space) of the center (in screen space).
                  zoom.translate([0, 0]);
                  zoom.scale(1);

                  d3el
                    .transition()
                    .duration(300)
                    .call(zoom.event);
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup
          responsive={false}
          direction="column"
          alignItems="flexStart"
          gutterSize="none"
          className="gphVisualization__toolbarButtonGroup"
        >
          <EuiFlexItem>
            <EuiToolTip position="right" content="Undo last action">
              <EuiButtonIcon
                color="text"
                iconType="editorUndo"
                aria-label="filter connections"
                onClick={() => clientWorkspace.undo()}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiToolTip position="right" content="Redo last action">
              <EuiButtonIcon
                color="text"
                iconType="editorRedo"
                aria-label="filter connections"
                onClick={() => clientWorkspace.redo()}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiFlexGroup responsive={false} direction="column" alignItems="flexStart" gutterSize="s">
          <EuiFlexItem>
            <EuiPopover
              id="popover"
              anchorPosition="rightUp"
              button={
                selectionOpen ? (
                  <EuiButtonIcon
                    className="gphVisualization__toolbarButton"
                    color="text"
                    iconType="partial"
                    aria-label="filter connections"
                    onClick={() => setSelectionOpen(!selectionOpen)}
                  />
                ) : (
                  <EuiToolTip position="right" content="Select vertices">
                    <EuiButtonIcon
                      className="gphVisualization__toolbarButton"
                      color="text"
                      iconType="partial"
                      aria-label="filter connections"
                      onClick={() => setSelectionOpen(!selectionOpen)}
                    />
                  </EuiToolTip>
                )
              }
              isOpen={selectionOpen}
              closePopover={() => setSelectionOpen(false)}
            >
              <EuiContextMenuPanel title="Selections">
                <EuiContextMenuItem
                  key="all"
                  icon="empty"
                  onClick={() => {
                    clientWorkspace.selectAll();
                    setRefresher(refresher + 1);
                    notifyAngular();
                  }}
                >
                  All
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  key="none"
                  icon="empty"
                  onClick={() => {
                    clientWorkspace.selectNone();
                    setRefresher(refresher + 1);
                    notifyAngular();
                  }}
                >
                  None
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  key="invert"
                  icon="empty"
                  onClick={() => {
                    clientWorkspace.selectInvert();
                    setRefresher(refresher + 1);
                    notifyAngular();
                  }}
                >
                  Invert
                </EuiContextMenuItem>
                <EuiContextMenuItem
                  key="linked"
                  icon="empty"
                  onClick={() => {
                    clientWorkspace.selectNeighbours();
                    setRefresher(refresher + 1);
                    notifyAngular();
                  }}
                >
                  Linked
                </EuiContextMenuItem>
              </EuiContextMenuPanel>
            </EuiPopover>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPopover
              id="popover"
              anchorPosition="rightUp"
              button={
                open ? (
                  <EuiButtonIcon
                    className="gphVisualization__toolbarButton"
                    color="text"
                    iconType="filter"
                    aria-label="filter connections"
                    onClick={() => setOpen(!open)}
                  />
                ) : (
                  <EuiToolTip position="right" content="Filter connections">
                    <EuiButtonIcon
                      className="gphVisualization__toolbarButton"
                      color="text"
                      iconType="filter"
                      aria-label="filter connections"
                      onClick={() => setOpen(!open)}
                    />
                  </EuiToolTip>
                )
              }
              isOpen={open}
              closePopover={() => setOpen(false)}
            >
              <EuiFormRow label="Minimum number of documents">
                <EuiRange
                  value={minDocCount}
                  min={0}
                  max={maxDocCount}
                  onChange={e => {
                    setMinDocCount(e.target.valueAsNumber);
                    updateLayout(clientWorkspace, e.target.valueAsNumber);
                  }}
                  showInput
                />
              </EuiFormRow>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
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
        onClick={() => {
          dataMode();
          clientWorkspace.selectNone();
          setRefresher(refresher + 1);
          notifyAngular();
        }}
      >
        <g>
          <g>
            <g>
              {filteredEdges.map((edge, index) => (
                <GraphEdge
                  maxDocCount={maxDocCount}
                  key={edge.id}
                  selectedEdge={selectedEdge}
                  edge={edge}
                  popoverForceClosed={popoverForceClosed}
                  setForceClosedPopover={setForceClosedPopover}
                  setShowDrilldown={setShowDrilldown}
                  setSelectedEdge={setSelectedEdge}
                  edgeSummary={edgeSummary}
                />
              ))}
            </g>
            {filteredNodes.map((node, index) => (
              <GraphNode
                key={node.id}
                node={node}
                nodeClick={nodeClick}
                minDocCount={minDocCount}
                topVertex={topVertex}
                popoverForceClosed={popoverForceClosed}
                setForceClosedPopover={setForceClosedPopover}
                setShowDrilldown={setShowDrilldown}
                clientWorkspace={clientWorkspace}
                mode={mode}
                dataMode={dataMode}
                editMode={editMode}
                showDrilldown={showDrilldown}
                urlTemplates={urlTemplates}
                setHoveredNode={setHoveredNode}
              />
            ))}
          </g>
        </g>
      </svg>
      {clientWorkspace && (
        <div className="gphBottomBar">
          {hoveredNode ? (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <NodeIcon node={hoveredNode} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <span>{`${hoveredNode.data.field}: ${hoveredNode.data.term}`}</span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <span style={{ padding: 4 }}>
                  <b>{clientWorkspace.nodes.length}</b> vertices,{' '}
                  <b>{clientWorkspace.edges.length}</b> connections filtered
                </span>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </div>
      )}
    </>
  );
}
const ConnectedGraphVisualization = connect(
  (state: GraphState) => {
    return {
      fields: selectedFieldsSelector(state),
      urlTemplates: templatesSelector(state),
      mode: metaDataSelector(state).mode,
      // hasDatasource: hasDatasourceSelector(state),
      // hasFields: hasFieldsSelector(state),
    };
  },
  dispatch => ({
    dataMode: () => {
      dispatch(updateMetaData({ mode: 'data' }));
    },
    editMode: () => {
      dispatch(updateMetaData({ mode: 'edit' }));
    },
    // onIndexPatternSelected: (indexPattern: IndexPatternSavedObject) => {
    //   dispatch(
    //     requestDatasource({
    //       type: 'indexpattern',
    //       id: indexPattern.id,
    //       title: indexPattern.attributes.title,
    //     })
    //   );
    // },
    // onFillWorkspace: () => {
    //   dispatch(fillWorkspace());
    // },
  })
)(GraphVisualizationComponent);

export const GraphVisualization = (props: any) => (
  <Provider store={props.reduxStore}>
    <ConnectedGraphVisualization {...props} />
  </Provider>
);
