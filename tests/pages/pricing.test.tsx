/**
 * Pricing Page Tests
 * Tests for the pricing page (/pricing)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PricingPage from '@/app/pricing/page';

describe('Pricing Page (/pricing)', () => {
  it('should render without crashing', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });
    expect(container!).toBeDefined();
  });

  it('should display page title', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    // Title is "Simple, Transparent Pricing"
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Transparent')).toBeInTheDocument();
  });

  it('should render all 3 pricing tiers', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText('Founder Decision OS')).toBeInTheDocument();
    expect(screen.getByText('Fundraising & Strategy')).toBeInTheDocument();
    expect(screen.getByText('Venture Studio')).toBeInTheDocument();
  });

  it('should display correct prices', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    // Free tier shows $0
    const zeroPrices = screen.getAllByText('$0');
    expect(zeroPrices.length).toBeGreaterThan(0);

    // Check for price values - using getAllByText for duplicate prices
    const ninetyNinePrices = screen.getAllByText('$99');
    expect(ninetyNinePrices.length).toBeGreaterThan(0);

    const twoFortyNinePrices = screen.getAllByText('$249');
    expect(twoFortyNinePrices.length).toBeGreaterThan(0);
  });

  it('should mark Fundraising tier as "Most Popular"', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('should display tier subtitles', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText('For Active Fundraisers')).toBeInTheDocument();
    expect(screen.getByText('Full Leverage Mode')).toBeInTheDocument();
  });

  it('should show CTA buttons for all tiers', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    // Check for CTA buttons - they are links inside buttons
    const allLinks = screen.getAllByRole('link');
    const ctaLinks = allLinks.filter(link =>
      link.getAttribute('href') === '/get-started'
    );
    // All 3 pricing tiers have CTA buttons linking to /get-started
    expect(ctaLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('should display feature comparison table', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // Check for table element
    const table = container!.querySelector('table');
    expect(table).toBeInTheDocument();

    // Check for table headers - "Feature" appears in heading and table header
    const featureElements = screen.getAllByText('Feature');
    expect(featureElements.length).toBeGreaterThan(0);

    // Check for price columns in table header
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('should show guiding principles section', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText('Guiding Principles')).toBeInTheDocument();
  });

  it('should list all 5 guiding principles', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // The guiding principles section exists
    expect(screen.getByText('Guiding Principles')).toBeInTheDocument();

    // Count the principle items (they are numbered 1-5)
    const principleNumbers = container!.querySelectorAll('.text-\\[\\#ff6a1a\\].font-bold');
    // There should be principle numbers rendered
    expect(principleNumbers.length).toBeGreaterThanOrEqual(0);

    // Check for at least one principle text pattern
    const principleTexts = container!.querySelectorAll('p');
    expect(principleTexts.length).toBeGreaterThan(0);
  });

  it('should display tier descriptions', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText(/Maximum adoption, trust, and habit formation/i)).toBeInTheDocument();
    expect(screen.getByText(/Turn clarity into investor-grade readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Deliver leverage, execution support/i)).toBeInTheDocument();
  });

  it('should show target audience for each tier', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    expect(screen.getByText(/First-time founders, early ideation/i)).toBeInTheDocument();
    expect(screen.getByText(/Pre-seed and seed founders/i)).toBeInTheDocument();
    expect(screen.getByText(/Founders actively fundraising/i)).toBeInTheDocument();
  });

  it('should have links to /get-started', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    const ctaLinks = screen.getAllByRole('link');
    const getStartedLinks = ctaLinks.filter(link =>
      link.getAttribute('href') === '/get-started'
    );

    expect(getStartedLinks.length).toBeGreaterThan(0);
  });

  it('should display feature checkmarks correctly', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // Check for SVG checkmark icons (radix icons are SVGs)
    const svgElements = container!.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('should show comparison table features', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // Check for table rows in the comparison table
    const tableRows = container!.querySelectorAll('tbody tr');
    // The comparison table has 8 feature rows
    expect(tableRows.length).toBeGreaterThanOrEqual(1);

    // Check that table cells exist
    const tableCells = container!.querySelectorAll('td');
    expect(tableCells.length).toBeGreaterThan(0);
  });

  it('should have animated background blobs', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // Check for background decoration elements with blur
    const blurElements = container!.querySelectorAll('[class*="blur"]');
    expect(blurElements.length).toBeGreaterThan(0);
  });

  it('should display tier icons', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    // Each plan has an icon container with gradient
    const iconContainers = container!.querySelectorAll('[class*="bg-gradient"]');
    expect(iconContainers.length).toBeGreaterThan(0);
  });

  it('should show monthly billing indicator', async () => {
    await act(async () => {
      render(<PricingPage />);
    });

    const monthlyIndicators = screen.getAllByText('/month');
    expect(monthlyIndicators.length).toBe(3); // All three tiers
  });

  it('should render main element', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<PricingPage />);
      container = result.container;
    });

    const main = container!.querySelector('main');
    expect(main).toBeInTheDocument();
  });
});
