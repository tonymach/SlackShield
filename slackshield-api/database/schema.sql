-- SlackShield Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, team
  stripe_customer_id VARCHAR(255)
);

-- Slack workspaces connected to user
CREATE TABLE IF NOT EXISTS slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id VARCHAR(255) NOT NULL, -- Slack team ID
  team_name VARCHAR(255),
  access_token TEXT NOT NULL, -- Encrypted Slack access token
  bot_token TEXT, -- For bot features (future)
  user_slack_id VARCHAR(255), -- User's Slack ID in this workspace
  connected_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, team_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_slack_workspaces_user_id ON slack_workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_workspaces_team_id ON slack_workspaces(team_id);

-- User schedules (when they're "off the clock")
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Sunday, 6=Saturday
  start_time TIME, -- e.g., '18:00:00'
  end_time TIME, -- e.g., '08:00:00' (next day)
  timezone VARCHAR(50) DEFAULT 'America/Toronto',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_workspace_id ON schedules(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schedules_active ON schedules(is_active);

-- Auto-response templates
CREATE TABLE IF NOT EXISTS response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_workspace_id ON response_templates(workspace_id);

-- Violation logs (when someone messages during off-hours)
CREATE TABLE IF NOT EXISTS violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES slack_workspaces(id) ON DELETE CASCADE,
  violator_slack_id VARCHAR(255) NOT NULL,
  violator_name VARCHAR(255),
  channel_id VARCHAR(255),
  channel_name VARCHAR(255),
  message_ts VARCHAR(255), -- Slack message timestamp
  occurred_at TIMESTAMP DEFAULT NOW(),
  auto_response_sent BOOLEAN DEFAULT false,
  response_sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violations_workspace_id ON violation_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_violations_occurred_at ON violation_logs(occurred_at);
CREATE INDEX IF NOT EXISTS idx_violations_violator ON violation_logs(violator_slack_id);

-- Insert default data (optional)
-- This would be used for testing purposes

COMMENT ON TABLE users IS 'SlackShield users';
COMMENT ON TABLE slack_workspaces IS 'Connected Slack workspaces for each user';
COMMENT ON TABLE schedules IS 'User off-hours schedules';
COMMENT ON TABLE response_templates IS 'Auto-response message templates';
COMMENT ON TABLE violation_logs IS 'Log of boundary violations (messages during off-hours)';
