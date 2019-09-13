/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphSearchBar } from './graph_search_bar';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React, { ReactElement } from 'react';
import { CoreStart } from 'src/core/public';
import { IndexPatternSavedObject } from '../types';
import { act } from 'react-dom/test-utils';
import { IndexPattern, QueryBarInput } from 'src/legacy/core_plugins/data/public';

jest.mock('ui/new_platform');

describe('graph_search_bar', () => {
  it('should render search bar and submit queryies', () => {
    const querySubmit = jest.fn();
    const instance = shallowWithIntl(
      <GraphSearchBar
        isLoading={false}
        onIndexPatternSelected={() => {}}
        onQuerySubmit={querySubmit}
        savedObjects={{} as CoreStart['savedObjects']}
        uiSettings={{} as CoreStart['uiSettings']}
        currentIndexPattern={{ title: 'Testpattern' } as IndexPattern}
      />
    );
    act(() => {
      instance.find(QueryBarInput).prop('onChange')!({ language: 'lucene', query: 'testQuery' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    expect(querySubmit).toHaveBeenCalledWith('testQuery');
  });

  it('should translate kql query into JSON dsl', () => {
    const querySubmit = jest.fn();
    const instance = shallowWithIntl(
      <GraphSearchBar
        isLoading={false}
        onIndexPatternSelected={() => {}}
        onQuerySubmit={querySubmit}
        savedObjects={{} as CoreStart['savedObjects']}
        uiSettings={{} as CoreStart['uiSettings']}
        currentIndexPattern={{ title: 'Testpattern', fields: [{ name: 'test' }] } as IndexPattern}
      />
    );
    act(() => {
      instance.find(QueryBarInput).prop('onChange')!({ language: 'kuery', query: 'test: abc' });
    });

    act(() => {
      instance.find('form').simulate('submit', { preventDefault: () => {} });
    });

    const parsedQuery = JSON.parse(querySubmit.mock.calls[0][0]);
    expect(parsedQuery).toEqual({
      bool: { should: [{ match: { test: 'abc' } }], minimum_should_match: 1 },
    });
  });

  it('should render index pattern picker', () => {
    const indexPatternSelected = jest.fn();
    const instance = shallowWithIntl(
      <GraphSearchBar
        isLoading={false}
        onIndexPatternSelected={indexPatternSelected}
        onQuerySubmit={() => {}}
        savedObjects={{} as CoreStart['savedObjects']}
        uiSettings={{} as CoreStart['uiSettings']}
        currentIndexPattern={{ title: 'Testpattern' } as IndexPattern}
      />
    );

    const newIndexpattern = {} as IndexPatternSavedObject;

    // pick the GraphSourcePicker component out of the tree because
    // it's part of a popover and thus not covered by enzyme
    (instance
      .find(QueryBarInput)
      .prop('prepend') as ReactElement).props.children.props.onIndexPatternSelected(
      newIndexpattern
    );

    expect(indexPatternSelected).toHaveBeenCalledWith(newIndexpattern);
  });
});
