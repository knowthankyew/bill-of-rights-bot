#!/usr/bin/env bash
set -e

echo "⚖️  Launching BillOfRightsBot Studio..."
echo "🔒 Local-first, air-gapped subscription trap auditor"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing local dependencies..."
  npm install
fi

echo "🚀 Starting Vite local server on http://localhost:5173"
npm run dev
