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

import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { injectI18n, FormattedMessage } from '@kbn/i18n/react';

import { TableListView } from './../../table_list_view';

import {
  EuiIcon,
  EuiLink,
  EuiButton,
  EuiEmptyPrompt,
} from '@elastic/eui';

class VisualizeListingTableUi extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { intl } = this.props;
    return (
      <TableListView
        create={this.props.create}
        find={this.props.find}
        delete={this.props.delete}
        edit={this.props.edit}
        tableColumns={this.getTableColumns()}
        listingLimit={100}
        initialFilter={''}
        hideWriteControls={false}
        noItemsFragment={this.getNoItemsMessage()}
        entityName={
          intl.formatMessage({
            id: 'kbn.visualize.listing.table.entityName',
            defaultMessage: 'visualization',
          })
        }
        entityNamePlural={
          intl.formatMessage({
            id: 'kbn.visualize.listing.table.entityNamePlural',
            defaultMessage: 'visualizations',
          })
        }
        tableListTitle={
          intl.formatMessage({
            id: 'kbn.visualize.listing.table.listTitle',
            defaultMessage: 'Visualizations',
          })
        }
      />
    );
  }

  getTableColumns() {
    const { intl } = this.props;
    const tableColumns = [
      {
        field: 'title',
        name: intl.formatMessage({
          id: 'kbn.visualize.listing.table.titleColumnName',
          defaultMessage: 'Title',
        }),
        sortable: true,
        render: (field, record) => (
          <span>
            {this.renderFlaskIcon(record)}
            <EuiLink
              onClick={() => this.props.edit(record.id)}
              data-test-subj={`visListingTitleLink-${record.title.split(' ').join('-')}`}
            >
              {field}
            </EuiLink>
          </span>
        )
      },
      {
        field: 'type.title',
        name: intl.formatMessage({
          id: 'kbn.visualize.listing.table.typeColumnName',
          defaultMessage: 'Type',
        }),
        sortable: true,
        render: (field, record) =>  (
          <span>
            {this.renderItemTypeIcon(record)}
            {record.type.title}
          </span>
        )
      }
    ];

    return tableColumns;
  }

  getNoItemsMessage() {
    if (this.props.hideWriteControls) {
      return (
        <div>
          <EuiEmptyPrompt
            iconType="visualizeApp"
            title={
              <h2>
                <FormattedMessage
                  id="kbn.visualize.listing.noItemsMessage"
                  defaultMessage="Looks like you don't have any visualizations."
                />
              </h2>
            }
          />
        </div>
      );
    }

    return (
      <div>
        <EuiEmptyPrompt
          iconType="visualizeApp"
          title={
            <h2>
              <FormattedMessage
                id="kbn.visualize.listing.createNew.title"
                defaultMessage="Create your first visualization"
              />
            </h2>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="kbn.visualize.listing.createNew.description"
                  defaultMessage="You can create different visualizations, based on your data."
                />
              </p>
            </Fragment>
          }
          actions={
            <EuiButton
              onClick={this.props.onCreateVis}
              fill
              iconType="plusInCircle"
              data-test-subj="createVisualizationPromptButton"
            >
              <FormattedMessage
                id="kbn.visualize.listing.createNew.createButtonLabel"
                defaultMessage="Create new visualization"
              />
            </EuiButton>
          }
        />
      </div>
    );

  }

  renderItemTypeIcon(item) {
    let icon;
    if (item.type.image) {
      icon = (
        <img
          className="visListingTable__typeImage"
          aria-hidden="true"
          alt=""
          src={item.type.image}
        />
      );
    } else {
      icon = (
        <EuiIcon
          className="visListingTable__typeIcon"
          aria-hidden="true"
          type={item.icon || 'empty'}
          size="m"
        />
      );
    }

    return icon;
  }

  renderFlaskIcon(item) {
    let flaskHolder;
    if (item.type.shouldMarkAsExperimentalInUI()) {
      flaskHolder =  (
        <EuiIcon
          className="visListingTable__typeIcon"
          aria-hidden="true"
          type="beaker"
          size="m"
        />
      );
    }else{
      flaskHolder = <span />;
    }
    return flaskHolder;
  }
}

VisualizeListingTableUi.propTypes = {
  delete: PropTypes.func.isRequired,
  find: PropTypes.func.isRequired,
  create: PropTypes.func.isRequired,
  edit: PropTypes.func.isRequired,
};

export const VisualizeListingTable = injectI18n(VisualizeListingTableUi);
