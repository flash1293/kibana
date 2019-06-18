/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { editorFrameSetup, editorFrameStop } from '../editor_frame_plugin';
import { indexPatternDatasourceSetup, indexPatternDatasourceStop } from '../indexpattern_plugin';
import { xyVisualizationSetup, xyVisualizationStop } from '../xy_visualization_plugin';
import { App } from './app';
import { EditorFrameInstance } from '../types';
import { graphDatasourceSetup, graphDatasourceStop } from '../dummy_graphdata_plugin';
import { graphVisualizationSetup, graphVisualizationStop } from '../graph_visualization_plugin';

export class AppPlugin {
  private instance: EditorFrameInstance | null = null;

  constructor() {}

  setup() {
    // TODO: These plugins should not be called from the top level, but since this is the
    // entry point to the app we have no choice until the new platform is ready
    const indexPattern = indexPatternDatasourceSetup();
    const graph = graphDatasourceSetup();
    const xyVisualization = xyVisualizationSetup();
    const editorFrame = editorFrameSetup();
    const graphVisualization = graphVisualizationSetup();

    editorFrame.registerDatasource('indexpattern', indexPattern);
    editorFrame.registerDatasource('graph', graph);
    editorFrame.registerVisualization('xy', xyVisualization);
    editorFrame.registerVisualization('graph', graphVisualization);

    this.instance = editorFrame.createInstance({});

    return <App editorFrame={this.instance} />;
  }

  stop() {
    if (this.instance) {
      this.instance.unmount();
    }

    // TODO this will be handled by the plugin platform itself
    indexPatternDatasourceStop();
    graphDatasourceStop();
    xyVisualizationStop();
    graphVisualizationStop();
    editorFrameStop();
  }
}

const app = new AppPlugin();

export const appSetup = () => app.setup();
export const appStop = () => app.stop();
