# SlackShield Quick Start

Get SlackShield running in 10 minutes. For detailed setup, see [SETUP.md](SETUP.md).

## Prerequisites

- Node.js 18+
- PostgreSQL or [Supabase](https://supabase.com) account (free)
- Slack workspace admin access

## 1. Clone & Install (2 min)

```bash
git clone <your-repo-url>
cd SlackShield

# Install backend
cd slackshield-api
npm install
cd ..

# Install frontend
cd slackshield-web
npm install
cd ..
```

## 2. Database Setup (2 min)

### Using Supabase (Easiest)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor
4. Copy/paste `slackshield-api/database/schema.sql`
5. Run it
6. Copy connection string from Project Settings > Database

## 3. Slack App Setup (3 min)

1. Go to https://api.slack.com/apps → Create New App → From scratch
2. Name: "SlackShield", select your workspace
3. **OAuth & Permissions** → Add User Token Scopes:
   - `users:read`, `users:write`, `chat:write`, `dnd:write`, `im:write`, `channels:read`, `groups:read`
4. **OAuth & Permissions** → Redirect URLs:
   - Add: `http://localhost:3000/auth/slack/callback`
5. **Event Subscriptions** → Enable Events
   - Request URL: `https://your-ngrok-url/slack/events` (see step 5)
   - Subscribe to: `message.im`
6. **Basic Information** → Copy:
   - Client ID
   - Client Secret
   - Signing Secret

## 4. Configure Environment (1 min)

### Backend `.env`

```bash
cd slackshield-api
cp .env.example .env
```

Edit `slackshield-api/.env`:
```env
PORT=3001
DATABASE_URL=your-supabase-connection-string
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
FRONTEND_URL=http://localhost:3000
```

### Frontend `.env`

```bash
cd slackshield-web
cp .env.example .env
```

Edit `slackshield-web/.env`:
```env
VITE_API_URL=http://localhost:3001
```

## 5. Start Everything (2 min)

### Terminal 1: Backend

```bash
cd slackshield-api
npm run dev
```

Should see:
```
✅ Database connected
🛡️  SlackShield API running on port 3001
⏰ DND Scheduler started
```

### Terminal 2: Frontend

```bash
cd slackshield-web
npm run dev
```

Should see:
```
➜  Local:   http://localhost:3000/
```

### Terminal 3: ngrok (for Slack events)

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3001
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

Update Slack App Event Subscriptions Request URL:
`https://abc123.ngrok.io/slack/events`

## 6. Test It!

1. Open http://localhost:3000
2. Click "Connect with Slack"
3. Authorize the app
4. Add a schedule:
   - Day: Today
   - Start: Current time - 5 minutes
   - End: Current time + 1 hour
5. From another account, DM yourself
6. See auto-response! ✅

## Troubleshooting

**"Database connection failed"**
→ Check `DATABASE_URL` is correct

**"Slack OAuth error"**
→ Verify Client ID/Secret, check redirect URI matches exactly

**"Events not received"**
→ Make sure ngrok is running, URL in Slack App is correct

**"DND not activating"**
→ Check schedule timezone, verify times are correct

## Next Steps

- Read [SETUP.md](SETUP.md) for detailed docs
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Customize auto-response template
- Set up real schedules (weekday evenings, weekends)

## Quick Commands

```bash
# Backend
cd slackshield-api
npm run dev          # Start with hot reload

# Frontend
cd slackshield-web
npm run dev          # Start dev server

# Database
psql $DATABASE_URL                        # Connect
psql $DATABASE_URL -f database/schema.sql # Reset schema

# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

**You're ready! 🛡️ Protect those boundaries.**
