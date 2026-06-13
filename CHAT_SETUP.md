# KhaysAlpha AI Chat System Setup

## Overview
The KhaysAlpha AI app now features a complete **real-time AI chat system** that delivers answers within **1-2 seconds** using Google's Gemini 2.0 Flash model.

## Features

### 🚀 Real-Time Chat
- **Instant Responses**: Stream responses from Gemini 2.0 Flash API in real-time
- **Fast Model**: One of the fastest AI models available (~1-2 second responses)
- **Guest Chat**: 3 free messages without login
- **Unlimited Access**: Sign in for unlimited conversations

### 💬 Chat Capabilities
- **General Q&A**: Ask anything - crypto, markets, science, relationships, travel, food, and more
- **Conversation History**: All conversations are saved to your account
- **Image Analysis**: Upload and analyze images with detailed descriptions
- **Image Generation**: Create custom images with AI
- **Market Analysis**: Real-time cryptocurrency market data integration

### 📊 Supported Topics
- Cryptocurrency & Markets (with real-time CoinGecko data)
- Science & Technology
- History & Culture
- Relationships & Advice
- Travel & Food
- Entertainment & Sports
- And much more!

## Technical Architecture

### Backend (Node.js)
- **Streaming API**: Server-Sent Events (SSE) for real-time responses
- **Database**: PostgreSQL for message persistence
- **AI Model**: Google Gemini 2.0 Flash via generativelanguage.googleapis.com
- **Authentication**: Token-based sessions with bcrypt password hashing

### Frontend (Vanilla JavaScript)
- **Real-Time Display**: Messages stream as they're generated
- **Responsive Design**: Works on desktop and mobile
- **Local Storage**: Remembers auth token and guest count
- **Markdown Rendering**: Formatted responses with code blocks and styling

## API Endpoints

### Guest Chat (No Auth Required)
```
POST /api/chat/guest
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "What is Bitcoin?" }
  ]
}

Response: Server-Sent Events stream
data: {"text": "chunk of response"}
data: {"done": true}
```

### Authenticated Chat
```
POST /api/conversations/:id/chat
Authorization: Bearer {token}
Content-Type: application/json

{
  "message": "What is the future of crypto?"
}

Response: Server-Sent Events stream with saved messages
```

### Create Conversation
```
POST /api/conversations
Authorization: Bearer {token}

{ "title": "My first question" }
```

### Get Conversation History
```
GET /api/conversations/:id
Authorization: Bearer {token}
```

## Environment Variables Required

```bash
# Database connection string
DATABASE_URL=postgresql://user:password@localhost:5432/khaysalpha

# Google Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Server port (default: 5000)
PORT=5000
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
```bash
export GEMINI_API_KEY="your_gemini_api_key"
export DATABASE_URL="postgresql://user:password@host:5432/db"
```

Get your Gemini API key from: https://ai.google.dev/

### 3. Start the Server
```bash
npm start
```

The app will be available at `http://localhost:5000`

## How Chat Works

### 1. User Sends Message
- Frontend calls POST `/api/chat/guest` (guests) or `/api/conversations/:id/chat` (authenticated)
- Message is saved to database (authenticated users only)

### 2. Backend Processes
- Server retrieves conversation history
- Sends message thread to Gemini 2.0 Flash API
- Streams response back via Server-Sent Events

### 3. Real-Time Display
- Frontend receives chunks as they arrive
- Messages update in real-time as text streams
- Response rendered with markdown support

### 4. Message Saved
- Once response completes, full message saved to database
- Available in conversation history

## Performance

- **Response Time**: ~1-2 seconds for most queries
- **Streaming**: Instant feedback with streaming chunks
- **Concurrency**: Supports multiple simultaneous conversations
- **Database**: Efficient with proper indexing

## Models Used

### Chat: Gemini 2.0 Flash
- Ultra-fast response times
- 8K context window
- Multi-modal capabilities
- Cost-effective streaming

### Image Generation: Imagen 3 / Gemini Flash
- High-quality image generation
- 1:1 aspect ratio
- Safety filters enabled

### Image Analysis: Gemini 2.5 Flash
- Detailed image descriptions
- Technical analysis capability
- Context-aware responses

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions for authentication
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (chat threads)
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages in conversations
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  image_data TEXT, -- Base64 for generated images
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Troubleshooting

### Responses are slow
- Check internet connection
- Verify GEMINI_API_KEY is valid
- Check Gemini API quota at https://ai.google.dev

### Chat not loading
- Ensure DATABASE_URL is set and database is accessible
- Check PostgreSQL is running
- Verify tables are created (app auto-creates on startup)

### Messages not saving
- Check database connection
- Verify user is authenticated (has valid token)
- Check PostgreSQL permissions

### Image generation not working
- Verify GEMINI_API_KEY is valid
- Some regions may have restrictions
- Check Gemini API documentation

## Roadmap

- [ ] Voice input/output
- [ ] Custom AI personalities
- [ ] Conversation sharing
- [ ] Export to PDF
- [ ] Mobile app
- [ ] Offline mode
- [ ] Custom model fine-tuning

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error messages in browser console
3. Check server logs for API errors
4. Verify environment variables are set correctly

---

**KhaysAlpha AI** — Research Faster. Decide Smarter. 🚀
