/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@elastic/eui';
import { isElkyQuery } from './elky_detection';

describe('isElkyQuery', () => {
  it('returns true for exact match "where is elky"', () => {
    const query = { text: 'where is elky' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns true for case-insensitive match "WHERE IS ELKY"', () => {
    const query = { text: 'WHERE IS ELKY' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns true for mixed case "WhErE iS eLkY"', () => {
    const query = { text: 'WhErE iS eLkY' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns true when query has leading whitespace', () => {
    const query = { text: '  where is elky' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns true when query has trailing whitespace', () => {
    const query = { text: 'where is elky  ' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns true when query has both leading and trailing whitespace', () => {
    const query = { text: '   where is elky   ' } as Query;
    expect(isElkyQuery(query)).toBe(true);
  });

  it('returns false for different query text', () => {
    const query = { text: 'some other search' } as Query;
    expect(isElkyQuery(query)).toBe(false);
  });

  it('returns false for empty string', () => {
    const query = { text: '' } as Query;
    expect(isElkyQuery(query)).toBe(false);
  });

  it('returns false for undefined query', () => {
    expect(isElkyQuery(undefined)).toBe(false);
  });

  it('returns false for query without text property', () => {
    const query = {} as Query;
    expect(isElkyQuery(query)).toBe(false);
  });

  it('returns false for partial match "where is elk"', () => {
    const query = { text: 'where is elk' } as Query;
    expect(isElkyQuery(query)).toBe(false);
  });

  it('returns false for query with extra words', () => {
    const query = { text: 'where is elky today' } as Query;
    expect(isElkyQuery(query)).toBe(false);
  });
});
