// Script to create Testimonial content type via Strapi v5 API
// Run with: node config/sync.testimonials.js
const http = require('http');
const TOKEN = process.env.STRAPI_ADMIN_TOKEN || '';

// Testimonial schema for Strapi v5
const testimonialSchema = {
  collectionName: 'testimonial',
  info: { singularName: 'testimonial', pluralName: 'testimonials', displayName: 'Testimonial', description: '' },
  options: { draftAndPublish: true },
  pluginOptions: { 'content-manager': { visible: true }, 'content-type-builder': { visible: true } },
  attributes: {
    name: { type: 'string', required: true },
    role: { type: 'string' },
    company: { type: 'string' },
    avatar: { type: 'media', multiple: false, required: false, allowedTypes: ['images'] },
    content: { type: 'richtext', required: true },
    rating: { type: 'integer', min: 1, max: 5 },
    featured: { type: 'boolean', default: false }
  }
};

console.log('Testimonial schema ready to create via Strapi admin');
console.log('Schema:', JSON.stringify(testimonialSchema, null, 2));
