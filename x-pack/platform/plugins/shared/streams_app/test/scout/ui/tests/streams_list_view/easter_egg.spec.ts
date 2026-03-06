/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/ui';
import { tags } from '@kbn/scout';
import { test } from '../../fixtures';

test.describe(
  'Stream list view - easter egg',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.streams.gotoStreamMainPage();
      // Wait for the streams table to load
      await pageObjects.streams.expectStreamsTableVisible();
    });

    test('should display elk emoji banner when searching "Where is Elky"', async ({ page }) => {
      // Get the search input by aria-label
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // Type the easter egg query
      await searchInput.fill('Where is Elky');

      // Wait a moment for the UI to update
      await page.waitForTimeout(500);

      // Verify the elk emoji banner is visible
      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).toBeVisible();

      // Verify the banner contains elk emojis
      await expect(elkBanner).toContainText('🦌');
    });

    test('should display elk emoji banner for case-insensitive query', async ({ page }) => {
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // Test with lowercase
      await searchInput.fill('where is elky');
      await page.waitForTimeout(500);

      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).toBeVisible();
    });

    test('should display elk emoji banner with extra whitespace', async ({ page }) => {
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // Test with leading/trailing whitespace
      await searchInput.fill('  where is elky  ');
      await page.waitForTimeout(500);

      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).toBeVisible();
    });

    test('should not display elk emoji banner for different query', async ({ page }) => {
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // Search for something else
      await searchInput.fill('logs');
      await page.waitForTimeout(500);

      // Verify the banner is not visible
      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).not.toBeVisible();
    });

    test('should hide elk emoji banner when query is changed', async ({ page }) => {
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // First show the easter egg
      await searchInput.fill('where is elky');
      await page.waitForTimeout(500);

      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).toBeVisible();

      // Now change the search to something else
      await searchInput.fill('logs');
      await page.waitForTimeout(500);

      // Verify the banner is now hidden
      await expect(elkBanner).not.toBeVisible();
    });

    test('should hide elk emoji banner when search is cleared', async ({ page }) => {
      const searchInput = page.getByRole('searchbox', { name: 'Search streams by name' });
      await expect(searchInput).toBeVisible();

      // First show the easter egg
      await searchInput.fill('where is elky');
      await page.waitForTimeout(500);

      const elkBanner = page.getByTestId('elkEasterEggBanner');
      await expect(elkBanner).toBeVisible();

      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Verify the banner is now hidden
      await expect(elkBanner).not.toBeVisible();
    });
  }
);
