import { getBlogPosts, getSite } from '../../lib/strapi';
import siteConfig from '../../../site.config';

export async function GET() {
  const [site, { posts }] = await Promise.all([
    getSite(),
    getBlogPosts(1, 20),
  ]);

  const siteName = site?.siteName || siteConfig.customer.name;
  const siteUrl = `https://${siteConfig.customer.domain}`;
  const blogUrl = `${siteUrl}/blog`;

  const items = posts.map(post => {
    const postUrl = `${blogUrl}/${post.slug}`;
    const date = new Date(post.publishedAt).toUTCString();
    const content = post.excerpt || '';
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid>${postUrl}</guid>
      <pubDate>${date}</pubDate>
      <description><![CDATA[${content}]]></description>
      ${post.category ? `<category>${post.category.name}</category>` : ''}
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName} Blog</title>
    <link>${blogUrl}</link>
    <description>Latest blog posts from ${siteName}</description>
    <language>en</language>
    <atom:link href="${blogUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${posts.length > 0 ? new Date(posts[0].publishedAt).toUTCString() : new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
