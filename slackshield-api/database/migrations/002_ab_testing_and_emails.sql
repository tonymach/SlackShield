-- A/B/C/D Testing and Email Infrastructure
-- Migration 002

-- ============================================
-- A/B Testing Tables
-- ============================================

-- Experiments configuration
CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE, -- e.g., 'landing_page_hero', 'email_welcome_subject'
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'page', 'email', 'feature', 'component'
  status VARCHAR(50) DEFAULT 'draft', -- draft, running, paused, completed
  traffic_allocation DECIMAL(3,2) DEFAULT 1.00, -- 0.00 to 1.00 (percentage of users to include)
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Experiment variants (A, B, C, D, etc.)
CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- 'A', 'B', 'C', 'D', 'control', 'variant_1', etc.
  description TEXT,
  config JSONB, -- Variant-specific configuration (colors, copy, layout, etc.)
  traffic_weight INT DEFAULT 1, -- Relative weight (1:1:1:1 for equal distribution)
  is_control BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(experiment_id, name)
);

-- User assignments (consistent bucketing)
CREATE TABLE IF NOT EXISTS experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES experiment_variants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NULL, -- NULL for anonymous users
  anonymous_id VARCHAR(255), -- For tracking before signup
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, anonymous_id)
);

-- Experiment events (conversions, views, clicks)
CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES experiment_variants(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES experiment_assignments(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'view', 'click', 'signup', 'conversion', 'purchase'
  event_name VARCHAR(255), -- Specific event name
  event_data JSONB, -- Additional event metadata
  occurred_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for experiments
CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiments_type ON experiments(type);
CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment ON experiment_variants(experiment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_experiment ON experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_anonymous ON experiment_assignments(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_events_experiment ON experiment_events(experiment_id);
CREATE INDEX IF NOT EXISTS idx_events_variant ON experiment_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_events_assignment ON experiment_events(assignment_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON experiment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON experiment_events(occurred_at);

-- ============================================
-- Email Infrastructure Tables
-- ============================================

-- Email campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'transactional', 'onboarding', 'marketing', 'notification'
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, archived
  experiment_id UUID REFERENCES experiments(id) ON DELETE SET NULL NULL, -- Optional A/B test
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email templates (can have multiple variants per campaign)
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES experiment_variants(id) ON DELETE SET NULL NULL, -- NULL if not part of experiment
  name VARCHAR(255) NOT NULL,
  subject_line VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) DEFAULT 'SlackShield',
  from_email VARCHAR(255) DEFAULT 'hello@slackshield.com',
  reply_to VARCHAR(255),
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB, -- Template variables like {{user_name}}, {{workspace_name}}
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email sends (tracking each email sent)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_email VARCHAR(255) NOT NULL,
  subject_line VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed
  sendgrid_message_id VARCHAR(255), -- External email provider ID
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB, -- Additional tracking data
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email unsubscribes
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NULL,
  email VARCHAR(255) NOT NULL,
  category VARCHAR(50), -- 'marketing', 'onboarding', 'notifications', 'all'
  reason TEXT,
  unsubscribed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email, category)
);

-- Indexes for email tables
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON email_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_templates_campaign ON email_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_templates_variant ON email_templates(variant_id);
CREATE INDEX IF NOT EXISTS idx_sends_campaign ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_sends_sent_at ON email_sends(sent_at);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_user ON email_unsubscribes(user_id);

-- ============================================
-- Analytics Views for Quick Queries
-- ============================================

-- Experiment results summary
CREATE OR REPLACE VIEW experiment_results AS
SELECT
  e.id AS experiment_id,
  e.name AS experiment_name,
  e.type AS experiment_type,
  e.status,
  v.id AS variant_id,
  v.name AS variant_name,
  v.is_control,
  COUNT(DISTINCT a.id) AS assignments,
  COUNT(DISTINCT CASE WHEN ev.event_type = 'view' THEN ev.id END) AS views,
  COUNT(DISTINCT CASE WHEN ev.event_type = 'click' THEN ev.id END) AS clicks,
  COUNT(DISTINCT CASE WHEN ev.event_type = 'signup' THEN ev.id END) AS signups,
  COUNT(DISTINCT CASE WHEN ev.event_type = 'conversion' THEN ev.id END) AS conversions,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN ev.event_type = 'conversion' THEN ev.id END) /
    NULLIF(COUNT(DISTINCT a.id), 0),
    2
  ) AS conversion_rate
FROM experiments e
LEFT JOIN experiment_variants v ON v.experiment_id = e.id
LEFT JOIN experiment_assignments a ON a.variant_id = v.id
LEFT JOIN experiment_events ev ON ev.assignment_id = a.id
GROUP BY e.id, e.name, e.type, e.status, v.id, v.name, v.is_control
ORDER BY e.created_at DESC, v.name;

-- Email campaign performance
CREATE OR REPLACE VIEW email_campaign_performance AS
SELECT
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.type AS campaign_type,
  t.id AS template_id,
  t.name AS template_name,
  COUNT(DISTINCT s.id) AS total_sends,
  COUNT(DISTINCT CASE WHEN s.status = 'sent' THEN s.id END) AS sent,
  COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) AS delivered,
  COUNT(DISTINCT CASE WHEN s.status = 'opened' THEN s.id END) AS opened,
  COUNT(DISTINCT CASE WHEN s.status = 'clicked' THEN s.id END) AS clicked,
  COUNT(DISTINCT CASE WHEN s.status = 'bounced' THEN s.id END) AS bounced,
  COUNT(DISTINCT CASE WHEN s.status = 'failed' THEN s.id END) AS failed,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END) /
    NULLIF(COUNT(DISTINCT s.id), 0),
    2
  ) AS delivery_rate,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN s.status = 'opened' THEN s.id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN s.status = 'delivered' THEN s.id END), 0),
    2
  ) AS open_rate,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN s.status = 'clicked' THEN s.id END) /
    NULLIF(COUNT(DISTINCT CASE WHEN s.status = 'opened' THEN s.id END), 0),
    2
  ) AS click_rate
FROM email_campaigns c
LEFT JOIN email_templates t ON t.campaign_id = c.id
LEFT JOIN email_sends s ON s.campaign_id = c.id
GROUP BY c.id, c.name, c.type, t.id, t.name
ORDER BY c.created_at DESC;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE experiments IS 'A/B/C/D test experiments configuration';
COMMENT ON TABLE experiment_variants IS 'Variants (A, B, C, D) for each experiment';
COMMENT ON TABLE experiment_assignments IS 'User assignments to experiment variants (consistent bucketing)';
COMMENT ON TABLE experiment_events IS 'Events tracked for experiment analysis (views, clicks, conversions)';
COMMENT ON TABLE email_campaigns IS 'Email campaigns (onboarding, transactional, marketing)';
COMMENT ON TABLE email_templates IS 'Email templates with optional A/B testing variants';
COMMENT ON TABLE email_sends IS 'Individual email sends with delivery tracking';
COMMENT ON TABLE email_unsubscribes IS 'Email unsubscribe preferences';
