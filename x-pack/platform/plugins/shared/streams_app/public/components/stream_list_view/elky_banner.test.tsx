/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ElkyBanner } from './elky_banner';

describe('ElkyBanner', () => {
  it('renders the banner when visible is true', () => {
    render(<ElkyBanner visible={true} />);
    const banner = screen.getByTestId('elkyBanner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent('🦌 🦌 🦌');
  });

  it('does not render the banner when visible is false', () => {
    render(<ElkyBanner visible={false} />);
    const banner = screen.queryByTestId('elkyBanner');
    expect(banner).not.toBeInTheDocument();
  });

  it('renders with correct styling and structure', () => {
    render(<ElkyBanner visible={true} />);
    const banner = screen.getByTestId('elkyBanner');
    expect(banner).toHaveClass('euiCallOut');
  });
});
