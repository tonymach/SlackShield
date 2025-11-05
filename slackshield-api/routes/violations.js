import express from 'express'
import { query } from '../utils/db.js'

const router = express.Router()

/**
 * Get all violations for user's workspaces
 * GET /api/violations
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id
    const { limit = 100, offset = 0, workspace_id } = req.query

    let queryText = `
      SELECT vl.*
      FROM violation_logs vl
      JOIN slack_workspaces sw ON vl.workspace_id = sw.id
      WHERE sw.user_id = $1
    `
    const params = [userId]

    if (workspace_id) {
      queryText += ` AND vl.workspace_id = $${params.length + 1}`
      params.push(workspace_id)
    }

    queryText += ` ORDER BY vl.occurred_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    res.json(result.rows)
  } catch (error) {
    console.error('Get violations error:', error)
    res.status(500).json({ error: 'Failed to fetch violations' })
  }
})

/**
 * Get a specific violation
 * GET /api/violations/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const result = await query(
      `SELECT vl.*
       FROM violation_logs vl
       JOIN slack_workspaces sw ON vl.workspace_id = sw.id
       WHERE vl.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Violation not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get violation error:', error)
    res.status(500).json({ error: 'Failed to fetch violation' })
  }
})

export default router
