/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { APMOSSConfig } from './';

export class APMOSSPlugin implements Plugin<APMOSSPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }

  public setup(core: CoreSetup) {
    const config$ = this.initContext.config.create<APMOSSConfig>();

    const tutorialProvider = tutorialProvider({
      indexPatternTitle: this.currentConfig['apm_oss.indexPattern'],
      indices: {
        errorIndices: this.currentConfig['apm_oss.errorIndices'],
        metricsIndices: this.currentConfig['apm_oss.metricsIndices'],
        onboardingIndices: this.currentConfig['apm_oss.onboardingIndices'],
        sourcemapIndices: this.currentConfig['apm_oss.sourcemapIndices'],
        transactionIndices: this.currentConfig['apm_oss.transactionIndices'])
    ;
    plugins.home.tutorials.registerTutorial(tutorialProvider);

    return {
      config$,
      getRegisteredTutorialProvider: () => tutorialProvider;
    };
  }

  start() {}
  stop() {}
}

export interface APMOSSPluginSetup {
  config$: Observable<APMOSSConfig>;
}
