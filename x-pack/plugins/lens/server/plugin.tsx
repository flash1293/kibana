/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart, PluginInitializerContext, Logger } from 'src/core/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { Observable, Subject } from 'rxjs';
import { first } from 'rxjs/operators';
import { TaskManagerSetupContract, TaskManagerStartContract } from '../../task_manager/server';
import { setupRoutes } from './routes';
import {
  registerLensUsageCollector,
  initializeLensTelemetry,
  scheduleLensTelemetry,
} from './usage';

export interface PluginSetupContract {
  usageCollection?: UsageCollectionSetup;
  taskManager?: TaskManagerSetupContract;
}

export interface PluginStartContract {
  taskManager?: TaskManagerStartContract;
}

const taskManagerStartContract$ = new Subject<TaskManagerStartContract>();

export class LensServerPlugin implements Plugin<{}, {}, {}, {}> {
  private readonly kibanaIndexConfig: Observable<{ kibana: { index: string } }>;
  private readonly telemetryLogger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaIndexConfig = initializerContext.config.legacy.globalConfig$;
    this.telemetryLogger = initializerContext.logger.get('telemetry');
  }
  setup(core: CoreSetup, plugins: PluginSetupContract) {
    setupRoutes(core);
    if (plugins.usageCollection && plugins.taskManager) {
      registerLensUsageCollector(
        plugins.usageCollection,
        taskManagerStartContract$.pipe(first()).toPromise()
      );
      initializeLensTelemetry(
        this.telemetryLogger,
        core,
        this.kibanaIndexConfig,
        plugins.taskManager
      );
    }
    return {};
  }

  start(core: CoreStart, plugins: PluginStartContract) {
    if (plugins.taskManager) {
      scheduleLensTelemetry(this.telemetryLogger, plugins.taskManager);
      taskManagerStartContract$.next(plugins.taskManager);
      taskManagerStartContract$.complete();
    }
    return {};
  }

  stop() {}
}
