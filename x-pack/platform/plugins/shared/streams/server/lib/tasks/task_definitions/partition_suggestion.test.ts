/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getPartitionSuggestionTaskId,
  STREAMS_PARTITION_SUGGESTION_TASK_TYPE,
} from './partition_suggestion';

describe('partition_suggestion', () => {
  describe('STREAMS_PARTITION_SUGGESTION_TASK_TYPE', () => {
    it('has expected value', () => {
      expect(STREAMS_PARTITION_SUGGESTION_TASK_TYPE).toBe('streams_partition_suggestion');
    });
  });

  describe('getPartitionSuggestionTaskId', () => {
    it('generates task ID from stream name', () => {
      const taskId = getPartitionSuggestionTaskId('logs-test');
      expect(taskId).toBe('streams_partition_suggestion_logs-test');
    });

    it('handles stream names with dots', () => {
      const taskId = getPartitionSuggestionTaskId('logs.nginx.access');
      expect(taskId).toBe('streams_partition_suggestion_logs.nginx.access');
    });

    it('handles stream names with hyphens', () => {
      const taskId = getPartitionSuggestionTaskId('logs-generic-default');
      expect(taskId).toBe('streams_partition_suggestion_logs-generic-default');
    });

    it('creates unique IDs for different stream names', () => {
      const taskId1 = getPartitionSuggestionTaskId('stream-a');
      const taskId2 = getPartitionSuggestionTaskId('stream-b');
      expect(taskId1).not.toBe(taskId2);
    });

    it('creates same ID for same stream name', () => {
      const taskId1 = getPartitionSuggestionTaskId('my-stream');
      const taskId2 = getPartitionSuggestionTaskId('my-stream');
      expect(taskId1).toBe(taskId2);
    });
  });
});
