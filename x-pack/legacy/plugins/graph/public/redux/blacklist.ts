/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';
import { reducerWithInitialState } from 'typescript-fsa-reducers/dist';
import { WorkspaceNode } from '../types';

const actionCreator = actionCreatorFactory('x-pack/graph/blacklist');

export const removeBlacklistEntry = actionCreator<WorkspaceNode>('REMOVE_ENTRY');
export const removeAllBlacklistEntries = actionCreator<void>('REMOVE_ALL_ENTRIES');

const initialBlacklist: WorkspaceNode[] = [];

export const blacklistReducer = reducerWithInitialState(initialBlacklist)
  .case(removeBlacklistEntry, (list, node) => list.filter(currentNode => currentNode !== node))
  .case(removeAllBlacklistEntries, () => [])
  .build();
