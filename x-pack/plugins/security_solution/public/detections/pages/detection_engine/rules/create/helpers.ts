/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has, isEmpty } from 'lodash/fp';
import moment from 'moment';
import deepmerge from 'deepmerge';

import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../common/constants';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import { isMlRule } from '../../../../../../common/machine_learning/helpers';
import { isThresholdRule } from '../../../../../../common/detection_engine/utils';
import { List } from '../../../../../../common/detection_engine/schemas/types';
import { ENDPOINT_LIST_ID, ExceptionListType, NamespaceType } from '../../../../../shared_imports';
import { Rule } from '../../../../containers/detection_engine/rules';
import { Type } from '../../../../../../common/detection_engine/schemas/common/schemas';

import {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
  DefineStepRuleJson,
  ScheduleStepRuleJson,
  AboutStepRuleJson,
  ActionsStepRuleJson,
  RuleStepsFormData,
  RuleStep,
} from '../types';

export const getTimeTypeValue = (time: string): { unit: string; value: number } => {
  const timeObj = {
    unit: '',
    value: 0,
  };
  const filterTimeVal = time.match(/\d+/g);
  const filterTimeType = time.match(/[a-zA-Z]+/g);
  if (!isEmpty(filterTimeVal) && filterTimeVal != null && !isNaN(Number(filterTimeVal[0]))) {
    timeObj.value = Number(filterTimeVal[0]);
  }
  if (
    !isEmpty(filterTimeType) &&
    filterTimeType != null &&
    ['s', 'm', 'h'].includes(filterTimeType[0])
  ) {
    timeObj.unit = filterTimeType[0];
  }
  return timeObj;
};

export const stepIsValid = <T extends RuleStepsFormData[keyof RuleStepsFormData]>(
  formData?: T
): formData is { [K in keyof T]: Exclude<T[K], undefined> } =>
  !!formData?.isValid && !!formData.data;

export const isDefineStep = (input: unknown): input is RuleStepsFormData[RuleStep.defineRule] =>
  has('data.ruleType', input);

export const isAboutStep = (input: unknown): input is RuleStepsFormData[RuleStep.aboutRule] =>
  has('data.name', input);

export const isScheduleStep = (input: unknown): input is RuleStepsFormData[RuleStep.scheduleRule] =>
  has('data.interval', input);

export const isActionsStep = (input: unknown): input is RuleStepsFormData[RuleStep.ruleActions] =>
  has('data.actions', input);

export interface RuleFields {
  anomalyThreshold: unknown;
  machineLearningJobId: unknown;
  queryBar: unknown;
  index: unknown;
  ruleType: unknown;
  threshold?: unknown;
}
type QueryRuleFields<T> = Omit<T, 'anomalyThreshold' | 'machineLearningJobId' | 'threshold'>;
type ThresholdRuleFields<T> = Omit<T, 'anomalyThreshold' | 'machineLearningJobId'>;
type MlRuleFields<T> = Omit<T, 'queryBar' | 'index' | 'threshold'>;

const isMlFields = <T>(
  fields: QueryRuleFields<T> | MlRuleFields<T> | ThresholdRuleFields<T>
): fields is MlRuleFields<T> => has('anomalyThreshold', fields);

const isThresholdFields = <T>(
  fields: QueryRuleFields<T> | MlRuleFields<T> | ThresholdRuleFields<T>
): fields is ThresholdRuleFields<T> => has('threshold', fields);

export const filterRuleFieldsForType = <T extends RuleFields>(fields: T, type: Type) => {
  if (isMlRule(type)) {
    const { index, queryBar, threshold, ...mlRuleFields } = fields;
    return mlRuleFields;
  } else if (isThresholdRule(type)) {
    const { anomalyThreshold, machineLearningJobId, ...thresholdRuleFields } = fields;
    return thresholdRuleFields;
  } else {
    const { anomalyThreshold, machineLearningJobId, threshold, ...queryRuleFields } = fields;
    return queryRuleFields;
  }
};

export const formatDefineStepData = (defineStepData: DefineStepRule): DefineStepRuleJson => {
  const ruleFields = filterRuleFieldsForType(defineStepData, defineStepData.ruleType);
  const { ruleType, timeline } = ruleFields;
  const baseFields = {
    type: ruleType,
    ...(timeline.id != null &&
      timeline.title != null && {
        timeline_id: timeline.id,
        timeline_title: timeline.title,
      }),
  };

  const typeFields = isMlFields(ruleFields)
    ? {
        anomaly_threshold: ruleFields.anomalyThreshold,
        machine_learning_job_id: ruleFields.machineLearningJobId,
      }
    : isThresholdFields(ruleFields)
    ? {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id,
        ...(ruleType === 'threshold' && {
          threshold: {
            field: ruleFields.threshold?.field[0] ?? '',
            value: parseInt(ruleFields.threshold?.value, 10) ?? 0,
          },
        }),
      }
    : {
        index: ruleFields.index,
        filters: ruleFields.queryBar?.filters,
        language: ruleFields.queryBar?.query?.language,
        query: ruleFields.queryBar?.query?.query as string,
        saved_id: ruleFields.queryBar?.saved_id,
        ...(ruleType === 'query' &&
          ruleFields.queryBar?.saved_id && { type: 'saved_query' as Type }),
      };

  return {
    ...baseFields,
    ...typeFields,
  };
};

export const formatScheduleStepData = (scheduleData: ScheduleStepRule): ScheduleStepRuleJson => {
  const { ...formatScheduleData } = scheduleData;
  if (!isEmpty(formatScheduleData.interval) && !isEmpty(formatScheduleData.from)) {
    const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(
      formatScheduleData.interval
    );
    const { unit: fromUnit, value: fromValue } = getTimeTypeValue(formatScheduleData.from);
    const duration = moment.duration(intervalValue, intervalUnit as 's' | 'm' | 'h');
    duration.add(fromValue, fromUnit as 's' | 'm' | 'h');
    formatScheduleData.from = `now-${duration.asSeconds()}s`;
    formatScheduleData.to = 'now';
  }
  return {
    ...formatScheduleData,
    meta: {
      from: scheduleData.from,
    },
  };
};

export const formatAboutStepData = (
  aboutStepData: AboutStepRule,
  exceptionsList?: List[]
): AboutStepRuleJson => {
  const {
    author,
    falsePositives,
    references,
    riskScore,
    severity,
    threat,
    isAssociatedToEndpointList,
    isBuildingBlock,
    note,
    ruleNameOverride,
    timestampOverride,
    ...rest
  } = aboutStepData;

  const detectionExceptionLists =
    exceptionsList != null ? exceptionsList.filter((list) => list.type !== 'endpoint') : [];

  const resp = {
    author: author.filter((item) => !isEmpty(item)),
    ...(isBuildingBlock ? { building_block_type: 'default' } : {}),
    ...(isAssociatedToEndpointList
      ? {
          exceptions_list: [
            {
              id: ENDPOINT_LIST_ID,
              list_id: ENDPOINT_LIST_ID,
              namespace_type: 'agnostic' as NamespaceType,
              type: 'endpoint' as ExceptionListType,
            },
            ...detectionExceptionLists,
          ],
        }
      : exceptionsList != null
      ? {
          exceptions_list: [...detectionExceptionLists],
        }
      : {}),
    false_positives: falsePositives.filter((item) => !isEmpty(item)),
    references: references.filter((item) => !isEmpty(item)),
    risk_score: riskScore.value,
    risk_score_mapping: riskScore.isMappingChecked
      ? riskScore.mapping.filter((m) => m.field != null && m.field !== '')
      : [],
    rule_name_override: ruleNameOverride !== '' ? ruleNameOverride : undefined,
    severity: severity.value,
    severity_mapping: severity.isMappingChecked
      ? severity.mapping.filter((m) => m.field != null && m.field !== '' && m.value != null)
      : [],
    threat: threat
      .filter((singleThreat) => singleThreat.tactic.name !== 'none')
      .map((singleThreat) => ({
        ...singleThreat,
        framework: 'MITRE ATT&CK',
        technique: singleThreat.technique.map((technique) => {
          const { id, name, reference } = technique;
          return { id, name, reference };
        }),
      })),
    timestamp_override: timestampOverride !== '' ? timestampOverride : undefined,
    ...(!isEmpty(note) ? { note } : {}),
    ...rest,
  };
  return resp;
};

export const formatActionsStepData = (actionsStepData: ActionsStepRule): ActionsStepRuleJson => {
  const {
    actions = [],
    enabled,
    kibanaSiemAppUrl,
    throttle = NOTIFICATION_THROTTLE_NO_ACTIONS,
  } = actionsStepData;

  return {
    actions: actions.map(transformAlertToRuleAction),
    enabled,
    throttle: actions.length ? throttle : NOTIFICATION_THROTTLE_NO_ACTIONS,
    meta: {
      kibana_siem_app_url: kibanaSiemAppUrl,
    },
  };
};

// Used to format form data in rule edit and
// create flows so "T" here would likely
// either be CreateRulesSchema or Rule
export const formatRule = <T>(
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule,
  rule?: Rule | null
): T =>
  (deepmerge.all([
    formatDefineStepData(defineStepData),
    formatAboutStepData(aboutStepData, rule?.exceptions_list),
    formatScheduleStepData(scheduleData),
    formatActionsStepData(actionsData),
  ]) as unknown) as T;
