-- Create announcements table for storing unique announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on announcements
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Users can read announcements" ON announcements;

-- Allow admins to manage announcements
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND database_role = 'admin'
    )
  );

-- Allow users to read announcements (they receive notifications)
CREATE POLICY "Users can read announcements" ON announcements
  FOR SELECT USING (true);

-- Clean up duplicate broadcast records from admin_messages
-- Delete all broadcast messages (they were duplicates)
DELETE FROM admin_messages WHERE is_broadcast = true;

-- Add RLS policy for users to read their own messages
DROP POLICY IF EXISTS "Users can read own messages" ON admin_messages;
CREATE POLICY "Users can read own messages" ON admin_messages
  FOR SELECT USING (auth.uid() = user_id);
