/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

interface StepsNavProps {
  previousActive?: boolean;
  nextActive?: boolean;
  previous?(): void;
  next?(): void;
}

export const WizardNav: FC<StepsNavProps> = ({
  previous,
  previousActive = true,
  next,
  nextActive = true,
}) => (
  <Fragment>
    <EuiHorizontalRule />
    <EuiFlexGroup>
      {previous && (
        <EuiFlexItem grow={false}>
          <PreviousButton previous={previous} previousActive={previousActive} />
        </EuiFlexItem>
      )}
      {next && (
        <EuiFlexItem grow={false}>
          <NextButton next={next} nextActive={nextActive} />
        </EuiFlexItem>
      )}
      <EuiFlexItem />
    </EuiFlexGroup>
  </Fragment>
);

export const PreviousButton: FC<StepsNavProps> = ({ previous, previousActive = true }) => (
  <EuiButton
    disabled={!previousActive}
    onClick={previous}
    iconType="arrowLeft"
    data-test-subj="mlJobWizardNavButtonPrevious"
  >
    <FormattedMessage id="xpack.ml.newJob.wizard.previousStepButton" defaultMessage="Previous" />
  </EuiButton>
);

export const NextButton: FC<StepsNavProps> = ({ next, nextActive = true }) => (
  <EuiButton
    disabled={!nextActive}
    onClick={next}
    iconType="arrowRight"
    data-test-subj="mlJobWizardNavButtonNext"
  >
    <FormattedMessage id="xpack.ml.newJob.wizard.nextStepButton" defaultMessage="Next" />
  </EuiButton>
);
