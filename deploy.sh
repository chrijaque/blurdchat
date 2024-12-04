#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Install dependencies if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Create server archive
echo "📦 Creating server archive..."
tar -czf server.tar.gz server package.json package-lock.json tsconfig.json tsconfig.server.json

# Upload to Digital Ocean
echo "📤 Uploading to server..."
scp server.tar.gz root@207.154.254.52:/root/blurdchat/

# SSH into server and deploy
echo "🔧 Deploying on server..."
ssh root@207.154.254.52 << 'EOF'
    cd /root/blurdchat

    # Stop existing server
    pm2 stop blurdchat || true
    pm2 delete blurdchat || true

    # Extract new files
    tar -xzf server.tar.gz

    # Install dependencies
    npm install
    npm install --save-dev typescript ts-node @types/node @types/express @types/cors @types/socket.io

    # Build TypeScript
    ./node_modules/.bin/tsc --project tsconfig.server.json

    # Start server with PM2
    pm2 start dist/server/index.js --name blurdchat

    # Save PM2 config
    pm2 save

    # Clean up
    rm server.tar.gz
EOF

# Clean up local files
echo "🧹 Cleaning up..."
rm server.tar.gz

echo "✅ Deployment complete!" 