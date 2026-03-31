module.exports = {
  apps: [
    {
      name: 'atc-support-backend',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 10,
    },
  ],
};
