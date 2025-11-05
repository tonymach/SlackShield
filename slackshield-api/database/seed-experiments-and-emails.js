import pool from './db.js'

/**
 * Seed script for experiments and email campaigns
 * Run with: node database/seed-experiments-and-emails.js
 */

async function seed() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('🌱 Seeding experiments and email campaigns...')

    // ============================================
    // 1. Create Landing Page Hero Experiment
    // ============================================

    console.log('Creating landing page hero experiment...')

    const heroExpResult = await client.query(`
      INSERT INTO experiments (name, description, type, status, traffic_allocation)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE
      SET description = EXCLUDED.description
      RETURNING id
    `, [
      'landing_page_hero',
      'Test different hero section messaging approaches',
      'page',
      'running',
      1.0
    ])

    const heroExpId = heroExpResult.rows[0].id

    // Create 4 variants (A, B, C, D)
    const heroVariants = [
      {
        name: 'A',
        description: 'Control - Professional boundary enforcement focus',
        config: { approach: 'professional' },
        trafficWeight: 1,
        isControl: true
      },
      {
        name: 'B',
        description: 'Emotional - Work-life balance and burnout prevention',
        config: { approach: 'emotional' },
        trafficWeight: 1,
        isControl: false
      },
      {
        name: 'C',
        description: 'Problem-focused - Pain points emphasis',
        config: { approach: 'problem' },
        trafficWeight: 1,
        isControl: false
      },
      {
        name: 'D',
        description: 'Feature-benefit - What you get with social proof',
        config: { approach: 'features' },
        trafficWeight: 1,
        isControl: false
      }
    ]

    for (const variant of heroVariants) {
      await client.query(`
        INSERT INTO experiment_variants (experiment_id, name, description, config, traffic_weight, is_control)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (experiment_id, name) DO UPDATE
        SET description = EXCLUDED.description, config = EXCLUDED.config
      `, [
        heroExpId,
        variant.name,
        variant.description,
        JSON.stringify(variant.config),
        variant.trafficWeight,
        variant.isControl
      ])
    }

    console.log('✓ Landing page hero experiment created with 4 variants')

    // ============================================
    // 2. Create Welcome Email Campaign
    // ============================================

    console.log('Creating welcome email campaign...')

    const welcomeCampaignResult = await client.query(`
      INSERT INTO email_campaigns (name, description, type, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      'welcome',
      'Welcome email sent immediately after signup',
      'onboarding',
      'active'
    ])

    if (welcomeCampaignResult.rows.length > 0) {
      const welcomeCampaignId = welcomeCampaignResult.rows[0].id

      await client.query(`
        INSERT INTO email_templates (campaign_id, name, subject_line, from_name, from_email, html_content, text_content)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        welcomeCampaignId,
        'Welcome Email',
        'Welcome to SlackShield - Let\'s protect your boundaries!',
        'SlackShield',
        'hello@slackshield.com',
        `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #611f69; color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background: #f8f8f8; }
              .button { display: inline-block; background: #611f69; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🛡️ Welcome to SlackShield!</h1>
              </div>
              <div class="content">
                <p>Hi {{user_name}},</p>
                <p>Welcome to SlackShield! We're excited to help you protect your after-hours boundaries.</p>
                <p><strong>Here's what you need to do next:</strong></p>
                <ol>
                  <li>Connect your Slack workspace</li>
                  <li>Set your off-hours schedule</li>
                  <li>Customize your auto-response message</li>
                  <li>Start protecting your time!</li>
                </ol>
                <a href="{{dashboard_url}}" class="button">Go to Dashboard</a>
                <p>If you have any questions, just reply to this email. We're here to help!</p>
                <p>Best regards,<br>The SlackShield Team</p>
              </div>
              <div class="footer">
                <p>SlackShield - Protect Your After-Hours Boundaries</p>
                <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
              </div>
            </div>
          </body>
        </html>
        `,
        `Hi {{user_name}},

Welcome to SlackShield! We're excited to help you protect your after-hours boundaries.

Here's what you need to do next:
1. Connect your Slack workspace
2. Set your off-hours schedule
3. Customize your auto-response message
4. Start protecting your time!

Go to your dashboard: {{dashboard_url}}

If you have any questions, just reply to this email. We're here to help!

Best regards,
The SlackShield Team

---
SlackShield - Protect Your After-Hours Boundaries
Unsubscribe: {{unsubscribe_url}}`
      ])

      console.log('✓ Welcome email campaign created')
    }

    // ============================================
    // 3. Create Onboarding Email Campaigns
    // ============================================

    console.log('Creating onboarding email sequence...')

    const onboardingSteps = [
      {
        name: 'onboarding_step_1',
        subject: 'Quick win: Set your first off-hours schedule',
        html: `
        <!DOCTYPE html>
        <html>
          <body>
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2>🎯 Quick Win: Set Your First Schedule</h2>
              <p>Hi {{user_name}},</p>
              <p>Let's get you started with SlackShield! Your first step is super simple:</p>
              <h3>Set when you're "off the clock"</h3>
              <p>Most people start with:</p>
              <ul>
                <li><strong>Weekdays:</strong> 6 PM - 8 AM</li>
                <li><strong>Weekends:</strong> All day Saturday & Sunday</li>
              </ul>
              <p>This takes 2 minutes and you'll immediately start seeing protection.</p>
              <a href="{{dashboard_url}}" style="display: inline-block; background: #611f69; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Set My Schedule</a>
              <p>Questions? Just reply to this email.</p>
              <p>Best,<br>The SlackShield Team</p>
            </div>
          </body>
        </html>
        `,
        text: `Hi {{user_name}},

Let's get you started with SlackShield! Your first step is super simple:

Set when you're "off the clock"

Most people start with:
- Weekdays: 6 PM - 8 AM
- Weekends: All day Saturday & Sunday

This takes 2 minutes and you'll immediately start seeing protection.

Go to dashboard: {{dashboard_url}}

Questions? Just reply to this email.

Best,
The SlackShield Team`
      },
      {
        name: 'onboarding_step_2',
        subject: 'Customize your auto-response message',
        html: `
        <!DOCTYPE html>
        <html>
          <body>
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2>💬 Customize Your Auto-Response</h2>
              <p>Hi {{user_name}},</p>
              <p>Great job setting your schedule! Now let's make your auto-response message perfect for you.</p>
              <p><strong>Your current message:</strong></p>
              <blockquote style="background: #f0f0f0; padding: 15px; border-left: 4px solid #611f69;">
                "I'm currently off the clock. I'll respond during working hours."
              </blockquote>
              <p>You can customize this to:</p>
              <ul>
                <li>Add your working hours</li>
                <li>Include an emergency contact</li>
                <li>Add a personal touch</li>
              </ul>
              <a href="{{dashboard_url}}" style="display: inline-block; background: #611f69; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Customize Message</a>
              <p>Best,<br>The SlackShield Team</p>
            </div>
          </body>
        </html>
        `,
        text: `Hi {{user_name}},

Great job setting your schedule! Now let's make your auto-response message perfect for you.

Your current message:
"I'm currently off the clock. I'll respond during working hours."

You can customize this to:
- Add your working hours
- Include an emergency contact
- Add a personal touch

Go to dashboard: {{dashboard_url}}

Best,
The SlackShield Team`
      },
      {
        name: 'onboarding_step_3',
        subject: 'Your first week with SlackShield 📊',
        html: `
        <!DOCTYPE html>
        <html>
          <body>
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2>📊 How's Your First Week Going?</h2>
              <p>Hi {{user_name}},</p>
              <p>You've been using SlackShield for a week now. Here's what we're protecting you from:</p>
              <div style="background: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <p style="margin: 10px 0;"><strong>✓</strong> Blocked after-hours notifications</p>
                <p style="margin: 10px 0;"><strong>✓</strong> Sent professional auto-responses</p>
                <p style="margin: 10px 0;"><strong>✓</strong> Tracked boundary violations</p>
              </div>
              <p><strong>Pro tip:</strong> Check your violation reports to see who's messaging you after-hours most often. You might want to have a conversation about boundaries.</p>
              <a href="{{dashboard_url}}" style="display: inline-block; background: #611f69; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View My Reports</a>
              <p>Keep up the great work protecting your time!</p>
              <p>Best,<br>The SlackShield Team</p>
            </div>
          </body>
        </html>
        `,
        text: `Hi {{user_name}},

You've been using SlackShield for a week now. Here's what we're protecting you from:

✓ Blocked after-hours notifications
✓ Sent professional auto-responses
✓ Tracked boundary violations

Pro tip: Check your violation reports to see who's messaging you after-hours most often. You might want to have a conversation about boundaries.

View reports: {{dashboard_url}}

Keep up the great work protecting your time!

Best,
The SlackShield Team`
      }
    ]

    for (let i = 0; i < onboardingSteps.length; i++) {
      const step = onboardingSteps[i]

      const campaignResult = await client.query(`
        INSERT INTO email_campaigns (name, description, type, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        step.name,
        `Onboarding email step ${i + 1}`,
        'onboarding',
        'active'
      ])

      if (campaignResult.rows.length > 0) {
        const campaignId = campaignResult.rows[0].id

        await client.query(`
          INSERT INTO email_templates (campaign_id, name, subject_line, from_name, from_email, html_content, text_content)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          campaignId,
          `Onboarding Step ${i + 1}`,
          step.subject,
          'SlackShield',
          'hello@slackshield.com',
          step.html,
          step.text
        ])
      }
    }

    console.log('✓ Onboarding email sequence created (3 steps)')

    // ============================================
    // 4. Create Weekly Violation Report Campaign
    // ============================================

    console.log('Creating weekly violation report campaign...')

    const reportCampaignResult = await client.query(`
      INSERT INTO email_campaigns (name, description, type, status)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      'violation_report_weekly',
      'Weekly violation report with accountability data',
      'notification',
      'active'
    ])

    if (reportCampaignResult.rows.length > 0) {
      const reportCampaignId = reportCampaignResult.rows[0].id

      await client.query(`
        INSERT INTO email_templates (campaign_id, name, subject_line, from_name, from_email, html_content, text_content)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        reportCampaignId,
        'Weekly Violation Report',
        'Your SlackShield Report: {{week_start}} - {{week_end}}',
        'SlackShield Reports',
        'reports@slackshield.com',
        `
        <!DOCTYPE html>
        <html>
          <body>
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
              <h2>📊 Your Weekly Boundary Report</h2>
              <p>Hi {{user_name}},</p>
              <p>Here's your SlackShield activity for {{week_start}} - {{week_end}}:</p>
              <div style="background: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Key Stats</h3>
                <p><strong>{{total_violations}}</strong> after-hours messages blocked</p>
                <p><strong>{{unique_violators}}</strong> unique people contacted you</p>
                <p><strong>Top violator:</strong> {{top_violator}}</p>
              </div>
              <p>SlackShield is working hard to protect your time. If you see repeat violators, consider having a conversation about boundaries.</p>
              <a href="{{report_url}}" style="display: inline-block; background: #611f69; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Full Report</a>
              <p>Keep protecting your boundaries!</p>
              <p>Best,<br>The SlackShield Team</p>
            </div>
          </body>
        </html>
        `,
        `Hi {{user_name}},

Here's your SlackShield activity for {{week_start}} - {{week_end}}:

Key Stats:
- {{total_violations}} after-hours messages blocked
- {{unique_violators}} unique people contacted you
- Top violator: {{top_violator}}

SlackShield is working hard to protect your time. If you see repeat violators, consider having a conversation about boundaries.

View full report: {{report_url}}

Keep protecting your boundaries!

Best,
The SlackShield Team`
      ])

      console.log('✓ Weekly violation report campaign created')
    }

    await client.query('COMMIT')

    console.log('\n✅ Seeding complete!')
    console.log('\nCreated:')
    console.log('  - 1 landing page experiment with 4 variants')
    console.log('  - 1 welcome email campaign')
    console.log('  - 3 onboarding email campaigns')
    console.log('  - 1 weekly violation report campaign')

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    client.release()
    pool.end()
  }
}

// Run seed
seed().catch(console.error)
