/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import classNames from 'classnames';
import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FontawesomeIcon } from '../../services/style_choices';

export interface LegacyIconProps {
  icon: FontawesomeIcon;
  selected?: boolean;
  onClick?: () => void;
  asListIcon?: boolean;
}

export function LegacyIcon(props: LegacyIconProps) {
  const icon = (
    <i
      className={classNames('fa', {
        selectedNode: props.selected,
        gphNode__text: !props.onClick,
        'gphNode__text--lowOpacity': !props.onClick,
        gphIconPicker__icon: !!props.onClick,
        gphNoUserSelect: !!props.onClick,
        gphListIcon: props.asListIcon,
      })}
    >
      {props.icon.code}
    </i>
  );

  if (props.onClick) {
    return <EuiButtonEmpty onClick={props.onClick}>{icon}</EuiButtonEmpty>;
  } else {
    return icon;
  }
}
