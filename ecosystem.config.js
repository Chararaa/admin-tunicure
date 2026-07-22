
module.exports = {
  apps: [{
    name: 'admin-tunicure',
    script: 'server.js',           // Fichier principal à la racine
    cwd: '/home/ubuntu/adminback/admin-tunicure',  // Chemin complet
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=512',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/ubuntu/logs/err.log',
    out_file: '/home/ubuntu/logs/out.log',
    log_file: '/home/ubuntu/logs/combined.log',
    time: true
  }]
};
