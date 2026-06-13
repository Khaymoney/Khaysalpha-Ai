# KhaysAlpha AI - API Configuration & Response Check

## ✅ Is Your AI Working?

### How to Check

**Option 1: Check Server Startup (Recommended)**
```bash
npm start
```

Look for one of these messages:

#### ✅ AI IS WORKING
```
✅ Environment variables configured
   ✓ GEMINI_API_KEY: sk-...
   ✓ DATABASE_URL: Connected
🚀 KhaysAlpha AI running at http://0.0.0.0:5000
```
→ Your AI is ready! Open http://localhost:5000

#### ❌ AI IS NOT WORKING
```
⚠️  Configuration Issues:
  ❌ GEMINI_API_KEY not set. AI responses will fail.
  ❌ DATABASE_URL not set. Database connection will fail.

📝 To fix:
  1. Create/edit .env file in project root
  2. Add: GEMINI_API_KEY=your_key_from_ai.google.dev
  3. Add: DATABASE_URL=postgresql://user:pass@host/db
  4. Restart: npm start
```
→ You need to set up your API key

**Option 2: Try Sending a Message**
1. Open http://localhost:5000
2. Try guest chat: "Hello, can you respond?"
3. If you see an error message, check below

### Error Messages & Solutions

#### Error: "Invalid GEMINI_API_KEY"
```
❌ Invalid GEMINI_API_KEY. Check your .env file at https://ai.google.dev/
```

**Solution:**
1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create new project
4. Copy the key
5. Edit `.env` file: `GEMINI_API_KEY=paste_key_here`
6. Restart: `npm start`

#### Error: "API quota exceeded"
```
❌ API quota exceeded. Check https://ai.google.dev/
```

**Solution:**
1. Check your usage at https://ai.google.dev/
2. Free tier has monthly limits
3. Consider upgrading or waiting until next month

#### Error: "GEMINI_API_KEY not configured"
```
GEMINI_API_KEY not configured. Set it in .env file and restart the server.
```

**Solution:**
1. Create `.env` file in project root
2. Add: `GEMINI_API_KEY=your_key_here`
3. Save the file
4. Restart: `npm start`

---

## 🚀 Getting Your API Key (5 Minutes)

### Step 1: Go to Google AI Platform
```
https://ai.google.dev/
```

### Step 2: Create API Key
1. Click "Get API Key" button
2. Click "Create API Key"
3. Select or create a project
4. Copy your API key (starts with "sk-" or "AIza...")

### Step 3: Add to .env
```bash
# Open .env file in project root
nano .env
# or
code .env
```

Add this line:
```
GEMINI_API_KEY=your_key_pasted_here
```

### Step 4: Restart Server
```bash
npm start
```

You should see:
```
✅ Environment variables configured
   ✓ GEMINI_API_KEY: sk-...
```

---

## 📋 Setup Checklist

### Before AI Will Work
- [ ] Have Node.js installed
- [ ] Have PostgreSQL running
- [ ] Have created `.env` file
- [ ] Have added `GEMINI_API_KEY` to `.env`
- [ ] Have added `DATABASE_URL` to `.env`
- [ ] Have run `npm install`

### Quick Setup (Paste This)
```bash
# 1. Create .env file
cat > .env << EOF
GEMINI_API_KEY=your_key_from_ai.google.dev
DATABASE_URL=postgresql://user:password@localhost:5432/khaysalpha
PORT=5000
EOF

# 2. Start server
npm start

# 3. Open browser
# http://localhost:5000
```

---

## 🧪 Test If AI Is Responding

### Test 1: Guest Chat (Easiest)
```
1. Open http://localhost:5000
2. Click message input
3. Type: "Hello"
4. Press Enter
5. ✅ Should see response in 1-2 seconds
6. ❌ If error, check API key
```

### Test 2: Check Browser Console
```
1. Open http://localhost:5000
2. Press F12 (open Developer Tools)
3. Click Console tab
4. Try sending a message
5. Look for errors or warnings
6. Copy full error and search for solution
```

### Test 3: Check Server Logs
```
1. Look at terminal where you ran "npm start"
2. Look for error messages
3. Check API key configuration message
4. Look for database connection status
```

### Test 4: Test API Directly
```bash
# Test guest chat (should work without login)
curl -X POST http://localhost:5000/api/chat/guest \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi"}]}'

# If you see response chunks starting with "data: " → AI is working
# If you see error → check API key
```

---

## 🔧 Complete Environment Setup

### Create `.env` File
```bash
# Navigate to project
cd /workspaces/Khaysalpha-Ai

# Create .env
cp .env.example .env

# Edit .env with your values
nano .env
# (or use your editor)
```

### Full `.env` Template
```
# ⚠️  REQUIRED: Get from https://ai.google.dev/
GEMINI_API_KEY=sk-xxx

# ⚠️  REQUIRED: PostgreSQL connection
# Format: postgresql://username:password@localhost:5432/dbname
DATABASE_URL=postgresql://postgres:password@localhost:5432/khaysalpha

# Optional: Server port (default: 5000)
PORT=5000

# Optional: Environment mode
NODE_ENV=development
```

---

## 📊 How AI Response Works

### When User Sends Message:

```
User sends "What is AI?"
        ↓
   Server receives
        ↓
   Check API key configured ← If missing, shows error
        ↓
   Send to Gemini API
        ↓
   Stream response back
        ↓
   User sees: "AI stands for..." (appears instantly)
        ↓
   Full response in 1-2 seconds
```

### If AI Key Missing:

```
User sends "What is AI?"
        ↓
   Server receives
        ↓
   Check API key → NOT FOUND ❌
        ↓
   Return error to user:
   "GEMINI_API_KEY not configured"
```

---

## 🎯 Common Issues & Fixes

| Issue | Check | Fix |
|-------|-------|-----|
| "AI not responding" | API key set? | Add GEMINI_API_KEY to .env |
| Slow responses (>5s) | Internet speed? | Check connection |
| "Invalid API key" error | Key is recent? | Get new key from ai.google.dev |
| Database errors | PostgreSQL running? | Start PostgreSQL server |
| "Cannot GET /api/chat/guest" | Server running? | Run `npm start` |

---

## 🔑 API Key Sources

### Free Options
- **Google Gemini API** (FREE) ← Recommended
  - Go to: https://ai.google.dev/
  - Free tier: 15 requests/min
  - Usage limits per month
  
### Paid Options (If Free Limit Exceeded)
- Upgrade at https://ai.google.dev/
- Different pricing tiers available

---

## ✨ Quick Reference

### Check If AI Key Is Set
```bash
echo $GEMINI_API_KEY
# If blank → not set
# If shows key → configured
```

### Check If Database Is Connected
```bash
psql postgresql://user:pass@localhost:5432/khaysalpha
# If connects → database working
# If error → database not running
```

### Restart Everything
```bash
# Stop current server (Ctrl+C)
# Then:
npm start
```

---

## 📱 Testing on Phone

If you want to test from your phone on same network:

```bash
# Find your computer's IP
hostname -I

# Access from phone
http://YOUR_IP:5000

# Example: http://192.168.1.100:5000
```

---

## 💡 Pro Tips

1. **Don't Share Your API Key** - It's secret!
2. **Check Quota Regularly** - Free tier has limits
3. **Use Guest Chat First** - Test without login
4. **Monitor Console** - F12 shows errors
5. **Keep .env Secure** - Add to `.gitignore`

---

## 📞 Support Checklist

Before asking for help, verify:
- [ ] Is .env file created?
- [ ] Is GEMINI_API_KEY set in .env?
- [ ] Is DATABASE_URL set in .env?
- [ ] Did you restart after editing .env?
- [ ] Does `npm start` show ✅ configuration message?
- [ ] Are you accessing http://localhost:5000?
- [ ] Check browser console (F12) for errors?

---

## Next Steps

1. **Get API Key** → Go to https://ai.google.dev/
2. **Set Environment** → Create .env with your key
3. **Restart Server** → Run `npm start`
4. **Test Chat** → Open http://localhost:5000
5. **Verify Response** → Send guest message and see response

---

**KhaysAlpha AI** — Research Faster. Decide Smarter. 🚀

*Once API key is configured, AI responds within 1-2 seconds!*
