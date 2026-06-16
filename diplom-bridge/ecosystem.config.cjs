module.exports = {
  apps: [
    {
      name: "diplom-bridge",
      cwd: "/opt/dndtable/diplom-bridge",
      script: "npx",
      args: "tsx src/server.ts",
      env: { NODE_ENV: "production" },
      env_file: "/opt/dndtable/diplom-bridge/.env",
    },
  ],
};