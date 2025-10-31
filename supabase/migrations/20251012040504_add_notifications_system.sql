/*
  # Add Notifications System

  ## Overview
  Creates a notifications table to track system notifications for participants about announcements and status changes.

  ## 1. New Tables

  ### `notifications`
  - `id` (uuid, primary key) - Unique notification identifier
  - `participant_id` (uuid, foreign key) - Recipient participant
  - `type` (text) - Notification type: announcement, status_change, audition_scheduled
  - `title` (text) - Notification title
  - `message` (text) - Notification message content
  - `is_read` (boolean) - Whether notification has been read
  - `related_id` (uuid, nullable) - Related record ID (announcement_id, audition_id, etc.)
  - `created_at` (timestamptz) - Creation timestamp

  ## 2. Security
  - Enable RLS on notifications table
  - Participants can only view their own notifications
  - Participants can update read status of their own notifications
  - System/admin can create notifications

  ## 3. Important Notes
  - Notifications are created automatically via triggers when:
    - New announcements are published
    - Participant status changes
    - Auditions are scheduled
    - Audition results are updated
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('announcement', 'status_change', 'audition_scheduled', 'audition_result')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Participants can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Participants can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Admin can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_participant ON notifications(participant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Function to create notification for new announcement
CREATE OR REPLACE FUNCTION notify_new_announcement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    IF NEW.category_id IS NULL THEN
      -- Notify all participants
      INSERT INTO notifications (participant_id, type, title, message, related_id)
      SELECT 
        id,
        'announcement',
        'New Announcement: ' || NEW.title,
        NEW.content,
        NEW.id
      FROM participants;
    ELSE
      -- Notify participants in specific category
      INSERT INTO notifications (participant_id, type, title, message, related_id)
      SELECT 
        p.id,
        'announcement',
        'New Announcement: ' || NEW.title,
        NEW.content,
        NEW.id
      FROM participants p
      WHERE p.category_id = NEW.category_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify participant status change
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO notifications (participant_id, type, title, message)
    VALUES (
      NEW.id,
      'status_change',
      'Status Updated',
      'Your registration status has been updated to: ' || 
      CASE NEW.status
        WHEN 'pending' THEN 'Pending'
        WHEN 'audition_scheduled' THEN 'Audition Scheduled'
        WHEN 'selected' THEN 'Selected for Finals'
        WHEN 'not_selected' THEN 'Not Selected'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify audition scheduled
CREATE OR REPLACE FUNCTION notify_audition_scheduled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_date IS NOT NULL THEN
    INSERT INTO notifications (participant_id, type, title, message, related_id)
    VALUES (
      NEW.participant_id,
      'audition_scheduled',
      'Audition Scheduled',
      'Your audition has been scheduled for ' || 
      TO_CHAR(NEW.scheduled_date, 'Day, Month DD, YYYY at HH:MI AM') || 
      ' at ' || COALESCE(NEW.venue, 'TBA'),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to notify audition result
CREATE OR REPLACE FUNCTION notify_audition_result()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result != OLD.result AND NEW.result != 'pending' THEN
    INSERT INTO notifications (participant_id, type, title, message, related_id)
    VALUES (
      NEW.participant_id,
      'audition_result',
      'Audition Result Available',
      'Your audition result is now available: ' || 
      CASE NEW.result
        WHEN 'qualified' THEN 'Congratulations! You have qualified for the finals.'
        WHEN 'not_qualified' THEN 'Thank you for participating. Unfortunately, you did not qualify this time.'
      END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_announcement ON announcements;
CREATE TRIGGER trigger_notify_new_announcement
  AFTER INSERT ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_announcement();

DROP TRIGGER IF EXISTS trigger_notify_status_change ON participants;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_status_change();

DROP TRIGGER IF EXISTS trigger_notify_audition_scheduled ON auditions;
CREATE TRIGGER trigger_notify_audition_scheduled
  AFTER INSERT ON auditions
  FOR EACH ROW
  EXECUTE FUNCTION notify_audition_scheduled();

DROP TRIGGER IF EXISTS trigger_notify_audition_result ON auditions;
CREATE TRIGGER trigger_notify_audition_result
  AFTER UPDATE ON auditions
  FOR EACH ROW
  EXECUTE FUNCTION notify_audition_result();
