import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import morgan from 'morgan'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import scheduleRoutes from './routes/schedules.js'
import violationRoutes from './routes/violations.js'
import templateRoutes from './routes/templates.js'
import slackEventsRoutes from './routes/slack-events.js'
import { startDNDScheduler } from './services/dndScheduler.js'
import { authenticateToken } from './middleware/auth.js'
import {
  securityHeaders,
  apiLimiter,
  requestId,
  enforceHTTPS,
  sanitizeError,
  corsOptions,
  secureResponseHeaders,
  bodyParserLimits
} from './middleware/security.js'
import { auditMiddleware } from './utils/auditLog.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1)

// Security Middleware (applied to all routes)
app.use(requestId) // Add unique request ID
app.use(securityHeaders()) // Security headers (helmet.js)
app.use(enforceHTTPS) // Enforce HTTPS in production
app.use(secureResponseHeaders) // Additional response headers

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  // Production: structured JSON logs
  app.use(morgan('combined'))
}

// CORS with whitelist
app.use(cors(corsOptions()))

// Body parsing with size limits
app.use(express.json(bodyParserLimits.json))
app.use(express.urlencoded(bodyParserLimits.urlencoded))

// Audit logging middleware
app.use(auditMiddleware)

// Health check (no rate limit)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SlackShield API is running',
    timestamp: new Date().toISOString(),
    requestId: req.id,
    environment: process.env.NODE_ENV || 'development'
  })
})

// Apply rate limiting to API routes
app.use('/api', apiLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/workspaces', authenticateToken, workspaceRoutes)
app.use('/api/schedules', authenticateToken, scheduleRoutes)
app.use('/api/violations', authenticateToken, violationRoutes)
app.use('/api/templates', authenticateToken, templateRoutes)
app.use('/slack', slackEventsRoutes) // Slack events don't use JWT auth

// Error handling middleware (must be last)
app.use(sanitizeError)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🛡️  SlackShield API running on port ${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)

  // Start background scheduler
  if (process.env.NODE_ENV !== 'test') {
    startDNDScheduler()
    console.log('⏰ DND Scheduler started')
  }
})

export default app
