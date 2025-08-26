#!/bin/bash
echo "🏫 Building Desktop App for Central High School..."
echo

echo "📦 Installing dependencies..."
npm install

echo
echo "🔨 Building application..."
npm run build

echo
echo "✅ Build complete!"
echo "📁 Check the 'dist' folder for the installer"
echo
