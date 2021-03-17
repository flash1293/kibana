/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { useStateToaster, errorToToaster } from '../../components/toasters';
import * as i18n from '../translations';
import { fetchActionTypes } from './api';
import { ActionTypeConnector } from './types';

export interface UseActionTypesResponse {
  loading: boolean;
  actionTypes: ActionTypeConnector[];
  refetchActionTypes: () => void;
}

export const useActionTypes = (): UseActionTypesResponse => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [actionTypes, setActionTypes] = useState<ActionTypeConnector[]>([]);
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());
  const queryFirstTime = useRef(true);

  const refetchActionTypes = useCallback(async () => {
    try {
      setLoading(true);
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      const res = await fetchActionTypes({ signal: abortCtrlRef.current.signal });

      if (!isCancelledRef.current) {
        setLoading(false);
        setActionTypes(res);
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        setLoading(false);
        setActionTypes([]);
        errorToToaster({
          title: i18n.ERROR_TITLE,
          error: error.body && error.body.message ? new Error(error.body.message) : error,
          dispatchToaster,
        });
      }
    }
  }, [dispatchToaster]);

  useEffect(() => {
    if (queryFirstTime.current) {
      refetchActionTypes();
      queryFirstTime.current = false;
    }

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
      queryFirstTime.current = true;
    };
  }, [refetchActionTypes]);

  return {
    loading,
    actionTypes,
    refetchActionTypes,
  };
};
