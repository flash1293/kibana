/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FontawesomeIcon } from '../services/style_choices';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface JsonArray extends Array<JsonValue> {}

type JsonValue = null | boolean | number | string | JsonObject | JsonArray;

interface JsonObject {
  [key: string]: JsonValue;
}

export interface WorkspaceNode {
  x: number;
  y: number;
  label: string;
  icon: FontawesomeIcon;
  data: {
    field: string;
    term: string;
  };
  scaledSize: number;
  parent: WorkspaceNode | null;
  color: string;
}

export interface WorkspaceEdge {
  weight: number;
  width: number;
  inferred: boolean;
  label: string;
  source: WorkspaceNode;
  target: WorkspaceNode;
}

export interface GraphData {
  nodes: Array<{
    field: string;
    term: string;
    id: string;
    label: string;
    color: string;
    icon: FontawesomeIcon;
    data: {
      field: string;
      term: string;
    };
  }>;
  edges: Array<{
    source: number;
    target: number;
    weight: number;
    width: number;
    doc_count?: number;
    inferred: boolean;
  }>;
}

export interface Workspace {
  nodesMap: Record<string, WorkspaceNode>;
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  blacklistedNodes: WorkspaceNode[];

  getQuery(startNodes?: WorkspaceNode[], loose?: boolean): JsonObject;
  getSelectedOrAllNodes(): WorkspaceNode[];
  getLikeThisButNotThisQuery(startNodes?: WorkspaceNode[]): JsonObject;

  /**
   * Flatten grouped nodes and return a flat array of nodes
   * @param nodes List of nodes probably containing grouped nodes
   */
  returnUnpackedGroupeds(nodes: WorkspaceNode[]): WorkspaceNode[];

  /**
   * Adds new nodes retrieved from an elasticsearch search
   * @param newData
   */
  mergeGraph(newData: GraphData): void;
}
