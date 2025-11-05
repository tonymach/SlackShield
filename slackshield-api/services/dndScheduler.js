import cron from 'node-cron'
import { WebClient } from '@slack/web-api'
import { query } from '../utils/db.js'
import { decrypt } from '../utils/encryption.js'

/**
 * Check if current time is within off-hours schedule
 * @param {string} currentTime - Current time in HH:MM format
 * @param {number} dayOfWeek - Current day (0=Sunday, 6=Saturday)
 * @param {Object} schedule - Schedule object from database
 * @returns {boolean} True if within off-hours
 */
function isWithinOffHours(currentTime, dayOfWeek, schedule, currentDate) {
  // Check if schedule is for current day
  if (schedule.day_of_week !== dayOfWeek) {
    return false
  }

  const [currentHour, currentMinute] = currentTime.split(':').map(Number)
  const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
  const [endHour, endMinute] = schedule.end_time.split(':').map(Number)

  const currentMinutes = currentHour * 60 + currentMinute
  const startMinutes = startHour * 60 + startMinute
  const endMinutes = endHour * 60 + endMinute

  // Handle overnight schedules (e.g., 18:00 to 08:00)
  if (endMinutes < startMinutes) {
    // We're in an overnight schedule
    // Check if current time is after start OR before end
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else {
    // Normal same-day schedule
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
}

/**
 * Process all workspaces and enable/disable DND as needed
 */
async function processDNDSchedules() {
  try {
    console.log('[DND Scheduler] Checking schedules...')

    // Get all active workspaces with their schedules
    const result = await query(`
      SELECT
        sw.id as workspace_id,
        sw.access_token,
        sw.team_name,
        s.id as schedule_id,
        s.day_of_week,
        s.start_time,
        s.end_time,
        s.timezone
      FROM slack_workspaces sw
      JOIN schedules s ON s.workspace_id = sw.id
      WHERE s.is_active = true
    `)

    if (result.rows.length === 0) {
      console.log('[DND Scheduler] No active schedules found')
      return
    }

    const now = new Date()
    let dndEnabled = 0
    let dndDisabled = 0

    for (const workspace of result.rows) {
      try {
        // Convert current time to workspace timezone
        // For MVP, we'll use the server time and trust the schedule timezone setting
        const currentTime = now.toTimeString().slice(0, 5) // HH:MM
        const dayOfWeek = now.getDay()

        // Check if current time falls within off-hours schedule
        if (isWithinOffHours(currentTime, dayOfWeek, workspace, now)) {
          // Enable DND for next 60 minutes
          const accessToken = decrypt(workspace.access_token)
          const client = new WebClient(accessToken)

          try {
            await client.dnd.setSnooze({ num_minutes: 60 })
            console.log(`[DND Scheduler] ✅ DND enabled for workspace: ${workspace.team_name}`)
            dndEnabled++
          } catch (slackError) {
            if (slackError.data?.error === 'snooze_end_failed') {
              // Already in DND, that's fine
              console.log(`[DND Scheduler] ℹ️  DND already active for: ${workspace.team_name}`)
            } else {
              console.error(`[DND Scheduler] ❌ Failed to enable DND for ${workspace.team_name}:`, slackError.data?.error)
            }
          }
        }
      } catch (error) {
        console.error(`[DND Scheduler] Error processing workspace ${workspace.workspace_id}:`, error.message)
      }
    }

    console.log(`[DND Scheduler] Processed ${result.rows.length} schedules (${dndEnabled} enabled, ${dndDisabled} disabled)`)

  } catch (error) {
    console.error('[DND Scheduler] Fatal error:', error)
  }
}

/**
 * Start the DND scheduler
 * Runs every 5 minutes to check and enforce schedules
 */
export function startDNDScheduler() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    processDNDSchedules()
  })

  // Also run immediately on startup for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('[DND Scheduler] Running initial check...')
    processDNDSchedules()
  }

  console.log('[DND Scheduler] ⏰ Scheduler started (runs every 5 minutes)')
}

export default { startDNDScheduler }
