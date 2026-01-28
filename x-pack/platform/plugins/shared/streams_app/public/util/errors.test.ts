/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedError } from './errors';

describe('getFormattedError', () => {
  it('extracts message from error.body.message', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = { message: 'Extracted body message' };

    const result = getFormattedError(originalError);

    expect(result.message).toBe('Extracted body message');
  });

  it('preserves the original stack trace when extracting body.message', () => {
    const originalError = new Error('Original message');
    const originalStack = originalError.stack;
    (originalError as any).body = { message: 'Extracted body message' };

    const result = getFormattedError(originalError);

    expect(result.stack).toBe(originalStack);
    expect(result.stack).toContain('errors.test.ts');
  });

  it('returns a new Error instance with extracted message but original stack', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = { message: 'Extracted body message' };

    const result = getFormattedError(originalError);

    // Should be a different Error instance
    expect(result).not.toBe(originalError);
    // But with the extracted message
    expect(result.message).toBe('Extracted body message');
    // And the original stack
    expect(result.stack).toBe(originalError.stack);
  });

  it('returns error unchanged when body is missing', () => {
    const originalError = new Error('Original message');

    const result = getFormattedError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe('Original message');
  });

  it('returns error unchanged when body.message is missing', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = { statusCode: 400 };

    const result = getFormattedError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe('Original message');
  });

  it('returns error unchanged when body.message is not a string', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = { message: 123 };

    const result = getFormattedError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe('Original message');
  });

  it('returns error unchanged when body is null', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = null;

    const result = getFormattedError(originalError);

    expect(result).toBe(originalError);
  });

  it('returns error unchanged when body is not an object', () => {
    const originalError = new Error('Original message');
    (originalError as any).body = 'string body';

    const result = getFormattedError(originalError);

    expect(result).toBe(originalError);
  });
});
