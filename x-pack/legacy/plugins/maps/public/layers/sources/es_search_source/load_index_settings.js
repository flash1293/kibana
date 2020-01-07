/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_MAX_RESULT_WINDOW,
  DEFAULT_MAX_INNER_RESULT_WINDOW,
  INDEX_SETTINGS_API_PATH,
} from '../../../../common/constants';
import { kfetch } from 'ui/kfetch';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

let toastDisplayed = false;
const indexSettings = new Map();

export async function loadIndexSettings(indexPatternTitle) {
  if (indexSettings.has(indexPatternTitle)) {
    return indexSettings.get(indexPatternTitle);
  }

  const fetchPromise = fetchIndexSettings(indexPatternTitle);
  indexSettings.set(indexPatternTitle, fetchPromise);
  return fetchPromise;
}

async function fetchIndexSettings(indexPatternTitle) {
  try {
    const indexSettings = await kfetch({
      pathname: `../${INDEX_SETTINGS_API_PATH}`,
      query: {
        indexPatternTitle,
      },
    });
    return indexSettings;
  } catch (err) {
    const warningMsg = i18n.translate('xpack.maps.indexSettings.fetchErrorMsg', {
      defaultMessage: `Unable to fetch index settings for index pattern '{indexPatternTitle}'.
      Ensure you have '{viewIndexMetaRole}' role.`,
      values: {
        indexPatternTitle,
        viewIndexMetaRole: 'view_index_metadata',
      },
    });
    if (!toastDisplayed) {
      // Only show toast for first failure to avoid flooding user with warnings
      toastDisplayed = true;
      toastNotifications.addWarning(warningMsg);
    }
    console.warn(warningMsg);
    return {
      maxResultWindow: DEFAULT_MAX_RESULT_WINDOW,
      maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
    };
  }
}
