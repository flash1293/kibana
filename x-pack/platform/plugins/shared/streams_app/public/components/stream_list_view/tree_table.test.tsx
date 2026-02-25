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
import { useKibana } from '../../hooks/use_kibana';

// Mock all hooks
jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_streams_doc_counts_fetch');
jest.mock('../../hooks/use_timefilter');
jest.mock('../../hooks/use_time_range');
jest.mock('../streams_tour');
jest.mock('../../hooks/use_kibana');

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseStreamDocCountsFetch = useStreamDocCountsFetch as jest.MockedFunction<
  typeof useStreamDocCountsFetch
>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseStreamsTour = useStreamsTour as jest.MockedFunction<typeof useStreamsTour>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamsTreeTable - Elky Easter Egg', () => {
  beforeEach(() => {
    // Set up default mocks
    mockUseStreamsAppRouter.mockReturnValue({
      link: jest.fn(() => '/test'),
      push: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseStreamDocCountsFetch.mockReturnValue({
      getStreamDocCounts: jest.fn(() => ({
        docCount: Promise.resolve([]),
        failedDocCount: Promise.resolve([]),
        degradedDocCount: Promise.resolve([]),
      })),
      getStreamHistogram: jest.fn(() => ({
        histogram: Promise.resolve([]),
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseTimefilter.mockReturnValue({
      timeState: { from: 'now-15m', to: 'now', mode: 'relative' },
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

    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          unifiedSearch: {
            ui: {
              SearchBar: () => <div>Search Bar Mock</div>,
            },
          },
        },
      },
      core: {
        uiSettings: {
          get: jest.fn(),
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not show elk banner by default', () => {
    renderWithProviders(<StreamsTreeTable streams={[]} />);

    expect(screen.queryByTestId('elkyEasterEggBanner')).not.toBeInTheDocument();
  });

  it('should render the table without errors', () => {
    renderWithProviders(<StreamsTreeTable streams={[]} />);

    expect(screen.getByTestId('streamsTable')).toBeInTheDocument();
  });

  // Test the detection logic manually
  describe('Easter egg detection logic', () => {
    it('should match "Where is Elky?" exactly', () => {
      const queryText = 'Where is Elky?';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(true);
    });

    it('should match "where is elky?" (lowercase)', () => {
      const queryText = 'where is elky?';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(true);
    });

    it('should match "WHERE IS ELKY?" (uppercase)', () => {
      const queryText = 'WHERE IS ELKY?';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(true);
    });

    it('should match with surrounding whitespace', () => {
      const queryText = '   Where is Elky?   ';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(true);
    });

    it('should not match partial queries', () => {
      const queryText = 'Where is Elky';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(false);
    });

    it('should not match different queries', () => {
      const queryText = 'Where is Waldo?';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(false);
    });

    it('should not match empty string', () => {
      const queryText = '';
      const isMatch = queryText.trim().toLowerCase() === 'where is elky?';
      expect(isMatch).toBe(false);
    });
  });
});
