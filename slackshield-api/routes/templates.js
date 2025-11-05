import express from 'express'
import { query } from '../utils/db.js'

const router = express.Router()

/**
 * Update a template
 * PUT /api/templates/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { message, is_default } = req.body

    // Verify template belongs to user's workspace
    const templateCheck = await query(
      `SELECT rt.id, rt.workspace_id
       FROM response_templates rt
       JOIN slack_workspaces sw ON rt.workspace_id = sw.id
       WHERE rt.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' })
    }

    // If setting as default, unset other defaults for this workspace
    if (is_default) {
      await query(
        'UPDATE response_templates SET is_default = false WHERE workspace_id = $1 AND id != $2',
        [templateCheck.rows[0].workspace_id, id]
      )
    }

    // Build update query
    const updates = []
    const values = []
    let paramCount = 1

    if (message !== undefined) {
      updates.push(`message = $${paramCount}`)
      values.push(message)
      paramCount++
    }
    if (is_default !== undefined) {
      updates.push(`is_default = $${paramCount}`)
      values.push(is_default)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(id)
    const result = await query(
      `UPDATE response_templates SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Update template error:', error)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

/**
 * Set template as default
 * PUT /api/templates/:id/default
 */
router.put('/:id/default', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify template belongs to user's workspace
    const templateCheck = await query(
      `SELECT rt.id, rt.workspace_id
       FROM response_templates rt
       JOIN slack_workspaces sw ON rt.workspace_id = sw.id
       WHERE rt.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' })
    }

    // Unset all defaults for this workspace
    await query(
      'UPDATE response_templates SET is_default = false WHERE workspace_id = $1',
      [templateCheck.rows[0].workspace_id]
    )

    // Set this template as default
    const result = await query(
      'UPDATE response_templates SET is_default = true WHERE id = $1 RETURNING *',
      [id]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Set default template error:', error)
    res.status(500).json({ error: 'Failed to set default template' })
  }
})

/**
 * Delete a template
 * DELETE /api/templates/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verify template belongs to user's workspace
    const templateCheck = await query(
      `SELECT rt.id
       FROM response_templates rt
       JOIN slack_workspaces sw ON rt.workspace_id = sw.id
       WHERE rt.id = $1 AND sw.user_id = $2`,
      [id, userId]
    )

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' })
    }

    await query('DELETE FROM response_templates WHERE id = $1', [id])

    res.json({ success: true, message: 'Template deleted' })
  } catch (error) {
    console.error('Delete template error:', error)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

export default router
