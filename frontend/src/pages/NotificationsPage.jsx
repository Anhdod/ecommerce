import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

export default function NotificationsPage({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const hasReadNotifications = notifications.some((item) => item.read);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const notifyBadgeChanged = () => {
    window.dispatchEvent(new Event('notifications:changed'));
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await api('/api/notifications');
      setNotifications(result.data || []);
      const countResult = await api('/api/notifications/unread-count');
      setUnreadCount(Number(countResult.data || 0));
    } catch (error) {
      showMessage(error?.message || 'Cannot load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      loadNotifications();
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Cannot update notification');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api('/api/notifications/read-all', { method: 'PUT' });
      loadNotifications();
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Cannot update notifications');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api(`/api/notifications/${notificationId}`, { method: 'DELETE' });
      showMessage('Notification deleted');
      loadNotifications();
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Cannot delete notification');
    }
  };

  const clearReadNotifications = async () => {
    try {
      const result = await api('/api/notifications/read', { method: 'DELETE' });
      showMessage(`${result.data || 0} read notifications deleted`);
      loadNotifications();
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Cannot clear read notifications');
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
            <p className="muted">
              Unread: {unreadCount} / Total: {notifications.length}
            </p>
          </div>
          <div className="row-actions">
            <button className="small" onClick={loadNotifications} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="small" onClick={markAllAsRead} disabled={!unreadCount}>
              Mark all as read
            </button>
            <button className="small danger" onClick={clearReadNotifications} disabled={!hasReadNotifications}>
              Clear read
            </button>
          </div>
        </div>

        {notifications.length ? (
          <div className="table-list">
            {notifications.map((item) => (
              <article className={`card compact-card ${item.read ? '' : 'selected-card'}`} key={item.id}>
                <div className="card-header">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small className="muted">{formatDateTime(item.createdAt)}</small>
                  </div>
                  <div className="tag-group">
                    <span className="tag">{item.type}</span>
                    <span className={`tag ${item.read ? '' : 'success-tag'}`}>{item.read ? 'Read' : 'Unread'}</span>
                  </div>
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
                  <button className="small danger" onClick={() => deleteNotification(item.id)}>
                    Delete
                  </button>
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
