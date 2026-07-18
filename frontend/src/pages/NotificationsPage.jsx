import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ExternalLink,
  Info,
  Package,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import api from '../api';
import './NotificationsPage.css';

const notificationTypes = {
  ORDER: { label: 'Đơn hàng', icon: Package, className: 'order' },
  PAYMENT: { label: 'Thanh toán', icon: CircleDollarSign, className: 'payment' },
  SYSTEM: { label: 'Hệ thống', icon: Info, className: 'system' },
};

const filters = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'READ', label: 'Đã đọc' },
];

const formatDateTime = (value) => {
  if (!value) return 'Không rõ thời gian';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function NotificationsPage({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const messageTimer = useRef(null);

  const filteredNotifications = useMemo(() => notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.read;
    if (filter === 'READ') return item.read;
    return true;
  }), [filter, notifications]);

  const readCount = Math.max(0, totalElements - unreadCount);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const notifyBadgeChanged = () => window.dispatchEvent(new Event('notifications:changed'));

  const loadNotifications = async (targetPage = page) => {
    try {
      setLoading(true);
      const [result, countResult] = await Promise.all([
        api(`/api/notifications?page=${targetPage}&size=10`),
        api('/api/notifications/unread-count'),
      ]);
      const pageData = result.data || {};
      const content = Array.isArray(pageData) ? pageData : pageData.content || [];
      setNotifications(content);
      setUnreadCount(Number(countResult.data || 0));
      setTotalElements(Array.isArray(pageData) ? content.length : Number(pageData.totalElements || 0));
      setTotalPages(Array.isArray(pageData) ? (content.length ? 1 : 0) : Number(pageData.totalPages || 0));
      setPage(targetPage);
    } catch (error) {
      showMessage(error?.message || 'Không tải được thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      setBusyId(notificationId);
      await api(`/api/notifications/${notificationId}/read`, { method: 'PUT' });
      setNotifications((current) => current.map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
      setUnreadCount((current) => Math.max(0, current - 1));
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật thông báo.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setBulkAction('read');
      await api('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
      showMessage('Đã đánh dấu tất cả là đã đọc.');
      notifyBadgeChanged();
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật các thông báo.', 'error');
    } finally {
      setBulkAction('');
    }
  };

  const deleteNotification = async (notification) => {
    if (!window.confirm(`Xóa thông báo "${notification.title}"?`)) return;
    try {
      setBusyId(notification.id);
      await api(`/api/notifications/${notification.id}`, { method: 'DELETE' });
      showMessage('Đã xóa thông báo.');
      notifyBadgeChanged();
      const targetPage = notifications.length === 1 && page > 0 ? page - 1 : page;
      await loadNotifications(targetPage);
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa thông báo.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const clearReadNotifications = async () => {
    if (!window.confirm('Xóa toàn bộ thông báo đã đọc?')) return;
    try {
      setBulkAction('clear');
      const result = await api('/api/notifications/read', { method: 'DELETE' });
      showMessage(`Đã xóa ${Number(result.data || 0)} thông báo đã đọc.`);
      notifyBadgeChanged();
      await loadNotifications(0);
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa thông báo đã đọc.', 'error');
    } finally {
      setBulkAction('');
    }
  };

  useEffect(() => {
    if (user) loadNotifications(0);
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  if (!user) {
    return (
      <main className="notifications-page">
        <section className="notifications-auth-state">
          <span><Bell size={34} /></span>
          <h1>Trung tâm thông báo</h1>
          <p>Đăng nhập để xem cập nhật về đơn hàng và thanh toán.</p>
          <Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="notifications-page antialiased">
      <div className="notifications-container">
        <header className="notifications-heading">
          <div>
            <span>Tài khoản</span>
            <h1>Thông báo</h1>
            <p>{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem tất cả thông báo'}</p>
          </div>
          <button type="button" onClick={() => loadNotifications(page)} disabled={loading} title="Làm mới thông báo">
            <RefreshCw size={17} className={loading ? 'notifications-spinning' : ''} /> Làm mới
          </button>
        </header>

        <section className="notifications-summary">
          <div><span><Bell size={18} /></span><div><strong>{totalElements}</strong><small>Tổng thông báo</small></div></div>
          <div><span className="unread"><Info size={18} /></span><div><strong>{unreadCount}</strong><small>Chưa đọc</small></div></div>
          <div><span className="read"><CheckCheck size={18} /></span><div><strong>{readCount}</strong><small>Đã đọc</small></div></div>
        </section>

        <section className="notifications-panel">
          <div className="notifications-toolbar">
            <div className="notification-tabs" role="tablist" aria-label="Lọc thông báo">
              {filters.map((item) => (
                <button className={filter === item.value ? 'active' : ''} type="button" role="tab" aria-selected={filter === item.value} onClick={() => setFilter(item.value)} key={item.value}>
                  {item.label}
                  {item.value === 'UNREAD' && unreadCount > 0 && <span>{unreadCount}</span>}
                </button>
              ))}
            </div>
            <div className="notification-bulk-actions">
              <button type="button" disabled={!unreadCount || bulkAction !== ''} onClick={markAllAsRead}><CheckCheck size={15} /> Đọc tất cả</button>
              <button className="clear-read-button" type="button" disabled={!readCount || bulkAction !== ''} onClick={clearReadNotifications}><Trash2 size={15} /> Xóa đã đọc</button>
            </div>
          </div>

          {loading && !notifications.length ? (
            <div className="notifications-loading"><span /><span /><span /></div>
          ) : filteredNotifications.length ? (
            <div className="notifications-list">
              {filteredNotifications.map((item, index) => {
                const type = notificationTypes[item.type] || notificationTypes.SYSTEM;
                const TypeIcon = type.icon;
                return (
                  <motion.article
                    className={`notification-item ${item.read ? 'is-read' : 'is-unread'}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.035 }}
                    key={item.id}
                  >
                    <span className={`notification-type-icon ${type.className}`}><TypeIcon size={19} /></span>
                    <div className="notification-content">
                      <div className="notification-title-row">
                        <div><h2>{item.title}</h2>{!item.read && <span>Chưa đọc</span>}</div>
                        <time>{formatDateTime(item.createdAt)}</time>
                      </div>
                      <p>{item.message}</p>
                      <div className="notification-footer">
                        <span className={`notification-type-label ${type.className}`}>{type.label}</span>
                        <div>
                          {item.linkUrl && <Link to={item.linkUrl} onClick={() => !item.read && markAsRead(item.id)}><ExternalLink size={15} /> Xem chi tiết</Link>}
                          {!item.read && <button type="button" disabled={busyId === item.id} onClick={() => markAsRead(item.id)}><Check size={15} /> Đánh dấu đã đọc</button>}
                          <button className="delete-notification" type="button" title="Xóa thông báo" disabled={busyId === item.id} onClick={() => deleteNotification(item)}><Trash2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          ) : (
            <div className="notifications-empty-state">
              <span><Bell size={30} /></span>
              <h2>{notifications.length ? 'Không có thông báo phù hợp' : 'Chưa có thông báo'}</h2>
              <p>{notifications.length ? 'Hãy chọn một bộ lọc khác.' : 'Các cập nhật mới sẽ xuất hiện tại đây.'}</p>
              {notifications.length > 0 && <button type="button" onClick={() => setFilter('ALL')}>Xem tất cả</button>}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="notifications-pagination" aria-label="Phân trang thông báo">
              <button type="button" title="Trang trước" disabled={page === 0 || loading} onClick={() => loadNotifications(page - 1)}><ChevronLeft size={17} /></button>
              <span>Trang <strong>{page + 1}</strong> / {totalPages}</span>
              <button type="button" title="Trang sau" disabled={page >= totalPages - 1 || loading} onClick={() => loadNotifications(page + 1)}><ChevronRight size={17} /></button>
            </nav>
          )}
        </section>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className={`notifications-toast ${message.type}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            {message.type === 'success' ? <Check size={18} /> : <X size={18} />} {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
