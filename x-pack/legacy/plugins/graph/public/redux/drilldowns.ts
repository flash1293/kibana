/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { UrlTemplate } from '../types';

const actionCreator = actionCreatorFactory('x-pack/graph/drilldowns');

export const addUrlTemplate = actionCreator<UrlTemplate>('ADD_URL_TEMPLATE');
export const removeUrlTemplate = actionCreator<{ index: number }>('REMOVE_URL_TEMPLATE');
export const updateUrlTemplate = actionCreator<{ index: number; template: UrlTemplate }>(
  'UPDATE_URL_TEMPLATE'
);

const initialDrilldowns: UrlTemplate[] = [];

export const drilldownReducer = reducerWithInitialState(initialDrilldowns)
  .case(addUrlTemplate, (list, newTemplate) => [...list, newTemplate])
  .case(removeUrlTemplate, (list, { index }) => {
    const newList = [...list];
    newList.splice(index, 1);
    return newList;
  })
  .case(updateUrlTemplate, (list, { index, template }) => {
    const newList = [...list];
    newList[index] = template;
    return newList;
  })
  .build();
