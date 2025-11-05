# SlackShield

A Slack boundary enforcement tool that prevents after-hours notifications, auto-responds to violators, and creates accountability reports.

## Project Structure

```
SlackShield/
├── slackshield-web/       # React frontend (Vite)
└── slackshield-api/       # Node.js + Express backend
```

## Features

- 🔔 Automatic DND (Do Not Disturb) enforcement during off-hours
- 🤖 Auto-response to messages received outside work hours
- 📊 Violation tracking and analytics dashboard
- ⚙️ Customizable schedules and response templates
- 📈 Weekly reports showing boundary violations

## Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Axios for API calls
- Recharts for analytics visualization

### Backend
- Node.js + Express
- PostgreSQL database
- Slack Web API & Events API
- node-cron for scheduling
- JWT for authentication

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Slack workspace for testing
- Slack App credentials (Client ID, Client Secret, Signing Secret)

### Backend Setup

1. Navigate to the API directory:
```bash
cd slackshield-api
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/slackshield
JWT_SECRET=your-jwt-secret-here

SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_REDIRECT_URI=http://localhost:3000/auth/slack/callback
```

4. Set up the database:
```bash
psql -U postgres -f database/schema.sql
```

5. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the web directory:
```bash
cd slackshield-web
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```
VITE_API_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Slack App Configuration

1. Go to https://api.slack.com/apps
2. Create a new app "SlackShield"
3. Configure OAuth & Permissions:
   - Add scopes: `users:read`, `users:write`, `chat:write`, `dnd:write`, `im:write`, `channels:read`, `groups:read`
   - Set redirect URL: `http://localhost:3000/auth/slack/callback`
4. Enable Event Subscriptions:
   - Subscribe to: `message.im`
   - Request URL: `http://your-api-url/slack/events`
5. Install to your test workspace

## Development Roadmap

### Phase 1: Core MVP ✅
- [x] Slack OAuth integration
- [x] Set off-hours schedule
- [x] Auto-enable DND during off-hours
- [x] Basic auto-response to DMs
- [x] Violation logging
- [x] Simple dashboard

### Phase 2: Reports & Analytics
- [ ] Weekly email reports
- [ ] Charts/analytics
- [ ] Custom response templates
- [ ] Multiple schedules

### Phase 3: Monetization & Polish
- [ ] Stripe integration (Free/Pro tiers)
- [ ] Nuclear mode (browser extension)
- [ ] Landing page
- [ ] Onboarding flow

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
