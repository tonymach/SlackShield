import sgMail from '@sendgrid/mail'
import pool from '../database/db.js'
import { getVariant, trackEvent } from './experimentService.js'

/**
 * Email Service with SendGrid Integration and A/B Testing
 *
 * Handles transactional, onboarding, and marketing emails with
 * built-in A/B testing support.
 */

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

/**
 * Check if user has unsubscribed from a category
 *
 * @param {string} email - User email
 * @param {string} category - Email category
 * @returns {Promise<boolean>} - True if unsubscribed
 */
export async function isUnsubscribed(email, category) {
  const result = await pool.query(
    `SELECT id FROM email_unsubscribes
     WHERE email = $1 AND (category = $2 OR category = 'all')`,
    [email, category]
  )

  return result.rows.length > 0
}

/**
 * Unsubscribe user from email category
 *
 * @param {string} email - User email
 * @param {string} category - Email category
 * @param {string|null} reason - Unsubscribe reason
 * @returns {Promise<Object>} - Unsubscribe record
 */
export async function unsubscribe(email, category, reason = null) {
  const result = await pool.query(
    `INSERT INTO email_unsubscribes (email, category, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (email, category) DO UPDATE
     SET unsubscribed_at = NOW(), reason = EXCLUDED.reason
     RETURNING id, email, category, unsubscribed_at`,
    [email, category, reason]
  )

  return result.rows[0]
}

/**
 * Get email template for campaign (with A/B testing support)
 *
 * @param {string} campaignName - Campaign name
 * @param {string|null} userId - User UUID
 * @param {string|null} anonymousId - Anonymous ID
 * @returns {Promise<Object>} - Template with variant info
 */
export async function getTemplate(campaignName, userId = null, anonymousId = null) {
  const client = await pool.connect()

  try {
    // Get campaign
    const campaignResult = await client.query(
      `SELECT id, experiment_id, type FROM email_campaigns WHERE name = $1 AND status = 'active'`,
      [campaignName]
    )

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign '${campaignName}' not found or not active`)
    }

    const campaign = campaignResult.rows[0]

    // If campaign has an experiment, get variant
    let templateId

    if (campaign.experiment_id) {
      const experimentResult = await client.query(
        'SELECT name FROM experiments WHERE id = $1',
        [campaign.experiment_id]
      )

      if (experimentResult.rows.length > 0) {
        const experimentName = experimentResult.rows[0].name
        const assignment = await getVariant(experimentName, userId, anonymousId)

        // Get template for this variant
        const templateResult = await client.query(
          `SELECT id, name, subject_line, from_name, from_email, reply_to, html_content, text_content, variables
           FROM email_templates
           WHERE campaign_id = $1 AND variant_id = $2`,
          [campaign.id, assignment.variant.id]
        )

        if (templateResult.rows.length === 0) {
          throw new Error('No template found for variant')
        }

        return {
          ...templateResult.rows[0],
          campaignId: campaign.id,
          campaignType: campaign.type,
          experimentId: campaign.experiment_id,
          variantId: assignment.variant.id,
          variantName: assignment.variant.name
        }
      }
    }

    // No experiment - get default template
    const templateResult = await client.query(
      `SELECT id, name, subject_line, from_name, from_email, reply_to, html_content, text_content, variables
       FROM email_templates
       WHERE campaign_id = $1 AND variant_id IS NULL
       LIMIT 1`,
      [campaign.id]
    )

    if (templateResult.rows.length === 0) {
      throw new Error('No template found for campaign')
    }

    return {
      ...templateResult.rows[0],
      campaignId: campaign.id,
      campaignType: campaign.type
    }

  } finally {
    client.release()
  }
}

/**
 * Replace template variables with actual values
 *
 * @param {string} template - Template string with {{variables}}
 * @param {Object} variables - Key-value pairs for replacement
 * @returns {string} - Rendered template
 */
export function renderTemplate(template, variables) {
  let rendered = template

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    rendered = rendered.replace(regex, value || '')
  }

  return rendered
}

/**
 * Send an email
 *
 * @param {Object} params - Email parameters
 * @returns {Promise<Object>} - Send result
 */
export async function sendEmail({
  campaignName,
  userId,
  toEmail,
  toName,
  variables = {},
  anonymousId = null
}) {
  const client = await pool.connect()

  try {
    // Check if user is unsubscribed
    const template = await getTemplate(campaignName, userId, anonymousId)

    const unsubscribed = await isUnsubscribed(toEmail, template.campaignType)
    if (unsubscribed) {
      return {
        success: false,
        message: 'User unsubscribed from this category'
      }
    }

    // Add standard variables
    const allVariables = {
      user_name: toName,
      user_email: toEmail,
      unsubscribe_url: `${process.env.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(toEmail)}&category=${template.campaignType}`,
      ...variables
    }

    // Render template
    const subject = renderTemplate(template.subject_line, allVariables)
    const htmlContent = renderTemplate(template.html_content, allVariables)
    const textContent = template.text_content ? renderTemplate(template.text_content, allVariables) : null

    // Create email send record
    const sendResult = await client.query(
      `INSERT INTO email_sends (campaign_id, template_id, user_id, to_email, subject_line, status, metadata)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING id`,
      [
        template.campaignId,
        template.id,
        userId,
        toEmail,
        subject,
        JSON.stringify({
          variantId: template.variantId || null,
          variantName: template.variantName || null
        })
      ]
    )

    const sendId = sendResult.rows[0].id

    // Send via SendGrid
    if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
      const msg = {
        to: toEmail,
        from: {
          email: template.from_email,
          name: template.from_name
        },
        replyTo: template.reply_to || template.from_email,
        subject,
        html: htmlContent,
        text: textContent || htmlContent.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        customArgs: {
          send_id: sendId,
          campaign_id: template.campaignId,
          variant_id: template.variantId || ''
        }
      }

      const response = await sgMail.send(msg)

      // Update send record
      await client.query(
        `UPDATE email_sends
         SET status = 'sent', sent_at = NOW(), sendgrid_message_id = $1
         WHERE id = $2`,
        [response[0].headers['x-message-id'], sendId]
      )

      // Track event if part of experiment
      if (template.experimentId) {
        const experimentResult = await client.query(
          'SELECT name FROM experiments WHERE id = $1',
          [template.experimentId]
        )

        if (experimentResult.rows.length > 0) {
          await trackEvent(
            experimentResult.rows[0].name,
            userId,
            anonymousId,
            'email_sent',
            campaignName,
            { sendId, toEmail }
          )
        }
      }

      return {
        success: true,
        sendId,
        messageId: response[0].headers['x-message-id']
      }

    } else {
      // Development mode - log email instead of sending
      console.log('📧 Email (dev mode - not sent):')
      console.log('To:', toEmail)
      console.log('Subject:', subject)
      console.log('HTML:', htmlContent.substring(0, 200) + '...')
      console.log('---')

      await client.query(
        `UPDATE email_sends SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [sendId]
      )

      return {
        success: true,
        sendId,
        devMode: true
      }
    }

  } catch (error) {
    console.error('Email send error:', error)

    // Try to update send record with error
    try {
      await client.query(
        `UPDATE email_sends
         SET status = 'failed', failed_at = NOW(), error_message = $1
         WHERE id = (SELECT id FROM email_sends WHERE user_id = $2 AND to_email = $3 ORDER BY created_at DESC LIMIT 1)`,
        [error.message, userId, toEmail]
      )
    } catch (updateError) {
      console.error('Failed to update send record:', updateError)
    }

    throw error

  } finally {
    client.release()
  }
}

/**
 * Handle SendGrid webhook events (delivery, open, click, bounce)
 *
 * @param {Array} events - Array of webhook events from SendGrid
 * @returns {Promise<Object>} - Processing result
 */
export async function handleWebhook(events) {
  const client = await pool.connect()
  const processed = []

  try {
    await client.query('BEGIN')

    for (const event of events) {
      const { event: eventType, send_id, sg_message_id, timestamp } = event

      if (!send_id && !sg_message_id) {
        continue
      }

      // Find send record
      const sendQuery = send_id
        ? 'SELECT id, campaign_id, template_id, user_id FROM email_sends WHERE id = $1'
        : 'SELECT id, campaign_id, template_id, user_id FROM email_sends WHERE sendgrid_message_id = $1'

      const sendResult = await client.query(sendQuery, [send_id || sg_message_id])

      if (sendResult.rows.length === 0) {
        continue
      }

      const send = sendResult.rows[0]

      // Update send record based on event type
      let updateQuery
      switch (eventType) {
        case 'delivered':
          updateQuery = `UPDATE email_sends SET status = 'delivered', delivered_at = to_timestamp($1) WHERE id = $2`
          break
        case 'open':
          updateQuery = `UPDATE email_sends SET status = 'opened', opened_at = to_timestamp($1) WHERE id = $2`
          break
        case 'click':
          updateQuery = `UPDATE email_sends SET status = 'clicked', clicked_at = to_timestamp($1) WHERE id = $2`
          break
        case 'bounce':
        case 'dropped':
          updateQuery = `UPDATE email_sends SET status = 'bounced', bounced_at = to_timestamp($1) WHERE id = $2`
          break
        default:
          continue
      }

      await client.query(updateQuery, [timestamp, send.id])

      // Track experiment event if applicable
      const campaignResult = await client.query(
        'SELECT experiment_id FROM email_campaigns WHERE id = $1',
        [send.campaign_id]
      )

      if (campaignResult.rows.length > 0 && campaignResult.rows[0].experiment_id) {
        const experimentResult = await client.query(
          'SELECT name FROM experiments WHERE id = $1',
          [campaignResult.rows[0].experiment_id]
        )

        if (experimentResult.rows.length > 0) {
          const eventTypeMap = {
            'open': 'email_opened',
            'click': 'email_clicked',
            'delivered': 'email_delivered'
          }

          if (eventTypeMap[eventType]) {
            try {
              await trackEvent(
                experimentResult.rows[0].name,
                send.user_id,
                null,
                eventTypeMap[eventType],
                null,
                { sendId: send.id, timestamp }
              )
            } catch (trackError) {
              console.error('Failed to track experiment event:', trackError)
            }
          }
        }
      }

      processed.push({
        sendId: send.id,
        eventType,
        timestamp
      })
    }

    await client.query('COMMIT')

    return {
      success: true,
      processed: processed.length,
      events: processed
    }

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Send welcome email to new user
 *
 * @param {Object} user - User object
 * @returns {Promise<Object>} - Send result
 */
export async function sendWelcomeEmail(user) {
  return sendEmail({
    campaignName: 'welcome',
    userId: user.id,
    toEmail: user.email,
    toName: user.email.split('@')[0], // Use email prefix as name
    variables: {
      user_name: user.email.split('@')[0]
    }
  })
}

/**
 * Send onboarding email (part of drip sequence)
 *
 * @param {Object} user - User object
 * @param {number} step - Onboarding step (1, 2, 3)
 * @returns {Promise<Object>} - Send result
 */
export async function sendOnboardingEmail(user, step) {
  return sendEmail({
    campaignName: `onboarding_step_${step}`,
    userId: user.id,
    toEmail: user.email,
    toName: user.email.split('@')[0],
    variables: {
      step,
      dashboard_url: `${process.env.FRONTEND_URL}/dashboard`
    }
  })
}

/**
 * Send weekly violation report
 *
 * @param {Object} user - User object
 * @param {Object} reportData - Violation statistics
 * @returns {Promise<Object>} - Send result
 */
export async function sendViolationReport(user, reportData) {
  return sendEmail({
    campaignName: 'violation_report_weekly',
    userId: user.id,
    toEmail: user.email,
    toName: user.email.split('@')[0],
    variables: {
      total_violations: reportData.totalViolations,
      unique_violators: reportData.uniqueViolators,
      top_violator: reportData.topViolator,
      week_start: reportData.weekStart,
      week_end: reportData.weekEnd,
      report_url: `${process.env.FRONTEND_URL}/dashboard?view=report`
    }
  })
}
