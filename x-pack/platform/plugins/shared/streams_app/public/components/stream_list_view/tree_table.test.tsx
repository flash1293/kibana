/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { StreamsTreeTable } from './tree_table';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';
import { useTimefilter } from '../../hooks/use_timefilter';
import { useTimeRange } from '../../hooks/use_time_range';
import { useStreamsTour } from '../streams_tour';
import { useKibana } from '../../hooks/use_kibana';

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
  return render(
    <IntlProvider locale="en">
      <I18nProvider>{ui}</I18nProvider>
    </IntlProvider>
  );
};

describe('StreamsTreeTable', () => {
  const mockRouter = {
    link: jest.fn().mockReturnValue('/test-link'),
    push: jest.fn(),
  };

  const mockDocCountsFetch = {
    docCount: Promise.resolve([]),
    failedDocCount: Promise.resolve([]),
    degradedDocCount: Promise.resolve([]),
  };

  const mockGetStreamHistogram = jest.fn().mockReturnValue({
    histogram: Promise.resolve([]),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseStreamsAppRouter.mockReturnValue(mockRouter as any);
    mockUseStreamDocCountsFetch.mockReturnValue({
      getStreamDocCounts: jest.fn().mockReturnValue(mockDocCountsFetch),
      getStreamHistogram: mockGetStreamHistogram,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseTimefilter.mockReturnValue({
      timeState: { refreshInterval: { pause: true, value: 0 }, time: {} },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseTimeRange.mockReturnValue({
      rangeFrom: 'now-15m',
      rangeTo: 'now',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseStreamsTour.mockReturnValue({
      getStepPropsByStepId: jest.fn().mockReturnValue(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseKibana.mockReturnValue({
      dependencies: {
        start: {
          unifiedSearch: {
            ui: {
              SearchBar: jest.fn(() => null),
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  describe('Elk Easter Egg Banner', () => {
    it('should display elk emoji banner when search query is "Where is Elky" (exact case)', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'Where is Elky');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
      expect(screen.getByLabelText('Elk emoji banner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query is "where is elky" (lowercase)', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elky');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query is "WHERE IS ELKY" (uppercase)', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'WHERE IS ELKY');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query is "wHeRe Is ElKy" (mixed case)', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'wHeRe Is ElKy');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query has leading whitespace', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, '   where is elky');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query has trailing whitespace', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elky   ');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should display elk emoji banner when search query has both leading and trailing whitespace', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, '   where is elky   ');

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should NOT display elk emoji banner when search query is empty', () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should NOT display elk emoji banner for partial match "where is elk"', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elk');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should NOT display elk emoji banner for partial match "where is"', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should NOT display elk emoji banner for different query "elky is here"', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'elky is here');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should NOT display elk emoji banner for query with extra words "where is elky today"', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elky today');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should NOT display elk emoji banner for unrelated query', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'random stream name');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should display elk emoji banner above the streams table', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elky');

      const banner = screen.getByTestId('elkEasterEggBanner');
      const table = screen.getByTestId('streamsTable');

      // Verify both banner and table exist in the document
      expect(banner).toBeInTheDocument();
      expect(table).toBeInTheDocument();

      // Verify banner appears before table in the DOM by comparing their positions
      const allElements = document.body.querySelectorAll('*');
      const elementsArray = Array.from(allElements);
      const bannerPosition = elementsArray.indexOf(banner);
      const tablePosition = elementsArray.indexOf(table);

      expect(bannerPosition).toBeGreaterThan(-1);
      expect(tablePosition).toBeGreaterThan(-1);
      expect(bannerPosition).toBeLessThan(tablePosition);
    });

    it('should contain exactly 10 elk emojis in the banner', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');
      await userEvent.type(searchInput, 'where is elky');

      const banner = screen.getByLabelText('Elk emoji banner');
      const elkCount = (banner.textContent?.match(/🦌/g) || []).length;

      expect(elkCount).toBe(10);
    });

    it('should hide elk emoji banner when search query is changed to something else', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');

      // First type the easter egg query
      await userEvent.type(searchInput, 'where is elky');
      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();

      // Clear and type different query
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'other query');

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should hide elk emoji banner when search query is cleared', async () => {
      renderWithProviders(<StreamsTreeTable streams={[]} />);

      const searchInput = screen.getByLabelText('Search streams by name');

      // Type the easter egg query
      await userEvent.type(searchInput, 'where is elky');
      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();

      // Clear the search - userEvent.clear() doesn't always trigger onChange in the search bar
      // So we need to simulate the user clearing it by typing backspace or selecting all and deleting
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, ' '); // Type a space to trigger onChange
      await userEvent.clear(searchInput); // Clear again to get empty state

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });
  });
});
