/*
  # Protect Voter Privacy

  ## Overview
  Updates RLS policies to protect the privacy of voters in the `performance_votes` table.

  ## 1. Security Update
  - The previous SELECT policy on `performance_votes` was too permissive, allowing anyone to view raw vote data, including voter IP addresses.
  - This update removes the old policy and adds a new one that restricts direct SELECT access to admins only.
  - The `performance_vote_counts` view is altered to use the view owner's permissions (a superuser), which bypasses RLS. This ensures that the public can still see the total vote counts without having access to the sensitive underlying vote data.

  ## 2. Changes
  - DROPPED the "Anyone can view votes" policy on the `performance_votes` table.
  - CREATED a new, more restrictive "Admins can view raw votes" policy.
  - ALTERED the `performance_vote_counts` view to set `security_invoker = false`, allowing it to bypass RLS for the purpose of aggregation.
*/

-- Drop the old, permissive policy that allowed anyone to see voter IPs
DROP POLICY IF EXISTS "Anyone can view votes" ON performance_votes;

-- Create a new policy that allows only admins to see the raw vote data
CREATE POLICY "Admins can view raw votes"
  ON performance_votes FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM admin WHERE admin.id = auth.uid()));

-- Alter the view to bypass RLS for counting votes,
-- so the public can see vote counts without seeing individual voter data.
-- When security_invoker is false, the view uses the permissions of the owner (postgres role),
-- which is a superuser and bypasses RLS.
ALTER VIEW public.performance_vote_counts SET (security_invoker = false);
