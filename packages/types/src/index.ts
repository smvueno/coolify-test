// Shared types for Haru Digi template

export interface SiteConfig {
  customer: { name: string; domain: string };
  theme: 'service-pro' | 'editorial' | 'smb-clean' | 'custom';
  locales: { available: string[]; default: string };
  modules: {
    pageBuilder: boolean;
    blog: boolean;
    forms: boolean;
    booking: boolean;
    seo: boolean;
    i18n: boolean;
    analytics: { provider: 'plausible' | 'umami' | 'ga4' | 'none' };
    teamTestimonials: boolean;
    portfolio: boolean;
    cookieConsent: boolean;
  };
  strapi: { url: string; publicToken: string };
  email: { provider: 'resend'; from: string };
  spam: { turnstile: { siteKey: string } };
}

export interface StrapiBlock {
  __component: string;
  id: number;
  [key: string]: any;
}

export interface StrapiPage {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  blocks: StrapiBlock[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface StrapiSite {
  siteName: string;
  tagline: string | null;
  logo: any | null;
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string | null;
  enabledModules: Record<string, boolean>;
  seoTitleTemplate: string;
  seoDescription: string | null;
  socialLinks: Record<string, string>;
}

// ── Blog types ────────────────────────────────────────────────────

export interface StrapiAuthor {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  bio: string | null;
  email: string | null;
  avatar: any | null;
}

export interface StrapiCategory {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface StrapiTag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
}

export interface StrapiBlogPost {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string; // JSON string from Strapi rich text
  coverImage: any | null;
  category: StrapiCategory | null;
  tags: StrapiTag[];
  author: StrapiAuthor | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Testimonial types ────────────────────────────────────────────

export interface StrapiTestimonial {
  id: number;
  documentId: string;
  name: string;
  role: string | null;
  company: string | null;
  avatar: any | null;
  content: string;
  rating: number | null;
  featured: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── FAQ types ────────────────────────────────────────────────────

export interface StrapiFAQ {
  id: number;
  documentId: string;
  question: string;
  answer: string;
  category: string | null;
  order: number | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Service types ─────────────────────────────────────────────────

export interface StrapiService {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  description: string;
  icon: string | null;
  features: string | null;
  price: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Case Study types ─────────────────────────────────────────────

export interface StrapiCaseStudy {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  client: string;
  industry: string | null;
  challenge: string | null;
  solution: string | null;
  results: string | null;
  coverImage: any | null;
  gallery: any[] | null;
  testimonial: any | null;
  services: any[] | null;
  website: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Gallery types ─────────────────────────────────────────────────

export interface StrapiGallery {
  id: number;
  documentId: string;
  title: string;
  description: string | null;
  images: any[];
  featured: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Form Submission types ─────────────────────────────────────────

export interface StrapiFormSubmission {
  id: number;
  documentId: string;
  formKey: string;
  name: string;
  email: string;
  message: string;
  phone: string | null;
  sourcePage: string | null;
  submittedAt: string;
}
