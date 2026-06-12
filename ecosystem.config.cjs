const path = require("path");

/** PM2 — запуск из корня репо: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "dndtable-api",
      cwd: path.join(__dirname, "backend"),
      script: "dist/server.js",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
