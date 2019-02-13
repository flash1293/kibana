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

import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import chrome from 'ui/chrome';

import {
  EuiBasicTable,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiListGroup,
  // @ts-ignore
  EuiListGroupItem,
  EuiPagination,
  EuiTableCriteria,
} from '@elastic/eui';
import { Direction } from '@elastic/eui/src/services/sort/sort_direction';
import { i18n } from '@kbn/i18n';

import { EuiIcon } from '@elastic/eui';
import { SavedObjectMetaData } from 'ui/embeddable/embeddable_factory';
import { SavedObjectAttributes } from '../../../../server/saved_objects';
import { VisTypesRegistryProvider } from '../../registry/vis_types';
import { SimpleSavedObject } from '../simple_saved_object';

interface SavedObjectFinderUIState {
  items: Array<{
    title: string | null;
    id: SimpleSavedObject<SavedObjectAttributes>['id'];
    type: SimpleSavedObject<SavedObjectAttributes>['type'];
  }>;
  filter: string;
  isFetchingItems: boolean;
  page: number;
  perPage: number;
  sortField?: string;
  sortDirection?: Direction;
}

interface BaseSavedObjectFinder {
  callToActionButton?: React.ReactNode;
  onChoose?: (
    id: SimpleSavedObject<SavedObjectAttributes>['id'],
    type: SimpleSavedObject<SavedObjectAttributes>['type']
  ) => void;
  makeUrl?: (id: SimpleSavedObject<SavedObjectAttributes>['id']) => void;
  noItemsMessage?: React.ReactNode;
  savedObjectMetaData: SavedObjectMetaData[];
  visTypes?: VisTypesRegistryProvider;
}

interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
  initialPageSize?: undefined;
  fixedPageSize: number;
}

interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
  initialPageSize?: 5 | 10 | 15;
  fixedPageSize?: undefined;
}
type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;

class SavedObjectFinder extends React.Component<SavedObjectFinderProps, SavedObjectFinderUIState> {
  public static propTypes = {
    callToActionButton: PropTypes.node,
    onChoose: PropTypes.func,
    makeUrl: PropTypes.func,
    noItemsMessage: PropTypes.node,
    visTypes: PropTypes.object,
    savedObjectMetaData: PropTypes.object.isRequired,
    initialPageSize: PropTypes.oneOf([5, 10, 15]),
    fixedPageSize: PropTypes.number,
  };

  private isComponentMounted: boolean = false;

  private debouncedFetch = _.debounce(async (filter: string) => {
    const resp = await chrome.getSavedObjectsClient().find({
      type: this.props.savedObjectMetaData.map(savedObjectType => savedObjectType.type),
      fields: ['title', 'visState'],
      search: filter ? `${filter}*` : undefined,
      page: 1,
      perPage: chrome.getUiSettingsClient().get('savedObjects:listingLimit'),
      searchFields: ['title^3', 'description'],
      defaultSearchOperator: 'AND',
    });

    const { savedObjectMetaData, visTypes } = this.props;
    if (
      savedObjectMetaData.findIndex(metaData => metaData.type === 'visualization') &&
      !chrome.getUiSettingsClient().get('visualize:enableLabs') &&
      visTypes
    ) {
      resp.savedObjects = resp.savedObjects.filter(savedObject => {
        if (typeof savedObject.attributes.visState !== 'string') {
          return false;
        }
        const typeName: string = JSON.parse(savedObject.attributes.visState).type;
        const visType = visTypes.byName[typeName];
        return visType.stage !== 'experimental';
      });
    }

    if (!this.isComponentMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        isFetchingItems: false,
        items: resp.savedObjects.map(({ attributes: { title }, id, type }) => {
          return {
            title: typeof title === 'string' ? title : '',
            id,
            type,
          };
        }),
      });
    }
  }, 300);

  constructor(props: SavedObjectFinderProps) {
    super(props);

    this.state = {
      items: [],
      isFetchingItems: false,
      page: 0,
      perPage: props.initialPageSize || props.fixedPageSize || 15,
      filter: '',
    };
  }

  public componentWillUnmount() {
    this.isComponentMounted = false;
    this.debouncedFetch.cancel();
  }

  public componentDidMount() {
    this.isComponentMounted = true;
    this.fetchItems();
  }

  public render() {
    return (
      <React.Fragment>
        {this.renderSearchBar()}
        {this.renderTable()}
      </React.Fragment>
    );
  }

  private onTableChange = ({ page, sort = {} }: EuiTableCriteria) => {
    let sortField: string | undefined = sort.field;
    let sortDirection: Direction | undefined = sort.direction;

    // 3rd sorting state that is not captured by sort - native order (no sort)
    // when switching from desc to asc for the same field - use native order
    if (
      this.state.sortField === sortField &&
      this.state.sortDirection === 'desc' &&
      sortDirection === 'asc'
    ) {
      sortField = undefined;
      sortDirection = undefined;
    }

    this.setState({
      page: page.index,
      perPage: page.size,
      sortField,
      sortDirection,
    });
  };

  // server-side paging not supported
  // 1) saved object client does not support sorting by title because title is only mapped as analyzed
  // 2) can not search on anything other than title because all other fields are stored in opaque JSON strings,
  //    for example, visualizations need to be search by isLab but this is not possible in Elasticsearch side
  //    with the current mappings
  private getPageOfItems = () => {
    // do not sort original list to preserve elasticsearch ranking order
    const items = this.state.items.slice();
    const { sortField } = this.state;

    if (sortField) {
      items.sort((a, b) => {
        const fieldA = _.get(a, sortField, '');
        const fieldB = _.get(b, sortField, '');
        let order = 1;
        if (this.state.sortDirection === 'desc') {
          order = -1;
        }
        return order * fieldA.toLowerCase().localeCompare(fieldB.toLowerCase());
      });
    }

    // If begin is greater than the length of the sequence, an empty array is returned.
    const startIndex = this.state.page * this.state.perPage;
    // If end is greater than the length of the sequence, slice extracts through to the end of the sequence (arr.length).
    const lastIndex = startIndex + this.state.perPage;
    return items.slice(startIndex, lastIndex);
  };

  private fetchItems = () => {
    this.setState(
      {
        isFetchingItems: true,
      },
      this.debouncedFetch.bind(null, this.state.filter)
    );
  };

  private renderSearchBar() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiFieldSearch
            placeholder={i18n.translate('common.ui.savedObjects.finder.searchPlaceholder', {
              defaultMessage: 'Search…',
            })}
            fullWidth
            value={this.state.filter}
            onChange={e => {
              this.setState(
                {
                  filter: e.target.value,
                },
                this.fetchItems
              );
            }}
            data-test-subj="savedObjectFinderSearchInput"
          />
        </EuiFlexItem>

        {this.props.callToActionButton && (
          <EuiFlexItem grow={false}>{this.props.callToActionButton}</EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }

  private renderTable() {
    const items = this.state.items.length === 0 ? [] : this.getPageOfItems();
    const { onChoose, savedObjectMetaData } = this.props;

    return (
      <>
        <EuiListGroup>
          {items.map(item => {
            const iconType = (
              savedObjectMetaData.find(metaData => metaData.type === item.type) ||
              ({
                icon: 'document',
              } as Partial<SavedObjectMetaData>)
            ).icon;
            return (
              <EuiListGroupItem
                key={item.id}
                iconType={iconType}
                label={item.title}
                onClick={
                  onChoose
                    ? () => {
                        onChoose(item.id, item.type);
                      }
                    : undefined
                }
                data-test-subj={`savedObjectTitle${(item.title || '').split(' ').join('-')}`}
              />
            );
          })}
        </EuiListGroup>
        <EuiPagination
          activePage={this.state.page}
          pageCount={Math.ceil(this.state.items.length / this.state.perPage)}
          onPageClick={page => {
            this.setState({
              page,
            });
          }}
        />
      </>
    );
  }
}

export { SavedObjectFinder };
