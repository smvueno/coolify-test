// seed.js — Bootstrap Strapi with initial data via lifecycle hook
// Called from src/index.js during the bootstrap phase.

async function seedData(strapi) {
  // ── Public API permissions ──────────────────────────────────────
  const publicRole = await strapi.db.query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (publicRole) {
    const existingPerms = await strapi.db.query('plugin::users-permissions.permission')
      .findMany({ where: { role: publicRole.id } });
    const existingActions = new Set(existingPerms.map(p => p.action));

    const needed = [
      'api::page.page.find',
      'api::page.page.findOne',
      'api::site.site.find',
      'api::blog-post.blog-post.find',
      'api::blog-post.blog-post.findOne',
      'api::category.category.find',
      'api::category.category.findOne',
      'api::tag.tag.find',
      'api::tag.tag.findOne',
      'api::author.author.find',
      'api::author.author.findOne',
      'api::testimonial.testimonial.find',
      'api::testimonial.testimonial.findOne',
      'api::faq.faq.find',
      'api::faq.faq.findOne',
      'api::service.service.find',
      'api::service.service.findOne',
      'api::case-study.case-study.find',
      'api::case-study.case-study.findOne',
      'api::gallery.gallery.find',
      'api::gallery.gallery.findOne',
      'api::form-submission.form-submission.create',
    ];
    const toCreate = needed.filter(a => !existingActions.has(a));

    if (toCreate.length > 0) {
      await strapi.db.query('plugin::users-permissions.permission').createMany({
        data: toCreate.map(action => ({ action, role: publicRole.id })),
      });
      console.log(`🔓 Public permissions granted: ${toCreate.join(', ')}`);
    }
  }

  // ── Seed site + pages ──────────────────────────────────────────
  const existingSite = await strapi.documents('api::site.site').findFirst();
  if (!existingSite) {
    console.log('🌱 Seeding site data...');

    await strapi.documents('api::site.site').create({
      data: {
        siteName: 'Haru Digi Demo',
        tagline: 'Beautiful websites, simply managed',
        primaryColor: '#2563eb',
        secondaryColor: '#7c3aed',
        contactEmail: 'hello@harudigi.com',
        enabledModules: {
          pageBuilder: true,
          blog: true,
          forms: true,
          booking: false,
          portfolio: false,
          teamTestimonials: false,
        },
        seoTitleTemplate: '{{title}} | Haru Digi',
        seoDescription: 'A demo site built with Astro + Strapi',
      },
    });

    const page = await strapi.documents('api::page.page').create({
      data: {
        title: 'Home',
        slug: 'home',
        description: 'Welcome to Haru Digi',
        blocks: [
          {
            __component: 'blocks.hero',
            headline: 'Build Faster. Launch Sooner.',
            subtext: 'A modular website template powered by Astro and Strapi. Toggle features on and off with a single config file.',
            alignment: 'center',
            size: 'large',
            primaryCta: { label: 'Get Started', url: '#features', variant: 'primary' },
            secondaryCta: { label: 'Learn More', url: '#about', variant: 'outline' },
          },
          {
            __component: 'blocks.features',
            heading: 'Everything You Need',
            subheading: 'Toggle exactly the modules your project needs.',
            layout: 'grid-3',
            features: [
              { title: 'Page Builder', description: 'Drag-and-drop page sections.' },
              { title: 'Multi-language', description: 'Built-in i18n for German, English, and Japanese.' },
              { title: 'Contact Forms', description: 'Spam-protected forms with Turnstile.' },
            ],
          },
          {
            __component: 'blocks.cta',
            heading: 'Ready to build your site?',
            body: 'Fork the template, set your config, and deploy in minutes.',
            cta: { label: 'View on GitHub', url: 'https://github.com/smvueno/j-harudigi', variant: 'primary', isExternal: true },
            variant: 'default',
          },
        ],
      },
    });

    await strapi.documents('api::page.page').publish({ documentId: page.documentId });
    console.log('✅ Seed complete — Site + Home page created.');
  } else {
    console.log('🟢 Seed: Site data already exists, skipping site/pages.');
  }

  // ── Seed blog data ─────────────────────────────────────────────
  await seedBlog(strapi);

  // ── Seed testimonials ──────────────────────────────────────────
  await seedTestimonials(strapi);

  // ── Seed FAQs ──────────────────────────────────────────────────
  await seedFaqs(strapi);

  // ── Seed services ──────────────────────────────────────────────
  await seedServices(strapi);

  // ── Seed case studies ──────────────────────────────────────────
  await seedCaseStudies(strapi);

  // ── Seed galleries ─────────────────────────────────────────────
  await seedGalleries(strapi);
}

async function seedBlog(strapi) {
  const existingPosts = await strapi.db.query('api::blog-post.blog-post').findMany({ limit: 1 });
  if (existingPosts.length > 0) {
    console.log('🟢 Seed: Blog data already exists, skipping.');
    return;
  }

  // Create author
  const author = await strapi.documents('api::author.author').create({
    data: {
      name: 'Haru Digi Editorial',
      slug: 'haru-digi-editorial',
      bio: 'The Haru Digi team shares insights on building modern websites with Astro and Strapi.',
      email: 'hello@harudigi.com',
    },
  });

  // Create categories
  const catTech = await strapi.documents('api::category.category').create({
    data: { name: 'Technology', slug: 'technology', description: 'Tech tutorials and guides' },
  });
  const catDesign = await strapi.documents('api::category.category').create({
    data: { name: 'Design', slug: 'design', description: 'UI/UX and design patterns' },
  });
  const catBusiness = await strapi.documents('api::category.category').create({
    data: { name: 'Business', slug: 'business', description: 'Business tips for SMBs' },
  });

  // Create tags
  const tagAstro = await strapi.documents('api::tag.tag').create({ data: { name: 'Astro', slug: 'astro' } });
  const tagStrapi = await strapi.documents('api::tag.tag').create({ data: { name: 'Strapi', slug: 'strapi' } });
  const tagTailwind = await strapi.documents('api::tag.tag').create({ data: { name: 'Tailwind CSS', slug: 'tailwind-css' } });
  const tagAI = await strapi.documents('api::tag.tag').create({ data: { name: 'AI', slug: 'ai' } });
  const tagAutomation = await strapi.documents('api::tag.tag').create({ data: { name: 'Automation', slug: 'automation' } });
  const tagTutorial = await strapi.documents('api::tag.tag').create({ data: { name: 'Tutorial', slug: 'tutorial' } });

  // Create blog posts
  const posts = [
    {
      title: 'Getting Started with Astro and Strapi',
      slug: 'getting-started-astro-strapi',
      excerpt: 'Learn how to build a blazing-fast static site with Astro and manage content through Strapi CMS.',
      content: JSON.stringify({
        type: 'root',
        children: [
          { type: 'heading', level: 2, children: [{ type: 'text', text: 'Why Astro + Strapi?' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Astro is a modern static site generator that delivers lightning-fast performance by shipping zero JavaScript by default. Combined with Strapi as a headless CMS, you get the best of both worlds: a powerful admin panel for content editors and a blazing-fast frontend for visitors.' }] },
          { type: 'heading', level: 3, children: [{ type: 'text', text: 'Setting Up Your Project' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Start by creating a monorepo with npm workspaces, then scaffold your Strapi backend and Astro frontend in separate packages. Configure Tailwind CSS v4 for styling and you are ready to build.' }] },
          { type: 'heading', level: 3, children: [{ type: 'text', text: 'Key Benefits' }] },
          { type: 'list', format: 'unordered', children: [
            { type: 'list-item', children: [{ type: 'text', text: 'Excellent performance — Astro ships minimal JS' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Great developer experience with hot module reloading' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Content editors get a familiar UI through Strapi' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Easy to scale with SSG or SSR' }] },
          ]},
        ],
      }),
      category: catTech.documentId,
      tags: [tagAstro.documentId, tagStrapi.documentId, tagTutorial.documentId],
      author: author.documentId,
      publishedAt: new Date('2026-05-01').toISOString(),
    },
    {
      title: 'Building a Modular Design System with Tailwind CSS v4',
      slug: 'modular-design-system-tailwind-v4',
      excerpt: 'Create a maintainable, themeable design system using Tailwind CSS v4 tokens and CSS variables.',
      content: JSON.stringify({
        type: 'root',
        children: [
          { type: 'heading', level: 2, children: [{ type: 'text', text: 'Tailwind CSS v4 Changes' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Tailwind CSS v4 introduces a new CSS-first configuration approach using the @theme directive. This makes it much easier to define design tokens that can be shared across projects and themes.' }] },
          { type: 'heading', level: 3, children: [{ type: 'text', text: 'Token Structure' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Define your colors, fonts, spacing, and radius values in a tokens.css file. Each theme variant can override these values, giving you a consistent yet flexible design system.' }] },
          { type: 'code', lang: 'css', children: [{ type: 'text', text: '@theme {\n  --color-primary: #2563eb;\n  --color-secondary: #7c3aed;\n  --font-heading: system-ui, sans-serif;\n  --radius: 0.5rem;\n}' }] },
        ],
      }),
      category: catDesign.documentId,
      tags: [tagTailwind.documentId],
      author: author.documentId,
      publishedAt: new Date('2026-05-03').toISOString(),
    },
    {
      title: '5 Ways SMBs Can Leverage AI in 2026',
      slug: 'smb-ai-leverage-2026',
      excerpt: 'Practical AI applications for small and medium businesses that deliver real results without breaking the bank.',
      content: JSON.stringify({
        type: 'root',
        children: [
          { type: 'heading', level: 2, children: [{ type: 'text', text: 'AI Is No Longer Optional' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Small and medium businesses that embrace AI tools gain a significant competitive advantage. Here are five practical ways to get started.' }] },
          { type: 'list', format: 'ordered', children: [
            { type: 'list-item', children: [{ type: 'text', text: 'Customer service chatbots powered by LLMs' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Automated content generation for marketing' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Data analysis and business intelligence' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Email automation and personalization' }] },
            { type: 'list-item', children: [{ type: 'text', text: 'Lead scoring and customer segmentation' }] },
          ]},
        ],
      }),
      category: catBusiness.documentId,
      tags: [tagAI.documentId, tagAutomation.documentId],
      author: author.documentId,
      publishedAt: new Date('2026-05-06').toISOString(),
    },
    {
      title: 'Automating Your Business Workflows with n8n',
      slug: 'automating-workflows-n8n',
      excerpt: 'Connect your tools and automate repetitive tasks with n8n, the open-source workflow automation platform.',
      content: JSON.stringify({
        type: 'root',
        children: [
          { type: 'heading', level: 2, children: [{ type: 'text', text: 'Why Automate?' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Every business has repetitive tasks that eat up hours each week. Workflow automation lets you connect your tools and let software handle the busywork.' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'n8n provides a visual workflow builder with 400+ integrations. You can connect Strapi, email, Slack, Google Sheets, and hundreds of other services without writing a single line of code.' }] },
        ],
      }),
      category: catTech.documentId,
      tags: [tagAutomation.documentId, tagTutorial.documentId],
      author: author.documentId,
      publishedAt: new Date('2026-05-08').toISOString(),
    },
  ];

  for (const postData of posts) {
    const post = await strapi.documents('api::blog-post.blog-post').create({ data: postData });
    await strapi.documents('api::blog-post.blog-post').publish({ documentId: post.documentId });
  }

  console.log(`✅ Blog seed complete — ${posts.length} posts, 3 categories, 6 tags, 1 author.`);
}

async function seedTestimonials(strapi) {
  const existing = await strapi.db.query('api::testimonial.testimonial').findMany({ limit: 1 });
  if (existing.length > 0) {
    console.log('🟢 Seed: Testimonials already exist, skipping.');
    return;
  }

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'CEO',
      company: 'TechFlow Solutions',
      content: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Haru Digi transformed our online presence. The modular approach meant we got exactly what we needed without paying for bloated features we would never use. Load times improved by 300%.' }] }] }),
      rating: 5,
      featured: true,
    },
    {
      name: 'Marcus Tanaka',
      role: 'Marketing Director',
      company: 'GreenLeaf Media',
      content: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'We needed a site that could grow with us. The Astro + Strapi stack delivers incredible performance while giving our content team full control. Publishing a new blog post takes minutes.' }] }] }),
      rating: 5,
      featured: true,
    },
    {
      name: 'Elena Voss',
      role: 'Founder',
      company: 'Nordic Wellness',
      content: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Switching to this template saved us months of development time. The built-in multi-language support made expanding into new markets seamless. Highly recommended for any growing business.' }] }] }),
      rating: 4,
      featured: false,
    },
    {
      name: 'James Park',
      role: 'CTO',
      company: 'DataSync Inc.',
      content: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'The developer experience is outstanding. Clean codebase, excellent documentation, and the n8n integration workflow automation saved us countless hours on repetitive tasks.' }] }] }),
      rating: 5,
      featured: true,
    },
  ];

  for (const t of testimonials) {
    const doc = await strapi.documents('api::testimonial.testimonial').create({ data: t });
    await strapi.documents('api::testimonial.testimonial').publish({ documentId: doc.documentId });
  }
  console.log(`✅ ${testimonials.length} testimonials seeded.`);
}

async function seedFaqs(strapi) {
  const existing = await strapi.db.query('api::faq.faq').findMany({ limit: 1 });
  if (existing.length > 0) {
    console.log('🟢 Seed: FAQs already exist, skipping.');
    return;
  }

  const faqs = [
    { question: 'What is Astro and why use it?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Astro is a modern static site generator that ships zero JavaScript by default. It delivers blazing-fast performance by rendering HTML at build time and only loading JavaScript for interactive components when needed.' }] }] }), category: 'Technology', order: 1 },
    { question: 'How does Strapi work as a CMS?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Strapi is an open-source headless CMS that gives content editors a friendly admin panel while developers get a clean REST or GraphQL API. Content is created, edited, and published through the Strapi dashboard, then fetched by your frontend at build time.' }] }] }), category: 'Technology', order: 2 },
    { question: 'Can I add more pages and sections?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Absolutely. The modular template is designed to grow with you. New pages are as simple as adding an Astro file in the pages directory, and new content sections can be created through Strapi\'s content-type builder in minutes.' }] }] }), category: 'General', order: 3 },
    { question: 'Is the site optimized for SEO?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Yes. Every page supports custom meta titles, descriptions, and Open Graph tags. The static site generation ensures fast load times which Google rewards, and the clean semantic HTML gives search engines exactly what they need.' }] }] }), category: 'General', order: 4 },
    { question: 'How long does it take to deploy?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Once configured, deployment takes minutes. The static build outputs pure HTML and CSS that can be hosted anywhere — Vercel, Netlify, Cloudflare Pages, or your own server behind a CDN.' }] }] }), category: 'Deployment', order: 5 },
    { question: 'Can I use my own domain?', answer: JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Yes. Point your domain to your hosting provider, configure SSL, and you are live. The template includes full RSS feed support and sitemap generation for maximum discoverability.' }] }] }), category: 'Deployment', order: 6 },
  ];

  for (const f of faqs) {
    const doc = await strapi.documents('api::faq.faq').create({ data: f });
    await strapi.documents('api::faq.faq').publish({ documentId: doc.documentId });
  }
  console.log(`✅ ${faqs.length} FAQs seeded.`);
}

async function seedServices(strapi) {
  const existing = await strapi.db.query('api::service.service').findMany({ limit: 1 });
  if (existing.length > 0) {
    console.log('🟢 Seed: Services already exist, skipping.');
    return;
  }

  const services = [
    {
      title: 'Website Development',
      slug: 'website-development',
      description: 'Custom website development using Astro and Strapi. Lightning-fast static sites with a powerful headless CMS backend that your content team will love.',
      icon: 'code',
      features: JSON.stringify(['Static site generation', 'Headless CMS integration', 'Responsive design', 'SEO optimization', 'Performance auditing']),
      price: 'From $5,000',
    },
    {
      title: 'Workflow Automation',
      slug: 'workflow-automation',
      description: 'Connect your business tools with n8n workflow automation. Eliminate manual data entry and let your systems work together seamlessly.',
      icon: 'zap',
      features: JSON.stringify(['n8n workflow design', 'Custom integrations', 'Data transformation', 'Scheduled automation', 'Error handling & monitoring']),
      price: 'From $2,500',
    },
    {
      title: 'AI Strategy & Implementation',
      slug: 'ai-strategy',
      description: 'Practical AI solutions for small and medium businesses. From chatbots to data analysis, we help you leverage AI without the enterprise price tag.',
      icon: 'brain',
      features: JSON.stringify(['AI readiness assessment', 'Chatbot implementation', 'Content generation pipelines', 'Data analysis dashboards', 'Team training']),
      price: 'From $3,500',
    },
    {
      title: 'Consulting & Training',
      slug: 'consulting-training',
      description: 'Expert guidance on technology strategy, platform selection, and team training. We help you make informed decisions about your digital infrastructure.',
      icon: 'users',
      features: JSON.stringify(['Technology stack audit', 'Platform migration planning', 'Workshop & training sessions', 'Architecture review', 'Ongoing support']),
      price: 'From $200/hour',
    },
  ];

  for (const s of services) {
    const doc = await strapi.documents('api::service.service').create({ data: s });
    await strapi.documents('api::service.service').publish({ documentId: doc.documentId });
  }
  console.log(`✅ ${services.length} services seeded.`);
}

function richText(text) {
  return JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] });
}

async function seedCaseStudies(strapi) {
  const existing = await strapi.db.query('api::case-study.case-study').findMany({ limit: 1 });
  if (existing.length > 0) { console.log('🟢 Seed: Case studies already exist, skipping.'); return; }

  // Get testimonial and service relations
  const testimonials = await strapi.db.query('api::testimonial.testimonial').findMany({});
  const services = await strapi.db.query('api::service.service').findMany({});

  const cases = [
    {
      title: 'Multi-Platform Booking Sync for Kyoto Ryokan',
      slug: 'booking-sync-kyoto-ryokan',
      client: 'Kyoto Ryokan Collective',
      industry: 'Hospitality',
      challenge: richText('The ryokan relied on Booking.com, Expedia, and Rakuten Travel for reservations. Staff spent 3+ hours daily manually cross-checking bookings across platforms to prevent double-bookings. Guest satisfaction suffered when overbooking occurred during peak season.'),
      solution: richText('We built an n8n workflow that monitors all three booking platforms in real-time, syncs reservations to a central Google Sheet, and automatically blocks dates across all platforms when a booking is confirmed. A Slack notification alerts staff to any discrepancies.'),
      results: richText('Double-bookings eliminated entirely. Staff saved 15+ hours per week on reservation management. Guest satisfaction scores improved by 22%. The system paid for itself within the first month of peak season.'),
      website: 'https://kyotoryokancollective.example.com',
      testimonial: testimonials.length > 0 ? testimonials[0].documentId : null,
      services: services.length > 0 ? [services[0].documentId] : [],
    },
    {
      title: 'Bilingual Website Redesign for Osaka Restaurant',
      slug: 'bilingual-restaurant-website',
      client: 'Osaka Bistro Tanaka',
      industry: 'Food & Beverage',
      challenge: richText('A popular local restaurant was losing international tourists because their Japanese-only website was inaccessible to foreign visitors. Menu items had no English descriptions, and online reviews consistently mentioned language barriers.'),
      solution: richText('We built a bilingual (JA/EN) Astro + Strapi site with full menu translation, an AI chatbot for allergy/dietary questions in multiple languages, and Google Calendar integration for table reservations. Content editors can update menu items in Strapi — changes appear live in both languages.'),
      results: richText('International customer traffic increased 180% within 3 months. The AI chatbot handled 65% of reservation inquiries without staff intervention. The restaurant now ranks on Google for English-language Kyoto food searches.'),
      testimonial: testimonials.length > 1 ? testimonials[1].documentId : null,
      services: services.length > 1 ? [services[1].documentId, services[2].documentId] : [],
    },
    {
      title: 'AI-Powered Invoice Processing for Wholesaler',
      slug: 'ai-invoice-processing',
      client: 'Kyoto Food Distributors Co.',
      industry: 'Wholesale',
      challenge: richText('The company received 200+ paper invoices and fax orders daily. Manual data entry into their accounting system (freee) required a full-time staff member. Error rates averaged 8%, causing payment delays and supplier friction.'),
      solution: richText('We deployed an OCR + GPT pipeline that scans incoming paper invoices, extracts line items, categorizes expenses, and pushes structured data directly into freee. A dashboard shows unmatched items for human review. The entire process takes seconds instead of hours.'),
      results: richText('Data entry time reduced by 95%. Error rate dropped to under 1%. The dedicated data entry staff member was reassigned to customer service. Invoice processing backlog — previously 3 days — now clears daily by 10 AM.'),
    },
  ];

  for (const c of cases) {
    const doc = await strapi.documents('api::case-study.case-study').create({ data: c });
    await strapi.documents('api::case-study.case-study').publish({ documentId: doc.documentId });
  }
  console.log(`✅ ${cases.length} case studies seeded.`);
}

async function seedGalleries(strapi) {
  const existing = await strapi.db.query('api::gallery.gallery').findMany({ limit: 1 });
  if (existing.length > 0) { console.log('🟢 Seed: Galleries already exist, skipping.'); return; }

  const galleries = [
    { title: 'Website Designs', description: 'Showcase of recent website designs and builds.', featured: true },
    { title: 'Automation Dashboards', description: 'n8n workflow automation dashboards built for clients.', featured: true },
    { title: 'Team & Events', description: 'Haru Digi team events and meetups.', featured: false },
  ];

  for (const g of galleries) {
    const doc = await strapi.documents('api::gallery.gallery').create({ data: g });
    await strapi.documents('api::gallery.gallery').publish({ documentId: doc.documentId });
  }
  console.log(`✅ ${galleries.length} galleries seeded (note: images need to be uploaded in Strapi admin).`);
}

module.exports = { seedData };
