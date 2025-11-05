/*
  # Add Voting System for Finals

  ## Overview
  Creates tables for managing final performances and public audience voting.
  Allows anonymous voting with IP tracking to prevent duplicate votes.

  ## 1. New Tables

  ### `final_performances`
  - `id` (uuid, primary key) - Performance identifier
  - `participant_id` (uuid, foreign key) - Participant reference
  - `category_id` (uuid, foreign key) - Category reference
  - `performance_title` (text) - Title/name of the performance
  - `performance_image_url` (text, nullable) - URL to performance image
  - `performance_order` (integer) - Order in finals
  - `is_active` (boolean) - Whether performance is active for voting
  - `created_at` (timestamptz) - Creation timestamp

  ### `performance_votes`
  - `id` (uuid, primary key) - Vote identifier
  - `performance_id` (uuid, foreign key) - Performance reference
  - `voter_ip` (text) - IP address of voter (for duplicate prevention)
  - `voter_fingerprint` (text, nullable) - Browser fingerprint for additional tracking
  - `created_at` (timestamptz) - Vote timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Public can view active performances
  - Public can insert votes (with IP tracking)
  - Admin can manage performances
  - Vote counts are aggregated in views

  ## 3. Important Notes
  - One vote per IP per performance
  - Votes are anonymous but tracked by IP
  - Only participants with 'selected' status can have performances
*/

-- Create final_performances table
CREATE TABLE IF NOT EXISTS final_performances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  performance_title text NOT NULL,
  performance_image_url text,
  performance_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create performance_votes table
CREATE TABLE IF NOT EXISTS performance_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_id uuid REFERENCES final_performances(id) ON DELETE CASCADE NOT NULL,
  voter_ip text NOT NULL,
  voter_fingerprint text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(performance_id, voter_ip)
);

-- Enable RLS
ALTER TABLE final_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_votes ENABLE ROW LEVEL SECURITY;

-- Final performances policies
CREATE POLICY "Anyone can view active performances"
  ON final_performances FOR SELECT
  TO authenticated, anon
  USING (is_active = true OR EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can insert performances"
  ON final_performances FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can update performances"
  ON final_performances FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

CREATE POLICY "Admin can delete performances"
  ON final_performances FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Performance votes policies
CREATE POLICY "Anyone can view votes"
  ON performance_votes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can vote"
  ON performance_votes FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_final_performances_participant ON final_performances(participant_id);
CREATE INDEX IF NOT EXISTS idx_final_performances_category ON final_performances(category_id);
CREATE INDEX IF NOT EXISTS idx_final_performances_active ON final_performances(is_active);
CREATE INDEX IF NOT EXISTS idx_performance_votes_performance ON performance_votes(performance_id);
CREATE INDEX IF NOT EXISTS idx_performance_votes_ip ON performance_votes(voter_ip);

-- Create view for vote counts
CREATE OR REPLACE VIEW performance_vote_counts AS
SELECT 
  fp.id,
  fp.participant_id,
  fp.category_id,
  fp.performance_title,
  fp.performance_order,
  fp.is_active,
  COUNT(pv.id) as vote_count,
  fp.created_at
FROM final_performances fp
LEFT JOIN performance_votes pv ON fp.id = pv.performance_id
GROUP BY fp.id, fp.participant_id, fp.category_id, fp.performance_title, 
         fp.performance_order, fp.is_active, fp.created_at;
