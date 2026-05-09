import type { SiteConfig } from '@harudigi/types';

const config: SiteConfig = {
  customer: { name: 'Haru Digi Demo', domain: 'harudigi.com' },
  theme: 'smb-clean',
  locales: { available: ['en'], default: 'en' },
  modules: {
    pageBuilder: true,
    blog: true,
    forms: true,
    booking: false,
    seo: true,
    i18n: false,
    analytics: { provider: 'none' },
    teamTestimonials: true,
    portfolio: false,
    cookieConsent: false,
  },
  strapi: {
    url: process.env.STRAPI_URL || 'http://localhost:1337',
    publicToken: process.env.STRAPI_API_TOKEN || '',
  },
  email: { provider: 'resend', from: 'noreply@harudigi.com' },
  spam: { turnstile: { siteKey: '' } },
};

export default config;
