/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React, { ChangeEvent, ReactElement } from 'react';
import { EuiComboBox, EuiFieldSearch, EuiContextMenuPanel } from '@elastic/eui';
import { IndexPatternPrivateState } from './indexpattern';
import { createMockedDragDropContext } from './mocks';
import { InnerIndexPatternDataPanel } from './datapanel';
import { FieldItem } from './field_item';
import { act } from 'react-dom/test-utils';

jest.mock('./loader');

const initialState: IndexPatternPrivateState = {
  currentIndexPatternId: '1',
  layers: {
    first: {
      indexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
          operationType: 'terms',
          sourceField: 'op',
          params: {
            size: 5,
            orderDirection: 'asc',
            orderBy: {
              type: 'alphabetical',
            },
          },
          indexPatternId: '1',
        },
      },
    },
  },
  indexPatterns: {
    '1': {
      id: '1',
      title: 'my-fake-index-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
          indexPatternId: '1',
        },
        {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
          indexPatternId: '1',
        },
        {
          name: 'memory',
          type: 'number',
          aggregatable: true,
          searchable: true,
          indexPatternId: '1',
        },
        {
          name: 'unsupported',
          type: 'geo',
          aggregatable: true,
          searchable: true,
          indexPatternId: '1',
        },
        {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
          indexPatternId: '1',
        },
      ],
    },
    '2': {
      id: '2',
      title: 'my-fake-restricted-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
          indexPatternId: '2',
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              fixed_interval: '1d',
              delay: '7d',
              time_zone: 'UTC',
            },
          },
        },
        {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
          indexPatternId: '2',
          aggregationRestrictions: {
            histogram: {
              agg: 'histogram',
              interval: 1000,
            },
            avg: {
              agg: 'avg',
            },
            max: {
              agg: 'max',
            },
            min: {
              agg: 'min',
            },
            sum: {
              agg: 'sum',
            },
          },
        },
        {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
          indexPatternId: '2',
          aggregationRestrictions: {
            terms: {
              agg: 'terms',
            },
          },
        },
      ],
    },
  },
};
describe('IndexPattern Data Panel', () => {
  let defaultProps: Parameters<typeof InnerIndexPatternDataPanel>[0];

  beforeEach(() => {
    defaultProps = {
      dragDropContext: createMockedDragDropContext(),
      currentIndexPatternId: '1',
      indexPatterns: initialState.indexPatterns,
      showIndexPatternSwitcher: false,
      setShowIndexPatternSwitcher: jest.fn(),
      onChangeIndexPattern: jest.fn(),
    };
  });

  it('should render a warning if there are no index patterns', () => {
    const wrapper = shallow(
      <InnerIndexPatternDataPanel {...defaultProps} currentIndexPatternId="" indexPatterns={{}} />
    );
    expect(wrapper.find('[data-test-subj="indexPattern-no-indexpatterns"]')).toHaveLength(1);
  });

  it('should call setState when the index pattern is switched', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    wrapper.find('[data-test-subj="indexPattern-switch-link"]').simulate('click');

    expect(defaultProps.setShowIndexPatternSwitcher).toHaveBeenCalledWith(true);

    wrapper.setProps({ showIndexPatternSwitcher: true });

    const comboBox = wrapper.find(EuiComboBox);

    comboBox.prop('onChange')!([
      {
        label: initialState.indexPatterns['2'].title,
        value: '2',
      },
    ]);

    expect(defaultProps.onChangeIndexPattern).toHaveBeenCalledWith('2');
  });

  it('should list all supported fields in the pattern sorted alphabetically', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
      'source',
      'timestamp',
    ]);
  });

  it('should filter down by name', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    act(() => {
      wrapper.find(EuiFieldSearch).prop('onChange')!({ target: { value: 'mem' } } as ChangeEvent<
        HTMLInputElement
      >);
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'memory',
    ]);
  });

  it('should filter down by type', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
    ]);
  });

  it('should toggle type if clicked again', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'bytes',
      'memory',
      'source',
      'timestamp',
    ]);
  });

  it('should filter down by type and by name', async () => {
    const wrapper = shallow(<InnerIndexPatternDataPanel {...defaultProps} />);

    act(() => {
      wrapper.find(EuiFieldSearch).prop('onChange')!({ target: { value: 'mem' } } as ChangeEvent<
        HTMLInputElement
      >);
    });

    act(() => {
      (wrapper
        .find(EuiContextMenuPanel)
        .prop('items')!
        .find(
          item => (item as ReactElement).props['data-test-subj'] === 'typeFilter-number'
        )! as ReactElement).props.onClick();
    });

    expect(wrapper.find(FieldItem).map(fieldItem => fieldItem.prop('field').name)).toEqual([
      'memory',
    ]);
  });
});
