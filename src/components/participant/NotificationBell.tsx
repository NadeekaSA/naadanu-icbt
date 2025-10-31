import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('participant_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `participant_id=eq.${user?.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          showToast(newNotification.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const showToast = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('නාදනූ 2025', {
        body: message,
        icon: '/nadanu.png',
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-5 h-5';
    switch (type) {
      case 'announcement':
        return <Bell className={iconClass} />;
      case 'status_change':
      case 'audition_result':
        return <Check className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'announcement':
        return 'bg-blue-100 text-blue-600';
      case 'status_change':
        return 'bg-green-100 text-green-600';
      case 'audition_scheduled':
        return 'bg-purple-100 text-purple-600';
      case 'audition_result':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
<div
  className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden"
>
  <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
    <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
    <div className="flex items-center gap-2">
      {unreadCount > 0 && (
        <button
          onClick={markAllAsRead}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Mark all read
        </button>
      )}
      <button
        onClick={() => setShowDropdown(false)}
        className="p-1 hover:bg-slate-100 rounded"
      >
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  </div>

  {/* Notifications List */}
  <div className="overflow-y-auto max-h-[28rem]">
    {notifications.length === 0 ? (
      <div className="p-8 text-center text-slate-500">
        <Bell className="w-12 h-12 mx-auto mb-3 text-slate-400" />
        <p className="text-sm">No notifications yet</p>
      </div>
    ) : (
      <div className="divide-y divide-slate-100">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${
              !notification.is_read ? 'bg-blue-50' : ''
            }`}
            onClick={() =>
              !notification.is_read && markAsRead(notification.id)
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(
                  notification.type
                )}`}
              >
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900 text-sm">
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(notification.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</div>

        </>
      )}
    </div>
  );
}
