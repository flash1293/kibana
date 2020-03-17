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

jest.mock('../lib/url_shortener', () => ({}));

import React from 'react';
import { shallow } from 'enzyme';

import { UrlPanelContent } from './url_panel_content';

const URL_PARAM_EXTENSIONS_SELECTOR = '[data-test-subj="urlParamExtensions"]';
const defaultProps = {
  allowShortUrl: true,
  objectType: 'dashboard',
  basePath: '',
  post: () => Promise.resolve({} as any),
};

test('render', () => {
  const component = shallow(<UrlPanelContent {...defaultProps} />);
  expect(component).toMatchSnapshot();
});

test('should enable saved object export option when objectId is provided', () => {
  const component = shallow(<UrlPanelContent {...defaultProps} objectId="id1" />);
  expect(component).toMatchSnapshot();
});

test('should hide short url section when allowShortUrl is false', () => {
  const component = shallow(
    <UrlPanelContent {...defaultProps} allowShortUrl={false} objectId="id1" />
  );
  expect(component).toMatchSnapshot();
});

test('should show url param checkboxes when embedded link', () => {
  const component = shallow(<UrlPanelContent {...defaultProps} isEmbedded={true} objectId="id1" />);
  expect(component.find(URL_PARAM_EXTENSIONS_SELECTOR).length).toBe(1);
  expect(component).toMatchSnapshot();
});

test('should not show url param checkboxes when permalink', () => {
  const component = shallow(<UrlPanelContent {...defaultProps} objectId="id1" />);
  expect(component.find(URL_PARAM_EXTENSIONS_SELECTOR).length).toBe(0);
  expect(component).toMatchSnapshot();
});
