import express from 'express'
import { query } from '../utils/db.js'

const router = express.Router()

/**
 * Update a schedule
 * PUT /api/schedules/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { day_of_week, start_time, end_time, timezone, is_active } = req.body

    // Verify schedule belongs to user's workspace
    const scheduleCheck = await query(
      `SELECT s.id
       FROM schedules s
       JOIN slack_workspaces sw ON s.workspace_id = sw.id
       WHERE s.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1

    if (day_of_week !== undefined) {
      updates.push(`day_of_week = $${paramCount}`)
      values.push(day_of_week)
      paramCount++
    }
    if (start_time !== undefined) {
      updates.push(`start_time = $${paramCount}`)
      values.push(start_time)
      paramCount++
    }
    if (end_time !== undefined) {
      updates.push(`end_time = $${paramCount}`)
      values.push(end_time)
      paramCount++
    }
    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount}`)
      values.push(timezone)
      paramCount++
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`)
      values.push(is_active)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(id)
    const result = await query(
      `UPDATE schedules SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update schedule error:', error)
    res.status(500).json({ error: 'Failed to update schedule' })
  }
})

/**
 * Delete a schedule
 * DELETE /api/schedules/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify schedule belongs to user's workspace
    const scheduleCheck = await query(
      `SELECT s.id
       FROM schedules s
       JOIN slack_workspaces sw ON s.workspace_id = sw.id
       WHERE s.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (scheduleCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' })
    }

    await query('DELETE FROM schedules WHERE id = $1', [id])

    res.json({ success: true, message: 'Schedule deleted' })
  } catch (error) {
    console.error('Delete schedule error:', error)
    res.status(500).json({ error: 'Failed to delete schedule' })
  }
})

export default router
