import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import workspaceRoutes from './routes/workspaces.js'
import scheduleRoutes from './routes/schedules.js'
import violationRoutes from './routes/violations.js'
import templateRoutes from './routes/templates.js'
import slackEventsRoutes from './routes/slack-events.js'
import { startDNDScheduler } from './services/dndScheduler.js'
import { authenticateToken } from './middleware/auth.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SlackShield API is running' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/workspaces', authenticateToken, workspaceRoutes)
app.use('/api/schedules', authenticateToken, scheduleRoutes)
app.use('/api/violations', authenticateToken, violationRoutes)
app.use('/api/templates', authenticateToken, templateRoutes)
app.use('/slack', slackEventsRoutes) // Slack events don't use JWT auth

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

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
