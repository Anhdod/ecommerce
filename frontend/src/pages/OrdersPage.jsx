import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Clock3, MapPin, Package, RefreshCw, Save, Search, ShieldCheck, ShoppingBag, Truck, XCircle } from 'lucide-react';
import api, { assetUrl } from '../api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { formatVnd as currency } from '../utils/currency';
import './OrdersPage.css';

const orderStatuses = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

const statusInfo = {
  PENDING: { label: 'Chờ xác nhận', icon: Clock3 },
  CONFIRMED: { label: 'Đã xác nhận', icon: Check },
  SHIPPING: { label: 'Đang giao', icon: Truck },
  DELIVERED: { label: 'Đã giao', icon: Package },
  CANCELLED: { label: 'Đã hủy', icon: XCircle },
};

const formatDate = (value) => {
  if (!value) return 'Chưa có thời gian';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

export default function OrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const isManager = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const filteredOrders = useMemo(() => {
    const value = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (!value) return true;
      return [order.orderId, order.trackingCode, order.phoneNumber, order.shippingAddress, order.status, ...(order.items || []).map((item) => item.productName)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value));
    });
  }, [orders, query, statusFilter]);

  const orderPagination = usePagination(filteredOrders, 8, `${query}|${statusFilter}`);

  const statusCounts = useMemo(() => orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {}), [orders]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const result = await api(isManager ? '/api/orders/admin' : '/api/orders');
      let nextOrders = Array.isArray(result.data) ? result.data : [];
      if (!isManager) {
        const paymentResult = await api('/api/payments/me');
        const paymentByOrder = new Map((paymentResult.data || []).map((payment) => [Number(payment.orderId), payment]));
        nextOrders = nextOrders.map((order) => ({ ...order, payment: paymentByOrder.get(Number(order.orderId)) || null }));
      }
      setOrders(nextOrders);
      setTrackingDrafts(Object.fromEntries(nextOrders.map((order) => [order.orderId, order.trackingCode || ''])));
    } catch (error) {
      showMessage(error?.message || 'Không tải được đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      await api(`/api/orders/${orderId}/status?status=${status}`, { method: 'PUT' });
      showMessage('Đã cập nhật trạng thái đơn hàng');
      await loadOrders();
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được trạng thái');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateTracking = async (orderId) => {
    const trackingCode = trackingDrafts[orderId]?.trim();
    if (!trackingCode) {
      showMessage('Vui lòng nhập mã vận đơn');
      return;
    }
    try {
      setUpdatingId(orderId);
      await api(`/api/orders/${orderId}/tracking?trackingCode=${encodeURIComponent(trackingCode)}`, { method: 'PUT' });
      showMessage('Đã cập nhật mã vận đơn');
      await loadOrders();
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được mã vận đơn');
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm(`Hủy đơn hàng #${orderId}?`)) return;
    try {
      setCancellingId(orderId);
      await api(`/api/orders/${orderId}`, { method: 'DELETE' });
      showMessage('Đã hủy đơn hàng');
      loadOrders();
    } catch (error) {
      showMessage(error?.message || 'Không hủy được đơn hàng');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (user) loadOrders();
  }, [user]);

  if (!user) {
    return (
      <main className="orders-page">
        <section className="orders-auth-state">
          <span><Package size={34} /></span>
          <h1>Theo dõi đơn hàng</h1>
          <p>Đăng nhập để xem trạng thái và lịch sử mua sắm của bạn.</p>
          <div><Link to="/login">Đăng nhập</Link><Link to="/">Về cửa hàng</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className="orders-page antialiased">
      <div className="orders-container">
        <header className="orders-heading">
          <div>
            <span>{isManager ? 'Quản lý vận hành' : 'Tài khoản của tôi'}</span>
            <h1>{isManager ? 'Tất cả đơn hàng' : 'Đơn hàng của tôi'}</h1>
            <p>{orders.length} đơn hàng trong hệ thống</p>
          </div>
          <button type="button" onClick={loadOrders} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'spinning' : ''} /> Làm mới
          </button>
        </header>

        <section className="orders-toolbar">
          <label className="orders-search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn, sản phẩm, tracking..." />
          </label>
          <div className="order-status-tabs" role="tablist" aria-label="Lọc trạng thái đơn hàng">
            {orderStatuses.map((status) => (
              <button
                className={statusFilter === status ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={statusFilter === status}
                key={status}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL' ? 'Tất cả' : statusInfo[status]?.label}
                <span>{status === 'ALL' ? orders.length : statusCounts[status] || 0}</span>
              </button>
            ))}
          </div>
        </section>

        {loading && !orders.length ? (
          <div className="orders-loading">{[1, 2, 3].map((item) => <span key={item} />)}</div>
        ) : filteredOrders.length ? (
          <><motion.section className="orders-list" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
            {orderPagination.pageItems.map((order) => {
              const info = statusInfo[order.status] || statusInfo.PENDING;
              const StatusIcon = info.icon;
              const itemCount = order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;
              return (
                <motion.article className="order-row" key={order.orderId} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                  <div className="order-row-header">
                    <div>
                      <span className="order-number">Đơn hàng #{order.orderId}</span>
                      <small>{formatDate(order.createdAt)}</small>
                    </div>
                    <span className={`order-status status-${String(order.status).toLowerCase()}`}><StatusIcon size={15} /> {info.label}</span>
                  </div>

                  <div className="order-row-content">
                    <div className="order-products-preview">
                      <div className="order-product-images">
                        {(order.items || []).slice(0, 3).map((item) => (
                          <Link to={`/products/${item.productId}`} key={item.orderItemId} title={item.productName}>
                            {item.imageUrl ? <img src={assetUrl(item.imageUrl)} alt={item.productName} /> : <ShoppingBag size={22} />}
                          </Link>
                        ))}
                      </div>
                      <div>
                        <strong>{order.items?.[0]?.productName || 'Đơn hàng'}</strong>
                        <span>{itemCount} sản phẩm{(order.items?.length || 0) > 1 ? ` · và ${(order.items?.length || 1) - 1} mặt hàng khác` : ''}</span>
                      </div>
                    </div>

                    <div className="order-shipping-meta">
                      <span><Truck size={15} /> {order.shippingMethod === 'EXPRESS' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}</span>
                      <span><MapPin size={15} /> {order.shippingAddress || 'Chưa có địa chỉ'}</span>
                      <span><Package size={15} /> {order.trackingCode || 'Chưa có mã tracking'}</span>
                    </div>

                    <div className="order-total">
                      <span>Tổng thanh toán</span>
                      <strong>{currency(order.totalPrice)}</strong>
                    </div>
                  </div>

                  <div className="order-row-footer">
                    {isManager && (
                      <div className="manager-order-controls">
                        <span className="manager-note"><ShieldCheck size={14} /> Quản lý</span>
                        <select value={order.status} disabled={updatingId === order.orderId} onChange={(event) => updateStatus(order.orderId, event.target.value)} aria-label={`Trạng thái đơn hàng ${order.orderId}`}>
                          {orderStatuses.filter((status) => status !== 'ALL').map((status) => <option value={status} key={status}>{statusInfo[status]?.label}</option>)}
                        </select>
                        <label>
                          <Truck size={14} />
                          <input value={trackingDrafts[order.orderId] || ''} onChange={(event) => setTrackingDrafts((current) => ({ ...current, [order.orderId]: event.target.value }))} placeholder="Mã vận đơn" />
                        </label>
                        <button type="button" title="Lưu mã vận đơn" disabled={updatingId === order.orderId} onClick={() => updateTracking(order.orderId)}><Save size={14} /></button>
                      </div>
                    )}
                    {!isManager && order.status === 'PENDING' && order.payment?.status !== 'PAID' && (
                      <button className="cancel-order-button" type="button" onClick={() => cancelOrder(order.orderId)} disabled={cancellingId === order.orderId}>
                        <XCircle size={15} /> {cancellingId === order.orderId ? 'Đang hủy...' : 'Hủy đơn'}
                      </button>
                    )}
                    <Link to={`/orders/${order.orderId}`}>Xem chi tiết <ArrowRight size={16} /></Link>
                  </div>
                </motion.article>
              );
            })}
          </motion.section><Pagination {...orderPagination} onPageChange={orderPagination.setPage} label="đơn hàng" /></>
        ) : (
          <section className="orders-empty-state">
            <span><Search size={30} /></span>
            <h2>Không tìm thấy đơn hàng</h2>
            <p>Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</p>
            <button type="button" onClick={() => { setQuery(''); setStatusFilter('ALL'); }}>Đặt lại bộ lọc</button>
          </section>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className="orders-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Check size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
