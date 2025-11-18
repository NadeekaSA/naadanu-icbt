/*
  # Strengthen Admin RLS Policy

  ## Overview
  Updates the RLS policy on the `admin` table to be more restrictive.

  ## 1. Security Update
  - The previous policy "Admin can view all admin records" was too permissive, allowing any authenticated user to potentially see admin data.
  - This update replaces it with a new policy "Admins can only view their own record" which ensures that an admin can only access their own data.

  ## 2. Changes
  - DROPPED old policy on `admin` table.
  - CREATED new, more restrictive SELECT policy on `admin` table.
*/

-- Drop the old, permissive policy
DROP POLICY IF EXISTS "Admin can view all admin records" ON admin;

-- Create a new, more restrictive policy
CREATE POLICY "Admins can only view their own record"
  ON admin FOR SELECT
  USING (auth.uid() = id);
