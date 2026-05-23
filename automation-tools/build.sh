#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Using Node version:"
node -v
echo "Using npm version:"
npm -v

echo "Navigating to omni-assist and building..."
cd /home/hungtd/git-automation-tools/omni-assisstant/automation-tools/omni-assist || exit 1
npm run build || exit 1

echo "Copying built file to backup-chatbot/public/omni-sdk.js..."
cp dist/omni-sdk.umd.cjs ../backup-chatbot/public/omni-sdk.js || exit 1

echo "Build and deploy completed successfully!"
