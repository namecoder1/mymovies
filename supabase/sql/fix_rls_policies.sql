-- ============================================
-- FIX RLS POLICIES FOR ADMIN
-- Run this script in your Supabase SQL Editor
-- ============================================

-- Allow the Admin user to perform ALL operations (INSERT, UPDATE, DELETE, SELECT)
-- We identify the admin via the known Profile ID used in the application.

CREATE POLICY "stream_providers_admin_manage"
ON stream_providers
FOR ALL
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM profiles 
        WHERE id = 'f0245e82-9cec-4d6c-a6b1-a935b48a13b7'
    )
);

-- Note: The existing service_role policies will coexist with this one.
-- RLS policies are additive (OR logic), so satisfying this policy grants access
-- regardless of the others.
