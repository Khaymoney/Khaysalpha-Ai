#!/bin/bash

# KhaysAlpha AI Quick Start Script

echo "🚀 KhaysAlpha AI - Quick Start"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cat > .env << EOF
# Google Gemini API Key (get from https://ai.google.dev)
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL Database URL
# Format: postgresql://user:password@host:port/database
DATABASE_URL=postgresql://localhost:5432/khaysalpha

# Server Port (optional, default: 5000)
PORT=5000
EOF
  echo "✅ Created .env file"
  echo "⚠️  Please update GEMINI_API_KEY and DATABASE_URL in .env"
  echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed"
  echo ""
fi

# Check if public directory exists
if [ ! -d "public" ]; then
  echo "📁 Creating public directory..."
  mkdir -p public
  cp index.html app.js style.css logo.png public/ 2>/dev/null || true
  echo "✅ Public directory created"
  echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API credentials"
echo "2. Ensure PostgreSQL is running"
echo "3. Run: npm start"
echo ""
echo "🌐 The app will be available at: http://localhost:5000"
