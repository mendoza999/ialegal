// PM2 — ialegal.algoritmojuridico.com (VPS Hostinger recomendado)
module.exports = {
  apps: [{
    name: 'ialegal',
    script: './dist/server.cjs',
    instances: 1,
    exec_mode: 'fork',
    env_production: { NODE_ENV: 'production', PORT: 3000 },
  }],
};
