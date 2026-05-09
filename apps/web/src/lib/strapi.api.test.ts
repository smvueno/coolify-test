import { describe, it, expect } from 'vitest';

const STRAPI_URL = 'http://localhost:1337/api';

describe('Strapi API smoke tests', () => {
  it('returns site data from API', async () => {
    const res = await fetch(`${STRAPI_URL}/site`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.siteName).toBe('Haru Digi Demo');
  });

  it('returns blog posts from API', async () => {
    const res = await fetch(`${STRAPI_URL}/blog-posts?populate=%2A&sort[0]=publishedAt:desc`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns categories from API', async () => {
    const res = await fetch(`${STRAPI_URL}/categories`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns tags from API', async () => {
    const res = await fetch(`${STRAPI_URL}/tags`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('returns authors from API', async () => {
    const res = await fetch(`${STRAPI_URL}/authors`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters blog posts by category slug', async () => {
    const res = await fetch(`${STRAPI_URL}/blog-posts?populate=%2A&filters[category][slug][$eq]=technology`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length > 0) {
      expect(json.data[0].category.slug).toBe('technology');
    }
  });

  it('filters blog posts by tag slug', async () => {
    const res = await fetch(`${STRAPI_URL}/blog-posts?populate=%2A&filters[tags][slug][$eq]=astro`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    if (json.data.length > 0) {
      const hasAstroTag = json.data[0].tags?.some((t: any) => t.slug === 'astro');
      expect(hasAstroTag).toBe(true);
    }
  });

  it('returns pages with blocks', async () => {
    const res = await fetch(`${STRAPI_URL}/pages?populate=blocks.*`);
    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
  });
});
