/** PM2 process file — run from repo root: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "dndtable-api",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
