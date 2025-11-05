import express from 'express'
import { query } from '../utils/db.js'

const router = express.Router()

/**
 * Get all workspaces for the authenticated user
 * GET /api/workspaces
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await query(
      `SELECT id, team_id, team_name, user_slack_id, connected_at
       FROM slack_workspaces
       WHERE user_id = $1
       ORDER BY connected_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get workspaces error:', error)
    res.status(500).json({ error: 'Failed to fetch workspaces' })
  }
})

/**
 * Get a specific workspace
 * GET /api/workspaces/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const result = await query(
      `SELECT id, team_id, team_name, user_slack_id, connected_at
       FROM slack_workspaces
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Get workspace error:', error)
    res.status(500).json({ error: 'Failed to fetch workspace' })
  }
})

/**
 * Disconnect a workspace
 * DELETE /api/workspaces/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    // Delete workspace (cascade will handle related data)
    await query('DELETE FROM slack_workspaces WHERE id = $1', [id])

    res.json({ success: true, message: 'Workspace disconnected' })
  } catch (error) {
    console.error('Delete workspace error:', error)
    res.status(500).json({ error: 'Failed to disconnect workspace' })
  }
})

/**
 * Get schedules for a workspace
 * GET /api/workspaces/:id/schedules
 */
router.get('/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    const schedules = await query(
      `SELECT * FROM schedules
       WHERE workspace_id = $1
       ORDER BY day_of_week, start_time`,
      [id]
    )

    res.json(schedules.rows)
  } catch (error) {
    console.error('Get schedules error:', error)
    res.status(500).json({ error: 'Failed to fetch schedules' })
  }
})

/**
 * Create a schedule for a workspace
 * POST /api/workspaces/:id/schedules
 */
router.post('/:id/schedules', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { day_of_week, start_time, end_time, timezone, is_active } = req.body

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    // Create schedule
    const result = await query(
      `INSERT INTO schedules (workspace_id, day_of_week, start_time, end_time, timezone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, day_of_week, start_time, end_time, timezone || 'America/Toronto', is_active !== false]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create schedule error:', error)
    res.status(500).json({ error: 'Failed to create schedule' })
  }
})

/**
 * Get violations for a workspace
 * GET /api/workspaces/:id/violations
 */
router.get('/:id/violations', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { limit = 100, offset = 0 } = req.query

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    const violations = await query(
      `SELECT * FROM violation_logs
       WHERE workspace_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    )

    res.json(violations.rows)
  } catch (error) {
    console.error('Get violations error:', error)
    res.status(500).json({ error: 'Failed to fetch violations' })
  }
})

/**
 * Get violation statistics for a workspace
 * GET /api/workspaces/:id/violations/stats
 */
router.get('/:id/violations/stats', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    // Get total violations
    const total = await query(
      'SELECT COUNT(*) as count FROM violation_logs WHERE workspace_id = $1',
      [id]
    )

    // Get this week's violations
    const thisWeek = await query(
      `SELECT COUNT(*) as count FROM violation_logs
       WHERE workspace_id = $1
       AND occurred_at >= NOW() - INTERVAL '7 days'`,
      [id]
    )

    // Get unique violators
    const uniqueViolators = await query(
      'SELECT COUNT(DISTINCT violator_slack_id) as count FROM violation_logs WHERE workspace_id = $1',
      [id]
    )

    // Get response rate
    const responseRate = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN auto_response_sent THEN 1 ELSE 0 END) as responded
       FROM violation_logs
       WHERE workspace_id = $1`,
      [id]
    )

    const responseRatePercent = responseRate.rows[0].total > 0
      ? Math.round((responseRate.rows[0].responded / responseRate.rows[0].total) * 100)
      : 0

    res.json({
      total_violations: parseInt(total.rows[0].count),
      this_week: parseInt(thisWeek.rows[0].count),
      unique_violators: parseInt(uniqueViolators.rows[0].count),
      response_rate: responseRatePercent
    })
  } catch (error) {
    console.error('Get violation stats error:', error)
    res.status(500).json({ error: 'Failed to fetch statistics' })
  }
})

/**
 * Get templates for a workspace
 * GET /api/workspaces/:id/templates
 */
router.get('/:id/templates', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    const templates = await query(
      `SELECT * FROM response_templates
       WHERE workspace_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [id]
    )

    res.json(templates.rows)
  } catch (error) {
    console.error('Get templates error:', error)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

/**
 * Create a template for a workspace
 * POST /api/workspaces/:id/templates
 */
router.post('/:id/templates', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { message, is_default } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Verify workspace belongs to user
    const workspace = await query(
      'SELECT id FROM slack_workspaces WHERE id = $1 AND user_id = $2',
      [id, userId]
    )

    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' })
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await query(
        'UPDATE response_templates SET is_default = false WHERE workspace_id = $1',
        [id]
      )
    }

    // Create template
    const result = await query(
      `INSERT INTO response_templates (workspace_id, message, is_default)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, message, is_default || false]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create template error:', error)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

export default router
