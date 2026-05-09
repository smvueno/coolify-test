const { seedData } = require('./seed.js');

module.exports = {
  register() {},
  async bootstrap({ strapi }) {
    try {
      await seedData(strapi);
    } catch (err) {
      console.error('Seed failed (non-fatal):', err.message);
    }
  },
};
