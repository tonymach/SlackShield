# SlackShield Setup Guide

Complete step-by-step guide to get SlackShield running locally.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or a Supabase account)
- A Slack workspace where you have admin access
- Git

## Part 1: Database Setup

### Option A: Local PostgreSQL

1. Install PostgreSQL if you haven't already:
```bash
# macOS
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt install postgresql-14
sudo systemctl start postgresql
```

2. Create database:
```bash
psql -U postgres
CREATE DATABASE slackshield;
\q
```

3. Run schema:
```bash
psql -U postgres -d slackshield -f slackshield-api/database/schema.sql
```

### Option B: Supabase (Recommended for MVP)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to SQL Editor
4. Copy and paste contents of `slackshield-api/database/schema.sql`
5. Click "Run"
6. Go to Project Settings > Database and copy the connection string
7. You'll use this connection string in your `.env` file

## Part 2: Slack App Setup

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: "SlackShield"
4. Choose your development workspace
5. Click "Create App"

### Configure OAuth & Permissions

1. In the left sidebar, click "OAuth & Permissions"
2. Scroll to "Scopes" section
3. Add these **User Token Scopes**:
   - `users:read` - View people in the workspace
   - `users:write` - Modify your user profile
   - `chat:write` - Send messages as you
   - `dnd:write` - Set your Do Not Disturb status
   - `im:write` - Start direct messages with people
   - `channels:read` - View basic channel information
   - `groups:read` - View basic private channel information

4. Scroll to "Redirect URLs" and add:
   - Development: `http://localhost:3000/auth/slack/callback`
   - Production: `https://yourdomain.com/auth/slack/callback`

5. Click "Save URLs"

### Enable Event Subscriptions

1. In the left sidebar, click "Event Subscriptions"
2. Toggle "Enable Events" to **On**
3. For development, you'll need a public URL. Options:
   - **ngrok** (recommended): `ngrok http 3001` then use the URL
   - **localhost.run**: `ssh -R 80:localhost:3001 localhost.run`
   - **Cloudflare Tunnel**: Follow their docs

4. Set Request URL to: `https://your-public-url/slack/events`
   - Slack will verify this URL (you need your API running first)

5. Subscribe to bot events:
   - `message.im` - Listen for direct messages
   - `message.channels` - Listen for channel messages (optional)

6. Click "Save Changes"

### Get Your Credentials

1. Go to "Basic Information" in the left sidebar
2. Scroll to "App Credentials"
3. Copy:
   - **Client ID**
   - **Client Secret**
   - **Signing Secret**

You'll need these for your `.env` file.

## Part 3: Backend Setup

1. Navigate to the API directory:
```bash
cd slackshield-api
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` with your values:
```env
PORT=3001
NODE_ENV=development

# Database - Use your connection string
DATABASE_URL=postgresql://user:password@localhost:5432/slackshield
# OR for Supabase:
# DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# JWT Secret - Generate a random string
JWT_SECRET=your-super-secret-jwt-key-change-this

# Encryption Key - Must be exactly 32 characters
ENCRYPTION_KEY=your-32-character-encryption-key

# Slack App Credentials - From api.slack.com/apps
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

5. Generate secure keys:
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

6. Test database connection:
```bash
npm run dev
```

You should see:
```
✅ Database connected
🛡️  SlackShield API running on port 3001
⏰ DND Scheduler started
```

## Part 4: Frontend Setup

1. Open a new terminal and navigate to the web directory:
```bash
cd slackshield-web
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env`:
```env
VITE_API_URL=http://localhost:3001
```

5. Start the development server:
```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Part 5: Testing the Full Flow

### 1. Test Login Page

1. Open http://localhost:3000 in your browser
2. You should see the SlackShield login page
3. Click "Connect with Slack"

### 2. Complete Slack OAuth

1. You'll be redirected to Slack
2. Review the permissions
3. Click "Allow"
4. You should be redirected back to the dashboard

### 3. Set Up a Schedule

1. In the dashboard, find "Your Schedule" section
2. Click "Add Schedule"
3. Configure:
   - Day: Monday
   - Start Time: 18:00 (6 PM)
   - End Time: 08:00 (8 AM next day)
   - Timezone: Your timezone
4. Click "Add Schedule"

### 4. Test Auto-Response

For testing purposes, temporarily set a schedule that includes the current time:

1. Create a test schedule:
   - Day: Today's day
   - Start Time: 5 minutes ago
   - End Time: 1 hour from now
2. Save it

3. From another Slack account (or ask a colleague):
   - Send yourself a direct message in Slack

4. You should see:
   - The message appears in your Slack
   - An auto-response is sent immediately
   - The violation appears in your dashboard

### 5. Test DND Enforcement

1. Wait 5 minutes (or restart the API server to trigger immediate check)
2. Check your Slack status - it should show DND/snooze
3. Check the API logs:
```
[DND Scheduler] ✅ DND enabled for workspace: Your Workspace Name
```

## Part 6: Exposing Your API for Slack Events

Slack needs to send events to your API. For local development:

### Using ngrok (Easiest)

1. Install ngrok: https://ngrok.com/download
2. Run:
```bash
ngrok http 3001
```
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Go to your Slack App > Event Subscriptions
5. Set Request URL to: `https://abc123.ngrok.io/slack/events`
6. Slack will verify the URL (make sure your API is running!)

### Using localhost.run (No account needed)

```bash
ssh -R 80:localhost:3001 localhost.run
```

Copy the URL and use it in Slack Event Subscriptions.

## Troubleshooting

### Database Connection Errors

```
❌ Unexpected database error
```

**Solution:**
- Check your `DATABASE_URL` is correct
- Ensure PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
- Test connection: `psql -U postgres -d slackshield`

### Slack OAuth Errors

```
error=access_denied
```

**Solution:**
- Check `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` in `.env`
- Verify redirect URI in Slack App matches exactly: http://localhost:3000/auth/slack/callback
- Check Slack App is installed in your workspace

### Events Not Received

**Solution:**
- Verify Event Subscriptions Request URL is set correctly
- Check ngrok/tunnel is running
- Look at ngrok web interface: http://127.0.0.1:4040
- Check API logs for incoming events

### DND Not Activating

**Solution:**
- Check schedule timezone matches your actual timezone
- Verify schedule times are correct
- Check API logs for DND scheduler output
- Make sure schedule `is_active` is true

### Auto-Response Not Sending

**Solution:**
- Check you subscribed to `message.im` event in Slack App
- Verify Event Subscriptions URL is working
- Check API logs for event handling
- Make sure you're testing during scheduled off-hours

## Next Steps

Once everything works locally:

1. **Deploy to production** - See DEPLOYMENT.md (coming soon)
2. **Add multiple schedules** - Weekday vs weekend
3. **Customize auto-response** - Edit templates in dashboard
4. **Invite team members** - Each person needs their own SlackShield account

## Common Development Commands

```bash
# Backend
cd slackshield-api
npm run dev          # Start with auto-reload
npm start            # Start production mode

# Frontend
cd slackshield-web
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Database
psql -d slackshield                          # Connect to database
psql -d slackshield -f database/schema.sql   # Re-run schema
```

## Need Help?

- Check the logs in both terminal windows
- Most errors show helpful messages
- Common issues are listed in Troubleshooting above
- Open an issue on GitHub if stuck

---

**You're all set! 🛡️**

SlackShield is now running and protecting your boundaries.
