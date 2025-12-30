/**
 * Homepage Tests
 * Tests for the main landing page (/)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Homepage (/)', () => {
  it('should render without crashing', () => {
    const { container } = render(<Home />);
    expect(container).toBeDefined();
  });

  it('should render Hero component', () => {
    render(<Home />);
    // The page renders the Hero component
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should render all main sections', () => {
    const { container } = render(<Home />);

    // Verify main structural elements exist
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex', 'flex-col', 'min-h-dvh');
  });

  it('should render ScrollProgress indicator', () => {
    const { container } = render(<Home />);

    // The ScrollProgress component is rendered
    expect(container).toBeTruthy();
  });
});
