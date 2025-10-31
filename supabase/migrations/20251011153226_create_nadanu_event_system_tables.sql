/*
  # නාදනූ Event Management System Database Schema

  ## Overview
  Complete database schema for the ICBT Computing Society's singing and dancing competition event management system.

  ## 1. New Tables

  ### `admin`
  - `id` (uuid, primary key) - Unique admin identifier
  - `email` (text, unique) - Admin email for login
  - `password_hash` (text) - Hashed password
  - `full_name` (text) - Admin's full name
  - `created_at` (timestamptz) - Account creation timestamp

  ### `categories`
  - `id` (uuid, primary key) - Category identifier
  - `name` (text) - Category name (Solo Singing, Group Singing, Solo Dancing, Group Dancing)
  - `type` (text) - Type: singing or dancing
  - `is_group` (boolean) - Whether it's a group category
  - `created_at` (timestamptz) - Creation timestamp

  ### `participants`
  - `id` (uuid, primary key) - Participant identifier
  - `email` (text, unique) - Participant email for login
  - `password_hash` (text) - Hashed password
  - `full_name` (text) - Full name
  - `icbt_id` (text, unique) - ICBT student ID
  - `phone_number` (text) - Contact number
  - `category_id` (uuid, foreign key) - Selected category
  - `team_name` (text, nullable) - Team name for group entries
  - `team_size` (integer, nullable) - Number of team members
  - `registration_date` (timestamptz) - Registration timestamp
  - `status` (text) - Registration status: pending, audition_scheduled, selected, not_selected
  - `created_at` (timestamptz) - Account creation timestamp

  ### `auditions`
  - `id` (uuid, primary key) - Audition record identifier
  - `participant_id` (uuid, foreign key) - Participant reference
  - `category_id` (uuid, foreign key) - Category reference
  - `scheduled_date` (timestamptz) - Audition date and time
  - `venue` (text) - Audition venue
  - `result` (text, nullable) - Result: qualified, not_qualified, pending
  - `admin_notes` (text, nullable) - Admin comments/feedback
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `announcements`
  - `id` (uuid, primary key) - Announcement identifier
  - `title` (text) - Announcement title
  - `content` (text) - Announcement content
  - `category_id` (uuid, foreign key, nullable) - Target specific category or null for all
  - `created_by` (uuid, foreign key) - Admin who created it
  - `is_active` (boolean) - Whether announcement is currently visible
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Admin policies: Full access for authenticated admin users
  - Participant policies: Read own data only, public registration
  - Category policies: Public read access
  - Audition policies: Participants can view own auditions, admins have full access
  - Announcement policies: Public read for active announcements, admin-only write

  ## 3. Important Notes
  - All timestamps use Sri Lankan timezone context
  - Password hashing will be handled by application layer
  - Default categories will be pre-populated
  - Admin account needs to be created separately for initial setup
*/

-- Create admin table
CREATE TABLE IF NOT EXISTS admin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('singing', 'dancing')),
  is_group boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  icbt_id text UNIQUE NOT NULL,
  phone_number text NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  team_name text,
  team_size integer CHECK (team_size > 0),
  registration_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'audition_scheduled', 'selected', 'not_selected')),
  created_at timestamptz DEFAULT now()
);

-- Create auditions table
CREATE TABLE IF NOT EXISTS auditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  scheduled_date timestamptz,
  venue text DEFAULT '',
  result text DEFAULT 'pending' CHECK (result IN ('qualified', 'not_qualified', 'pending')),
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category_id uuid REFERENCES categories(id),
  created_by uuid REFERENCES admin(id) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Admin policies (restrictive - admin access only)
CREATE POLICY "Admin can view all admin records"
  ON admin FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can update own record"
  ON admin FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Categories policies (public read access)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Admin can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Participants policies
CREATE POLICY "Participants can view own data"
  ON participants FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Anyone can register as participant"
  ON participants FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Participants can update own data"
  ON participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin can update participant status"
  ON participants FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Auditions policies
CREATE POLICY "Participants can view own auditions"
  ON auditions FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid() OR EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can manage all auditions"
  ON auditions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can update auditions"
  ON auditions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can delete auditions"
  ON auditions FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Announcements policies
CREATE POLICY "Anyone can view active announcements"
  ON announcements FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can create announcements"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can update announcements"
  ON announcements FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can delete announcements"
  ON announcements FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Insert default categories
INSERT INTO categories (name, type, is_group) VALUES
  ('Solo Singing', 'singing', false),
  ('Group Singing', 'singing', true),
  ('Solo Dancing', 'dancing', false),
  ('Group Dancing', 'dancing', true)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_participants_category ON participants(category_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_auditions_participant ON auditions(participant_id);
CREATE INDEX IF NOT EXISTS idx_auditions_scheduled_date ON auditions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category_id);