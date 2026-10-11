module.exports = {
  '/api/**': {
    target: `http://127.0.0.1:${process.env.BACKEND_PORT || '8080'}`,
    secure: false,
    changeOrigin: true,
  },
};
