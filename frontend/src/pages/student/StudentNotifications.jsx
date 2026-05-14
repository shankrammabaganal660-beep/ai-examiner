import React, { useEffect, useState } from 'react';
import { studentAPI } from '../../services/api';
import useNotificationStore from '../../store/notificationStore';
import { Bell, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_COLOR = { evaluation_complete: 'text-emerald-400', submission_received: 'text-blue-400', marks_updated: 'text-purple-400', announcement: 'text-amber-400', system: 'text-gray-400' };

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { markAllRead } = useNotificationStore();

  useEffect(() => {
    studentAPI.getNotifications().then(({ data }) => setNotifications(data.data)).finally(() => setLoading(false));
  }, []);

  const handleMarkAll = async () => {
    await studentAPI.markAllRead();
    markAllRead();
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    toast.success('All marked as read');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-gray-100">Notifications</h1>
        <button onClick={handleMarkAll} className="btn-ghost text-xs flex items-center gap-1.5"><CheckCheck className="w-4 h-4" /> Mark all read</button>
      </div>
      {loading ? <div className="space-y-3">{Array.from({length:4}).map((_,i)=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      : notifications.length === 0 ? (
        <div className="card text-center py-12"><Bell className="w-10 h-10 mx-auto mb-3 text-gray-600" /><p className="text-gray-500">No notifications</p></div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n._id} className={`card py-4 flex items-start gap-3 ${!n.isRead ? 'border-primary-600/30' : 'opacity-60'}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.isRead ? 'bg-primary-500' : 'bg-gray-600'}`} />
              <div>
                <p className={`text-sm font-semibold ${TYPE_COLOR[n.type] || 'text-gray-300'}`}>{n.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
