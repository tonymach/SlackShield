# SlackShield Unit Test Plan

Comprehensive testing strategy to ensure all functionality works correctly and is maintainable.

## Testing Philosophy

**Goals:**
1. ✅ **Confidence** - Tests prove the code works
2. 🔧 **Maintainability** - Easy to update when code changes
3. 📊 **Coverage** - Test critical paths, not just lines
4. ⚡ **Speed** - Fast feedback loop for developers
5. 🎯 **Focus** - Test behavior, not implementation

**Testing Pyramid:**
```
        /\
       /  \      E2E Tests (5%)
      /    \     - Critical user flows
     /------\
    /        \   Integration Tests (15%)
   /          \  - API endpoints
  /------------\ - Database operations
 /              \
/________________\ Unit Tests (80%)
                   - Pure functions
                   - Business logic
                   - Component behavior
```

## Test Coverage Goals

**Overall Target:** 80%+ line coverage
- Backend utilities: 100%
- Middleware: 95%
- Services: 90%
- Routes: 85%
- Frontend components: 75%

## Backend Testing Strategy

### 1. Utilities (`utils/`)

#### `utils/encryption.js`
**What to test:**
- ✅ Encrypt produces different output each time (due to IV)
- ✅ Decrypt reverses encryption correctly
- ✅ Encrypted text contains ':' separator (IV:data)
- ✅ Decrypt handles invalid input gracefully
- ✅ Round-trip encryption/decryption works for various inputs
  - Short strings
  - Long strings (1000+ chars)
  - Special characters
  - Unicode/emoji
  - Empty strings (edge case)

**Test cases:**
```javascript
describe('Encryption', () => {
  test('encrypts and decrypts correctly', () => {
    const original = 'xoxp-slack-token-123'
    const encrypted = encrypt(original)
    expect(encrypted).not.toBe(original)
    expect(encrypted).toContain(':')

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(original)
  })

  test('produces different ciphertext each time', () => {
    const text = 'test'
    const encrypted1 = encrypt(text)
    const encrypted2 = encrypt(text)
    expect(encrypted1).not.toBe(encrypted2) // Different IVs
  })

  test('handles special characters', () => {
    const special = '!@#$%^&*()_+-=[]{}|;:",.<>?/`~'
    const encrypted = encrypt(special)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(special)
  })

  test('handles emoji and unicode', () => {
    const emoji = '🛡️ SlackShield 日本語 中文'
    const encrypted = encrypt(emoji)
    const decrypted = decrypt(emoji)
    expect(decrypted).toBe(emoji)
  })

  test('throws on invalid encrypted format', () => {
    expect(() => decrypt('invalid')).toThrow()
  })

  test('handles empty string', () => {
    const encrypted = encrypt('')
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe('')
  })
})
```

#### `utils/db.js`
**What to test:**
- ✅ Query function calls pool.query with correct params
- ✅ Query logs in development mode
- ✅ Query doesn't log in production
- ✅ Query handles database errors gracefully
- ✅ getClient returns a client from pool

**Approach:** Mock `pg` module
```javascript
jest.mock('pg')

describe('Database utilities', () => {
  test('query executes with parameters', async () => {
    const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    Pool.mockImplementation(() => ({ query: mockQuery }))

    await query('SELECT * FROM users WHERE id = $1', ['123'])

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', ['123'])
  })

  test('query handles errors', async () => {
    const mockQuery = jest.fn().mockRejectedValue(new Error('Connection failed'))
    Pool.mockImplementation(() => ({ query: mockQuery }))

    await expect(query('SELECT 1')).rejects.toThrow('Connection failed')
  })
})
```

### 2. Middleware (`middleware/`)

#### `middleware/auth.js`
**What to test:**
- ✅ authenticateToken accepts valid JWT
- ✅ authenticateToken rejects missing token (401)
- ✅ authenticateToken rejects invalid token (403)
- ✅ authenticateToken rejects expired token (403)
- ✅ authenticateToken extracts user from token
- ✅ generateToken creates valid JWT
- ✅ generateToken includes correct claims (id, email)
- ✅ generateToken sets 30-day expiry

**Test cases:**
```javascript
describe('JWT Authentication', () => {
  test('authenticateToken accepts valid token', () => {
    const req = {
      headers: { authorization: 'Bearer valid-token' }
    }
    const res = {}
    const next = jest.fn()

    // Mock jwt.verify to call callback with user
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, { id: '123', email: 'test@example.com' })
    })

    authenticateToken(req, res, next)

    expect(req.user).toEqual({ id: '123', email: 'test@example.com' })
    expect(next).toHaveBeenCalled()
  })

  test('authenticateToken rejects missing token', () => {
    const req = { headers: {} }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    authenticateToken(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' })
    expect(next).not.toHaveBeenCalled()
  })

  test('generateToken creates valid JWT', () => {
    const user = { id: '123', email: 'test@example.com' }
    const token = generateToken(user)

    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts

    const decoded = jwt.decode(token)
    expect(decoded.id).toBe('123')
    expect(decoded.email).toBe('test@example.com')
  })
})
```

### 3. Services (`services/`)

#### `services/dndScheduler.js`
**What to test:**
- ✅ isWithinOffHours correctly identifies off-hours (same-day schedule)
- ✅ isWithinOffHours correctly identifies off-hours (overnight schedule)
- ✅ isWithinOffHours returns false for wrong day
- ✅ isWithinOffHours handles edge cases (exactly at start/end time)
- ✅ processDNDSchedules queries active schedules
- ✅ processDNDSchedules enables DND for matching schedules
- ✅ processDNDSchedules skips non-matching schedules
- ✅ processDNDSchedules handles Slack API errors gracefully
- ✅ startDNDScheduler sets up cron job

**Critical test cases:**
```javascript
describe('DND Scheduler - Time Logic', () => {
  describe('isWithinOffHours - Same-day schedule', () => {
    const schedule = {
      day_of_week: 1, // Monday
      start_time: '09:00',
      end_time: '17:00'
    }

    test('returns true when within hours', () => {
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(true)
      expect(isWithinOffHours('09:00', 1, schedule)).toBe(true) // Start boundary
      expect(isWithinOffHours('16:59', 1, schedule)).toBe(true) // End boundary
    })

    test('returns false when outside hours', () => {
      expect(isWithinOffHours('08:59', 1, schedule)).toBe(false)
      expect(isWithinOffHours('17:00', 1, schedule)).toBe(false) // Exactly at end
      expect(isWithinOffHours('18:00', 1, schedule)).toBe(false)
    })

    test('returns false for wrong day', () => {
      expect(isWithinOffHours('12:00', 2, schedule)).toBe(false) // Tuesday
    })
  })

  describe('isWithinOffHours - Overnight schedule', () => {
    const schedule = {
      day_of_week: 1, // Monday
      start_time: '18:00', // 6 PM
      end_time: '08:00'    // 8 AM next day
    }

    test('returns true after start time', () => {
      expect(isWithinOffHours('18:00', 1, schedule)).toBe(true)
      expect(isWithinOffHours('23:59', 1, schedule)).toBe(true)
    })

    test('returns true before end time', () => {
      expect(isWithinOffHours('00:00', 1, schedule)).toBe(true)
      expect(isWithinOffHours('07:59', 1, schedule)).toBe(true)
    })

    test('returns false during day hours', () => {
      expect(isWithinOffHours('08:00', 1, schedule)).toBe(false)
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(false)
      expect(isWithinOffHours('17:59', 1, schedule)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    test('handles midnight correctly', () => {
      const schedule = { day_of_week: 1, start_time: '23:00', end_time: '01:00' }
      expect(isWithinOffHours('23:30', 1, schedule)).toBe(true)
      expect(isWithinOffHours('00:30', 1, schedule)).toBe(true)
    })

    test('handles exact same start and end time', () => {
      const schedule = { day_of_week: 1, start_time: '00:00', end_time: '00:00' }
      // This is a degenerate case - decide on expected behavior
      expect(isWithinOffHours('12:00', 1, schedule)).toBe(false)
    })
  })
})

describe('DND Scheduler - Integration', () => {
  test('processDNDSchedules enables DND for active schedules', async () => {
    // Mock database query to return active schedules
    // Mock Slack API calls
    // Verify DND was enabled for matching schedules
  })

  test('processDNDSchedules handles Slack API errors', async () => {
    // Mock Slack API to throw error
    // Verify error is logged but doesn't crash
  })
})
```

### 4. Routes (`routes/`)

**Testing approach:** Use `supertest` for HTTP testing

#### `routes/auth.js`
**What to test:**
- ✅ GET /slack redirects to Slack OAuth URL
- ✅ GET /slack/callback exchanges code for token
- ✅ GET /slack/callback creates new user if needed
- ✅ GET /slack/callback updates existing workspace
- ✅ GET /slack/callback returns JWT token
- ✅ GET /slack/callback handles Slack API errors
- ✅ GET /me returns user info for valid token
- ✅ GET /me returns 401 for missing token

```javascript
describe('Auth Routes', () => {
  test('GET /api/auth/slack redirects to Slack', async () => {
    const response = await request(app)
      .get('/api/auth/slack')
      .expect(302)

    expect(response.headers.location).toContain('slack.com/oauth')
    expect(response.headers.location).toContain('client_id')
  })

  test('GET /api/auth/slack/callback with valid code', async () => {
    // Mock fetch to return successful Slack response
    // Mock database queries
    const response = await request(app)
      .get('/api/auth/slack/callback?code=valid-code')
      .expect(200)

    expect(response.body).toHaveProperty('token')
    expect(response.body.user).toHaveProperty('id')
  })

  test('GET /api/auth/me returns user for valid token', async () => {
    const token = generateToken({ id: '123', email: 'test@example.com' })

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(response.body.user).toHaveProperty('email')
  })
})
```

#### `routes/workspaces.js`
**What to test:**
- ✅ GET /workspaces returns user's workspaces
- ✅ GET /workspaces requires authentication
- ✅ GET /workspaces/:id returns specific workspace
- ✅ GET /workspaces/:id returns 404 for non-existent
- ✅ DELETE /workspaces/:id removes workspace
- ✅ DELETE /workspaces/:id returns 404 for other user's workspace

#### `routes/schedules.js`
**What to test:**
- ✅ PUT /schedules/:id updates schedule
- ✅ PUT /schedules/:id validates ownership
- ✅ DELETE /schedules/:id removes schedule
- ✅ PUT /schedules/:id handles partial updates

#### `routes/slack-events.js`
**What to test:**
- ✅ POST /slack/events handles message events
- ✅ POST /slack/events verifies Slack signature
- ✅ POST /slack/events ignores bot messages
- ✅ POST /slack/events logs violations during off-hours
- ✅ POST /slack/events sends auto-response
- ✅ POST /slack/events does nothing during work hours

### 5. Route Helpers

**Extract testable functions from routes:**

Before:
```javascript
// routes/slack-events.js
slackEvents.on('message', async (event) => {
  // 100 lines of logic inline
})
```

After (more testable):
```javascript
// services/violationHandler.js
export async function handleOffHoursMessage(event, workspace) {
  // Logic here
  return { violationLogged: true, responseSent: true }
}

// routes/slack-events.js
slackEvents.on('message', async (event) => {
  const workspace = await getWorkspaceByTeamId(event.team)
  const result = await handleOffHoursMessage(event, workspace)
  // Minimal glue code
})
```

## Frontend Testing Strategy

### 1. Components (`components/`)

#### `ScheduleEditor.jsx`
**What to test:**
- ✅ Renders schedule list correctly
- ✅ Shows empty state when no schedules
- ✅ Opens form when "Add Schedule" clicked
- ✅ Submits form with correct data
- ✅ Calls onUpdate callback after successful creation
- ✅ Toggles schedule active/inactive
- ✅ Deletes schedule with confirmation
- ✅ Validates time inputs
- ✅ Handles API errors gracefully

```javascript
describe('ScheduleEditor', () => {
  test('renders schedule list', () => {
    const schedules = [
      { id: '1', day_of_week: 1, start_time: '18:00', end_time: '08:00', is_active: true }
    ]

    render(<ScheduleEditor schedules={schedules} workspaceId="ws-1" onUpdate={jest.fn()} />)

    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('18:00 - 08:00')).toBeInTheDocument()
  })

  test('shows empty state', () => {
    render(<ScheduleEditor schedules={[]} workspaceId="ws-1" onUpdate={jest.fn()} />)

    expect(screen.getByText(/no schedules configured/i)).toBeInTheDocument()
  })

  test('submits new schedule', async () => {
    const mockOnUpdate = jest.fn()
    scheduleAPI.create = jest.fn().mockResolvedValue({ data: {} })

    render(<ScheduleEditor schedules={[]} workspaceId="ws-1" onUpdate={mockOnUpdate} />)

    fireEvent.click(screen.getByText('+ Add Schedule'))
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '18:00' } })
    fireEvent.change(screen.getByLabelText(/end time/i), { target: { value: '08:00' } })
    fireEvent.click(screen.getByText(/add schedule/i))

    await waitFor(() => {
      expect(scheduleAPI.create).toHaveBeenCalledWith('ws-1', expect.objectContaining({
        start_time: '18:00',
        end_time: '08:00'
      }))
      expect(mockOnUpdate).toHaveBeenCalled()
    })
  })
})
```

#### `ViolationList.jsx`
**What to test:**
- ✅ Renders violation list
- ✅ Filters by time period (today, week, month)
- ✅ Groups violations by violator
- ✅ Expands/collapses groups
- ✅ Shows empty state
- ✅ Formats dates correctly

#### `TemplateEditor.jsx`
**What to test:**
- ✅ Displays current template
- ✅ Switches to edit mode
- ✅ Saves updated template
- ✅ Resets to default
- ✅ Validates non-empty message

### 2. Pages (`pages/`)

#### `Dashboard.jsx`
**What to test:**
- ✅ Redirects to login if no token
- ✅ Fetches workspace data on mount
- ✅ Displays workspace list
- ✅ Switches between workspaces
- ✅ Shows statistics
- ✅ Passes correct props to child components

#### `Login.jsx`
**What to test:**
- ✅ Renders login UI
- ✅ Redirects to Slack OAuth on button click
- ✅ Uses correct redirect URL from env

#### `AuthCallback.jsx`
**What to test:**
- ✅ Shows loading state initially
- ✅ Exchanges code for token
- ✅ Stores token in localStorage
- ✅ Redirects to dashboard on success
- ✅ Shows error message on failure
- ✅ Redirects to login after error

### 3. Services (`services/`)

#### `api.js`
**What to test:**
- ✅ Adds Authorization header with token
- ✅ Handles 401 by clearing token and redirecting
- ✅ Makes correct API calls for each method
- ✅ Passes parameters correctly

```javascript
describe('API Service', () => {
  test('adds Authorization header', async () => {
    localStorage.setItem('slackshield_token', 'test-token')

    axios.get = jest.fn().mockResolvedValue({ data: [] })

    await workspaceAPI.getAll()

    expect(axios.get).toHaveBeenCalledWith('/workspaces', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer test-token'
      })
    }))
  })

  test('redirects on 401', async () => {
    axios.get = jest.fn().mockRejectedValue({ response: { status: 401 } })

    await workspaceAPI.getAll().catch(() => {})

    expect(localStorage.getItem('slackshield_token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})
```

## Integration Testing Strategy

**Critical user flows to test end-to-end:**

### 1. OAuth Flow
```javascript
describe('OAuth Integration', () => {
  test('complete authentication flow', async () => {
    // 1. Click "Connect with Slack"
    // 2. Mock Slack redirect
    // 3. Handle callback with code
    // 4. Verify token stored
    // 5. Verify redirected to dashboard
  })
})
```

### 2. Schedule Creation & DND Enforcement
```javascript
describe('Schedule Integration', () => {
  test('creating schedule enables DND at correct time', async () => {
    // 1. Create schedule via API
    // 2. Mock time to be within schedule
    // 3. Run DND scheduler
    // 4. Verify Slack DND API was called
  })
})
```

### 3. Off-Hours Message & Auto-Response
```javascript
describe('Auto-Response Integration', () => {
  test('off-hours message triggers response', async () => {
    // 1. Set up schedule
    // 2. Mock Slack event (message received)
    // 3. Verify violation logged
    // 4. Verify auto-response sent
    // 5. Verify violation appears in dashboard
  })
})
```

## Test Infrastructure

### Backend (`slackshield-api`)

**Dependencies:**
```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@types/jest": "^29.5.8"
  }
}
```

**jest.config.js:**
```javascript
export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'utils/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    }
  },
  testMatch: ['**/__tests__/**/*.test.js']
}
```

### Frontend (`slackshield-web`)

**Dependencies:**
```json
{
  "devDependencies": {
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.0.4",
    "jsdom": "^23.0.1"
  }
}
```

**vitest.config.js:**
```javascript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
})
```

## Test Organization

```
slackshield-api/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── encryption.test.js
│   │   │   └── db.test.js
│   │   ├── middleware/
│   │   │   └── auth.test.js
│   │   └── services/
│   │       └── dndScheduler.test.js
│   └── integration/
│       ├── auth.test.js
│       ├── schedules.test.js
│       └── violations.test.js
└── jest.config.js

slackshield-web/
├── src/
│   ├── __tests__/
│   │   ├── components/
│   │   │   ├── ScheduleEditor.test.jsx
│   │   │   ├── ViolationList.test.jsx
│   │   │   └── TemplateEditor.test.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.test.jsx
│   │   │   └── AuthCallback.test.jsx
│   │   └── services/
│   │       └── api.test.js
│   └── test/
│       └── setup.js
└── vitest.config.js
```

## Test Commands

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration"
  }
}
```

## Testability Refactoring Needed

### 1. Extract Pure Functions

**Before:**
```javascript
// routes/slack-events.js - hard to test
slackEvents.on('message', async (event) => {
  const now = new Date()
  const currentTime = now.toTimeString().slice(0, 5)
  // ... 50 lines of logic
})
```

**After:**
```javascript
// services/timeUtils.js - easy to test
export function getCurrentTime() {
  return new Date().toTimeString().slice(0, 5)
}

export function isCurrentlyOffHours(schedules, currentTime, dayOfWeek) {
  // Pure function - deterministic
}
```

### 2. Dependency Injection

**Before:**
```javascript
// Hard to test - creates WebClient internally
async function sendAutoResponse(token, channel, message) {
  const client = new WebClient(token)
  await client.chat.postMessage({ channel, text: message })
}
```

**After:**
```javascript
// Easy to test - client injected
async function sendAutoResponse(client, channel, message) {
  await client.chat.postMessage({ channel, text: message })
}
```

### 3. Extract Slack API Wrapper

```javascript
// services/slackClient.js
export class SlackClientWrapper {
  constructor(token) {
    this.client = new WebClient(token)
  }

  async setDND(minutes) {
    return await this.client.dnd.setSnooze({ num_minutes: minutes })
  }

  async sendMessage(channel, text, threadTs) {
    return await this.client.chat.postMessage({ channel, text, thread_ts: threadTs })
  }
}

// Now easy to mock in tests
```

## Coverage Reporting

**Generate coverage report:**
```bash
npm run test:coverage
```

**View HTML report:**
```bash
open coverage/index.html
```

**CI/CD Integration:**
- Fail build if coverage < 80%
- Post coverage reports to PR comments
- Track coverage trends over time

## Test Data & Fixtures

```javascript
// __tests__/fixtures/users.js
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  subscription_tier: 'free'
}

export const mockWorkspace = {
  id: 'ws-123',
  team_id: 'T123ABC',
  team_name: 'Test Workspace',
  user_slack_id: 'U123'
}

export const mockSchedule = {
  id: 'sch-123',
  workspace_id: 'ws-123',
  day_of_week: 1,
  start_time: '18:00',
  end_time: '08:00',
  timezone: 'America/Toronto',
  is_active: true
}
```

## Next Steps

1. ✅ Set up Jest for backend
2. ✅ Set up Vitest for frontend
3. ✅ Write critical unit tests (encryption, time logic)
4. ✅ Refactor for testability where needed
5. ✅ Write route tests with supertest
6. ✅ Write component tests with RTL
7. ✅ Add integration tests for key flows
8. ✅ Set up coverage reporting
9. ✅ Add pre-commit hook to run tests
10. ✅ Document test patterns for contributors

## Success Metrics

- ✅ 80%+ code coverage
- ✅ All critical paths tested
- ✅ Tests run in < 30 seconds
- ✅ Zero flaky tests
- ✅ Easy to add new tests (good patterns)

---

**Let's build bulletproof code! 🧪**
