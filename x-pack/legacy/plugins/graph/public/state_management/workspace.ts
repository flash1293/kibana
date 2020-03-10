/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { i18n } from '@kbn/i18n';
import { takeLatest, select, call, takeEvery } from 'redux-saga/effects';
import { GraphStoreDependencies, GraphState } from '.';
import { datasourceSelector } from './datasource';
import { selectedFieldsSelector } from './fields';
import { fetchTopNodes } from '../services/fetch_top_nodes';
import { matchesOne } from './helpers';
const d3 = require('d3');
const actionCreator = actionCreatorFactory('x-pack/graph');

export const fillWorkspace = actionCreator<void>('FILL_WORKSPACE');
export const changeWorkspace = actionCreator<void>('CHANGE_WORKSPACE');

/**
 * Saga handling filling in top terms into workspace.
 *
 * It will load the top terms of the selected fields, add them to the workspace and fill in the connections.
 */
export const fillWorkspaceSaga = ({
  getWorkspace,
  setWorkspaceInitialized,
  notifyAngular,
  http,
  notifications,
}: GraphStoreDependencies) => {
  function* fetchNodes() {
    try {
      const workspace = getWorkspace();
      if (!workspace) {
        return;
      }

      const state: GraphState = yield select();
      const fields = selectedFieldsSelector(state);
      const datasource = datasourceSelector(state).current;
      if (datasource.type === 'none') {
        return;
      }

      const topTermNodes = yield call(fetchTopNodes, http.post, datasource.title, fields);
      workspace.mergeGraph({
        nodes: topTermNodes,
        edges: [],
      });
      setWorkspaceInitialized();
      notifyAngular();
      workspace.fillInGraph(fields.length * 10);
    } catch (e) {
      const message = 'body' in e ? e.body.message : e.message;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.graph.fillWorkspaceError', {
          defaultMessage: 'Fetching top terms failed: {message}',
          values: { message },
        }),
      });
    }
  }

  return function*() {
    yield takeLatest(fillWorkspace.match, fetchNodes);
  };
};

export const layoutingSaga = ({ getWorkspace, notifyAngular }: GraphStoreDependencies) => {
  function* layoutGraph(): IterableIterator<unknown> {
    const workspace = getWorkspace();
    if (!workspace) {
      return;
    }

    const effectiveEdges: any[] = [];
    const edges = workspace.edges;
    for (const e in edges) {
      const edge = edges[e];
      let topSrc = edge.source;
      let topTarget = edge.target;
      while (topSrc.parent != undefined) {
        topSrc = topSrc.parent;
      }
      while (topTarget.parent != undefined) {
        topTarget = topTarget.parent;
      }
      edge.topSrc = topSrc;
      edge.topTarget = topTarget;

      if (
        topSrc != topTarget &&
        (!workspace.minShownDocCount || edge.doc_count >= workspace.minShownDocCount)
      ) {
        effectiveEdges.push({
          source: topSrc,
          target: topTarget,
        });
      }
    }

    const selectedFieldIds = new Set();
    workspace.options.vertex_fields.forEach(field => {
      if (field.hopSize > 0) {
        selectedFieldIds.add(field.name);
      }
    });
    const visibleNodes = workspace.nodes.filter(function(n) {
      return n.parent == undefined && (selectedFieldIds.has(n.data.field) || n.data.alwaysKeep);
    });
    //reset then roll-up all the counts
    const allNodes = workspace.nodes;
    for (const n in allNodes) {
      const node = allNodes[n];
      node.numChildren = 0;
    }
    for (const n in allNodes) {
      let node = allNodes[n];
      while (node.parent != undefined) {
        node = node.parent;
        node.numChildren = node.numChildren + 1;
      }
    }
    console.log(visibleNodes);
    console.log(effectiveEdges);
    const force = d3.layout
      .force()
      .nodes(visibleNodes)
      .links(effectiveEdges)
      .friction(0.8)
      .linkDistance(100)
      .charge(-1500)
      .gravity(0.15)
      .theta(0.99)
      .alpha(0.5)
      .size([800, 600])
      .on('tick', function(e) {
        const nodeArray = workspace.nodes;
        let hasRollups = false;
        // Update the position of all "top level nodes"
        for (const i in nodeArray) {
          const n = nodeArray[i];
          // Code to support roll-ups
          if (n.parent == undefined) {
            n.kx = n.x;
            n.ky = n.y;
          } else {
            hasRollups = true;
          }
        }
        if (hasRollups) {
          for (const i in nodeArray) {
            const n = nodeArray[i];
            // Code to support roll-ups
            if (n.parent != undefined) {
              // Is a grouped node - inherit parent's position so edges point into parent
              // d3 thinks it has moved it to x and y but we have final say using kx and ky.
              let topLevelNode = n.parent;
              while (topLevelNode.parent != undefined) {
                topLevelNode = topLevelNode.parent;
              }

              n.kx = topLevelNode.x;
              n.ky = topLevelNode.y;
            }
          }
        }
      });
    force.start();
    let safety = 0;
    while (force.alpha() > 0.05) {
      // You'll want to try out different, "small" values for this
      force.tick();
      if (safety++ > 2000) {
        break; // Avoids infinite looping in case this solution was a bad idea
      }
    }
    force.stop();

    notifyAngular();
  }
  return function*() {
    yield takeEvery(matchesOne(changeWorkspace), layoutGraph);
  };
};
