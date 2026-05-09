module.exports = (config) => ({
  ...config,
  server: {
    ...config.server,
    allowedHosts: true,
  },
});
