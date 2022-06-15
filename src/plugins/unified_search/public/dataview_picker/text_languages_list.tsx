/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiSelectable, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { TextBasedLanguages } from '.';

export interface TextBasedLanguagesListProps {
  textBasedLanguages: TextBasedLanguages[];
  onChange: (lang: string) => void;
  selectedOption: string;
}

export function TextBasedLanguagesList({
  textBasedLanguages,
  onChange,
  selectedOption,
}: TextBasedLanguagesListProps) {
  return (
    <EuiSelectable<{
      key?: string;
      label: string;
      value?: string;
      checked?: 'on' | 'off' | undefined;
    }>
      data-test-subj="text-based-languages-switcher"
      singleSelection="always"
      options={textBasedLanguages.map((lang) => ({
        key: lang,
        label: lang,
        value: lang,
        checked: lang === selectedOption ? 'on' : undefined,
      }))}
      onChange={(choices) => {
        const choice = choices.find(({ checked }) => checked) as unknown as {
          value: string;
        };
        onChange(choice.value);
      }}
    >
      {(list) => (
        <EuiPanel
          css={css`
            padding-bottom: 0;
          `}
          color="transparent"
          paddingSize="s"
        >
          {list}
        </EuiPanel>
      )}
    </EuiSelectable>
  );
}
