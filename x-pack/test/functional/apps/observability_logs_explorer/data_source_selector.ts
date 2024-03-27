/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from './config';

const initialPackageMap = {
  apache: 'Apache HTTP Server',
  aws: 'AWS',
  system: 'System',
};
const initialPackagesTexts = ['Apache HTTP Server', 'AWS', 'System'];

const expectedDataViews = ['logs-*', 'logstash-*', 'metrics-*'];
const sortedExpectedDataViews = expectedDataViews.slice().sort();

const uncategorizedDatasets = ['logs-gaming-*', 'logs-manufacturing-*', 'logs-retail-*'];
const expectedUncategorizedDatasets = uncategorizedDatasets.map((dataset) => dataset.split('-')[1]);

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discover', 'observabilityLogsExplorer']);

  const noIntegrationsTitle = 'No integrations found';
  const noUncategorizedTitle = 'No data streams found';

  describe.only('DataSourceSelector', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('as consistent behavior', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
      });

      beforeEach(async () => {
        await browser.refresh();
        await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
      });

      it('should always display the Integrations and Data Views top level tabs', async () => {
        const integrationsTab = await PageObjects.observabilityLogsExplorer.getIntegrationsTab();
        const dataViewsTab = await PageObjects.observabilityLogsExplorer.getDataViewsTab();

        expect(await integrationsTab.isDisplayed()).to.be(true);
        expect(await integrationsTab.getVisibleText()).to.be('Integrations');
        expect(await dataViewsTab.isDisplayed()).to.be(true);
        expect(await dataViewsTab.getVisibleText()).to.be('Data Views');
      });

      it('should always display the "Show all logs" action', async () => {
        const allLogsButton = await PageObjects.observabilityLogsExplorer.getAllLogsButton();

        const allLogsTitle = await allLogsButton.getVisibleText();

        expect(allLogsTitle).to.be('Show all logs');
      });

      describe('when open on the integrations tab', () => {
        it('should display an error prompt if could not retrieve the integrations', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusErrorPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no integrations', async () => {
          const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();

          expect(integrations.length).to.be(0);
          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noIntegrationsTitle
          );
        });
      });

      describe('when open the uncategorized integration', () => {
        it('should display an error prompt if could not retrieve the datasets', async function () {
          await PageObjects.observabilityLogsExplorer
            .getUncategorizedIntegration()
            .then((uncategorizedEntry) => uncategorizedEntry.click());

          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

            await PageObjects.observabilityLogsExplorer
              .getUncategorizedIntegration()
              .then((uncategorizedEntry) => uncategorizedEntry.click());

            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusErrorPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no uncategorized data streams', async () => {
          await PageObjects.observabilityLogsExplorer
            .getUncategorizedIntegration()
            .then((uncategorizedEntry) => uncategorizedEntry.click());

          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noUncategorizedTitle
          );
        });
      });
    });

    describe('with installed integrations and uncategorized data streams', () => {
      let cleanupIntegrationsSetup: () => Promise<void>;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
        );
        cleanupIntegrationsSetup =
          await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
        );
        await cleanupIntegrationsSetup();
      });

      describe('when open on the integrations tab', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
        });

        it('should display the uncategorized integration on top of the list', async () => {
          const uncategorizedEntry =
            await PageObjects.observabilityLogsExplorer.getUncategorizedIntegration();

          expect(await uncategorizedEntry.isDisplayed()).to.be(true);
        });

        it('should display a list of installed integrations', async () => {
          const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();

          expect(integrations.length).to.be(3);
          expect(integrations).to.eql(initialPackagesTexts);
        });

        it('should sort the integrations list by the clicked sorting option', async () => {
          // Test ascending order
          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });

          // Test descending order
          await PageObjects.observabilityLogsExplorer.sortIntegrationsByName();

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts.slice().reverse());
          });

          // Test back ascending order
          await PageObjects.observabilityLogsExplorer.sortIntegrationsByName();

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });
        });

        it('should filter the integrations list by the typed integration name', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache, initialPackageMap.aws]);
          });
        });

        it('should display an empty prompt when the search does not match any result', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('no result search text');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations.length).to.be(0);
          });

          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noIntegrationsTitle
          );
        });

        it('should load more integrations by scrolling to the end of the list', async () => {
          // Install more integrations and reload the page
          const cleanupAdditionalSetup =
            await PageObjects.observabilityLogsExplorer.setupAdditionalIntegrations();
          await browser.refresh();

          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();

          // Initially fetched integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(15);
            await nodes.at(-1)?.scrollIntoView();
          });

          // Load more integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
            await nodes.at(-1)?.scrollIntoView();
          });

          // No other integrations to load after scrolling to last integration
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
          });

          await cleanupAdditionalSetup();
        });

        describe('clicking on integration and expanding its datasets', () => {
          before(async () => {
            await PageObjects.observabilityLogsExplorer.navigateTo();
          });

          beforeEach(async () => {
            await browser.refresh();
            await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          });

          it('should display a list of available datasets', async () => {
            await retry.try(() =>
              PageObjects.observabilityLogsExplorer.expandIntegrationByName('Apache HTTP Server')
            );

            await retry.try(async () => {
              const { datasets } =
                await PageObjects.observabilityLogsExplorer.getIntegrationDatasets(
                  'Apache HTTP Server'
                );

              expect(datasets).to.eql([
                '[Apache HTTP Server] access',
                '[Apache HTTP Server] error',
              ]);
            });
          });

          it('should update the current selection with the clicked dataset', async () => {
            await retry.try(() =>
              PageObjects.observabilityLogsExplorer.expandIntegrationByName('Apache HTTP Server')
            );

            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrationDatasets(
                'Apache HTTP Server'
              );

              nodes[0].click();
            });

            await retry.try(async () => {
              const selectorButton =
                await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButton();

              expect(await selectorButton.getVisibleText()).to.be('[Apache HTTP Server] access');
            });
          });
        });
      });

      describe('when opening the uncategorized integration', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          await PageObjects.observabilityLogsExplorer
            .getUncategorizedIntegration()
            .then((uncategorized: WebElementWrapper) => uncategorized.click());
        });

        it('should display a list of available datasets', async () => {
          await retry.try(() =>
            PageObjects.observabilityLogsExplorer.expandIntegrationByName('Uncategorized')
          );

          await retry.try(async () => {
            const { datasets } = await PageObjects.observabilityLogsExplorer.getIntegrationDatasets(
              'Uncategorized'
            );

            expect(datasets).to.eql(expectedUncategorizedDatasets);
          });
        });

        it('should filter the datasets list by the typed dataset name', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('retail');

          await retry.try(() =>
            PageObjects.observabilityLogsExplorer.expandIntegrationByName('Uncategorized')
          );

          await retry.try(async () => {
            const { datasets } = await PageObjects.observabilityLogsExplorer.getIntegrationDatasets(
              'Uncategorized'
            );

            expect(datasets).to.eql(['retail']);
          });
        });
      });

      describe('when open on the data views tab', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          await PageObjects.observabilityLogsExplorer
            .getDataViewsTab()
            .then((tab: WebElementWrapper) => tab.click());
        });

        it('should display a list of available data views', async () => {
          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                ])
              );

            expect(
              await PageObjects.observabilityLogsExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
          });
        });

        it('should sort the data views list by the clicked sorting option', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogsExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          // Test descending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[2]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(sortedExpectedDataViews[0]);
          });

          // Test back ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(sortedExpectedDataViews[2]);
          });
        });

        it('should filter the data views list by the typed data view name', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogsExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('logs');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(menuEntries.length).to.be(2);
            expect(await menuEntries[0].getVisibleText()).to.be('logs-*');
            expect(await menuEntries[1].getVisibleText()).to.be('logstash-*');
          });
        });

        it('should load a data view allowed by the settings upon click', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogsExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const url = await browser.getCurrentUrl();
            expect(url).to.contain(`/app/observability-logs-explorer`);
          });

          await retry.try(async () => {
            const selectorButton =
              await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be(expectedDataViews[0]);
          });
        });

        it('should navigate to Discover and load a data view not allowed by the settings upon click', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogsExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
            menuEntries[2].click();
          });

          await retry.try(async () => {
            const url = await browser.getCurrentUrl();
            expect(url).to.contain(`/app/discover`);
          });

          await retry.try(async () => {
            expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.eql(
              expectedDataViews[2]
            );
          });
        });
      });

      describe('when open/close the selector', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
        });

        it('should restore the latest search results', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogsExplorer.closeDataSourceSelector();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });
        });
      });
    });
  });
}
