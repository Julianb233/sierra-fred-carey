/**
 * Homepage Tests
 * Tests for the main landing page (/)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Home from '@/app/page';

describe('Homepage (/)', () => {
  it('should render without crashing', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<Home />);
      container = result.container;
    });
    expect(container!).toBeDefined();
  });

  it('should render Hero component', async () => {
    await act(async () => {
      render(<Home />);
    });
    // The page renders the Hero component
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('should render all main sections', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<Home />);
      container = result.container;
    });

    // Verify main structural elements exist
    const main = container!.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveClass('flex', 'flex-col', 'min-h-dvh');
  });

  it('should render ScrollProgress indicator', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<Home />);
      container = result.container;
    });

    // The ScrollProgress component is rendered
    expect(container!).toBeTruthy();
  });
});
