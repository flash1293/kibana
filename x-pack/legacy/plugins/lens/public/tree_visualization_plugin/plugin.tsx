/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import { Registry } from '@kbn/interpreter/target/common';
import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { datatableVisualization } from './visualization';

import {
  renderersRegistry,
  functionsRegistry,
  // @ts-ignore untyped dependency
} from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { mapAdjacencyMatrix } from './expression';

interface RenderHandlers {
  done: () => void;
  onDestroy: (fn: () => void) => void;
}
export interface RenderFunction<T = unknown> {
  name: string;
  displayName: string;
  help: string;
  validate: () => void;
  reuseDomNode: boolean;
  render: (domNode: Element, data: T, handlers: RenderHandlers) => void;
}

export interface InterpreterSetup {
  renderersRegistry: Registry<RenderFunction, RenderFunction>;
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

export interface DatatableVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
}

class DatatableVisualizationPlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter }: DatatableVisualizationPluginSetupPlugins) {
    interpreter.functionsRegistry.register(() => mapAdjacencyMatrix);

    return datatableVisualization;
  }

  stop() {}
}

const plugin = new DatatableVisualizationPlugin();

export const treeVisualizationSetup = () =>
  plugin.setup(null, {
    interpreter: {
      renderersRegistry,
      functionsRegistry,
    },
  });
export const treeVisualizationStop = () => plugin.stop();
