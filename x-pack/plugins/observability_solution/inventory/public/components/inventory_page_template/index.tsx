/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, /* EuiHorizontalRule,*/ EuiPanel, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useTheme } from '@kbn/observability-utils-browser/hooks/use_theme';
import React from 'react';
// import { useInventoryRouter } from '../../hooks/use_inventory_router';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTypeList /* , EntityTypeListItem*/ } from '../entity_type_list';

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    dependencies: {
      start: { observabilityShared },
    },
  } = useKibana();

  const { PageTemplate } = observabilityShared.navigation;

  // const router = useInventoryRouter();

  const theme = useTheme();

  return (
    <PageTemplate
      pageSectionProps={{
        className: css`
          max-height: calc(100vh - var(--euiFixedHeadersOffset, 0));
          overflow: auto;
          padding-inline: 0px;
        `,
        contentProps: {
          className: css`
            padding-block: 0px;
            display: flex;
            height: 100%;
          `,
        },
      }}
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="stretch"
        className={css`
          min-width: 0;
        `}
      >
        <EuiPanel
          className={css`
            width: 288px;
            max-width: 288px;
            min-width: 288px;
            padding: 24px;
            height: 100%;
            border: none;
            border-radius: 0;
            border-right: 1px solid ${theme.colors.lightShade};
          `}
          hasBorder={false}
          hasShadow={false}
        >
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiTitle size="xs">
              <h1>
                {i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
                  defaultMessage: 'Entities',
                })}
              </h1>
            </EuiTitle>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EntityTypeList />
              {/* <EuiHorizontalRule margin="none" />
              <EntityTypeListItem
                icon="sparkles"
                count={0}
                href={router.link('/updates')}
                label={i18n.translate('xpack.inventory.updatesLinkLabel', {
                  defaultMessage: 'Updates',
                })}
              /> */}
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiPanel
          hasBorder={false}
          hasShadow={false}
          paddingSize="l"
          className={css`
            min-width: 0;
          `}
        >
          {children}
        </EuiPanel>
      </EuiFlexGroup>
    </PageTemplate>
  );
}
