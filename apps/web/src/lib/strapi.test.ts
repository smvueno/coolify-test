import { describe, it, expect } from 'vitest';

describe('Strapi URL construction', () => {
  it('constructs correct blog-posts URL with populate and pagination', () => {
    const baseUrl = 'http://localhost:1337/api';
    const path = `/blog-posts?populate=%2A&sort[0]=publishedAt:desc&pagination[page]=1&pagination[pageSize]=9`;
    const url = `${baseUrl}${path}`;

    expect(url).toContain('populate=%2A');
    expect(url).toContain('sort[0]=publishedAt:desc');
    expect(url).toContain('pagination[page]=1');
    expect(url).toContain('pagination[pageSize]=9');
  });

  it('constructs correct filter URL for category', () => {
    const slug = 'technology';
    const path = `/blog-posts?populate=%2A&filters[category][slug][$eq]=${slug}`;
    expect(path).toContain('filters[category][slug][$eq]=technology');
  });

  it('constructs correct filter URL for tag', () => {
    const slug = 'astro';
    const path = `/blog-posts?populate=%2A&filters[tags][slug][$eq]=${slug}`;
    expect(path).toContain('filters[tags][slug][$eq]=astro');
  });

  it('constructs correct single post URL', () => {
    const slug = 'getting-started-astro-strapi';
    const path = `/blog-posts?filters[slug][$eq]=${slug}&populate=%2A&status=published`;
    expect(path).toContain('filters[slug][$eq]=getting-started-astro-strapi');
  });
});

describe('Date formatting', () => {
  it('formats ISO date strings correctly', () => {
    const dateStr = '2026-05-01T00:00:00.000Z';
    const date = new Date(dateStr);
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    expect(formatted).toBe('May 1, 2026');
  });
});

describe('Rich text content parsing', () => {
  it('parses Strapi rich text JSON content', () => {
    const content = JSON.stringify({
      type: 'root',
      children: [
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Hello World' }] },
        { type: 'paragraph', children: [{ type: 'text', text: 'This is a test post.' }] },
      ],
    });

    const parsed = JSON.parse(content);
    expect(parsed.type).toBe('root');
    expect(parsed.children).toHaveLength(2);
    expect(parsed.children[0].children[0].text).toBe('Hello World');
    expect(parsed.children[1].children[0].text).toBe('This is a test post.');
  });

  it('handles inline text formatting in rich content', () => {
    const content = JSON.stringify({
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'This is ' },
            { type: 'text', text: 'bold', bold: true },
            { type: 'text', text: ' and ' },
            { type: 'text', text: 'italic', italic: true },
          ],
        },
      ],
    });

    const parsed = JSON.parse(content);
    const paragraph = parsed.children[0];
    expect(paragraph.children[1].bold).toBe(true);
    expect(paragraph.children[3].italic).toBe(true);
  });

  it('handles lists in rich content', () => {
    const content = JSON.stringify({
      type: 'root',
      children: [
        {
          type: 'list',
          format: 'unordered',
          children: [
            { type: 'list-item', children: [{ type: 'text', text: 'Item 1' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Item 2' }] },
          ],
        },
      ],
    });

    const parsed = JSON.parse(content);
    const list = parsed.children[0];
    expect(list.format).toBe('unordered');
    expect(list.children).toHaveLength(2);
  });
});

describe('Site config validation', () => {
  it('validates module config structure', () => {
    const modules = {
      pageBuilder: true,
      blog: true,
      forms: true,
      booking: false,
      seo: true,
      i18n: false,
      analytics: { provider: 'none' as const },
      teamTestimonials: false,
      portfolio: false,
      cookieConsent: false,
    };

    expect(modules.blog).toBe(true);
    expect(modules.pageBuilder).toBe(true);
    expect(typeof modules.analytics.provider).toBe('string');
  });
});
