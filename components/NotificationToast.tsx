
import React, { useEffect } from 'react';
import { PulseNotification } from '../types';

interface NotificationToastProps {
  notification: PulseNotification;
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  return (
    <div className="chunky-card !bg-[var(--primary)] !text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-fade-in pointer-events-auto cursor-pointer" onClick={() => onDismiss(notification.id)}>
      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center border border-white/40">
        ✨
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-tight">
          <span className="font-display mr-1">{notification.userName}</span>
          {notification.text}
        </p>
        <p className="text-[7px] font-mono opacity-60">Just now • PULSE_EVENT</p>
      </div>
    </div>
  );
};

export default NotificationToast;
