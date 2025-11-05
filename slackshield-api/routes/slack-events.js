import express from 'express'
import { createEventAdapter } from '@slack/events-api'
import { WebClient } from '@slack/web-api'
import { query } from '../utils/db.js'
import { decrypt } from '../utils/encryption.js'

const router = express.Router()

// Create Slack events adapter
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET)

/**
 * Check if current time is within off-hours for a workspace
 */
async function isCurrentlyOffHours(workspaceId) {
  try {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // HH:MM
    const dayOfWeek = now.getDay()

    // Get active schedules for this workspace
    const schedules = await query(
      `SELECT * FROM schedules
       WHERE workspace_id = $1 AND is_active = true`,
      [workspaceId]
    )

    if (schedules.rows.length === 0) {
      return false
    }

    // Check if any schedule matches current time
    for (const schedule of schedules.rows) {
      if (schedule.day_of_week !== dayOfWeek) {
        continue
      }

      const [startHour, startMinute] = schedule.start_time.split(':').map(Number)
      const [endHour, endMinute] = schedule.end_time.split(':').map(Number)
      const [currentHour, currentMinute] = currentTime.split(':').map(Number)

      const currentMinutes = currentHour * 60 + currentMinute
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      // Handle overnight schedules
      if (endMinutes < startMinutes) {
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return true
        }
      } else {
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return true
        }
      }
    }

    return false
  } catch (error) {
    console.error('Error checking off-hours status:', error)
    return false
  }
}

/**
 * Get default response template for workspace
 */
async function getResponseTemplate(workspaceId) {
  try {
    const result = await query(
      `SELECT message FROM response_templates
       WHERE workspace_id = $1 AND is_default = true
       LIMIT 1`,
      [workspaceId]
    )

    if (result.rows.length > 0) {
      return result.rows[0].message
    }

    // Default message if no template exists
    return `Hey! I'm currently off the clock and protecting my work-life balance with SlackShield.

I'll respond to your message during my next work hours. If this is truly urgent, please use the appropriate emergency contact method.

Thanks for respecting my boundaries! 🛡️`
  } catch (error) {
    console.error('Error fetching template:', error)
    return 'I\'m currently off the clock. I\'ll respond during work hours.'
  }
}

/**
 * Get workspace by team ID
 */
async function getWorkspaceByTeamId(teamId) {
  const result = await query(
    'SELECT * FROM slack_workspaces WHERE team_id = $1',
    [teamId]
  )
  return result.rows[0] || null
}

/**
 * Get user info from Slack
 */
async function getSlackUserInfo(client, userId) {
  try {
    const userInfo = await client.users.info({ user: userId })
    return {
      id: userId,
      name: userInfo.user.real_name || userInfo.user.name,
      profile: userInfo.user.profile
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    return { id: userId, name: 'Unknown User' }
  }
}

/**
 * Get channel info from Slack
 */
async function getChannelInfo(client, channelId) {
  try {
    // Try conversations.info first (works for channels, DMs, groups)
    const channelInfo = await client.conversations.info({ channel: channelId })
    return {
      id: channelId,
      name: channelInfo.channel.name || 'Direct Message'
    }
  } catch (error) {
    return { id: channelId, name: 'Unknown' }
  }
}

// Mount Slack event handler middleware
router.use('/events', slackEvents.requestListener())

// Handle URL verification challenge from Slack
slackEvents.on('url_verification', (event, respond) => {
  console.log('[Slack Events] URL verification challenge received')
  respond({ challenge: event.challenge })
})

// Listen for messages (DMs and mentions)
slackEvents.on('message', async (event) => {
  try {
    // Ignore bot messages and message edits
    if (event.subtype || event.bot_id) {
      return
    }

    console.log('[Slack Events] Message received:', {
      user: event.user,
      channel: event.channel,
      team: event.team
    })

    // Get workspace from team ID
    const workspace = await getWorkspaceByTeamId(event.team)

    if (!workspace) {
      console.log('[Slack Events] Workspace not found for team:', event.team)
      return
    }

    // Check if message is during user's off-hours
    const isOffHours = await isCurrentlyOffHours(workspace.id)

    if (!isOffHours) {
      console.log('[Slack Events] Not off-hours, ignoring message')
      return
    }

    console.log('[Slack Events] Off-hours violation detected!')

    // Decrypt access token and create Slack client
    const accessToken = decrypt(workspace.access_token)
    const client = new WebClient(accessToken)

    // Get violator info
    const violator = await getSlackUserInfo(client, event.user)
    const channel = await getChannelInfo(client, event.channel)

    // Log violation
    await query(
      `INSERT INTO violation_logs
       (workspace_id, violator_slack_id, violator_name, channel_id, channel_name, message_ts, auto_response_sent)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [workspace.id, violator.id, violator.name, channel.id, channel.name, event.ts]
    )

    // Get and send auto-response
    const template = await getResponseTemplate(workspace.id)

    try {
      await client.chat.postMessage({
        channel: event.channel,
        text: template,
        thread_ts: event.ts // Reply in thread to keep things organized
      })

      // Update violation log to mark response as sent
      await query(
        `UPDATE violation_logs
         SET auto_response_sent = true, response_sent_at = NOW()
         WHERE workspace_id = $1 AND message_ts = $2`,
        [workspace.id, event.ts]
      )

      console.log('[Slack Events] ✅ Auto-response sent to', violator.name)
    } catch (slackError) {
      console.error('[Slack Events] Failed to send auto-response:', slackError.data?.error)
    }

  } catch (error) {
    console.error('[Slack Events] Error handling message:', error)
  }
})

// Error handling for Slack events
slackEvents.on('error', (error) => {
  console.error('[Slack Events] Error:', error)
})

export default router
