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
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import {
  EuiTitle,
  EuiInMemoryTable,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiCallOut,
} from '@elastic/eui';

export const EMPTY_FILTER = '';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

// saved object client does not support sorting by title because title is only mapped as analyzed
// the legacy implementation got around this by pulling `listingLimit` items and doing client side sorting
// and not supporting server-side paging.
// This component does not try to tackle these problems (yet) and is just feature matching the legacy component
// TODO support server side sorting/paging once title and description are sortable on the server.
class TableListViewUi extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      items: [],
      totalItems: 0,
      hasInitialFetchReturned: false,
      isFetchingItems: false,
      showDeleteModal: false,
      showLimitError: false,
      filter: this.props.initialFilter,
      selectedIds: [],
      sortField: 'title',
      sortDirection: 'asc',
      page: 0,
      perPage: 20,
    };

  }

  componentWillMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.debouncedFetch.cancel();
  }

  componentDidMount() {
    this.fetchItems();
  }

  debouncedFetch = _.debounce(async (filter) => {
    const response = await this.props.find(filter);

    if (!this._isMounted) {
      return;
    }

    // We need this check to handle the case where search results come back in a different
    // order than they were sent out. Only load results for the most recent search.
    if (filter === this.state.filter) {
      this.setState({
        hasInitialFetchReturned: true,
        isFetchingItems: false,
        items: response.hits,
        totalItems: response.total,
        showLimitError: response.total > this.props.listingLimit,
      });
    }
  }, 300);

  fetchItems = () => {
    this.setState({
      isFetchingItems: true,
    }, this.debouncedFetch.bind(null, this.state.filter));
  }

  deleteSelectedItems = async () => {
    try {
      await this.props.delete(this.state.selectedIds);
    } catch (error) {
      toastNotifications.addDanger({
        title: (
          <FormattedMessage
            id="kbn.visualize.listing.unableToDeleteVisualizationsDangerMessage"
            defaultMessage="Unable to delete {entityName}(s)"
            values={{ entityName: this.props.entityName }}
          />
        ),
        text: `${error}`,
      });
    }
    this.fetchItems();
    this.setState({
      selectedIds: []
    });
    this.closeDeleteModal();
  }

  closeDeleteModal = () => {
    this.setState({ showDeleteModal: false });
  }

  openDeleteModal = () => {
    this.setState({ showDeleteModal: true });
  }

  setFilter(filter) {
    // If the user is searching, we want to clear the sort order so that
    // results are ordered by Elasticsearch's relevance.
    this.setState({
      filter: filter.queryText,
    }, this.fetchItems);
  }

  hasNoItems() {
    if (!this.state.isFetchingItems && this.state.items.length === 0 && !this.state.filter) {
      return true;
    }

    return false;
  }

  renderConfirmDeleteModal() {
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="kbn.table_list_view.listing.deleteSelectedConfirmModal.title"
              defaultMessage="Delete {itemCount} selected {entityName}?"
              values={{
                itemCount: this.state.selectedIds.length,
                entityName: (this.state.selectedIds.length === 1) ? this.props.entityName : this.props.entityNamePlural
              }}
            />
          }
          buttonColor="danger"
          onCancel={this.closeDeleteModal}
          onConfirm={this.deleteSelectedItems}
          cancelButtonText={
            <FormattedMessage
              id="kbn.table_list_view.listing.deleteSelectedItemsConfirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="kbn.table_list_view.listing.deleteSelectedItemsConfirmModal.confirmButtonLabel"
              defaultMessage="Delete"
            />
          }
          defaultFocusedButton="cancel"
        >
          <p>
            <FormattedMessage
              id="kbn.table_list_view.listing.deleteConfirmModalDescription"
              defaultMessage="You can't recover deleted {entityNamePlural}."
              values={{ entityNamePlural: this.props.entityNamePlural }}
            />
          </p>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  renderListingLimitWarning() {
    if (this.state.showLimitError) {
      return (
        <React.Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="kbn.table_list_view.listing.listingLimitExceededTitle"
                defaultMessage="Listing limit exceeded"
              />
            }
            color="warning"
            iconType="help"
          >
            <p>
              <FormattedMessage
                id="kbn.table_list_view.listing.listingLimitExceededDescription"
                defaultMessage="You have {totalItems} {entityNamePlural}, but your {listingLimitText} setting prevents
                the table below from displaying more than {listingLimitValue}. You can change this setting under {advancedSettingsLink}."
                values={{
                  entityNamePlural: this.props.entityNamePlural,
                  totalItems: this.state.totalItems,
                  listingLimitValue: this.props.listingLimit,
                  listingLimitText: (
                    <strong>
                      listingLimit
                    </strong>
                  ),
                  advancedSettingsLink: (
                    <EuiLink href="#/management/kibana/settings">
                      <FormattedMessage
                        id="kbn.table_list_view.listing.listingLimitExceeded.advancedSettingsLinkText"
                        defaultMessage="Advanced Settings"
                      />
                    </EuiLink>
                  )
                }}
              />
            </p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </React.Fragment>
      );
    }
  }

  renderNoItemsMessage() {
    if (this.props.noItemsFragment) {
      return (
        this.props.noItemsFragment
      );
    } else {
      return (
        <FormattedMessage
          id="kbn.table_list_view.listing.noAvailableItemsMessage"
          defaultMessage="No {entityNamePlural} available."
          values={{ entityNamePlural: this.props.entityNamePlural }}
        />
      );

    }
  }

  renderToolsLeft() {
    const selection = this.state.selectedIds;

    if (selection.length === 0) {
      return;
    }

    const onClick = () => {
      this.openDeleteModal();
    };

    return (
      <EuiButton
        color="danger"
        iconType="trash"
        onClick={onClick}
      >
        <FormattedMessage
          id="kbn.table_list_view.listing.deleteButtonMessage"
          defaultMessage="Delete {itemCount} {entityName}"
          values={{
            itemCount: selection.length,
            entityName: (selection.length === 1) ? this.props.entityName : this.props.entityNamePlural
          }}
        />
      </EuiButton>
    );
  }

  renderTable() {
    const { intl } = this.props;

    const pagination = {
      pageIndex: this.state.page,
      pageSize: this.state.perPage,
      totalItemCount: this.state.items.length,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
    };

    const selection = {
      onSelectionChange: (selection) => {
        this.setState({
          selectedIds: selection.map(item => { return item.id; })
        });
      }
    };

    const actions = [{
      name: intl.formatMessage({
        id: 'kbn.table_list_view.listing.table.editActionName',
        defaultMessage: 'Edit',
      }),
      description: intl.formatMessage({
        id: 'kbn.table_list_view.listing.table.editActionDescription',
        defaultMessage: 'Edit',
      }),
      icon: 'pencil',
      type: 'icon',
      onClick: this.props.edit
    }];

    const sorting = {};
    if (this.state.sortField) {
      sorting.sort = {
        field: this.state.sortField,
        direction: this.state.sortDirection,
      };
    }

    const search = {
      onChange: this.setFilter.bind(this),
      toolsLeft: this.renderToolsLeft(),
      box: {
        incremental: true,
      },
    };

    const columns = this.props.tableColumns.slice();
    if (!this.state.hideWriteControls) {
      columns.push({
        name: intl.formatMessage({
          id: 'kbn.table_list_view.listing.table.actionTitle',
          defaultMessage: 'Actions',
        }),
        actions
      });
    }

    const noItemsMessage = (
      <FormattedMessage
        id="kbn.table_list_view.listing.noMatchedItemsMessage"
        defaultMessage="No {entityNamePlural} matched your search."
        values={{ entityNamePlural: this.props.entityNamePlural }}
      />
    );

    return (
      <EuiInMemoryTable
        itemId="id"
        items={this.state.items}
        columns={columns}
        pagination={pagination}
        loading={this.state.isFetchingItems}
        message={noItemsMessage}
        selection={selection}
        search={search}
        sorting={sorting}
        hasActions={!this.state.hideWriteControls}
      />
    );
  }

  renderListingOrEmptyState() {
    if (this.hasNoItems()) {
      return this.renderNoItemsMessage();
    }

    return this.renderListing();
  }

  renderListing() {
    let createButton;
    if (!this.props.hideWriteControls) {
      createButton = (
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={this.props.create}
            data-test-subj="newItemLink"
            fill
          >
            <FormattedMessage
              id="kbn.table_list_view.listing.createNewItemButtonLabel"
              defaultMessage="Create new {entityName}"
              values={{ entityName: this.props.entityName }}
            />
          </EuiButton>
        </EuiFlexItem>
      );
    }
    return (
      <div>
        {this.state.showDeleteModal && this.renderConfirmDeleteModal()}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd" data-test-subj="top-nav">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>
                {this.props.tableListTitle}
              </h1>
            </EuiTitle>
          </EuiFlexItem>

          {createButton}

        </EuiFlexGroup>

        <EuiSpacer size="m" />

        {this.renderListingLimitWarning()}

        {this.renderTable()}
      </div>
    );
  }

  renderPageContent() {
    if (!this.state.hasInitialFetchReturned) {
      return;
    }

    return (
      <EuiPageContent horizontalPosition="center">
        {this.renderListingOrEmptyState()}
      </EuiPageContent>
    );
  }

  render() {
    return (
      <EuiPage data-test-subj="itemsListLandingPage" className="itemListing__page" restrictWidth>
        <EuiPageBody>
          {this.renderPageContent()}
        </EuiPageBody>
      </EuiPage>
    );
  }
}

TableListViewUi.propTypes = {
  tableColumns: PropTypes.array.isRequired,

  noItemsFragment: PropTypes.object,

  find: PropTypes.func.isRequired,
  delete: PropTypes.func.isRequired,
  create: PropTypes.func.isRequired,
  edit: PropTypes.func.isRequired,

  listingLimit: PropTypes.number,
  hideWriteControls: PropTypes.bool.isRequired,
  initialFilter: PropTypes.string,

  entityName: PropTypes.string.isRequired,
  entityNamePlural: PropTypes.string.isRequired,
  tableListTitle: PropTypes.string.isRequired,
};

TableListViewUi.defaultProps = {
  initialFilter: EMPTY_FILTER,
};

export const TableListView = injectI18n(TableListViewUi);

