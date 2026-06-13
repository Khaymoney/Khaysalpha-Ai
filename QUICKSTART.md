# Getting Started with KhaysAlpha AI Chat System

## ✅ What's Included

Your KhaysAlpha AI app now has a **complete AI chat system** with:

- 🤖 **Real-time AI responses** via Gemini 2.0 Flash (~1-2 seconds)
- 💬 **Guest chat** - 3 free messages without login
- 🔐 **Authenticated chat** - Unlimited messages with history
- 📊 **Crypto market data** integration
- 🖼️ **Image generation** and analysis
- 💾 **PostgreSQL database** for message persistence
- ⚡ **Server-Sent Events** for streaming responses

## 🚀 Quick Setup (5 minutes)

### Step 1: Get API Keys

1. **Google Gemini API Key** (FREE, required):
   - Go to https://ai.google.dev/
   - Click "Get API Key" 
   - Create new project
   - Generate API key
   - Copy your key

2. **PostgreSQL Database** (required):
   - Install PostgreSQL: https://www.postgresql.org/
   - Create a database: `createdb khaysalpha`
   - Note connection string: `postgresql://user:password@localhost:5432/khaysalpha`

### Step 2: Configure Environment

```bash
cd /workspaces/Khaysalpha-Ai

# Create .env file with your credentials
cat > .env << EOF
GEMINI_API_KEY=your_key_from_step_1
DATABASE_URL=postgresql://user:password@localhost:5432/khaysalpha
PORT=5000
EOF
```

### Step 3: Start the Server

```bash
npm install        # Install dependencies (if not done)
npm start          # Start server at http://localhost:5000
```

You should see:
```
✅ Database ready
✅ CAPX ID resolved: ...
🚀 KhaysAlpha AI running at http://0.0.0.0:5000
```

### Step 4: Open in Browser

Go to http://localhost:5000 and try:
- **Guest**: Ask a question without login (3 free messages)
- **Sign Up**: Create account for unlimited chat

## 🧪 Testing the Chat

### Test 1: Guest Chat (No Login)

1. Open http://localhost:5000
2. Type a question: "What is cryptocurrency?"
3. **Expected**: Response appears in ~1-2 seconds, streaming in real-time

### Test 2: Authenticated Chat

1. Click "Create free account"
2. Sign up with email/password
3. Ask a question: "Tell me about Bitcoin"
4. **Expected**: Response saved to history, can see previous conversations

### Test 3: Image Generation

1. Log in to your account
2. Type: "generate a beautiful sunset over mountains"
3. **Expected**: Image is created in ~5-10 seconds

### Test 4: Image Analysis

1. Log in to your account
2. Click attach file (in chat)
3. Upload an image
4. **Expected**: AI describes the image in detail

### Test 5: Market Data

1. Click "Market Analysis" in sidebar
2. **Expected**: Live crypto prices from CoinGecko
3. Search for tokens: "bitcoin", "ethereum", etc.

## 📱 How the Chat Works

### For Users
1. Type a question in the chat box
2. Press Enter or click Send
3. See AI response appear instantly (streaming)
4. Conversation is saved (if logged in)
5. Access history anytime

### For Developers

#### Guest Chat Request
```javascript
// POST /api/chat/guest (no auth needed)
{
  "messages": [
    { "role": "user", "content": "What is AI?" }
  ]
}

// Response: Server-Sent Events
data: {"text": "AI stands for "}
data: {"text": "Artificial Intelligence..."}
data: {"done": true}
```

#### Authenticated Chat Request
```javascript
// First, create conversation
POST /api/conversations
Authorization: Bearer {token}
{ "title": "First question" }

// Then, send message
POST /api/conversations/{id}/chat
Authorization: Bearer {token}
{ "message": "What is blockchain?" }

// Response: Same SSE streaming, message saved to DB
```

#### Response Format
```javascript
// Each chunk is JSON on a line with "data: " prefix
data: {"text": "Bitcoin is a "}
data: {"text": "decentralized cryptocurrency..."}
data: {"done": true}

// Or error
data: {"error": "Rate limit exceeded"}
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `GEMINI_API_KEY` | ✅ Yes | `sk-...` | Google Gemini API |
| `DATABASE_URL` | ✅ Yes | `postgresql://...` | PostgreSQL connection |
| `PORT` | ❌ No | `5000` | Server port |
| `NODE_ENV` | ❌ No | `production` | Environment mode |

### Database Setup

The database is created automatically, but you can manually create it:

```sql
-- Create database
createdb khaysalpha

-- Connect and create tables (done automatically on startup)
CREATE TABLE users (...);
CREATE TABLE conversations (...);
CREATE TABLE messages (...);
```

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql postgresql://user:password@localhost:5432/khaysalpha

# Create database if missing
createdb khaysalpha
```

### "Invalid API key"
```bash
# Check GEMINI_API_KEY in .env
cat .env | grep GEMINI_API_KEY

# Get new key from https://ai.google.dev/
```

### "Port 5000 already in use"
```bash
# Use different port
PORT=3000 npm start

# Or kill process using 5000
lsof -i :5000
kill -9 <PID>
```

### "Responses are slow"
- Check internet connection: `ping 8.8.8.8`
- Check API quota at https://ai.google.dev/
- Monitor server CPU: `top`
- Check database: `psql -c "SELECT COUNT(*) FROM messages;"`

### "Chat messages not saving"
- Verify user is logged in
- Check DATABASE_URL is correct
- Verify PostgreSQL is running
- Check browser console for errors

## 📚 File Structure

```
Khaysalpha-Ai/
├── server.mjs              # Backend server with API endpoints
├── app.js                  # Frontend JavaScript
├── index.html              # Frontend HTML
├── style.css               # Frontend styles
├── public/                 # Served static files
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   └── logo.png
├── package.json            # Dependencies
├── .env                    # Environment (create this)
├── .env.example            # Example environment
├── CHAT_SETUP.md           # Complete setup guide
├── CHAT_IMPLEMENTATION.md  # Architecture & API docs
├── PERFORMANCE_GUIDE.md    # Performance tuning
└── README.md               # Original project README
```

## 🎯 Key Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/logout` | ✅ | Logout |
| GET | `/api/auth/me` | ✅ | Get user info |
| POST | `/api/chat/guest` | ❌ | Chat without login |
| POST | `/api/conversations` | ✅ | Create conversation |
| GET | `/api/conversations/:id` | ✅ | Get conversation |
| POST | `/api/conversations/:id/chat` | ✅ | Send message |
| DELETE | `/api/conversations/:id` | ✅ | Delete conversation |
| POST | `/api/generate-image` | ✅ | Generate image |
| POST | `/api/analyze-image` | ✅ | Analyze image |
| GET | `/api/market` | ❌ | Get crypto prices |

## 📈 Performance

- **Response Time**: 1-2 seconds for most questions
- **Streaming**: Real-time chunks visible immediately
- **Concurrency**: Handles multiple users simultaneously
- **Database**: Efficient with connection pooling

Expected times:
- 🟢 < 2s: Excellent
- 🟡 2-5s: Good
- 🔴 > 5s: Check connection

## 🚀 Deployment

### Deploy to Heroku
```bash
heroku create khaysalpha-ai
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku config:set GEMINI_API_KEY=your_key
```

### Deploy to Railway
1. Connect GitHub repo
2. Set environment variables in Dashboard
3. Deploy automatically

### Deploy to AWS EC2
```bash
# SSH into server
ssh ec2-user@instance

# Install Node and PostgreSQL
sudo yum install nodejs postgresql-server

# Clone repo, set .env, start server
npm install && npm start
```

## 📞 Support

### Check These First
1. ✅ Is PostgreSQL running? `systemctl status postgresql`
2. ✅ Is .env set correctly? `cat .env`
3. ✅ Is API key valid? Test at https://ai.google.dev/
4. ✅ Check browser console for errors: F12
5. ✅ Check server logs: `npm start`

### Common Issues

| Problem | Solution |
|---------|----------|
| Slow responses | Check internet, API quota |
| Chat not loading | Restart server: `npm start` |
| Messages not saving | Verify database connection |
| Auth errors | Clear cookies, logout/login |
| Image fails | Check API quota, file size |

## 🎓 Next Steps

1. **Customize**: Edit system prompt in `server.mjs` line 20
2. **Style**: Modify colors in `style.css`
3. **Deploy**: Follow deployment guide above
4. **Monitor**: Set up error logging
5. **Scale**: Add caching/load balancing for high traffic

## 📊 Analytics

Track usage:
```javascript
// In server.mjs, add to chat endpoint
console.log(`[CHAT] User: ${user.id}, Chars: ${message.length}, Time: ${Date.now()}`);
```

## 🎉 You're Ready!

The chat system is fully functional and ready to use. Start by:

1. Opening http://localhost:5000
2. Trying a guest message (no signup needed)
3. Creating an account for unlimited chat
4. Exploring image generation and analysis
5. Checking out market data integration

---

**KhaysAlpha AI** — Research Faster. Decide Smarter. 🚀

Questions? Check the detailed guides:
- 📖 [Complete Setup Guide](./CHAT_SETUP.md)
- 🏗️ [Architecture & APIs](./CHAT_IMPLEMENTATION.md)
- ⚡ [Performance Tuning](./PERFORMANCE_GUIDE.md)
