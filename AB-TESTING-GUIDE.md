# A/B/C/D Testing & Email Marketing Guide

Complete guide to using SlackShield's built-in experimentation and email marketing infrastructure.

## Table of Contents

1. [Overview](#overview)
2. [A/B Testing System](#ab-testing-system)
3. [Email Marketing System](#email-marketing-system)
4. [Setup Instructions](#setup-instructions)
5. [Running Experiments](#running-experiments)
6. [Email Campaigns](#email-campaigns)
7. [Analytics & Reporting](#analytics--reporting)
8. [Best Practices](#best-practices)

---

## Overview

SlackShield includes a complete A/B/C/D testing and email marketing infrastructure that allows you to:

- **Test marketing variations** on your landing page
- **Optimize conversion rates** with statistical analysis
- **Send automated emails** for onboarding, engagement, and retention
- **Track email performance** with open rates, click rates, and conversions
- **Run A/B tests on emails** to optimize subject lines and content

## A/B Testing System

### Architecture

The A/B testing system uses:

- **Consistent hashing** for user bucketing (same user always sees same variant)
- **Traffic allocation** to control experiment reach (e.g., 50% of users)
- **Statistical analysis** with z-tests for significance
- **Event tracking** for conversions, clicks, views, etc.

### Key Features

✅ Support for **A/B/C/D testing** (2-26 variants)
✅ **Anonymous tracking** before signup
✅ **User tracking** after signup
✅ **Statistical significance** calculation
✅ **Real-time results** dashboard
✅ **Experiment lifecycle** (draft → running → completed)

### Database Schema

```sql
-- Experiments
CREATE TABLE experiments (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  type VARCHAR(50), -- 'page', 'email', 'feature', 'component'
  status VARCHAR(50), -- 'draft', 'running', 'paused', 'completed'
  traffic_allocation DECIMAL(3,2), -- 0.00 to 1.00
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Variants (A, B, C, D, etc.)
CREATE TABLE experiment_variants (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES experiments(id),
  name VARCHAR(50), -- 'A', 'B', 'C', 'D'
  config JSONB, -- Variant configuration
  traffic_weight INT, -- Relative weight (1:1:1:1 for equal)
  is_control BOOLEAN
);

-- User assignments (consistent bucketing)
CREATE TABLE experiment_assignments (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES experiments(id),
  variant_id UUID REFERENCES experiment_variants(id),
  user_id UUID REFERENCES users(id),
  anonymous_id VARCHAR(255),
  assigned_at TIMESTAMP
);

-- Events (views, clicks, conversions)
CREATE TABLE experiment_events (
  id UUID PRIMARY KEY,
  experiment_id UUID REFERENCES experiments(id),
  variant_id UUID REFERENCES experiment_variants(id),
  assignment_id UUID REFERENCES experiment_assignments(id),
  event_type VARCHAR(100), -- 'view', 'click', 'signup', 'conversion'
  event_data JSONB,
  occurred_at TIMESTAMP
);
```

### Bucketing Algorithm

```javascript
// Consistent hashing ensures same user always sees same variant
function hashBucket(experimentId, userId) {
  const input = `${experimentId}:${userId}`
  const hash = crypto.createHash('sha256').update(input).digest('hex')
  const hashInt = parseInt(hash.substring(0, 8), 16)
  return hashInt / 0xFFFFFFFF // Returns 0.0 - 1.0
}

// Weighted variant selection
function selectVariant(variants, bucketValue) {
  const totalWeight = variants.reduce((sum, v) => sum + v.traffic_weight, 0)
  let cumulativeWeight = 0

  for (const variant of variants) {
    cumulativeWeight += variant.traffic_weight
    const threshold = cumulativeWeight / totalWeight

    if (bucketValue <= threshold) {
      return variant
    }
  }
}
```

### API Endpoints

**Get Variant Assignment:**
```http
GET /api/experiments/:experimentName/variant?anonymousId=xxx
```

**Track Event:**
```http
POST /api/experiments/:experimentName/event
{
  "anonymousId": "uuid",
  "eventType": "click",
  "eventName": "hero_cta",
  "eventData": {}
}
```

**Get Results:**
```http
GET /api/experiments/:experimentName/results
```

**Create Experiment:**
```http
POST /api/experiments
{
  "name": "landing_page_hero",
  "type": "page",
  "variants": [
    { "name": "A", "isControl": true, "config": {...} },
    { "name": "B", "config": {...} }
  ]
}
```

---

## Email Marketing System

### Architecture

The email system integrates with **SendGrid** and includes:

- **Campaign management** for transactional, onboarding, and marketing emails
- **Template system** with variable substitution
- **A/B testing** for email variants
- **Delivery tracking** with webhooks (open, click, bounce)
- **Unsubscribe management** by category

### Email Types

1. **Transactional** - Welcome emails, password resets
2. **Onboarding** - Drip campaigns for new users
3. **Marketing** - Feature announcements, promotions
4. **Notifications** - Violation reports, weekly summaries

### Database Schema

```sql
-- Email campaigns
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50), -- 'transactional', 'onboarding', 'marketing', 'notification'
  status VARCHAR(50), -- 'draft', 'active', 'paused', 'archived'
  experiment_id UUID REFERENCES experiments(id) NULL
);

-- Email templates (can have variants)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  variant_id UUID REFERENCES experiment_variants(id) NULL,
  subject_line VARCHAR(255),
  html_content TEXT,
  text_content TEXT,
  variables JSONB -- Template variables
);

-- Email sends (tracking)
CREATE TABLE email_sends (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id),
  template_id UUID REFERENCES email_templates(id),
  user_id UUID REFERENCES users(id),
  to_email VARCHAR(255),
  status VARCHAR(50), -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced'
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

-- Unsubscribes
CREATE TABLE email_unsubscribes (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  category VARCHAR(50), -- 'marketing', 'onboarding', 'notifications', 'all'
  unsubscribed_at TIMESTAMP
);
```

### Template Variables

Templates support variable substitution:

```html
<p>Hi {{user_name}},</p>
<p>Welcome to SlackShield! Your dashboard is ready: {{dashboard_url}}</p>
<a href="{{unsubscribe_url}}">Unsubscribe</a>
```

Available variables:
- `{{user_name}}` - User's name
- `{{user_email}}` - User's email
- `{{dashboard_url}}` - Link to dashboard
- `{{unsubscribe_url}}` - Unsubscribe link
- Custom variables passed per email

### API Endpoints

**Send Email:**
```http
POST /api/email/send
{
  "campaignName": "welcome",
  "toEmail": "user@example.com",
  "toName": "John",
  "variables": { "custom_var": "value" }
}
```

**Unsubscribe:**
```http
POST /api/email/unsubscribe
{
  "email": "user@example.com",
  "category": "marketing",
  "reason": "Too many emails"
}
```

**SendGrid Webhook (for tracking):**
```http
POST /api/email/webhook
[
  {
    "event": "open",
    "send_id": "uuid",
    "timestamp": 1234567890
  }
]
```

---

## Setup Instructions

### 1. Database Migration

Run the migration to create tables:

```bash
cd slackshield-api
psql $DATABASE_URL -f database/migrations/002_ab_testing_and_emails.sql
```

### 2. Seed Initial Data

Populate experiments and email campaigns:

```bash
node database/seed-experiments-and-emails.js
```

This creates:
- 1 landing page experiment (4 variants)
- 1 welcome email campaign
- 3 onboarding email campaigns
- 1 weekly report campaign

### 3. SendGrid Configuration

1. **Sign up for SendGrid** (free tier: 100 emails/day)
   - https://sendgrid.com/

2. **Create API key:**
   - Settings → API Keys → Create API Key
   - Full Access

3. **Add to environment variables:**
   ```bash
   echo "SENDGRID_API_KEY=SG.xxx" >> .env
   ```

4. **Configure webhook** (for tracking opens/clicks):
   - Settings → Mail Settings → Event Webhook
   - URL: `https://your-api.com/api/email/webhook`
   - Select events: Delivered, Opened, Clicked, Bounced

5. **Verify sender identity:**
   - Settings → Sender Authentication
   - Verify your domain or single sender

### 4. Marketing Site Deployment

Deploy the marketing site (separate from main app):

```bash
cd slackshield-marketing
npm install
npm run build

# Deploy to Vercel, Netlify, or your hosting
vercel deploy
```

**Environment variables:**
```bash
VITE_API_URL=https://api.slackshield.com
```

### 5. Install Dependencies

```bash
# API
cd slackshield-api
npm install

# Marketing site
cd slackshield-marketing
npm install
```

---

## Running Experiments

### Example: Landing Page Hero Test

**Goal:** Test 4 different hero section approaches

**Variants:**
- **A (Control):** Professional boundary enforcement
- **B (Emotional):** Work-life balance focus
- **C (Problem-focused):** Pain point emphasis
- **D (Feature-benefit):** What you get

**Step 1: Create experiment** (already done via seed)

**Step 2: Start experiment:**
```bash
curl -X POST https://api.slackshield.com/api/experiments/landing_page_hero/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Step 3: Integrate into marketing site:**

The marketing site (`slackshield-marketing`) already has this integrated:

```jsx
// LandingPage.jsx automatically:
// 1. Gets variant assignment on page load
// 2. Tracks page view event
// 3. Renders appropriate hero variant
// 4. Tracks CTA clicks
```

**Step 4: Monitor results:**

View real-time results in the experiments dashboard:
```
https://app.slackshield.com/experiments
```

Or via API:
```bash
curl https://api.slackshield.com/api/experiments/landing_page_hero/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Step 5: Stop when significant:**

Wait for statistical significance (p-value < 0.05), then:

```bash
curl -X POST https://api.slackshield.com/api/experiments/landing_page_hero/stop \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Sample Results

```json
{
  "experimentName": "landing_page_hero",
  "status": "running",
  "control": {
    "variant": "A",
    "assignments": 523,
    "conversions": 42,
    "conversionRate": 8.03
  },
  "treatments": [
    {
      "variant": "B",
      "assignments": 518,
      "conversions": 58,
      "conversionRate": 11.20,
      "lift": "+39.48%",
      "pValue": "0.0234",
      "isSignificant": true,
      "confidence": "95%+"
    },
    {
      "variant": "C",
      "assignments": 511,
      "conversions": 39,
      "conversionRate": 7.63,
      "lift": "-4.98%",
      "pValue": "0.7812",
      "isSignificant": false,
      "confidence": "Not significant"
    },
    {
      "variant": "D",
      "assignments": 507,
      "conversions": 61,
      "conversionRate": 12.03,
      "lift": "+49.81%",
      "pValue": "0.0089",
      "isSignificant": true,
      "confidence": "95%+"
    }
  ]
}
```

**Interpretation:**
- Variant D is the winner (+49.81% lift, highly significant)
- Variant B is also strong (+39.48% lift, significant)
- Variant C underperforms (not significant)

---

## Email Campaigns

### Onboarding Sequence

**Automatic 3-step onboarding:**

1. **Welcome Email** (immediately after signup)
2. **Step 1: Set Schedule** (1 day after signup)
3. **Step 2: Customize Response** (3 days after signup)
4. **Step 3: First Week Report** (7 days after signup)

**Trigger emails programmatically:**

```javascript
// After user signup
await sendWelcomeEmail(user)

// Scheduled jobs (use node-cron)
cron.schedule('0 9 * * *', async () => {
  // Send onboarding step 1 to users who signed up yesterday
  const users = await getUsersSignedUpDaysAgo(1)
  for (const user of users) {
    await sendOnboardingEmail(user, 1)
  }
})
```

### Weekly Violation Reports

**Automatically send weekly reports:**

```javascript
cron.schedule('0 9 * * 1', async () => {
  // Every Monday at 9 AM
  const users = await getAllActiveUsers()

  for (const user of users) {
    const reportData = await getWeeklyViolationStats(user.id)

    await sendViolationReport(user, {
      totalViolations: reportData.count,
      uniqueViolators: reportData.uniqueCount,
      topViolator: reportData.topViolatorName,
      weekStart: 'May 1',
      weekEnd: 'May 7'
    })
  }
})
```

### A/B Testing Emails

**Test subject lines:**

1. **Create email experiment:**
```javascript
await createExperiment({
  name: 'welcome_email_subject',
  type: 'email',
  variants: [
    {
      name: 'A',
      isControl: true,
      config: { subject: 'Welcome to SlackShield!' }
    },
    {
      name: 'B',
      config: { subject: 'Your boundaries are now protected 🛡️' }
    }
  ]
})
```

2. **Create campaign with experiment:**
```sql
INSERT INTO email_campaigns (name, type, status, experiment_id)
VALUES ('welcome', 'onboarding', 'active', '<experiment_id>');
```

3. **Create templates for each variant:**
```sql
-- Variant A template
INSERT INTO email_templates (campaign_id, variant_id, subject_line, html_content)
VALUES ('<campaign_id>', '<variant_a_id>', 'Welcome to SlackShield!', '<html>');

-- Variant B template
INSERT INTO email_templates (campaign_id, variant_id, subject_line, html_content)
VALUES ('<campaign_id>', '<variant_b_id>', 'Your boundaries are now protected 🛡️', '<html>');
```

4. **Send email** (automatically selects variant):
```javascript
await sendEmail({
  campaignName: 'welcome',
  userId: user.id,
  toEmail: user.email,
  toName: user.name
})
```

5. **Track results** (opens, clicks automatically tracked via webhook)

---

## Analytics & Reporting

### Experiment Results View

Available in PostgreSQL:

```sql
-- Pre-built view for quick queries
SELECT * FROM experiment_results
WHERE experiment_name = 'landing_page_hero';
```

Returns:
- Variant names
- Assignments, views, clicks, conversions per variant
- Conversion rates

### Email Performance View

```sql
SELECT * FROM email_campaign_performance
WHERE campaign_name = 'welcome';
```

Returns:
- Total sends
- Delivery rate
- Open rate
- Click rate
- Bounce rate

### Custom Queries

**Conversion funnel:**
```sql
SELECT
  event_type,
  COUNT(*) as count
FROM experiment_events
WHERE experiment_id = '<id>'
GROUP BY event_type
ORDER BY count DESC;
```

**Daily signups from experiment:**
```sql
SELECT
  DATE(occurred_at) as date,
  variant_id,
  COUNT(*) as signups
FROM experiment_events
WHERE event_type = 'signup'
  AND experiment_id = '<id>'
GROUP BY date, variant_id
ORDER BY date DESC;
```

---

## Best Practices

### A/B Testing

✅ **DO:**
- Test one variable at a time
- Run experiments until statistical significance (p < 0.05)
- Need 100+ conversions per variant minimum
- Define success metrics before starting
- Use equal traffic weights unless ramping

❌ **DON'T:**
- Stop experiments early (false positives)
- Test too many variants at once (dilutes traffic)
- Change experiments mid-test
- Ignore statistical significance

### Email Marketing

✅ **DO:**
- Personalize with variables ({{user_name}})
- Include clear unsubscribe links
- Test subject lines with A/B tests
- Segment users by behavior
- Monitor bounce rates (keep < 5%)
- Provide plain text version

❌ **DON'T:**
- Send too frequently (causes unsubscribes)
- Use spammy words in subject lines
- Forget to test across email clients
- Send without unsubscribe option (illegal)

### Statistical Significance

**Minimum sample sizes:**
- 100 conversions per variant (minimum)
- 1,000 visitors per variant (recommended)
- Run for at least 1 week (account for weekly patterns)

**Interpreting p-values:**
- p < 0.05 → Statistically significant
- p < 0.01 → Highly significant
- p > 0.05 → Not significant (keep testing or abandon)

---

## Troubleshooting

### Experiments not tracking

**Check:**
1. Is experiment status 'running'?
2. Are events being sent to API?
3. Check browser console for errors
4. Verify anonymousId cookie is set

### Emails not sending

**Check:**
1. Is SENDGRID_API_KEY set?
2. Is sender email verified in SendGrid?
3. Check email_sends table for error_message
4. Verify campaign status is 'active'

### Emails going to spam

**Fix:**
1. Verify domain with SendGrid (SPF/DKIM)
2. Avoid spam trigger words
3. Include physical address in footer
4. Monitor bounce rates
5. Use double opt-in

---

## Next Steps

1. **Monitor your first experiment** → Check dashboard daily
2. **Set up email automation** → Schedule onboarding sequence
3. **Create custom experiments** → Test pricing page, CTA copy
4. **Optimize email templates** → A/B test subject lines
5. **Scale what works** → Roll out winning variants

---

## Support

Questions? Issues?

- **Email:** hello@slackshield.com
- **Documentation:** /docs
- **Issues:** GitHub Issues

