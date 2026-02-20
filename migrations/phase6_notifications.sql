-- Phase 6: Real-Time Notifications & Email Alerts

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all notifications" ON notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (auth.users.user_metadata->>'database_role' = 'Admin' 
                 OR auth.users.app_metadata->>'role' = 'Admin')
        )
    );

-- Function to trigger notification on new maintenance request
CREATE OR REPLACE FUNCTION notify_new_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify all admins
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
        au.id,
        'New Maintenance Request',
        'A new maintenance request has been submitted: ' || NEW.description,
        'info',
        jsonb_build_object('request_id', NEW.id, 'requester', NEW.requester_name)
    FROM auth.users au
    WHERE (au.user_metadata->>'database_role' = 'Admin' 
           OR au.app_metadata->>'role' = 'Admin')
    AND au.id != NEW.requester_id; -- Don't notify the requester
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to trigger notification on request completion
CREATE OR REPLACE FUNCTION notify_request_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the requester
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        NEW.requester_id,
        'Request Completed',
        'Your maintenance request has been completed: ' || NEW.description,
        'success',
        jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_request ON maintenance_requests;
CREATE TRIGGER trigger_notify_new_request
    AFTER INSERT ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_request();

DROP TRIGGER IF EXISTS trigger_notify_request_completion ON maintenance_requests;
CREATE TRIGGER trigger_notify_request_completion
    AFTER UPDATE ON maintenance_requests
    FOR EACH ROW
    WHEN (OLD.status != 'Completed' AND NEW.status = 'Completed')
    EXECUTE FUNCTION notify_request_completion();

-- Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
