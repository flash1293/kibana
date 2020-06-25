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

import 'jest-canvas-mock';

import { ImageComparator } from 'test_utils/image_comparator';
import { ExprVis } from '../../../visualizations/public/expressions/vis';

// Replace with mock when converting to jest tests
import { seedColors } from '../../../charts/public/services/colors/seed_colors';
import { BaseVisType } from '../../../visualizations/public/vis_types/base_vis_type';
import { createTagCloudVisTypeDefinition } from '../tag_cloud_type';
import { createTagCloudVisualization } from './tag_cloud_visualization';
import { setFormatService } from '../services';
import { fieldFormatsServiceMock } from '../../../data/public/field_formats/mocks';

describe('TagCloudVisualizationTest', function () {
  Object.defineProperties(window.SVGElement.prototype, {
    getBBox: {
      get: () =>
        function () {
          return {
            x: 0,
            y: 0,
            width: 512,
            height: 512,
          };
        },
      configurable: true,
    },
  });
  Object.defineProperties(window.HTMLElement.prototype, {
    offsetHeight: {
      get: function () {
        return 512;
      },
      configurable: true,
    },
    offsetWidth: {
      get: function () {
        return 512;
      },
      configurable: true,
    },
  });

  let domNode;
  let vis;
  let imageComparator;

  const dummyTableGroup = {
    columns: [
      {
        id: 'col-0',
        title: 'geo.dest: Descending',
      },
      {
        id: 'col-1',
        title: 'Count',
      },
    ],
    rows: [
      { 'col-0': 'CN', 'col-1': 26 },
      { 'col-0': 'IN', 'col-1': 17 },
      { 'col-0': 'US', 'col-1': 6 },
      { 'col-0': 'DE', 'col-1': 4 },
      { 'col-0': 'BR', 'col-1': 3 },
    ],
  };
  const TagCloudVisualization = createTagCloudVisualization({
    colors: {
      seedColors,
    },
  });

  beforeAll(() => {
    setFormatService(fieldFormatsServiceMock.createStartContract());
  });

  describe('TagCloudVisualization - basics', function () {
    beforeEach(async function () {
      const visType = new BaseVisType(createTagCloudVisTypeDefinition({ colors: seedColors }));
      setupDOM('512px', '512px');
      imageComparator = new ImageComparator();
      vis = new ExprVis({
        type: visType,
        params: {
          bucket: { accessor: 0, format: {} },
          metric: { accessor: 0, format: {} },
        },
        data: {},
      });
    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    test('simple draw', async function () {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);

      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });

    test('with resize', async function () {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      domNode.style.width = '256px';
      domNode.style.height = '368px';
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });

    test('with param change', async function () {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      Object.defineProperties(window.SVGElement.prototype, {
        getBBox: {
          get: () =>
            function () {
              return {
                x: 0,
                y: 0,
                width: 256,
                height: 368,
              };
            },
          configurable: true,
        },
        transform: {
          get: () => ({
            baseVal: {
              consolidate: () => {},
            },
          }),
          configurable: true,
        },
      });
      Object.defineProperties(window.HTMLElement.prototype, {
        offsetHeight: {
          get: function () {
            return 386;
          },
          configurable: true,
        },
        offsetWidth: {
          get: function () {
            return 256;
          },
          configurable: true,
        },
      });
      vis.params.orientation = 'right angled';
      vis.params.minFontSize = 70;
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });
  });

  function setupDOM(width, height) {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = width;
    domNode.style.height = height;
    domNode.style.position = 'fixed';
    domNode.style.border = '1px solid blue';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }
});
