/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  formatNumber,
} from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import useAsync from 'react-use/lib/useAsync';
import { BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import { useLocation } from 'react-router-dom';
import { useEsqlQueryResult } from '../../../hooks/use_esql_query_result';
import { Entity, getRerouteCode } from '../../../../common/entities';
import { useKibana } from '../../../hooks/use_kibana';
import { MainPipelineView } from '../../management_overview_view';
import { DatasetManagementSplitView } from '../../dataset_management_split_view';
import { DatasetManagementParseView } from '../../dataset_management_parse_view';
import { LogicalParseView } from './parse_view';

export function LogicalManagementView({
  entity,
  dataStreams,
}: {
  entity: Entity;
  dataStreams: Array<{ name: string }>;
}) {
  const {
    dependencies: {
      start: { data, unifiedSearch },
    },
    services: { inventoryAPIClient },
  } = useKibana();

  const {
    absoluteTimeRange: { start, end },
    timeRange,
    setTimeRange,
  } = useDateRange({ data });

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  const [view, setView] = React.useState<'main' | 'parse' | 'reroute'>(
    queryParams.get('initialView') || 'main'
  );

  const relationshipQueryFetch = useAbortableAsync(
    async ({ signal }) => {
      if (!dataStreams) {
        return undefined;
      }

      const queries = await inventoryAPIClient
        .fetch('POST /internal/inventory/entity/relationships', {
          signal,
          params: {
            body: {
              type: entity.type,
              displayName: entity.displayName,
              start,
              end,
              indexPatterns: dataStreams.map((dataStream) => dataStream.name),
            },
          },
        })
        .then((response) => {
          const relationshipsByType = groupBy(
            response.relatedEntities,
            (relatedEntity) => relatedEntity.type
          );

          return Object.entries(relationshipsByType).map(([type, entities]) => {
            return {
              bool: {
                filter: [
                  {
                    term: {
                      'entity.type': type,
                    },
                  },
                  {
                    terms: {
                      ['entity.displayName.keyword']: entities.map(
                        (relatedEntity) => relatedEntity.displayName
                      ),
                    },
                  },
                ],
              },
            };
          });
        });

      if (!queries.length) {
        return [
          {
            bool: {
              must_not: {
                match_all: {},
              },
            },
          },
        ];
      }

      return [
        {
          bool: {
            should: queries,
            minimum_should_match: 1,
          },
        },
      ];
    },
    [dataStreams, entity, inventoryAPIClient, start, end]
  );

  const dslFilter = relationshipQueryFetch.value;

  const queryFetch = useAbortableAsync(
    ({ signal }) => {
      const identityFields = entity.properties['entity.identityFields'] as string[] | string;
      const kuery = (Array.isArray(identityFields) ? identityFields : [identityFields])
        .map((field) => `${field}: "${entity.properties[field]}"`)
        .join(' AND ');

      return inventoryAPIClient.fetch('POST /internal/inventory/entities/inventory', {
        signal,
        params: {
          body: {
            start,
            end,
            kuery,
            type: 'data_stream',
            fromSourceIfEmpty: true,
            dslFilter: undefined,
          },
        },
      });
    },
    [entity.properties, inventoryAPIClient, start, end]
  );

  const relatedDataStreams = useMemo(() => {
    return queryFetch.value?.entities ?? [];
  }, [queryFetch.value]);

  function goBack() {
    setView('main');
  }

  // if (view === 'reroute') {
  //   return <DatasetManagementSplitView goBack={goBack} />;
  // }

  if (view === 'parse') {
    return <LogicalParseView goBack={goBack} entity={entity} />;
  }

  return (
    <EuiFlexGroup direction="column">
      <unifiedSearch.ui.SearchBar
        appName="inventory"
        showQueryInput={false}
        showFilterBar={false}
        showQueryMenu={false}
        showDatePicker={true}
        onTimeRangeChange={({ dateRange }) => {
          setTimeRange(dateRange);
        }}
        onQuerySubmit={({ dateRange }) => {
          setTimeRange(dateRange);
        }}
        submitOnBlur
        showSubmitButton={false}
        dateRangeFrom={timeRange.from}
        dateRangeTo={timeRange.to}
        displayStyle="inPage"
        disableQueryLanguageSwitcher
        indexPatterns={[]}
      />
      <EuiPanel>
        <EuiFlexGroup direction="column">
          <EuiText>
            <h2>
              {i18n.translate('xpack.inventory.logicalManagementView.h2.ingestProcessingLabel', {
                defaultMessage: 'Ingest processing',
              })}
            </h2>
          </EuiText>
          <IngestPipelines entity={entity} />
          <EuiFlexGroup>
            <EuiButton
              data-test-subj="inventoryDatasetManagementViewSplitUpButton"
              onClick={() => setView('parse')}
            >
              {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
                defaultMessage: 'Parse this entity',
              })}
            </EuiButton>
            <EuiButton
              data-test-subj="inventoryDatasetManagementViewSplitUpButton"
              onClick={() => setView('parse')}
            >
              {i18n.translate('xpack.inventory.datasetManagementView.splitUpButtonLabel', {
                defaultMessage: 'Parse entity type {type}',
                values: { type: entity.type },
              })}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiText>
        <h2>
          {i18n.translate('xpack.inventory.logicalManagementView.h2.dataStreamsOfLabel', {
            defaultMessage: 'Data streams of ',
          })}
          {entity.displayName}
        </h2>
      </EuiText>
      {relatedDataStreams.map((dataStream) => (
        <RelatedDataStream
          key={dataStream.displayName}
          dataStream={dataStream}
          rootEntity={entity}
          dataStreams={dataStreams}
        />
      ))}
    </EuiFlexGroup>
  );
}

export function IngestPipelines({ entity }: { entity: Entity }) {
  const {
    dependencies: {
      start: { data },
    },
    core: { http },
  } = useKibana();
  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });
  const query = useMemo(() => {
    // build a query dsl query that filters for all the identity fields of the entity
    const identityFields = entity.properties['entity.identityFields'] as string[] | string;
    const filters = (Array.isArray(identityFields) ? identityFields : [identityFields]).map(
      (field) => ({
        term: {
          [field]: entity.properties[field],
        },
      })
    );
    // add time rang3e filter
    filters.push({
      range: {
        '@timestamp': {
          gte: start,
          lte: end,
        },
      },
    });

    // return as full query of a search request
    return {
      bool: {
        filter: filters,
      },
    };
  }, [end, entity.properties, start]);

  const pipelines = useAsync(async () => {
    return await http.post('/api/pipelines_for_entity', {
      body: JSON.stringify({
        query,
      }),
    });
  }, [http, query]);

  const executionCounts = useMemo(() => {
    if (!pipelines.value) {
      return undefined;
    }
    const perPipeline = pipelines.value.aggregations.pipelines.buckets.reduce(
      (acc: Record<string, number>, pipeline: any) => {
        acc[pipeline.key] = pipeline.doc_count;
        return acc;
      },
      {}
    );
    return {
      total: pipelines.value.hits.total.value,
      perPipeline,
    };
  }, [pipelines.value]);

  if (pipelines.loading) {
    return <EuiLoadingSpinner />;
  }

  if (pipelines.error) {
    return (
      <div>
        {i18n.translate('xpack.inventory.mainPipelineView.div.errorLabel', {
          defaultMessage: 'Error:',
        })}
        {pipelines.error.message}
      </div>
    );
  }

  return (
    <div>
      <MainPipelineView executionCounts={executionCounts} />
    </div>
  );
}

function RelatedDataStream({
  dataStream,
  rootEntity,
  dataStreams,
}: {
  dataStream: Entity;
  rootEntity: Entity;
  dataStreams: Array<{ name: string }>;
}) {
  const {
    dependencies: {
      start: { data, share },
    },
  } = useKibana();
  const {
    core: { http },
  } = useKibana();
  const path = `/internal/dataset_quality/data_streams/${dataStream.displayName}/details`;

  const {
    absoluteTimeRange: { start, end },
    timeRange,
  } = useDateRange({ data });

  const details = useAsync(() => {
    return http.get(path, {
      query: {
        // start is now - 1 hour as iso string
        start: new Date(start).toISOString(),
        // end is now as iso string
        end: new Date(end).toISOString(),
      },
    });
  }, [http, path, start, end]);

  const baseQuery = useMemo(() => {
    const identityFields = rootEntity.properties['entity.identityFields'] as string[] | string;
    const whereClauses = (Array.isArray(identityFields) ? identityFields : [identityFields]).map(
      (field: string) => `WHERE ${field} == "${rootEntity.properties[field]}"`
    );
    return `FROM ${dataStream.displayName} | ${whereClauses.join(' AND ')}`;
  }, [dataStream, rootEntity.properties]);

  const countQuery = `${baseQuery} | STATS COUNT()`;

  const countQueryResult = useEsqlQueryResult({
    query: countQuery,
    kuery: '',
    start,
    end,
    operationName: 'count',
  });

  const discoverLocator = useMemo(() => {
    return share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [share?.url.locators]);

  const discoverLink = discoverLocator?.getRedirectUrl({
    dataViewSpec: { timeFieldName: '@timestamp', title: dataStream.displayName },
    timeRange,
    query: { esql: baseQuery },
    columns: [],
  });

  const rerouteQueryParams = new URLSearchParams();

  rerouteQueryParams.set('initialView', 'reroute');
  rerouteQueryParams.set('initialCode', getRerouteCode(rootEntity));

  // Generate the full query string
  const rerouteQueryString = rerouteQueryParams.toString();

  return (
    <EuiPanel>
      {details.loading || countQueryResult.loading ? (
        <EuiLoadingSpinner />
      ) : (
        <EuiFlexGroup direction="column">
          <EuiFlexGroup>
            <EuiText>
              <EuiLink
                data-test-subj="inventoryRelatedDataStreamLink"
                href={`/app/entities/data_stream/${dataStream.displayName}/management`}
              >
                <h3>{dataStream.displayName}</h3>
              </EuiLink>
            </EuiText>
            <EuiLink
              data-test-subj="inventoryRelatedDataStreamLink"
              href={discoverLink}
              target="_blank"
              color="primary"
              css={{
                display: 'flex',
                alignItems: 'center',
              }}
              external={false}
            >
              <EuiIcon type="discoverApp" size="s" color="primary" />
              <EuiText size="xs">
                {i18n.translate('xpack.inventory.openInDiscoverLabel', {
                  defaultMessage: 'Open in Discover',
                })}
              </EuiText>
            </EuiLink>
          </EuiFlexGroup>
          <div style={{ height: '100px' }}>
            <Chart
              title={i18n.translate(
                'xpack.inventory.relatedDataStream.chart.storageAllocationLabel',
                { defaultMessage: 'Doc count distribution' }
              )}
              description={`Share of ${rootEntity.displayName} docs in ${dataStream.displayName}`}
            >
              <Settings rotation={-90} />

              <BarSeries
                id="bars"
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                stackAccessors={['x']}
                splitSeriesAccessors={['g']}
                color={['#3185FC', '#D3DAE6']}
                data={[
                  {
                    x: 1,
                    y: countQueryResult.value?.values[0][0],
                    g: `${rootEntity.displayName} doc count`,
                  },
                  {
                    x: 1,
                    y: details.value.docsCount - countQueryResult.value?.values[0][0],
                    g: 'Other entities',
                  },
                ]}
              />
            </Chart>
          </div>
          <EuiFlexGroup>
            <EuiButton
              href={`/app/entities/data_stream/${dataStream.displayName}/management?${rerouteQueryString}`}
              data-test-subj="inventoryRelatedDataStreamSplitOutButton"
            >
              {i18n.translate('xpack.inventory.relatedDataStream.splitButtonLabel', {
                defaultMessage: 'Split ',
              })}
              {rootEntity.displayName}{' '}
              {i18n.translate('xpack.inventory.relatedDataStream.outIntoDedicatedDataButtonLabel', {
                defaultMessage: 'out into dedicated data stream',
              })}
            </EuiButton>
            {dataStream.displayName.startsWith('logs-') && (
              <EuiButton
                href={`/app/entities/data_stream/${dataStream.displayName}/management?initialView=parse`}
                data-test-subj="inventoryRelatedDataStreamParseMessageButton"
              >
                {i18n.translate('xpack.inventory.relatedDataStream.parseMessageButtonLabel', {
                  defaultMessage: 'Parse messages',
                })}
              </EuiButton>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}
