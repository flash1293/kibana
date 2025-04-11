/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MachineImplementationsFrom,
  assertEvent,
  fromObservable,
  enqueueActions,
  setup,
  assign,
  ActorRefFrom,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { DateRangeContext, DateRangeEvent, DateRangeInput } from './types';
import { useTimefilter } from '../../hooks/use_timefilter';

export type DateRangeActorRef = ActorRefFrom<typeof dateRangeMachine>;

export const dateRangeMachine = setup({
  types: {
    context: {} as DateRangeContext,
    events: {} as DateRangeEvent,
    input: {} as DateRangeInput,
  },
  actors: {
    subscribeTimeUpdates: getPlaceholderFor(createTimeUpdatesActor),
  },
  actions: {
    setTimeUpdates: () => {
      throw new Error('Not implemented');
    },
    storeTimeUpdates: () => {
      throw new Error('Not implemented');
    },
    notifyDateRangeUpdate: enqueueActions(({ enqueue, context }) => {
      if (context.parentRef) {
        enqueue.sendTo(context.parentRef, { type: 'dateRange.update' });
      }
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcwCUUDsYGJUNs8wA6AVwAciwBtABgF1FQqB7WASzS-Z1YgAHogBMANgCsZACwBmAOySANCACeiGQEYGZBQE5R+8QA4lAX3OraJAjdwwyAJzAAzF7AAWjFkhAduXn5BEQQAWjkZMn1jBn1FFXVEOX0FMjktcRkGcVFJSysQHHYIOEF7UkEAnj4BP1CtBVUNBFE5cTITSX15cQY5SS1JXPyCoA */
  id: 'dateRange',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    timeRange: {
      from: '',
      to: '',
    },
    absoluteTimeRange: {
      start: 0,
      end: 0,
    },
  }),
  entry: 'storeTimeUpdates',
  invoke: {
    id: 'dateRangeSubscriptionActor',
    src: 'subscribeTimeUpdates',
    onSnapshot: {
      actions: [{ type: 'storeTimeUpdates' }, { type: 'notifyDateRangeUpdate' }],
    },
  },
  on: {
    'dateRange.update': {
      actions: [{ type: 'setTimeUpdates' }],
    },
  },
});

export const createDateRangeMachineImplementations = ({
  timefilterHook,
}: {
  timefilterHook: ReturnType<typeof useTimefilter>;
}): MachineImplementationsFrom<typeof dateRangeMachine> => ({
  actors: {
    subscribeTimeUpdates: createTimeUpdatesActor({ timefilterHook }),
  },
  actions: {
    setTimeUpdates: ({ event }: { event: DateRangeEvent }) => {
      assertEvent(event, 'dateRange.update');
      timefilterHook.setTime(event.range);
    },
    storeTimeUpdates: assign(() => getTimeContextFromHook(timefilterHook)),
  },
});

function createTimeUpdatesActor({
  timefilterHook,
}: {
  timefilterHook: ReturnType<typeof useTimefilter>;
}) {
  return fromObservable(() => timefilterHook.timeState$);
}

function getTimeContextFromHook(timefilterHook: ReturnType<typeof useTimefilter>) {
  return {
    timeRange: timefilterHook.timeState.timeRange,
    absoluteTimeRange: {
      start: new Date(timefilterHook.timeState.asAbsoluteTimeRange.from).getTime(),
      end: new Date(timefilterHook.timeState.asAbsoluteTimeRange.to).getTime(),
    },
  };
}
