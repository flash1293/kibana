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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiButtonEmpty,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';

export class DashboardAddPanel extends React.Component {
  onAddPanel = (id, type, name) => {
    this.props.addNewPanel(id, type);

    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      toastNotifications.remove(this.lastToast);
    }

    this.lastToast = toastNotifications.addSuccess({
      title: i18n.translate(
        'kbn.dashboard.topNav.addPanel.selectedTabAddedToDashboardSuccessMessageTitle',
        {
          defaultMessage: '{savedObjectName} was added to your dashboard',
          values: {
            selectedTabName: name,
          },
        }
      ),
      'data-test-subj': this.state.selectedTab.toastDataTestSubj,
    });
  };

  render() {
    const addNewVisBtn = (
      <EuiButtonEmpty
        iconSide="left"
        iconType="plusInCircle"
        onClick={this.props.addNewVis}
        data-test-subj="addNewSavedObjectLink"
      >
        <FormattedMessage
          id="kbn.dashboard.topNav.addPanel.addNewVisualizationButtonLabel"
          defaultMessage="Add new Visualization"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutBody>
          <EuiTitle size="s">
            <h1>
              <FormattedMessage
                id="kbn.dashboard.topNav.addPanelsTitle"
                defaultMessage="Add Panels"
              />
            </h1>
          </EuiTitle>

          <EuiSpacer size="s" />

          <SavedObjectFinder
            onChoose={this.onAddPanel}
            savedObjectMetaData={this.props.embeddableFactories
              .filter(embeddableFactory => Boolean(embeddableFactory.savedObjectMetaData))
              .map(({ savedObjectMetaData }) => savedObjectMetaData)}
            showFilter={true}
            callToActionButton={addNewVisBtn}
            noItemsMessage={i18n.translate(
              'kbn.dashboard.topNav.addPanel.noMatchingObjectsMessage',
              {
                defaultMessage: 'No matching objects found.',
              }
            )}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

DashboardAddPanel.propTypes = {
  onClose: PropTypes.func.isRequired,
  addNewPanel: PropTypes.func.isRequired,
  addNewVis: PropTypes.func.isRequired,
};
