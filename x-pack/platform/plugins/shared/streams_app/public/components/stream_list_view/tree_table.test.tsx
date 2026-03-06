/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamsTreeTable } from './tree_table';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useStreamsTour } from '../streams_tour';

jest.mock('../../hooks/use_streams_app_router');
jest.mock('../../hooks/use_time_range');
jest.mock('../../hooks/use_timefilter');
jest.mock('../../hooks/use_streams_doc_counts_fetch');
jest.mock('../streams_tour');
jest.mock('../streams_app_search_bar', () => ({
  StreamsAppSearchBar: () => <div data-test-subj="mockSearchBar">Search Bar</div>,
}));

const mockUseStreamsAppRouter = useStreamsAppRouter as jest.MockedFunction<
  typeof useStreamsAppRouter
>;
const mockUseTimeRange = useTimeRange as jest.MockedFunction<typeof useTimeRange>;
const mockUseTimefilter = useTimefilter as jest.MockedFunction<typeof useTimefilter>;
const mockUseStreamDocCountsFetch = useStreamDocCountsFetch as jest.MockedFunction<
  typeof useStreamDocCountsFetch
>;
const mockUseStreamsTour = useStreamsTour as jest.MockedFunction<typeof useStreamsTour>;

// Helper to render with required providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('StreamsTreeTable', () => {
  const mockRouter = {
    link: jest.fn((path: string, params: unknown) => `/mock${path}`),
    push: jest.fn(),
  };

  const mockDocCountsFetch = {
    docCount: Promise.resolve([]),
    failedDocCount: Promise.resolve([]),
    degradedDocCount: Promise.resolve([]),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStreamsAppRouter.mockReturnValue(
      mockRouter as unknown as ReturnType<typeof useStreamsAppRouter>
    );
    mockUseTimeRange.mockReturnValue({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      setTimeRange: jest.fn(),
    } as unknown as ReturnType<typeof useTimeRange>);
    mockUseTimefilter.mockReturnValue({
      timeState: { from: 'now-15m', to: 'now' },
    } as unknown as ReturnType<typeof useTimefilter>);
    mockUseStreamDocCountsFetch.mockReturnValue({
      getStreamDocCounts: jest.fn().mockReturnValue(mockDocCountsFetch),
      getStreamHistogram: jest.fn().mockReturnValue({
        histogram: Promise.resolve([]),
      }),
    } as unknown as ReturnType<typeof useStreamDocCountsFetch>);
    mockUseStreamsTour.mockReturnValue({
      getStepPropsByStepId: jest.fn().mockReturnValue({}),
    } as unknown as ReturnType<typeof useStreamsTour>);
  });

  describe('Elky easter egg', () => {
    it('should display the easter egg banner when searching for "Where is Elky"', async () => {
      const { container } = renderWithProviders(<StreamsTreeTable streams={[]} />);

      // Get the search input
      const searchInput = container.querySelector('input[type="search"]');
      expect(searchInput).toBeInTheDocument();

      // Type the easter egg query
      await userEvent.type(searchInput!, 'Where is Elky');

      // Wait for the banner to appear
      await waitFor(() => {
        expect(screen.getByTestId('elkyEasterEggBanner')).toBeInTheDocument();
      });

      // Verify banner content
      expect(screen.getByText('🦌 Elky is here!')).toBeInTheDocument();
    });

    it('should display the easter egg banner with different casing variations', async () => {
      const variations = ['where is elky', 'WHERE IS ELKY', 'WhErE iS eLkY', 'where is Elky'];

      for (const query of variations) {
        const { container, unmount } = renderWithProviders(<StreamsTreeTable streams={[]} />);

        const searchInput = container.querySelector('input[type="search"]');
        await userEvent.type(searchInput!, query);

        await waitFor(() => {
          expect(screen.getByTestId('elkyEasterEggBanner')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should display the easter egg banner with surrounding whitespace', async () => {
      const variations = ['  Where is Elky  ', '\tWhere is Elky\t', ' Where is Elky'];

      for (const query of variations) {
        const { container, unmount } = renderWithProviders(<StreamsTreeTable streams={[]} />);

        const searchInput = container.querySelector('input[type="search"]');
        await userEvent.type(searchInput!, query);

        await waitFor(() => {
          expect(screen.getByTestId('elkyEasterEggBanner')).toBeInTheDocument();
        });

        unmount();
      }
    });

    it('should NOT display the easter egg banner for partial matches', async () => {
      const nonMatchingQueries = [
        'Where is',
        'is Elky',
        'Where is Elky the elk',
        'Tell me where is Elky',
      ];

      for (const query of nonMatchingQueries) {
        const { container, unmount } = renderWithProviders(<StreamsTreeTable streams={[]} />);

        const searchInput = container.querySelector('input[type="search"]');
        await userEvent.type(searchInput!, query);

        // Wait a bit to ensure no banner appears
        await waitFor(
          () => {
            expect(screen.queryByTestId('elkyEasterEggBanner')).not.toBeInTheDocument();
          },
          { timeout: 500 }
        );

        unmount();
      }
    });

    it('should NOT display the easter egg banner for empty search', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      // Wait to ensure no banner appears
      await waitFor(
        () => {
          expect(screen.queryByTestId('elkyEasterEggBanner')).not.toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should hide the easter egg banner when search query changes to non-matching text', async () => {
      const { container } = renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = container.querySelector('input[type="search"]');

      // First, show the easter egg
      await userEvent.type(searchInput!, 'Where is Elky');

      await waitFor(() => {
        expect(screen.getByTestId('elkyEasterEggBanner')).toBeInTheDocument();
      });

      // Clear and type different text
      await userEvent.clear(searchInput!);
      await userEvent.type(searchInput!, 'some other query');

      // Wait for the banner to disappear
      await waitFor(() => {
        expect(screen.queryByTestId('elkyEasterEggBanner')).not.toBeInTheDocument();
      });
    });

    it('should display the banner above the streams table', async () => {
      const { container } = renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = container.querySelector('input[type="search"]');
      await userEvent.type(searchInput!, 'Where is Elky');

      await waitFor(() => {
        expect(screen.getByTestId('elkyEasterEggBanner')).toBeInTheDocument();
      });

      const banner = screen.getByTestId('elkyEasterEggBanner');
      const table = screen.getByTestId('streamsTable');

      // Verify the banner appears before the table in the DOM by comparing positions
      expect(banner.compareDocumentPosition(table)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });
});
