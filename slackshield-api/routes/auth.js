import express from 'express'
import { WebClient } from '@slack/web-api'
import { query } from '../utils/db.js'
import { encrypt } from '../utils/encryption.js'
import { generateToken } from '../middleware/auth.js'
import { authLimiter } from '../middleware/security.js'
import { logAuth } from '../utils/auditLog.js'

const router = express.Router()

/**
 * Step 1: Redirect user to Slack OAuth
 * GET /api/auth/slack
 */
router.get('/slack', (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID
  const redirectUri = process.env.SLACK_REDIRECT_URI
  const scopes = 'users:read,users:write,chat:write,dnd:write,im:write,channels:read,groups:read'

  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}`

  res.redirect(authUrl)
})

/**
 * Step 2: Handle callback from Slack
 * GET /api/auth/slack/callback?code=xxx
 */
router.get('/slack/callback', authLimiter, async (req, res) => {
  const { code, error } = req.query

  if (error) {
    console.error('Slack OAuth error:', error)
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=access_denied`)
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: process.env.SLACK_REDIRECT_URI
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error)
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_exchange_failed`)
    }

    const {
      access_token,
      team,
      authed_user
    } = tokenData

    // Get user info from Slack
    const slackClient = new WebClient(access_token)
    const userInfo = await slackClient.users.info({ user: authed_user.id })

    const userEmail = userInfo.user.profile.email

    // Check if user exists, create if not
    let userResult = await query(
      'SELECT * FROM users WHERE email = $1',
      [userEmail]
    )

    let userId
    if (userResult.rows.length === 0) {
      // Create new user
      const newUser = await query(
        'INSERT INTO users (email) VALUES ($1) RETURNING *',
        [userEmail]
      )
      userId = newUser.rows[0].id
    } else {
      userId = userResult.rows[0].id
    }

    // Check if workspace connection already exists
    const existingWorkspace = await query(
      'SELECT * FROM slack_workspaces WHERE user_id = $1 AND team_id = $2',
      [userId, team.id]
    )

    if (existingWorkspace.rows.length === 0) {
      // Encrypt the access token before storing
      const encryptedToken = encrypt(access_token)

      // Store workspace connection
      await query(
        `INSERT INTO slack_workspaces
        (user_id, team_id, team_name, access_token, user_slack_id)
        VALUES ($1, $2, $3, $4, $5)`,
        [userId, team.id, team.name, encryptedToken, authed_user.id]
      )
    } else {
      // Update existing workspace connection with new token
      const encryptedToken = encrypt(access_token)
      await query(
        'UPDATE slack_workspaces SET access_token = $1, connected_at = NOW() WHERE id = $2',
        [encryptedToken, existingWorkspace.rows[0].id]
      )
    }

    // Generate JWT token
    const jwtToken = generateToken({ id: userId, email: userEmail })

    // Audit log successful authentication
    logAuth({
      action: 'SLACK_AUTH_SUCCESS',
      userId: userId,
      workspaceId: existingWorkspace.rows[0]?.id,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        teamId: team.id,
        teamName: team.name
      }
    })

    // Return token to frontend
    return res.json({
      success: true,
      token: jwtToken,
      user: {
        id: userId,
        email: userEmail
      }
    })

  } catch (error) {
    console.error('Slack OAuth callback error:', error)

    // Audit log failed authentication
    logAuth({
      action: 'SLACK_AUTH_FAILED',
      success: false,
      error: error.message,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    return res.status(500).json({
      error: 'Failed to complete Slack authentication',
      message: error.message
    })
  }
})

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify token and get user
    import('jsonwebtoken').then(async (jwt) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const userResult = await query('SELECT id, email, subscription_tier FROM users WHERE id = $1', [decoded.id])

        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' })
        }

        res.json({ user: userResult.rows[0] })
      } catch (err) {
        res.status(403).json({ error: 'Invalid token' })
      }
    })
  } catch (error) {
    console.error('Auth me error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
