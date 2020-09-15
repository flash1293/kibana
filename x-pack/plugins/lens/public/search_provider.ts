/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import levenshtein from 'js-levenshtein';
import { from, EMPTY } from 'rxjs';
import { GlobalSearchResultProvider } from '../../global_search/public';
import { getFullPath, NOT_INTERNATIONALIZED_PRODUCT_NAME } from '../common';

/**
 * Global search provider adding a Lens entry.
 * This is necessary because Lens does not show up in the nav bar and is filtered out by the
 * default app provider.
 *
 * It is inlining the same search term matching logic as the application search provider.
 *
 * TODO: This is a workaround and can be removed once there is a generic way to register sub features
 * of apps. In this case, Lens should be considered a feature of Visualize.
 */
export const searchProvider: GlobalSearchResultProvider = {
  id: 'lens',
  find: (term) => {
    const title = NOT_INTERNATIONALIZED_PRODUCT_NAME;
    const searchableTitle = title.toLowerCase();

    term = term.toLowerCase();
    let score = 0;

    // shortcuts to avoid calculating the distance when there is an exact match somewhere.
    if (searchableTitle === term) {
      score = 100;
    } else if (searchableTitle.startsWith(term)) {
      score = 90;
    } else if (searchableTitle.includes(term)) {
      score = 75;
    } else {
      const length = Math.max(term.length, searchableTitle.length);
      const distance = levenshtein(term, searchableTitle);

      // maximum lev distance is length, we compute the match ratio (lower distance is better)
      const ratio = Math.floor((1 - distance / length) * 100);
      if (ratio >= 60) {
        score = ratio;
      }
    }
    if (score === 0) return EMPTY;
    return from([
      [
        {
          id: 'lens',
          title,
          type: 'application',
          icon: 'logoKibana',
          score,
          url: getFullPath(),
        },
      ],
    ]);
  },
};
