/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';

interface ElkyBannerProps {
  visible: boolean;
}

export function ElkyBanner({ visible }: ElkyBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title="🦌 🦌 🦌"
        color="primary"
        iconType="empty"
        size="s"
        data-test-subj="elkyBanner"
        css={css`
          text-align: center;
          .euiCallOutHeader__title {
            font-size: 48px;
            line-height: 1;
          }
        `}
      />
      <EuiSpacer size="m" />
    </>
  );
}
