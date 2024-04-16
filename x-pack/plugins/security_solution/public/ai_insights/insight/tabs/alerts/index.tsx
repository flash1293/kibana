/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Replacements } from '@kbn/elastic-assistant-common';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import React, { useMemo } from 'react';

import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import type { AlertsInsight } from '../../../types';

interface Props {
  insight: AlertsInsight;
  replacements?: Replacements;
}

const AlertsComponent: React.FC<Props> = ({ insight, replacements }) => {
  const { triggersActionsUi } = useKibana().services;

  const originalAlertIds = useMemo(
    () =>
      insight.alertIds.map((alertId) =>
        replacements != null ? replacements[alertId] ?? alertId : alertId
      ),
    [insight.alertIds, replacements]
  );

  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: originalAlertIds,
      },
    }),
    [originalAlertIds]
  );

  const configId = ALERTS_TABLE_REGISTRY_CONFIG_IDS.CASE; // show the same row-actions as in the case view

  const alertStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      id: `ai-insights-alerts-${insight.id}`,
      featureIds: [AlertConsumers.SIEM],
      query: alertIdsQuery,
      showAlertStatusWithFlapping: false,
    }),
    [triggersActionsUi.alertsTableConfigurationRegistry, configId, insight.id, alertIdsQuery]
  );

  return (
    <div data-test-subj="alertsTab">{triggersActionsUi.getAlertsStateTable(alertStateProps)}</div>
  );
};

export const Alerts = React.memo(AlertsComponent);
