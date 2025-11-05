import express from 'express'
import {
  getVariant,
  trackEvent,
  getExperimentResults,
  createExperiment,
  startExperiment,
  stopExperiment
} from '../services/experimentService.js'
import { authenticateToken } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { body, param, query } from 'express-validator'

const router = express.Router()

/**
 * GET /api/experiments/:experimentName/variant
 * Get variant assignment for a user or anonymous visitor
 */
router.get(
  '/:experimentName/variant',
  [
    param('experimentName').isString().notEmpty(),
    query('userId').optional().isUUID(),
    query('anonymousId').optional().isString()
  ],
  validate,
  async (req, res) => {
    try {
      const { experimentName } = req.params
      const { userId, anonymousId } = req.query

      const assignment = await getVariant(experimentName, userId || null, anonymousId || null)

      res.json(assignment)
    } catch (error) {
      console.error('Get variant error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/experiments/:experimentName/event
 * Track an event for an experiment
 */
router.post(
  '/:experimentName/event',
  [
    param('experimentName').isString().notEmpty(),
    body('userId').optional().isUUID(),
    body('anonymousId').optional().isString(),
    body('eventType').isIn(['view', 'click', 'signup', 'conversion', 'email_sent', 'email_opened', 'email_clicked', 'email_delivered']),
    body('eventName').optional().isString(),
    body('eventData').optional().isObject()
  ],
  validate,
  async (req, res) => {
    try {
      const { experimentName } = req.params
      const { userId, anonymousId, eventType, eventName, eventData } = req.body

      const event = await trackEvent(
        experimentName,
        userId || null,
        anonymousId || null,
        eventType,
        eventName,
        eventData
      )

      res.json({ success: true, event })
    } catch (error) {
      console.error('Track event error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * GET /api/experiments/:experimentName/results
 * Get experiment results with statistical analysis
 * Requires authentication
 */
router.get(
  '/:experimentName/results',
  authenticateToken,
  param('experimentName').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { experimentName } = req.params

      const results = await getExperimentResults(experimentName)

      res.json(results)
    } catch (error) {
      console.error('Get results error:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

/**
 * POST /api/experiments
 * Create a new experiment
 * Requires authentication
 */
router.post(
  '/',
  authenticateToken,
  [
    body('name').isString().notEmpty(),
    body('description').optional().isString(),
    body('type').isIn(['page', 'email', 'feature', 'component']),
    body('trafficAllocation').optional().isFloat({ min: 0, max: 1 }),
    body('variants').isArray({ min: 2 }),
    body('variants.*.name').isString().notEmpty(),
    body('variants.*.description').optional().isString(),
    body('variants.*.config').optional().isObject(),
    body('variants.*.trafficWeight').optional().isInt({ min: 1 }),
    body('variants.*.isControl').optional().isBoolean()
  ],
  validate,
  async (req, res) => {
    try {
      const experimentData = req.body

      const experiment = await createExperiment(experimentData)

      res.status(201).json(experiment)
    } catch (error) {
      console.error('Create experiment error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/experiments/:experimentName/start
 * Start an experiment (change status to running)
 * Requires authentication
 */
router.post(
  '/:experimentName/start',
  authenticateToken,
  param('experimentName').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { experimentName } = req.params

      const experiment = await startExperiment(experimentName)

      res.json(experiment)
    } catch (error) {
      console.error('Start experiment error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

/**
 * POST /api/experiments/:experimentName/stop
 * Stop an experiment (change status to completed)
 * Requires authentication
 */
router.post(
  '/:experimentName/stop',
  authenticateToken,
  param('experimentName').isString().notEmpty(),
  validate,
  async (req, res) => {
    try {
      const { experimentName } = req.params

      const experiment = await stopExperiment(experimentName)

      res.json(experiment)
    } catch (error) {
      console.error('Stop experiment error:', error)
      res.status(400).json({ error: error.message })
    }
  }
)

export default router
