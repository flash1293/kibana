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

import React from 'react';
import { Plugin, CoreSetup } from 'kibana/public';
import { DiscoverSetup } from '../../../../../src/plugins/discover/public';
import { AngularScope } from '../../../../../src/plugins/discover/public/doc_views/doc_views_types';

export class DocViewsPlugin implements Plugin<void, void> {
  public setup(core: CoreSetup, { discover }: { discover: DiscoverSetup }) {
    discover.docViews.addDocView({
      directive: {
        controller: function MyController($scope: AngularScope, $injector: any) {
          debugger;
          ($scope as any).abc = 123;
        },
        template: `<h1>{{hit._id}} {{abc}}</h1>`,
      },
      order: 10,
      title: 'Angular doc view',
    });

    discover.docViews.addDocView({
      component: props => {
        return <h1>Test</h1>;
      },
      order: 11,
      title: 'React doc view',
    });
  }

  public start() {}
}
