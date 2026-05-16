/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Query } from '@elastic/eui';

/**
 * Test utility to replicate the easter egg detection logic from StreamsTreeTable
 */
function shouldShowElkEasterEgg(searchQuery?: Query): boolean {
  const queryText = searchQuery?.text?.trim().toLowerCase() ?? '';
  return queryText === 'where is elky';
}

/**
 * Simple test component that renders the banner based on easter egg logic
 */
function ElkEasterEggBanner({ searchQuery }: { searchQuery?: Query }) {
  const showElkEasterEgg = shouldShowElkEasterEgg(searchQuery);

  if (!showElkEasterEgg) {
    return null;
  }

  return (
    <div data-test-subj="elkEasterEggBanner" role="alert">
      <p>
        Elky is here!{' '}
        <span role="img" aria-label="elk">
          🦌🦌🦌
        </span>
      </p>
      <p>
        You found the elk!{' '}
        <span role="img" aria-label="elk">
          🦌
        </span>{' '}
        Elky and their elk friends are always watching over your streams.
      </p>
    </div>
  );
}

describe('StreamsTreeTable - Elk Easter Egg', () => {
  const renderBanner = (searchQuery?: Query) => {
    return render(
      <I18nProvider>
        <ElkEasterEggBanner searchQuery={searchQuery} />
      </I18nProvider>
    );
  };

  describe('shouldShowElkEasterEgg logic', () => {
    it('should return true when search query is "where is elky" (exact match, lowercase)', () => {
      const query: Query = { text: 'where is elky' } as Query;
      expect(shouldShowElkEasterEgg(query)).toBe(true);
    });

    it('should return true for case-insensitive matches', () => {
      expect(shouldShowElkEasterEgg({ text: 'WHERE IS ELKY' } as Query)).toBe(true);
      expect(shouldShowElkEasterEgg({ text: 'Where Is Elky' } as Query)).toBe(true);
      expect(shouldShowElkEasterEgg({ text: 'WhErE iS eLkY' } as Query)).toBe(true);
    });

    it('should return true when query has surrounding whitespace', () => {
      expect(shouldShowElkEasterEgg({ text: '  where is elky' } as Query)).toBe(true);
      expect(shouldShowElkEasterEgg({ text: 'where is elky  ' } as Query)).toBe(true);
      expect(shouldShowElkEasterEgg({ text: '  where is elky  ' } as Query)).toBe(true);
      expect(shouldShowElkEasterEgg({ text: '\twhere is elky\n' } as Query)).toBe(true);
    });

    it('should return false for similar but incorrect queries', () => {
      expect(shouldShowElkEasterEgg({ text: 'where is' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'where is elk' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'where is elky here' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'is elky where' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'elky' } as Query)).toBe(false);
    });

    it('should return false for normal search queries', () => {
      expect(shouldShowElkEasterEgg({ text: 'normal search' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'logs' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: 'stream name' } as Query)).toBe(false);
    });

    it('should return false when searchQuery is undefined', () => {
      expect(shouldShowElkEasterEgg(undefined)).toBe(false);
    });

    it('should return false when searchQuery.text is undefined', () => {
      expect(shouldShowElkEasterEgg({} as Query)).toBe(false);
    });

    it('should return false when searchQuery.text is empty string', () => {
      expect(shouldShowElkEasterEgg({ text: '' } as Query)).toBe(false);
      expect(shouldShowElkEasterEgg({ text: '   ' } as Query)).toBe(false);
    });
  });

  describe('ElkEasterEggBanner rendering', () => {
    it('should render banner when query matches "where is elky"', () => {
      const query: Query = { text: 'where is elky' } as Query;
      renderBanner(query);

      const banner = screen.getByTestId('elkEasterEggBanner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/Elky is here!/);
      expect(banner).toHaveTextContent(/🦌/);
      expect(banner).toHaveTextContent(/You found the elk!/);
    });

    it('should not render banner for normal queries', () => {
      const query: Query = { text: 'normal search' } as Query;
      renderBanner(query);

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should not render banner when query is undefined', () => {
      renderBanner(undefined);

      expect(screen.queryByTestId('elkEasterEggBanner')).not.toBeInTheDocument();
    });

    it('should render banner with case-insensitive query', () => {
      const query: Query = { text: 'WHERE IS ELKY' } as Query;
      renderBanner(query);

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });

    it('should render banner when query has whitespace', () => {
      const query: Query = { text: '  where is elky  ' } as Query;
      renderBanner(query);

      expect(screen.getByTestId('elkEasterEggBanner')).toBeInTheDocument();
    });
  });
});
