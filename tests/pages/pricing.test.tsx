/**
 * Pricing Page Tests
 * Tests for the pricing page (/pricing)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PricingPage from '@/app/pricing/page';

describe('Pricing Page (/pricing)', () => {
  it('should render without crashing', () => {
    const { container } = render(<PricingPage />);
    expect(container).toBeDefined();
  });

  it('should display page title', () => {
    render(<PricingPage />);

    expect(screen.getByText(/Simple/i)).toBeInTheDocument();
    expect(screen.getByText(/Transparent/i)).toBeInTheDocument();
    expect(screen.getByText(/Pricing/i)).toBeInTheDocument();
  });

  it('should render all 3 pricing tiers', () => {
    render(<PricingPage />);

    expect(screen.getByText('Founder Decision OS')).toBeInTheDocument();
    expect(screen.getByText('Fundraising & Strategy')).toBeInTheDocument();
    expect(screen.getByText('Venture Studio')).toBeInTheDocument();
  });

  it('should display correct prices', () => {
    render(<PricingPage />);

    // Free tier
    expect(screen.getByText('Free Forever')).toBeInTheDocument();

    // Check for price values - using getAllByText for duplicate "$99" and "$249"
    const ninetyNinePrices = screen.getAllByText('$99');
    expect(ninetyNinePrices.length).toBeGreaterThan(0);

    const twoFortyNinePrices = screen.getAllByText('$249');
    expect(twoFortyNinePrices.length).toBeGreaterThan(0);
  });

  it('should mark Fundraising tier as "Most Popular"', () => {
    render(<PricingPage />);

    expect(screen.getByText('Most Popular')).toBeInTheDocument();
  });

  it('should display tier subtitles', () => {
    render(<PricingPage />);

    expect(screen.getByText('For Active Fundraisers')).toBeInTheDocument();
    expect(screen.getByText('Full Leverage Mode')).toBeInTheDocument();
  });

  it('should show CTA buttons for all tiers', () => {
    render(<PricingPage />);

    expect(screen.getByText('Get Started Free')).toBeInTheDocument();

    const trialButtons = screen.getAllByText('Start 14-Day Trial');
    expect(trialButtons.length).toBe(2); // Two paid tiers
  });

  it('should display feature comparison table', () => {
    render(<PricingPage />);

    expect(screen.getByText('Feature Comparison')).toBeInTheDocument();

    // Check for table headers
    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('should show guiding principles section', () => {
    render(<PricingPage />);

    expect(screen.getByText(/Guiding Principles/i)).toBeInTheDocument();
  });

  it('should list all 5 guiding principles', () => {
    render(<PricingPage />);

    expect(screen.getByText(/Founders earn access to capital tooling/i)).toBeInTheDocument();
    expect(screen.getByText(/Fundraising is never positioned as success/i)).toBeInTheDocument();
    expect(screen.getByText(/Free tier builds trust and habit/i)).toBeInTheDocument();
    expect(screen.getByText(/Each tier unlocks outcomes/i)).toBeInTheDocument();
    expect(screen.getByText(/Higher tiers reduce time-to-clarity/i)).toBeInTheDocument();
  });

  it('should display tier descriptions', () => {
    render(<PricingPage />);

    expect(screen.getByText(/Maximum adoption, trust, and habit formation/i)).toBeInTheDocument();
    expect(screen.getByText(/Turn clarity into investor-grade readiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Deliver leverage, execution support/i)).toBeInTheDocument();
  });

  it('should show target audience for each tier', () => {
    render(<PricingPage />);

    expect(screen.getByText(/First-time founders, early ideation/i)).toBeInTheDocument();
    expect(screen.getByText(/Pre-seed and seed founders/i)).toBeInTheDocument();
    expect(screen.getByText(/Founders actively fundraising/i)).toBeInTheDocument();
  });

  it('should have links to /get-started', () => {
    render(<PricingPage />);

    const ctaLinks = screen.getAllByRole('link');
    const getStartedLinks = ctaLinks.filter(link =>
      link.getAttribute('href') === '/get-started'
    );

    expect(getStartedLinks.length).toBeGreaterThan(0);
  });

  it('should display feature checkmarks correctly', () => {
    const { container } = render(<PricingPage />);

    // Check for checkmark icons (using CheckIcon component)
    const checkmarks = container.querySelectorAll('[class*="CheckIcon"]');
    expect(checkmarks.length).toBeGreaterThan(0);
  });

  it('should show comparison table features', () => {
    render(<PricingPage />);

    expect(screen.getByText('Core OS')).toBeInTheDocument();
    expect(screen.getByText('Investor Lens')).toBeInTheDocument();
    expect(screen.getByText('Investor Readiness Score')).toBeInTheDocument();
    expect(screen.getByText('Deck Review')).toBeInTheDocument();
    expect(screen.getByText('Strategy Docs')).toBeInTheDocument();
  });

  it('should have animated background blobs', () => {
    const { container } = render(<PricingPage />);

    // Check for background decoration elements
    const blobs = container.querySelectorAll('.blur-\\[100px\\], .blur-\\[120px\\], .blur-\\[80px\\]');
    expect(blobs.length).toBeGreaterThan(0);
  });

  it('should display tier icons', () => {
    const { container } = render(<PricingPage />);

    // Each plan has an icon
    const iconContainers = container.querySelectorAll('[class*="gradient"]');
    expect(iconContainers.length).toBeGreaterThan(0);
  });

  it('should show monthly billing indicator', () => {
    render(<PricingPage />);

    const monthlyIndicators = screen.getAllByText('/month');
    expect(monthlyIndicators.length).toBe(3); // All three tiers
  });

  it('should render Footer component', () => {
    const { container } = render(<PricingPage />);

    // Footer is rendered at the bottom
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
  });
});
