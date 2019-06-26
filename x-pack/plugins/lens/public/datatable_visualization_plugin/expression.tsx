/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/types';
import { KibanaDatatable } from '../types';

export interface MapToAdjacencyArgs {
  metricColumns: string[];
}

function getId(idParts: unknown[][]) {
  return idParts.slice(1).reverse().map(([key, val]) => `${val}`).join(' and ');
}

function nodeToFilterPairRows({
  idParts,
  metrics,
}: {
  idParts: unknown[][];
  metrics: unknown[][];
}) {
  const key = getId(idParts);
  const row: any = { filterPair: [key, key] };
  const uplinkRow: any = {
    filterPair: [key, getId(idParts.slice(0, idParts.length - 1))],
  };
  metrics.forEach(([_, v], index) => {
    row[`value${index}`] = v;
    uplinkRow[`value${index}`] = v;
  });

  if (idParts.length === 1) {
    return [row];
  } else {
    return [row, uplinkRow];
  }
}

export const mapAdjacencyMatrix: ExpressionFunction<
  'lens_map_adjacency_matrix',
  KibanaDatatable,
  MapToAdjacencyArgs,
  KibanaDatatable
> = {
  name: 'lens_map_adjacency_matrix',
  aliases: [],
  type: 'kibana_datatable',
  help: '',
  context: {
    types: ['kibana_datatable'],
  },
  args: {
    metricColumns: {
      types: ['string'],
      multi: true,
      help: '',
    },
  },
  fn: function fn(context: KibanaDatatable, { metricColumns }: MapToAdjacencyArgs) {
    const nodes = context.rows.map(row => {
      const buckets = Object.keys(row)
        .filter(key => !metricColumns.includes(key))
        .map(key => [context.columns.find(col => col.id === key)!.name, row[key]]);
      const metrics = Object.keys(row)
        .filter(key => metricColumns.includes(key))
        .map(key => [context.columns.find(col => col.id === key)!.name, row[key]]);
      return {
        idParts: [['root', ''], ...buckets],
        metrics,
      };
    });

    const higherLevelNodes: {
      idParts: unknown[][];
      metrics: unknown[][];
    }[] = [];

    nodes.forEach(node => {
      node.idParts.forEach((_, index) => {
        const higherLevelNodeIdParts = node.idParts.slice(0, node.idParts.length - index);
        const higherLevelNode = higherLevelNodes.find(n => {
          return n.idParts.length === higherLevelNodeIdParts.length && n.idParts.every(([nk, nv], index) => {
            return (
              nk === higherLevelNodeIdParts[index][0] && nv === higherLevelNodeIdParts[index][1]
            );
          });
        });
        if (higherLevelNode) {
          higherLevelNode.metrics = higherLevelNode.metrics.map(([metricK, metricV], index) => [
            metricK,
            Number(metricV) + Number(node.metrics[index][1]),
          ]);
        } else {
          higherLevelNodes.push({
            idParts: higherLevelNodeIdParts,
            metrics: [...node.metrics],
          });
        }
      });
    });

    const table = {
      type: 'kibana_datatable',
      ...context,
      columns: [
        { id: 'filterPair', name: 'filterPair' },
        ...nodes[0].metrics.map((_, index) => ({ id: `value${index}`, name: context.columns.find(col => col.id === metricColumns[index])!.name })),
      ],
      rows: _.flatten(higherLevelNodes.map(node => nodeToFilterPairRows(node))),
    };

    return table;
  },
};
