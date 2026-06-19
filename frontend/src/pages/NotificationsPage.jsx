import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function NotificationsPage({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadNotifications = async () => {
    try {
      const result = await api('/api/notifications');
      setNotifications(result.data || []);
      const countResult = await api('/api/notifications/unread-count');
      setUnreadCount(Number(countResult.data || 0));
    } catch (error) {
      showMessage(error?.message || 'Cannot load notifications');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      loadNotifications();
    } catch (error) {
      showMessage(error?.message || 'Cannot update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api('/api/notifications/read-all', { method: 'PUT' });
      loadNotifications();
    } catch (error) {
      showMessage(error?.message || 'Cannot update notifications');
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Notifications</h2>
          <p>Please login first.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="card-header">
          <div>
            <h2>Notifications</h2>
            <p className="muted">Unread: {unreadCount}</p>
          </div>
          <button className="small" onClick={markAllAsRead}>
            Mark all as read
          </button>
        </div>

        {notifications.length ? (
          <div className="table-list">
            {notifications.map((item) => (
              <article className={`card compact-card ${item.read ? '' : 'selected-card'}`} key={item.id}>
                <div className="card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                  </div>
                  <span className="tag">{item.type}</span>
                </div>
                <div className="row-actions">
                  {item.linkUrl && (
                    <Link className="button small" to={item.linkUrl}>
                      Open
                    </Link>
                  )}
                  {!item.read && (
                    <button className="small" onClick={() => markAsRead(item.id)}>
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No notifications yet.</p>
        )}

        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
