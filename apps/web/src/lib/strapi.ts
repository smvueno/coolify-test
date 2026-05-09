import type { StrapiPage, StrapiSite, StrapiBlogPost, StrapiCategory, StrapiTag, StrapiTestimonial, StrapiFAQ, StrapiService, StrapiCaseStudy, StrapiGallery } from '@harudigi/types';
import siteConfig from '../../site.config';

const STRAPI_URL = siteConfig.strapi.url;
const STRAPI_TOKEN = siteConfig.strapi.publicToken;

interface StrapiResponse<T> {
  data: T | null;
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
}

async function fetchStrapi<T>(path: string): Promise<StrapiResponse<T>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (STRAPI_TOKEN) {
      headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
    }
    const res = await fetch(`${STRAPI_URL}/api${path}`, { headers });
    if (!res.ok) return { data: null };
    const json = await res.json();
    return json;
  } catch (e) {
    console.error(`Strapi fetch error (${path}):`, e);
    return { data: null };
  }
}

function extractData<T>(response: StrapiResponse<T>): T | null {
  return response.data || null;
}

// ── Site ──────────────────────────────────────────────────────────

export async function getSite(): Promise<StrapiSite | null> {
  const res = await fetchStrapi<StrapiSite>('/site');
  return extractData(res);
}

// ── Pages ─────────────────────────────────────────────────────────

export async function getPage(slug: string): Promise<StrapiPage | null> {
  const res = await fetchStrapi<StrapiPage[]>(
    `/pages?filters[slug][$eq]=${slug}&populate=blocks.primaryCta,blocks.secondaryCta,blocks.cta,blocks.features.features&status=published`
  );
  const pages = extractData(res);
  if (!pages || !Array.isArray(pages)) return null;
  return pages[0] || null;
}

export async function getAllPageSlugs(): Promise<string[]> {
  const res = await fetchStrapi<{ slug: string }[]>('/pages?fields[0]=slug&status=published');
  const pages = extractData(res);
  if (!pages || !Array.isArray(pages)) return [];
  return pages.map((p: any) => p.slug).filter(Boolean);
}

// ── Blog ──────────────────────────────────────────────────────────

export async function getBlogPosts(page: number = 1, pageSize: number = 10): Promise<{
  posts: StrapiBlogPost[];
  total: number;
  pageCount: number;
}> {
  const res = await fetchStrapi<StrapiBlogPost[]>(
    `/blog-posts?populate=%2A&sort[0]=publishedAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
  );
  const posts = extractData(res) || [];
  const pagination = res.meta?.pagination || { page: 1, pageSize, pageCount: 0, total: 0 };
  return { posts: Array.isArray(posts) ? posts : [], total: pagination.total, pageCount: pagination.pageCount };
}

export async function getBlogPost(slug: string): Promise<StrapiBlogPost | null> {
  const res = await fetchStrapi<StrapiBlogPost[]>(
    `/blog-posts?filters[slug][$eq]=${slug}&populate=%2A&status=published`
  );
  const posts = extractData(res);
  if (!posts || !Array.isArray(posts)) return null;
  return posts[0] || null;
}

export async function getAllBlogSlugs(): Promise<string[]> {
  const res = await fetchStrapi<{ slug: string }[]>('/blog-posts?fields[0]=slug&status=published');
  const posts = extractData(res);
  if (!posts || !Array.isArray(posts)) return [];
  return posts.map((p: any) => p.slug).filter(Boolean);
}

export async function getBlogPostsByCategory(slug: string, page: number = 1, pageSize: number = 10): Promise<{
  posts: StrapiBlogPost[];
  total: number;
  pageCount: number;
}> {
  const res = await fetchStrapi<StrapiBlogPost[]>(
    `/blog-posts?populate=%2A&sort[0]=publishedAt:desc&filters[category][slug][$eq]=${slug}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
  );
  const posts = extractData(res) || [];
  const pagination = res.meta?.pagination || { page: 1, pageSize, pageCount: 0, total: 0 };
  return { posts: Array.isArray(posts) ? posts : [], total: pagination.total, pageCount: pagination.pageCount };
}

export async function getBlogPostsByTag(slug: string, page: number = 1, pageSize: number = 10): Promise<{
  posts: StrapiBlogPost[];
  total: number;
  pageCount: number;
}> {
  const res = await fetchStrapi<StrapiBlogPost[]>(
    `/blog-posts?populate=%2A&sort[0]=publishedAt:desc&filters[tags][slug][$eq]=${slug}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`
  );
  const posts = extractData(res) || [];
  const pagination = res.meta?.pagination || { page: 1, pageSize, pageCount: 0, total: 0 };
  return { posts: Array.isArray(posts) ? posts : [], total: pagination.total, pageCount: pagination.pageCount };
}

export async function getCategories(): Promise<StrapiCategory[]> {
  const res = await fetchStrapi<StrapiCategory[]>('/categories');
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export async function getTags(): Promise<StrapiTag[]> {
  const res = await fetchStrapi<StrapiTag[]>('/tags');
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

// ── Testimonials ──────────────────────────────────────────────────

export async function getTestimonials(featured?: boolean): Promise<StrapiTestimonial[]> {
  const filter = featured ? '&filters[featured][$eq]=true' : '';
  const res = await fetchStrapi<StrapiTestimonial[]>(`/testimonials?populate=%2A${filter}`);
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

// ── FAQs ──────────────────────────────────────────────────────────

export async function getFaqs(): Promise<StrapiFAQ[]> {
  const res = await fetchStrapi<StrapiFAQ[]>('/faqs?sort[0]=order');
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export async function getFaqCategories(): Promise<string[]> {
  const faqs = await getFaqs();
  const cats = new Set(faqs.map(f => f.category).filter(Boolean));
  return Array.from(cats) as string[];
}

// ── Services ──────────────────────────────────────────────────────

export async function getServices(): Promise<StrapiService[]> {
  const res = await fetchStrapi<StrapiService[]>('/services?populate=%2A');
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export async function getService(slug: string): Promise<StrapiService | null> {
  const res = await fetchStrapi<StrapiService[]>(
    `/services?filters[slug][$eq]=${slug}&populate=%2A`
  );
  const services = extractData(res);
  if (!services || !Array.isArray(services)) return null;
  return services[0] || null;
}

export async function getAllServiceSlugs(): Promise<string[]> {
  const res = await fetchStrapi<{ slug: string }[]>('/services?fields[0]=slug');
  const services = extractData(res);
  if (!services || !Array.isArray(services)) return [];
  return services.map((s: any) => s.slug).filter(Boolean);
}

// ── Case Studies ─────────────────────────────────────────────────

export async function getCaseStudies(): Promise<StrapiCaseStudy[]> {
  const res = await fetchStrapi<StrapiCaseStudy[]>('/case-studies?populate=%2A&sort[0]=publishedAt:desc');
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

export async function getCaseStudy(slug: string): Promise<StrapiCaseStudy | null> {
  const res = await fetchStrapi<StrapiCaseStudy[]>(
    `/case-studies?filters[slug][$eq]=${slug}&populate=%2A`
  );
  const studies = extractData(res);
  if (!studies || !Array.isArray(studies)) return null;
  return studies[0] || null;
}

export async function getAllCaseStudySlugs(): Promise<string[]> {
  const res = await fetchStrapi<{ slug: string }[]>('/case-studies?fields[0]=slug');
  const studies = extractData(res);
  if (!studies || !Array.isArray(studies)) return [];
  return studies.map((s: any) => s.slug).filter(Boolean);
}

// ── Galleries ────────────────────────────────────────────────────

export async function getGalleries(featured?: boolean): Promise<StrapiGallery[]> {
  const filter = featured ? '&filters[featured][$eq]=true' : '';
  const res = await fetchStrapi<StrapiGallery[]>(`/galleries?populate=%2A${filter}`);
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

// ── Form Submission — unused, POSTs go through Worker /api/contact ──
