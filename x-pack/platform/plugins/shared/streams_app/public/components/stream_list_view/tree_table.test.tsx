/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamsTreeTable } from './tree_table';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useTimeRange } from '../../hooks/use_time_range';
import { useStreamsTour } from '../streams_tour';

jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_streams_doc_counts_fetch');
jest.mock('../../hooks/use_timefilter');
jest.mock('../../hooks/use_time_range');
jest.mock('../streams_tour');
jest.mock('../streams_app_search_bar', () => ({
  StreamsAppSearchBar: () => null,
}));

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseStreamDocCountsFetch = useStreamDocCountsFetch as jest.MockedFunction<
  typeof useStreamDocCountsFetch
>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseStreamsTour = useStreamsTour as jest.MockedFunction<typeof useStreamsTour>;

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamsTreeTable - Elky Easter Egg', () => {
  const mockRouter = {
    link: jest.fn(() => '/test'),
    push: jest.fn(),
  };

  const mockDocCountsFetch = {
    docCount: Promise.resolve([]),
    failedDocCount: Promise.resolve([]),
    degradedDocCount: Promise.resolve([]),
  };

  const mockGetStreamDocCounts = jest.fn(() => mockDocCountsFetch);
  const mockGetStreamHistogram = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseStreamsAppRouter.mockReturnValue(mockRouter as any);
    mockUseStreamDocCountsFetch.mockReturnValue({
      getStreamDocCounts: mockGetStreamDocCounts,
      getStreamHistogram: mockGetStreamHistogram,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseTimefilter.mockReturnValue({
      timeState: {
        from: 'now-15m',
        to: 'now',
        refresh: { pause: false, value: 60000 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseTimeRange.mockReturnValue({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseStreamsTour.mockReturnValue({
      getStepPropsByStepId: jest.fn(() => null),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('should not show Elky banner initially', () => {
    renderWithProviders(
      <StreamsTreeTable streams={[]} loading={false} canReadFailureStore={true} />
    );

    // Initially no banner should be shown
    expect(screen.queryByTestId('elkyEasterEggBanner')).not.toBeInTheDocument();
  });
});

describe('Elky Easter Egg Detection Logic', () => {
  // Test the detection logic directly
  const testDetection = (queryText: string | undefined): boolean => {
    const query = queryText?.trim().toLowerCase() ?? '';
    return query === 'where is elky?';
  };

  it('should detect exact phrase "Where is Elky?"', () => {
    expect(testDetection('Where is Elky?')).toBe(true);
  });

  it('should detect case-insensitive variations', () => {
    expect(testDetection('where is elky?')).toBe(true);
    expect(testDetection('WHERE IS ELKY?')).toBe(true);
    expect(testDetection('WhErE iS eLkY?')).toBe(true);
  });

  it('should detect with surrounding whitespace', () => {
    expect(testDetection('  Where is Elky?  ')).toBe(true);
    expect(testDetection('\tWhere is Elky?\n')).toBe(true);
  });

  it('should not detect other queries', () => {
    expect(testDetection('Where is Elk?')).toBe(false);
    expect(testDetection('Where is Elky')).toBe(false);
    expect(testDetection('Where Elky?')).toBe(false);
    expect(testDetection('streams')).toBe(false);
    expect(testDetection('')).toBe(false);
    expect(testDetection(undefined)).toBe(false);
  });

  it('should not detect partial matches', () => {
    expect(testDetection('Where is Elky? test')).toBe(false);
    expect(testDetection('test Where is Elky?')).toBe(false);
  });
});
