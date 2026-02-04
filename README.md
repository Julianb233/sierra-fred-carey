# Sahara - AI-Powered Founder Operating System

**Transform your startup journey with AI-powered insights and tools built by someone who's been in the trenches.**

![Preview](/app/opengraph-image.png)

## About the Creator

**Fred Cary** brings unparalleled experience to Sahara:
- **10,000+ founders coached** through their startup journeys
- **$50M+ raised** across various ventures
- Deep expertise in startup strategy, fundraising, and founder psychology

Sahara isn't just another SaaS tool - it's the distillation of decades of real-world founder experience into an AI-powered operating system.

---

## Table of Contents

- [About the Creator](#about-the-creator)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Pages & Routes](#pages--routes)
- [Getting Started](#getting-started)
- [Branding](#branding)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Startup Reality Lens
Get an unfiltered, honest assessment of your startup's current state. No sugar-coating - just the insights you need to make real progress.

### Investor Readiness Score
Understand exactly where you stand with potential investors. Receive actionable feedback to improve your fundability score before you start pitching.

### Pitch Deck Review
AI-powered analysis of your pitch deck with feedback based on what actually works with investors. Built from experience reviewing thousands of decks.

### Virtual Team Agents
Access AI-powered specialists who can help with specific aspects of your startup - from marketing strategy to financial modeling.

### Boardy Integration
Seamlessly connect with Boardy for enhanced networking and advisor matching capabilities.

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14 | React framework with App Router |
| **React** | 18+ | UI component library |
| **TailwindCSS** | 3.x | Utility-first CSS framework |
| **Framer Motion** | Latest | Smooth animations and transitions |
| **Shadcn/UI** | Latest | Beautiful, accessible UI components |

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage - Main landing page showcasing Sahara's value proposition |
| `/get-started` | Onboarding flow - Guided setup for new founders |
| `/waitlist` | Join waitlist - Early access signup |
| `/links` | Linktree-style page - Quick access to all important links |
| `/dashboard` | Main dashboard - Your founder command center |
| `/pricing` | Pricing plans - Subscription options and features |
| `/about` | About page - Learn more about Fred Cary and the Sahara mission |

---

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/sierra-fred-carey.git
   cd sierra-fred-carey
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your configuration.

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Branding

### Primary Color Palette

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Sahara Orange** | `#ff6a1a` | Primary brand color, CTAs, highlights |

### Usage in Tailwind

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        sahara: {
          primary: '#ff6a1a',
        },
      },
    },
  },
}
```

---

## Deployment

### Vercel (Recommended)

Sahara is optimized for deployment on [Vercel](https://vercel.com), the platform built by the creators of Next.js.

#### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/sierra-fred-carey)

#### Manual Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Production Deployment:**
   ```bash
   vercel --prod
   ```

#### Environment Variables

Configure the following in your Vercel project settings:
- Database connection strings
- API keys for integrations
- Authentication secrets

---

## Contributing

Contributions are welcome! If you have ideas, suggestions, or bug reports:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

---

<p align="center">
  <strong>Built with passion for founders, by a founder.</strong>
</p>
