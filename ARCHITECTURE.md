# SlackShield Architecture

Technical architecture documentation for developers.

## System Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Frontend   │ ◄─────► │   Backend   │
│  (React)    │   HTTP  │   (Vite)     │   REST  │  (Express)  │
└─────────────┘         └──────────────┘         └──────┬──────┘
                                                          │
                        ┌─────────────────────────────────┼────────┐
                        │                                 │        │
                   ┌────▼────┐                      ┌────▼────┐   │
                   │  Slack  │                      │   DB    │   │
                   │   API   │                      │  (PG)   │   │
                   └─────────┘                      └─────────┘   │
                                                                   │
                                                    ┌──────────────▼──┐
                                                    │  Background     │
                                                    │  Scheduler      │
                                                    │  (node-cron)    │
                                                    └─────────────────┘
```

## Component Details

### 1. Frontend (React + Vite)

**Purpose:** User interface for managing schedules and viewing violations

**Key Files:**
- `src/App.jsx` - Main app component and routing
- `src/pages/Dashboard.jsx` - Main dashboard view
- `src/pages/Login.jsx` - Slack OAuth initiation
- `src/components/ScheduleEditor.jsx` - Schedule CRUD operations
- `src/components/ViolationList.jsx` - Display violation logs
- `src/services/api.js` - API client with axios

**State Management:** React hooks (useState, useEffect)
**Styling:** CSS modules with custom properties
**API Communication:** Axios with JWT authentication

### 2. Backend (Node.js + Express)

**Purpose:** API server, Slack integration, business logic

**Key Files:**
- `index.js` - Express app initialization
- `routes/auth.js` - Slack OAuth flow
- `routes/workspaces.js` - Workspace CRUD
- `routes/schedules.js` - Schedule CRUD
- `routes/violations.js` - Violation queries
- `routes/slack-events.js` - Slack webhook handler
- `services/dndScheduler.js` - Background DND enforcement
- `middleware/auth.js` - JWT authentication
- `utils/db.js` - PostgreSQL connection pool
- `utils/encryption.js` - Token encryption/decryption

**Security:**
- JWT for user authentication (30-day expiry)
- Slack tokens encrypted at rest (AES-256-CBC)
- Environment variables for secrets
- CORS protection
- Slack signing secret verification for webhooks

### 3. Database (PostgreSQL)

**Schema:**

```sql
users
├── id (UUID, PK)
├── email (VARCHAR, unique)
├── subscription_tier (VARCHAR)
└── created_at (TIMESTAMP)

slack_workspaces
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── team_id (VARCHAR)
├── team_name (VARCHAR)
├── access_token (TEXT, encrypted)
├── user_slack_id (VARCHAR)
└── connected_at (TIMESTAMP)

schedules
├── id (UUID, PK)
├── workspace_id (UUID, FK → slack_workspaces.id)
├── day_of_week (INT, 0-6)
├── start_time (TIME)
├── end_time (TIME)
├── timezone (VARCHAR)
├── is_active (BOOLEAN)
└── created_at (TIMESTAMP)

response_templates
├── id (UUID, PK)
├── workspace_id (UUID, FK → slack_workspaces.id)
├── message (TEXT)
├── is_default (BOOLEAN)
└── created_at (TIMESTAMP)

violation_logs
├── id (UUID, PK)
├── workspace_id (UUID, FK → slack_workspaces.id)
├── violator_slack_id (VARCHAR)
├── violator_name (VARCHAR)
├── channel_id (VARCHAR)
├── message_ts (VARCHAR)
├── occurred_at (TIMESTAMP)
├── auto_response_sent (BOOLEAN)
└── response_sent_at (TIMESTAMP)
```

**Indexes:**
- `slack_workspaces.user_id` - Fast workspace lookups
- `schedules.workspace_id` - Fast schedule queries
- `violation_logs.workspace_id` - Fast violation queries
- `violation_logs.occurred_at` - Time-based filtering

### 4. Background Scheduler

**File:** `services/dndScheduler.js`

**Schedule:** Runs every 5 minutes via node-cron

**Process Flow:**
1. Query all active schedules from database
2. For each schedule:
   - Get current time in schedule's timezone
   - Check if current time is within off-hours window
   - If yes, enable Slack DND for 60 minutes
3. Log results

**Timezone Handling:**
- Server uses UTC
- Schedules store timezone string (e.g., 'America/Toronto')
- Comparison done in schedule's local timezone

**Error Handling:**
- Individual workspace failures don't stop batch processing
- Errors logged but don't crash scheduler
- DND failures (already active) are handled gracefully

### 5. Slack Integration

#### OAuth Flow

```
1. User clicks "Connect Slack"
   └─> Frontend redirects to /api/auth/slack

2. Backend redirects to Slack OAuth
   └─> https://slack.com/oauth/v2/authorize

3. User approves in Slack
   └─> Slack redirects to /api/auth/slack/callback?code=xxx

4. Backend exchanges code for access token
   └─> POST https://slack.com/api/oauth.v2.access

5. Backend creates/updates user and workspace
   └─> Encrypts and stores access token

6. Backend returns JWT to frontend
   └─> Frontend stores in localStorage
```

#### Event Subscriptions

**File:** `routes/slack-events.js`

**Events Listened:**
- `message.im` - Direct messages to user

**Event Flow:**
```
1. User receives Slack message
   └─> Slack POSTs event to /slack/events

2. Verify event signature
   └─> Check Slack signing secret

3. Check if workspace is in SlackShield
   └─> Query slack_workspaces by team_id

4. Check if current time is off-hours
   └─> Query schedules for workspace

5. If off-hours:
   ├─> Log violation to database
   ├─> Fetch auto-response template
   └─> Send response via Slack API
```

#### Slack API Calls

**DND Management:**
```javascript
client.dnd.setSnooze({ num_minutes: 60 })
```

**Sending Messages:**
```javascript
client.chat.postMessage({
  channel: channelId,
  text: message,
  thread_ts: originalMessageTs
})
```

**User Info:**
```javascript
client.users.info({ user: userId })
```

## Data Flow Examples

### Setting a Schedule

```
Frontend                    Backend                     Database
   |                          |                            |
   |--POST /api/workspaces/:id/schedules                   |
   |      { day_of_week: 1,    |                           |
   |        start_time: 18:00, |                           |
   |        end_time: 08:00 }  |                           |
   |                          |                            |
   |                          |--Verify workspace belongs to user
   |                          |                            |
   |                          |--INSERT INTO schedules---->|
   |                          |                            |
   |                          |<---return schedule---------|
   |<--201 Created: schedule--|                            |
   |                          |                            |
```

### Off-Hours Message Received

```
Slack                       Backend                     Database
   |                          |                            |
   |--POST /slack/events      |                            |
   |    (message event)       |                            |
   |                          |--Get workspace by team_id->|
   |                          |<---workspace data----------|
   |                          |                            |
   |                          |--Check if off-hours------->|
   |                          |<---yes, off-hours----------|
   |                          |                            |
   |                          |--Log violation------------>|
   |                          |                            |
   |                          |--Get template------------->|
   |                          |<---template message--------|
   |<--Send auto-response-----|                            |
   |                          |--Update violation---------->|
   |                          |   (response_sent = true)   |
```

## Security Considerations

### Token Storage

**Problem:** Slack access tokens are sensitive
**Solution:** Encrypt tokens before storing in database

```javascript
// Encryption (AES-256-CBC)
const encrypt = (text) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv)
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex')
}

// Decryption
const decrypt = (encrypted) => {
  const [iv, data] = encrypted.split(':')
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, Buffer.from(iv, 'hex'))
  return decipher.update(data, 'hex', 'utf8')
}
```

### JWT Authentication

**Token Structure:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Middleware:**
```javascript
// Verify token from Authorization: Bearer <token>
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token' })

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' })
    req.user = user
    next()
  })
}
```

### Slack Event Verification

```javascript
// Slack signs requests with HMAC-SHA256
// Verify signature to ensure events are from Slack
slackEvents = createEventAdapter(SLACK_SIGNING_SECRET)
```

## Performance Optimizations

### Database Connection Pooling

```javascript
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})
```

### Caching Strategy (Future)

Potential optimizations:
- Cache workspace tokens in Redis (reduce DB queries)
- Cache schedule data (reduce DB load during cron runs)
- Cache template messages (faster auto-responses)

### Rate Limiting (Future)

Slack API rate limits:
- Tier 1: 1 request per minute per method
- Tier 2: 20 requests per minute per method
- Tier 3: 50+ requests per minute per method

Consider:
- Queue system for high-volume workspaces
- Batch API calls where possible
- Exponential backoff on rate limit errors

## Deployment Architecture

### Development

```
localhost:3000 (Frontend)
     ↓
localhost:3001 (Backend)
     ↓
localhost:5432 (PostgreSQL)
```

### Production (Recommended)

```
Vercel/Netlify (Frontend)
     ↓ HTTPS
Railway/Render (Backend)
     ↓
Supabase (PostgreSQL)
     ↓
Slack API
```

### Environment Variables Required

**Frontend (.env):**
```
VITE_API_URL=https://api.slackshield.com
```

**Backend (.env):**
```
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...
SLACK_REDIRECT_URI=https://slackshield.com/auth/slack/callback
FRONTEND_URL=https://slackshield.com
```

## Monitoring & Observability

### Logging

All major operations log to console:
- `[DND Scheduler]` - DND enforcement events
- `[Slack Events]` - Incoming Slack events
- `[Auth]` - OAuth flow events
- Database queries (in development)

### Health Checks

```
GET /health
→ 200 { "status": "ok", "message": "SlackShield API is running" }
```

### Error Tracking

Current: Console logs
Recommended for production: Sentry or similar

## Testing Strategy

### Manual Testing

See SETUP.md for end-to-end testing flow.

### Unit Tests (Future)

Recommended:
- `services/dndScheduler.js` - Time comparison logic
- `utils/encryption.js` - Encrypt/decrypt functions
- `middleware/auth.js` - JWT validation

### Integration Tests (Future)

Recommended:
- OAuth flow end-to-end
- Schedule CRUD operations
- Violation logging
- Slack event handling

## Scaling Considerations

### Single User → 100 Users

Current architecture handles this fine:
- PostgreSQL can handle 100s of users easily
- DND scheduler runs every 5 min for all workspaces
- Auto-responses are event-driven (no polling)

### 100 Users → 1000 Users

Potential bottlenecks:
- DND scheduler processing time (5 min window)
- Database connections during peak times
- Slack API rate limits

Solutions:
- Shard schedule processing (different cron intervals)
- Add Redis for caching
- Implement job queue (BullMQ)

### 1000+ Users

Required changes:
- Microservices architecture
- Separate scheduler service
- Message queue for Slack events
- Read replicas for database
- CDN for frontend

## Future Enhancements

### Phase 2 Features

1. **Weekly Reports**
   - Email digest of violations
   - Top violators list
   - Boundary health score

2. **Nuclear Mode**
   - Browser extension
   - Completely block slack.com during off-hours
   - Show "You're off the clock" page

3. **Team Plans**
   - Multiple users per organization
   - Manager dashboard
   - Aggregate (anonymous) metrics

### Technical Debt

- Add comprehensive error handling
- Implement retry logic for Slack API calls
- Add request validation (express-validator)
- Implement rate limiting
- Add database migrations tool (Knex.js)
- Add automated tests
- Set up CI/CD pipeline

## Contributing

See SETUP.md for development environment setup.

Key principles:
- Keep it simple (KISS)
- Security first
- User privacy is paramount
- Clear error messages
- Log everything (in development)

---

**Questions?** Open an issue on GitHub.
