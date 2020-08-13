/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from 'src/plugins/data/public';
import { SavedObjectReference } from 'kibana/public';
import { Document } from './saved_object_store';
import { PersistableFilter } from '../../common';

export function getFilterableIndexPatternIds(doc: Document) {
  return new Array(doc.state.datasourceMetaData.numberFilterableIndexPatterns)
    .fill(undefined)
    .map((_, index) => {
      return doc.references.find(({ name }) => name === `filterable-index-pattern-${index}`)?.id;
    })
    .filter(Boolean) as string[];
}

export function filterableIndexPatternIdsToReferences(filterableIndexPatternIds: string[]) {
  return filterableIndexPatternIds.map((id, index) => {
    return { type: 'index-pattern', id, name: `filterable-index-pattern-${index}` };
  });
}

export function extractFilterReferences(
  filters: Filter[]
): { persistableFilters: PersistableFilter[]; references: SavedObjectReference[] } {
  const references: SavedObjectReference[] = [];
  const persistableFilters = filters.map((filterRow, i) => {
    if (!filterRow.meta || !filterRow.meta.index) {
      return filterRow;
    }
    const refName = `filter-index-pattern-${i}`;
    references.push({
      name: refName,
      type: 'index-pattern',
      id: filterRow.meta.index,
    });
    return {
      ...filterRow,
      meta: {
        ...filterRow.meta,
        indexRefName: refName,
        index: undefined,
      },
    };
  });

  return { persistableFilters, references };
}

export function injectFilterReferences(
  filters: PersistableFilter[],
  references: SavedObjectReference[]
) {
  return filters.map((filterRow) => {
    if (!filterRow.meta || !filterRow.meta.indexRefName) {
      return filterRow as Filter;
    }
    const { indexRefName, ...metaRest } = filterRow.meta;
    const reference = references.find((ref) => ref.name === indexRefName);
    if (!reference) {
      throw new Error(`Could not find reference for ${indexRefName}`);
    }
    return {
      ...filterRow,
      meta: metaRest,
    };
  });
}
