import express from 'express'
import {
  sendEmail,
  unsubscribe,
  handleWebhook,
  sendWelcomeEmail,
  sendOnboardingEmail,
  sendViolationReport
} from '../services/emailService.js'
import { authenticateToken } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { body } from 'express-validator'

const router = express.Router()

/**
 * POST /api/email/send
 * Send an email (requires authentication)
 */
router.post(
  '/send',
  authenticateToken,
  [
    body('campaignName').isString().notEmpty(),
    body('toEmail').isEmail(),
    body('toName').optional().isString(),
    body('variables').optional().isObject(),
    body('anonymousId').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { campaignName, toEmail, toName, variables, anonymousId } = req.body
      const userId = req.user.id

      const result = await sendEmail({
        campaignName,
        userId,
        toEmail,
        toName,
        variables,
        anonymousId
      })

      res.json(result)
    } catch (error) {
      console.error('Send email error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/email/unsubscribe
 * Unsubscribe from email category
 */
router.post(
  '/unsubscribe',
  [
    body('email').isEmail(),
    body('category').isIn(['marketing', 'onboarding', 'notifications', 'all']),
    body('reason').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { email, category, reason } = req.body

      const result = await unsubscribe(email, category, reason)

      res.json({
        success: true,
        unsubscribe: result
      })
    } catch (error) {
      console.error('Unsubscribe error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/email/webhook
 * Handle SendGrid webhook events (delivery, open, click, bounce)
 * This endpoint is called by SendGrid, not by our frontend
 */
router.post('/webhook', async (req, res) => {
  try {
    const events = req.body

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid webhook payload' })
    }

    const result = await handleWebhook(events)

    res.json(result)
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/email/welcome
 * Send welcome email to user (requires authentication)
 */
router.post(
  '/welcome',
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user

      const result = await sendWelcomeEmail(user)

      res.json(result)
    } catch (error) {
      console.error('Send welcome email error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/email/onboarding/:step
 * Send onboarding email (requires authentication)
 */
router.post(
  '/onboarding/:step',
  authenticateToken,
  async (req, res) => {
    try {
      const user = req.user
      const step = parseInt(req.params.step)

      if (![1, 2, 3].includes(step)) {
        return res.status(400).json({ error: 'Invalid step. Must be 1, 2, or 3.' })
      }

      const result = await sendOnboardingEmail(user, step)

      res.json(result)
    } catch (error) {
      console.error('Send onboarding email error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/email/violation-report
 * Send weekly violation report (requires authentication)
 */
router.post(
  '/violation-report',
  authenticateToken,
  [
    body('reportData').isObject(),
    body('reportData.totalViolations').isInt(),
    body('reportData.uniqueViolators').isInt(),
    body('reportData.topViolator').isString(),
    body('reportData.weekStart').isString(),
    body('reportData.weekEnd').isString()
  ],
  validate,
  async (req, res) => {
    try {
      const user = req.user
      const { reportData } = req.body

      const result = await sendViolationReport(user, reportData)

      res.json(result)
    } catch (error) {
      console.error('Send violation report error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

export default router
