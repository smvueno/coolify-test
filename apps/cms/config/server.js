module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS', ['dev-key-1', 'dev-key-2']),
  },
  url: 'https://test2.jens-photo.com',
  admin: {
    url: 'https://test2.jens-photo.com',
  },
});
