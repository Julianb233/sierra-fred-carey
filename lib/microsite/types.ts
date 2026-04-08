/**
 * Phase 165: Microsite Generation — Types & Constants
 */

// ============================================================================
// Branding
// ============================================================================

export interface MicrositeBranding {
  logo_url?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  font_heading: string
  font_body: string
  favicon_url?: string
}

export const DEFAULT_BRANDING: MicrositeBranding = {
  primary_color: "#ff6a1a",
  secondary_color: "#1a1a2e",
  accent_color: "#f59e0b",
  font_heading: "Inter",
  font_body: "Inter",
}

// ============================================================================
// Content Sections
// ============================================================================

export interface HeroSection {
  headline: string
  subheadline: string
  cta_text: string
  cta_url: string
  background_image_url?: string
}

export interface AboutSection {
  text: string
  image_url?: string
}

export interface Service {
  title: string
  description: string
  icon?: string
}

export interface Testimonial {
  quote: string
  author: string
  role?: string
  avatar_url?: string
}

export interface ContactSection {
  email?: string
  phone?: string
  address?: string
  form_enabled: boolean
}

export interface MicrositeContent {
  hero: HeroSection
  about: AboutSection
  services: Service[]
  testimonials: Testimonial[]
  contact: ContactSection
}

export const DEFAULT_CONTENT: MicrositeContent = {
  hero: {
    headline: "Welcome to Our Business",
    subheadline: "We help you achieve your goals with innovative solutions.",
    cta_text: "Get Started",
    cta_url: "#contact",
  },
  about: {
    text: "We are a passionate team dedicated to delivering exceptional results for our clients.",
  },
  services: [
    { title: "Consulting", description: "Expert guidance for your business strategy." },
    { title: "Development", description: "Custom solutions built for your needs." },
    { title: "Support", description: "Ongoing support to keep you on track." },
  ],
  testimonials: [],
  contact: {
    form_enabled: true,
  },
}

// ============================================================================
// Version History
// ============================================================================

export interface VersionEntry {
  version: number
  content: MicrositeContent
  branding: MicrositeBranding
  updated_at: string
}

// ============================================================================
// Microsite Record
// ============================================================================

export type MicrositeStatus = "draft" | "published" | "archived"

export interface Microsite {
  id: string
  user_id: string
  title: string
  slug: string
  template: string
  status: MicrositeStatus
  branding: MicrositeBranding
  content: MicrositeContent
  custom_domain?: string
  seo_title?: string
  seo_description?: string
  version: number
  version_history: VersionEntry[]
  published_at?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// Templates
// ============================================================================

export interface MicrositeTemplate {
  id: string
  name: string
  description: string
  thumbnail: string
  defaultBranding: Partial<MicrositeBranding>
}

export const TEMPLATES: MicrositeTemplate[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean, minimal design with bold typography and ample white space.",
    thumbnail: "/images/templates/modern.svg",
    defaultBranding: {
      primary_color: "#ff6a1a",
      secondary_color: "#1a1a2e",
      font_heading: "Inter",
      font_body: "Inter",
    },
  },
  {
    id: "professional",
    name: "Professional",
    description: "Corporate-friendly layout with structured sections and subtle gradients.",
    thumbnail: "/images/templates/professional.svg",
    defaultBranding: {
      primary_color: "#2563eb",
      secondary_color: "#1e293b",
      font_heading: "Inter",
      font_body: "Inter",
    },
  },
  {
    id: "creative",
    name: "Creative",
    description: "Vibrant, expressive design with dynamic layouts and bold colors.",
    thumbnail: "/images/templates/creative.svg",
    defaultBranding: {
      primary_color: "#8b5cf6",
      secondary_color: "#0f172a",
      font_heading: "Inter",
      font_body: "Inter",
    },
  },
  {
    id: "startup",
    name: "Startup",
    description: "Tech-forward design optimized for SaaS and startup landing pages.",
    thumbnail: "/images/templates/startup.svg",
    defaultBranding: {
      primary_color: "#06b6d4",
      secondary_color: "#0c0a09",
      font_heading: "Inter",
      font_body: "Inter",
    },
  },
]

// ============================================================================
// Font Options
// ============================================================================

export const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Raleway",
] as const

// ============================================================================
// Wizard Steps
// ============================================================================

export const WIZARD_STEPS = [
  { id: "template", label: "Template", description: "Choose your starting point" },
  { id: "branding", label: "Branding", description: "Colors, fonts & logo" },
  { id: "content", label: "Content", description: "Your story & services" },
  { id: "review", label: "Review", description: "Preview & publish" },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"]
