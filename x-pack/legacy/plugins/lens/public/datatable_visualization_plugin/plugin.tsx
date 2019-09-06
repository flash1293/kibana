/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import { getFormat, FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { datatableVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../../src/legacy/core_plugins/data/public/expressions';
import { setup as dataSetup } from '../../../../../../src/legacy/core_plugins/data/public/legacy';
import { datatable, datatableColumns, getDatatableRenderer } from './expression';

export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

class DatatableVisualizationPlugin {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, fieldFormat }: DatatableVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => datatableColumns);
    expressions.registerFunction(() => datatable);
    expressions.registerRenderer(() => getDatatableRenderer(fieldFormat.formatFactory));

    return datatableVisualization;
  }

  stop() {}
}

const plugin = new DatatableVisualizationPlugin();

export const datatableVisualizationSetup = () =>
  plugin.setup(null, {
    expressions: dataSetup.expressions,
    fieldFormat: {
      formatFactory: getFormat,
    },
  });
export const datatableVisualizationStop = () => plugin.stop();
