-- Migration: Add Web Push Notifications Support
-- Add tracking for push status on notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_push boolean DEFAULT false;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  endpoint text UNIQUE NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for push_subscriptions
CREATE POLICY "Participants can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Participants can view own subscriptions"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Participants can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (participant_id = auth.uid());

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_participant ON push_subscriptions(participant_id);
