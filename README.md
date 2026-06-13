# KhaysAlpha AI — Chat System 🚀

**Research Faster. Decide Smarter.**

KhaysAlpha AI is an intelligent research and decision-making assistant powered by Google's Gemini 2.0 Flash AI. Get answers to your questions in **1-2 seconds** with real-time streaming responses.

## ✨ Features

### 🤖 AI Chat
- Real-time responses from Gemini 2.0 Flash (~1-2 seconds)
- Server-Sent Events streaming for instant feedback
- Guest mode: 3 free messages without login
- Authenticated mode: Unlimited messages with history
- Ask about crypto, markets, science, advice, and more

### 📊 Market Analysis
- Real-time cryptocurrency prices
- Market cap and 24h volume data
- Price change tracking
- 50+ tracked tokens

### 🖼️ Image Features
- **Generate Images**: Create custom images with AI
- **Analyze Images**: Upload photos for detailed descriptions

### 💾 Conversation Management
- Save all conversations to database
- Full message history
- Search previous chats
- Multi-conversation support

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database
- Google Gemini API key (free)

### 2. Setup (5 minutes)
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials:
# GEMINI_API_KEY=your_key_from_https://ai.google.dev/
# DATABASE_URL=postgresql://user:password@localhost:5432/khaysalpha

# Start server
npm start
# Server runs at http://localhost:5000
```

### 3. Use the App
- Open http://localhost:5000
- Try guest chat (3 free messages)
- Or sign up for unlimited access

## 📖 Documentation

### Getting Started
👉 **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide

### Complete Setup
👉 **[CHAT_SETUP.md](./CHAT_SETUP.md)** - Features, setup, configuration

### For Developers
👉 **[CHAT_IMPLEMENTATION.md](./CHAT_IMPLEMENTATION.md)** - API docs, architecture

### Performance
👉 **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** - Optimization, monitoring

### Feature Summary
👉 **[CHAT_FEATURE_SUMMARY.md](./CHAT_FEATURE_SUMMARY.md)** - Complete overview

## 🏗️ Architecture

```
Frontend (vanilla JS)
    ↓
Node.js Backend (server.mjs)
    ├─→ Gemini API (AI responses)
    ├─→ PostgreSQL (message history)
    └─→ CoinGecko API (market data)
    ↓
Real-time Streaming (SSE)
    ↓
User Display (instant updates)
```

## ⚡ Performance

| Metric | Performance |
|--------|-------------|
| Response Time | 1-2 seconds |
| Streaming Start | 200-500ms |
| Concurrent Users | 100+ |
| Messages/minute | 1000+ |

## 🔧 API Endpoints

### Chat
- `POST /api/chat/guest` - Chat without login (3 messages)
- `POST /api/conversations/:id/chat` - Chat with auth
- `GET /api/conversations/:id` - Get conversation
- `POST /api/conversations` - Create conversation

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get user info

### Images
- `POST /api/generate-image` - Generate image
- `POST /api/analyze-image` - Analyze image

### Market
- `GET /api/market` - Get crypto prices

## 🗂️ Project Structure

```
Khaysalpha-Ai/
├── server.mjs              # Backend API server
├── app.js                  # Frontend JavaScript
├── index.html              # Frontend HTML
├── style.css               # Styling
├── logo.png                # Logo image
├── public/                 # Served static files
├── package.json            # Dependencies
├── .env.example            # Environment template
└── *.md                    # Documentation
```

## 🧪 Testing

### Quick Test
```bash
# Terminal 1: Start server
npm start

# Terminal 2: Send test message
curl -X POST http://localhost:5000/api/chat/guest \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is AI?"}]}'
```

## 📋 Feature Comparison

| Feature | Guest | Authenticated |
|---------|:-----:|:-----:|
| Chat | 3 msgs | Unlimited |
| History | ❌ | ✅ |
| Images | ❌ | ✅ |
| Market | ✅ | ✅ |

## 🐛 Troubleshooting

### Common Issues

**"Cannot connect to database"**
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check DATABASE_URL in .env

**"API key invalid"**
- Get new key from https://ai.google.dev/
- Verify GEMINI_API_KEY in .env

**"Slow responses"**
- Check internet connection
- Verify API quota at ai.google.dev
- Check server CPU: `top`

**"Port 5000 in use"**
- Use different port: `PORT=3000 npm start`
- Or kill process: `lsof -i :5000 && kill -9 <PID>`

## 🚀 Deployment

### Heroku
```bash
heroku create khaysalpha-ai
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set GEMINI_API_KEY=your_key
git push heroku main
```

### Railway
1. Connect GitHub repo
2. Set environment variables in dashboard
3. Auto-deploy on push

## 💡 What You Can Ask

The AI can answer questions about:
- Cryptocurrency and blockchain
- Market analysis and trends
- Science and technology
- History and culture
- Relationships and advice
- Travel and food
- Entertainment and sports
- And much more!

## 🎯 Taglines

- **KhaysAlpha AI** — Research Faster. Decide Smarter.
- **KhaysAlpha AI** — Your Universal AI Copilot.
- **KhaysAlpha AI** — Fast Answers, Smart Solutions.
- **KhaysAlpha AI** — AI-Powered Research and Problem Solving.
- **KhaysAlpha AI** — Ask Anything. Solve Everything.

## 📄 License

MIT License - See [LICENSE](./LICENSE)

## 🤝 Contributing

Ideas for improvements welcome! Some potential features:
- Voice chat input/output
- Conversation sharing
- Custom AI personalities
- Export to PDF
- Mobile app
- Offline mode

## 📞 Support

For issues or questions:
1. Check the relevant documentation file
2. Review error messages in browser console
3. Check server logs: `npm start`
4. Verify environment variables in .env

## 🎓 Learn More

- [Gemini API Documentation](https://ai.google.dev/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js Guide](https://nodejs.org/docs/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---

**Ready to get started?** See [QUICKSTART.md](./QUICKSTART.md) for a 5-minute setup guide.
