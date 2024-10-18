/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ThreatLanguageReadOnly } from './threat_language';
import { FieldReadOnly } from '../../field_readonly';
import type { DiffableRule } from '../../../../../../../../../common/api/detection_engine';
import { mockThreatMatchRule } from '../../storybook/mocks';
import { ThreeWayDiffStorybookProviders } from '../../storybook/three_way_diff_storybook_providers';

export default {
  component: ThreatLanguageReadOnly,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/threat_language',
};

interface TemplateProps {
  finalDiffableRule: DiffableRule;
}

const Template: Story<TemplateProps> = (args) => {
  return (
    <ThreeWayDiffStorybookProviders finalDiffableRule={args.finalDiffableRule}>
      <FieldReadOnly fieldName="threat_language" />
    </ThreeWayDiffStorybookProviders>
  );
};

export const Default = Template.bind({});

Default.args = {
  finalDiffableRule: mockThreatMatchRule({
    threat_language: 'lucene',
  }),
};
