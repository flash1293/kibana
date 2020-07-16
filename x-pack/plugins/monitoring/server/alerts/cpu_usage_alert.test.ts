/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CpuUsageAlert } from './cpu_usage_alert';
import { ALERT_CPU_USAGE } from '../../common/constants';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';
import { fetchClusters } from '../lib/alerts/fetch_clusters';

const RealDate = Date;

jest.mock('../lib/alerts/fetch_cpu_usage_node_stats', () => ({
  fetchCpuUsageNodeStats: jest.fn(),
}));
jest.mock('../lib/alerts/fetch_clusters', () => ({
  fetchClusters: jest.fn(),
}));

describe('CpuUsageAlert', () => {
  it('should have defaults', () => {
    const alert = new CpuUsageAlert();
    expect(alert.type).toBe(ALERT_CPU_USAGE);
    expect(alert.label).toBe('CPU Usage');
    expect(alert.defaultThrottle).toBe('1m');
    // @ts-ignore
    expect(alert.defaultParams).toStrictEqual({ threshold: 90, duration: '5m' });
    // @ts-ignore
    expect(alert.actionVariables).toStrictEqual([
      {
        name: 'internalShortMessage',
        description: 'The short internal message generated by Elastic.',
      },
      {
        name: 'internalFullMessage',
        description: 'The full internal message generated by Elastic.',
      },
      { name: 'state', description: 'The current state of the alert.' },
      { name: 'nodes', description: 'The list of nodes reporting high cpu usage.' },
      { name: 'count', description: 'The number of nodes reporting high cpu usage.' },
      { name: 'clusterName', description: 'The cluster to which the nodes belong.' },
      { name: 'action', description: 'The recommended action for this alert.' },
      {
        name: 'actionPlain',
        description: 'The recommended action for this alert, without any markdown.',
      },
    ]);
  });

  describe('execute', () => {
    function FakeDate() {}
    FakeDate.prototype.valueOf = () => 1;

    const clusterUuid = 'abc123';
    const clusterName = 'testCluster';
    const nodeId = 'myNodeId';
    const nodeName = 'myNodeName';
    const cpuUsage = 91;
    const stat = {
      clusterUuid,
      nodeId,
      nodeName,
      cpuUsage,
    };
    const getUiSettingsService = () => ({
      asScopedToClient: jest.fn(),
    });
    const getLogger = () => ({
      debug: jest.fn(),
    });
    const monitoringCluster = null;
    const config = {
      ui: { ccs: { enabled: true }, container: { elasticsearch: { enabled: false } } },
    };
    const kibanaUrl = 'http://localhost:5601';

    const replaceState = jest.fn();
    const scheduleActions = jest.fn();
    const getState = jest.fn();
    const executorOptions = {
      services: {
        callCluster: jest.fn(),
        alertInstanceFactory: jest.fn().mockImplementation(() => {
          return {
            replaceState,
            scheduleActions,
            getState,
          };
        }),
      },
      state: {},
    };

    beforeEach(() => {
      // @ts-ignore
      Date = FakeDate;
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [stat];
      });
      (fetchClusters as jest.Mock).mockImplementation(() => {
        return [{ clusterUuid, clusterName }];
      });
    });

    afterEach(() => {
      Date = RealDate;
      replaceState.mockReset();
      scheduleActions.mockReset();
      getState.mockReset();
    });

    it('should fire actions', async () => {
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 1;
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid, clusterName },
            cpuUsage,
            nodeId,
            nodeName,
            ui: {
              isFiring: true,
              message: {
                text:
                  'Node #start_linkmyNodeName#end_link is reporting cpu usage of 91.00% at #absolute',
                nextSteps: [
                  {
                    text: '#start_linkCheck hot threads#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'docLink',
                        partialUrl:
                          '{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/cluster-nodes-hot-threads.html',
                      },
                    ],
                  },
                  {
                    text: '#start_linkCheck long running tasks#end_link',
                    tokens: [
                      {
                        startToken: '#start_link',
                        endToken: '#end_link',
                        type: 'docLink',
                        partialUrl:
                          '{elasticWebsiteUrl}/guide/en/elasticsearch/reference/{docLinkVersion}/tasks.html',
                      },
                    ],
                  },
                ],
                tokens: [
                  {
                    startToken: '#absolute',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                  {
                    startToken: '#start_link',
                    endToken: '#end_link',
                    type: 'link',
                    url: 'elasticsearch/nodes/myNodeId',
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 0,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `CPU usage alert is firing for ${count} node(s) in cluster: ${clusterName}. [View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:${clusterUuid}))`,
        internalShortMessage: `CPU usage alert is firing for ${count} node(s) in cluster: ${clusterName}. Verify CPU levels across affected nodes.`,
        action: `[View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:${clusterUuid}))`,
        actionPlain: 'Verify CPU levels across affected nodes.',
        clusterName,
        count,
        nodes: `${nodeName}:${cpuUsage.toFixed(2)}`,
        state: 'firing',
      });
    });

    it('should not fire actions if under threshold', async () => {
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [
          {
            ...stat,
            cpuUsage: 1,
          },
        ];
      });
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            ccs: undefined,
            cluster: {
              clusterUuid,
              clusterName,
            },
            cpuUsage: 1,
            nodeId,
            nodeName,
            ui: {
              isFiring: false,
              lastCheckedMS: 0,
              message: null,
              resolvedMS: 0,
              severity: 'danger',
              triggeredMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).not.toHaveBeenCalled();
    });

    it('should resolve with a resolved message', async () => {
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [
          {
            ...stat,
            cpuUsage: 1,
          },
        ];
      });
      (getState as jest.Mock).mockImplementation(() => {
        return {
          alertStates: [
            {
              cluster: {
                clusterUuid,
                clusterName,
              },
              ccs: null,
              cpuUsage: 91,
              nodeId,
              nodeName,
              ui: {
                isFiring: true,
                message: null,
                severity: 'danger',
                resolvedMS: 0,
                triggeredMS: 1,
                lastCheckedMS: 0,
              },
            },
          ],
        };
      });
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 1;
      expect(replaceState).toHaveBeenCalledWith({
        alertStates: [
          {
            cluster: { clusterUuid, clusterName },
            ccs: null,
            cpuUsage: 1,
            nodeId,
            nodeName,
            ui: {
              isFiring: false,
              message: {
                text:
                  'The cpu usage on node myNodeName is now under the threshold, currently reporting at 1.00% as of #resolved',
                tokens: [
                  {
                    startToken: '#resolved',
                    type: 'time',
                    isAbsolute: true,
                    isRelative: false,
                    timestamp: 1,
                  },
                ],
              },
              severity: 'danger',
              resolvedMS: 1,
              triggeredMS: 1,
              lastCheckedMS: 0,
            },
          },
        ],
      });
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `CPU usage alert is resolved for ${count} node(s) in cluster: ${clusterName}.`,
        internalShortMessage: `CPU usage alert is resolved for ${count} node(s) in cluster: ${clusterName}.`,
        clusterName,
        count,
        nodes: `${nodeName}:1.00`,
        state: 'resolved',
      });
    });

    it('should handle ccs', async () => {
      const ccs = 'testCluster';
      (fetchCpuUsageNodeStats as jest.Mock).mockImplementation(() => {
        return [
          {
            ...stat,
            ccs,
          },
        ];
      });
      const alert = new CpuUsageAlert();
      alert.initializeAlertType(
        getUiSettingsService as any,
        monitoringCluster as any,
        getLogger as any,
        config as any,
        kibanaUrl
      );
      const type = alert.getAlertType();
      await type.executor({
        ...executorOptions,
        // @ts-ignore
        params: alert.defaultParams,
      } as any);
      const count = 1;
      expect(scheduleActions).toHaveBeenCalledWith('default', {
        internalFullMessage: `CPU usage alert is firing for ${count} node(s) in cluster: ${clusterName}. [View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:${clusterUuid},ccs:${ccs}))`,
        internalShortMessage: `CPU usage alert is firing for ${count} node(s) in cluster: ${clusterName}. Verify CPU levels across affected nodes.`,
        action: `[View nodes](http://localhost:5601/app/monitoring#elasticsearch/nodes?_g=(cluster_uuid:${clusterUuid},ccs:${ccs}))`,
        actionPlain: 'Verify CPU levels across affected nodes.',
        clusterName,
        count,
        nodes: `${nodeName}:${cpuUsage.toFixed(2)}`,
        state: 'firing',
      });
    });
  });
});
