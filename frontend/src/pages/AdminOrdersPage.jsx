import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Moon,
  PackageCheck,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Sun,
  Truck,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import api, { assetUrl } from '../api';
import usePagination from '../hooks/usePagination';
import { formatVnd as currency, toVndAmount } from '../utils/currency';
import './AdminOrdersPage.css';

const statusOrder = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const statusMeta = {
  PENDING: { label: 'Chờ xác nhận', icon: Clock3, next: 'CONFIRMED', action: 'Xác nhận đơn' },
  CONFIRMED: { label: 'Đã xác nhận', icon: CheckCircle2, next: 'SHIPPING', action: 'Bắt đầu giao' },
  SHIPPING: { label: 'Đang giao', icon: Truck, next: 'DELIVERED', action: 'Đánh dấu đã giao' },
  DELIVERED: { label: 'Đã giao', icon: PackageCheck },
  CANCELLED: { label: 'Đã hủy', icon: XCircle },
};
const paymentMeta = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Chưa có thời gian';

export default function AdminOrdersPage({ user }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [trackingDrafts, setTrackingDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderResult, paymentResult] = await Promise.all([
        api('/api/orders/admin'),
        api('/api/payments/admin'),
      ]);
      const nextOrders = Array.isArray(orderResult.data) ? orderResult.data : [];
      setOrders(nextOrders);
      setPayments(Array.isArray(paymentResult.data) ? paymentResult.data : []);
      setTrackingDrafts(Object.fromEntries(nextOrders.map((order) => [order.orderId, order.trackingCode || ''])));
    } catch (error) {
      showMessage(error?.message || 'Không tải được dữ liệu đơn hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) loadData();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  const paymentByOrder = useMemo(
    () => new Map(payments.map((payment) => [Number(payment.orderId), payment])),
    [payments]
  );

  const rows = useMemo(() => orders.map((order) => ({
    ...order,
    payment: paymentByOrder.get(Number(order.orderId)) || null,
  })), [orders, paymentByOrder]);

  const statusCounts = useMemo(() => rows.reduce((result, order) => {
    result[order.status] = (result[order.status] || 0) + 1;
    return result;
  }, {}), [rows]);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return rows.filter((order) => {
      if (status !== 'ALL' && order.status !== status) return false;
      if (paymentStatus !== 'ALL' && order.payment?.status !== paymentStatus) return false;
      if (!keyword) return true;
      return [order.orderId, order.userId, order.phoneNumber, order.trackingCode, order.shippingAddress, ...(order.items || []).map((item) => item.productName)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [paymentStatus, query, rows, status]);

  const orderPagination = usePagination(filteredRows, 10, `${query}|${status}|${paymentStatus}`);

  const totalValue = useMemo(() => rows
    .filter((order) => order.status !== 'CANCELLED')
    .reduce((total, order) => total + toVndAmount(order.totalPrice), 0), [rows]);

  const updateTracking = async (orderId) => {
    const code = trackingDrafts[orderId]?.trim();
    if (!code) {
      showMessage('Vui lòng nhập mã vận đơn.', 'error');
      return;
    }
    try {
      setBusyId(orderId);
      await api(`/api/orders/${orderId}/tracking?trackingCode=${encodeURIComponent(code)}`, { method: 'PUT' });
      showMessage('Đã lưu mã vận đơn.');
      await loadData();
    } catch (error) {
      showMessage(error?.message || 'Không lưu được mã vận đơn.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const advanceOrder = async (order) => {
    const meta = statusMeta[order.status];
    if (!meta?.next) return;
    if (!window.confirm(`${meta.action} #${order.orderId}?`)) return;
    try {
      setBusyId(order.orderId);
      await api(`/api/orders/${order.orderId}/status?status=${meta.next}`, { method: 'PUT' });
      showMessage(`Đã chuyển đơn #${order.orderId} sang ${statusMeta[meta.next].label.toLowerCase()}.`);
      await loadData();
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được đơn hàng.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const cancelOrder = async (order) => {
    const reason = window.prompt(`Lý do hủy đơn #${order.orderId}:`, 'Không thể tiếp tục xử lý đơn hàng');
    if (reason === null) return;
    if (!reason.trim()) {
      showMessage('Vui lòng nhập lý do hủy đơn.', 'error');
      return;
    }
    if (!window.confirm(`Hủy đơn #${order.orderId} và hoàn lại tồn kho?`)) return;
    try {
      setBusyId(order.orderId);
      await api(`/api/orders/${order.orderId}/admin-cancel?reason=${encodeURIComponent(reason.trim())}`, { method: 'PUT' });
      showMessage(`Đã hủy đơn #${order.orderId} và hoàn lại tồn kho.`);
      await loadData();
    } catch (error) {
      showMessage(error?.message || 'Không hủy được đơn hàng.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('adminTheme', next);
  };

  if (!canManage) {
    return <main className="admin-orders-access"><section><ShoppingBag size={34} /><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý đơn hàng.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;
  }

  return (
    <main className={`admin-orders-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-orders-content">
        <header className="admin-orders-topbar">
          <div><span>Quản trị / Kinh doanh</span><h1>Đơn hàng</h1></div>
          <div>
            <button className="admin-orders-icon" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <button className="admin-orders-refresh" type="button" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-orders-spinning' : ''} /> {loading ? 'Đang tải...' : 'Làm mới'}</button>
          </div>
        </header>

        <div className="admin-orders-inner">
          <section className="admin-orders-title"><div><h2>Vận hành đơn hàng</h2><p>Xác nhận, bàn giao vận chuyển và hoàn tất đơn theo đúng thứ tự.</p></div><span>{filteredRows.length} / {rows.length} đơn</span></section>

          <section className="admin-orders-stats">
            <article><span><ShoppingBag size={18} /></span><div><small>Tổng đơn hàng</small><strong>{rows.length}</strong></div></article>
            <article><span className="pending"><Clock3 size={18} /></span><div><small>Chờ xác nhận</small><strong>{statusCounts.PENDING || 0}</strong></div></article>
            <article><span className="shipping"><Truck size={18} /></span><div><small>Đang giao</small><strong>{statusCounts.SHIPPING || 0}</strong></div></article>
            <article><span className="value"><WalletCards size={18} /></span><div><small>Giá trị đơn hợp lệ</small><strong>{currency(totalValue)}</strong></div></article>
          </section>

          <section className="admin-orders-panel">
            <div className="admin-orders-toolbar">
              <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn, khách hàng, vận đơn..." /></label>
              <div><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Trạng thái đơn hàng">{statusOrder.map((item) => <option value={item} key={item}>{item === 'ALL' ? 'Tất cả trạng thái' : statusMeta[item].label}</option>)}</select><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} aria-label="Trạng thái thanh toán"><option value="ALL">Tất cả thanh toán</option>{Object.entries(paymentMeta).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
            </div>

            <div className="admin-orders-tabs">{statusOrder.map((item) => <button className={status === item ? 'active' : ''} type="button" onClick={() => setStatus(item)} key={item}>{item === 'ALL' ? 'Tất cả' : statusMeta[item].label}<span>{item === 'ALL' ? rows.length : statusCounts[item] || 0}</span></button>)}</div>

            {loading && !rows.length ? <div className="admin-orders-loading"><span /><span /><span /></div> : filteredRows.length ? (
              <><div className="admin-orders-table-wrap">
                <table className="admin-orders-table">
                  <thead><tr><th>Đơn hàng</th><th>Khách hàng</th><th>Thanh toán</th><th>Trạng thái</th><th>Vận chuyển</th><th>Tổng tiền</th><th aria-label="Thao tác" /></tr></thead>
                  <tbody>{orderPagination.pageItems.map((order) => {
                    const meta = statusMeta[order.status];
                    const StatusIcon = meta.icon;
                    const payment = order.payment;
                    const firstItem = order.items?.[0];
                    const itemCount = order.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0;
                    const onlineUnpaid = payment?.paymentMethod !== 'COD' && payment?.status !== 'PAID';
                    const missingTracking = order.status === 'CONFIRMED' && !order.trackingCode;
                    const disabled = busyId === order.orderId || (order.status === 'PENDING' && onlineUnpaid) || missingTracking;
                    const canCancel = (order.status === 'PENDING' || order.status === 'CONFIRMED') && payment?.status !== 'PAID';
                    return (
                      <tr key={order.orderId}>
                        <td><div className="admin-order-product"><span>{firstItem?.imageUrl ? <img src={assetUrl(firstItem.imageUrl)} alt={firstItem.productName} /> : <ShoppingBag size={18} />}</span><div><strong>#{order.orderId}</strong><small>{firstItem?.productName || 'Đơn hàng'} · {itemCount} sản phẩm</small><i>{formatDate(order.createdAt)}</i></div></div></td>
                        <td><div className="admin-order-customer"><strong>Khách hàng #{order.userId}</strong><small>{order.phoneNumber || 'Chưa có số điện thoại'}</small></div></td>
                        <td><span className={`admin-payment-badge ${String(payment?.status || 'PENDING').toLowerCase()}`}>{paymentMeta[payment?.status] || 'Chưa có giao dịch'}</span><small className="admin-payment-method">{payment?.paymentMethod === 'COD' ? 'COD' : payment?.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Thẻ'}</small></td>
                        <td><span className={`admin-order-status ${String(order.status).toLowerCase()}`}><StatusIcon size={13} /> {meta.label}</span></td>
                        <td>{order.status === 'CONFIRMED' || order.status === 'SHIPPING' ? <div className="admin-tracking-editor"><input value={trackingDrafts[order.orderId] || ''} onChange={(event) => setTrackingDrafts((current) => ({ ...current, [order.orderId]: event.target.value }))} placeholder="Nhập mã vận đơn" /><button type="button" title="Lưu mã vận đơn" disabled={busyId === order.orderId} onClick={() => updateTracking(order.orderId)}><Save size={14} /></button></div> : <span className="admin-tracking-code">{order.trackingCode || 'Chưa cần vận đơn'}</span>}</td>
                        <td><strong className="admin-order-total">{currency(order.totalPrice)}</strong></td>
                        <td><div className="admin-order-actions"><Link to={`/orders/${order.orderId}`} title="Xem chi tiết"><Eye size={15} /></Link>{canCancel && <button className="cancel" type="button" disabled={busyId === order.orderId} title="Hủy đơn và hoàn kho" onClick={() => cancelOrder(order)}><XCircle size={14} /><span>Hủy</span></button>}{meta.next && <button type="button" disabled={disabled} title={onlineUnpaid ? 'Chờ khách thanh toán' : missingTracking ? 'Nhập và lưu mã vận đơn trước' : meta.action} onClick={() => advanceOrder(order)}>{busyId === order.orderId ? <RefreshCw className="admin-orders-spinning" size={14} /> : <><span>{meta.action}</span><ArrowRight size={14} /></>}</button>}</div></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div><Pagination {...orderPagination} onPageChange={orderPagination.setPage} label="đơn hàng" /></>
            ) : <div className="admin-orders-empty"><Search size={28} /><strong>Không tìm thấy đơn hàng</strong><span>Hãy thay đổi từ khóa hoặc bộ lọc.</span><button type="button" onClick={() => { setQuery(''); setStatus('ALL'); setPaymentStatus('ALL'); }}>Đặt lại bộ lọc</button></div>}
          </section>
        </div>
      </div>

      <AnimatePresence>{message && <motion.div className={`admin-orders-toast ${message.type}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
