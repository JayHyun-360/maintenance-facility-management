export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationSubscription {
  unsubscribe: () => void;
}
