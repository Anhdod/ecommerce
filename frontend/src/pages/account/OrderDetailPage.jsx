import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Check, CircleDollarSign, Clock3, CreditCard, Edit3, MapPin, Package, PackageCheck, PackageOpen, Phone, RefreshCw, Save, ShieldCheck, ShoppingBag, Truck, XCircle } from 'lucide-react';
import api, { assetUrl } from '../../api';
import { formatVnd as currency } from '../../utils/currency';
import './OrderDetailPage.css';

const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const shippingOptions = ['STANDARD', 'EXPRESS'];
const progressStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'];

const statusInfo = {
  PENDING: { label: 'Chờ xác nhận', icon: Clock3 },
  CONFIRMED: { label: 'Đã xác nhận', icon: Check },
  PROCESSING: { label: 'Đang đóng gói', icon: PackageOpen },
  SHIPPING: { label: 'Đang giao hàng', icon: Truck },
  DELIVERED: { label: 'Đã giao hàng', icon: PackageCheck },
  CANCELLED: { label: 'Đã hủy', icon: XCircle },
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '';

export default function OrderDetailPage({ user }) {
  const { id } = useParams();
  const isManager = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [payment, setPayment] = useState(null);
  const [editForm, setEditForm] = useState({ shippingAddress: '', phoneNumber: '', shippingMethod: 'STANDARD' });
  const [status, setStatus] = useState('PENDING');
  const [shippingForm, setShippingForm] = useState({ carrier: '', trackingCode: '', estimatedDeliveryDate: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentStep = useMemo(() => Math.max(progressStatuses.indexOf(order?.status), 0), [order?.status]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadOrder = async () => {
    try {
      const result = await api(`/api/orders/${id}`);
      setOrder(result.data);
      setStatus(result.data.status);
      setShippingForm({
        carrier: result.data.carrier || '',
        trackingCode: result.data.trackingCode || '',
        estimatedDeliveryDate: result.data.estimatedDeliveryDate || '',
      });
      setEditForm({
        shippingAddress: result.data.shippingAddress || '',
        phoneNumber: result.data.phoneNumber || '',
        shippingMethod: result.data.shippingMethod || 'STANDARD',
      });
    } catch (error) {
      showMessage(error?.message || 'Không tải được đơn hàng');
    }
  };

  const loadHistory = async () => {
    try {
      const result = await api(`/api/orders/${id}/history`);
      setHistory(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được lịch sử đơn hàng');
    }
  };

  const loadPayment = async () => {
    try {
      const result = await api(`/api/payments/order/${id}`);
      setPayment(result.data);
    } catch {
      setPayment(null);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([loadOrder(), loadHistory(), loadPayment()]);
    setLoading(false);
  };

  const runAction = async (action, successMessage, fallbackMessage) => {
    try {
      setActionLoading(true);
      await action();
      showMessage(successMessage);
      await refreshAll();
    } catch (error) {
      showMessage(error?.message || fallbackMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const updateDetails = (event) => {
    event.preventDefault();
    runAction(
      () => api(`/api/orders/${id}/details`, { method: 'PUT', body: editForm }),
      'Đã cập nhật thông tin giao hàng',
      'Không cập nhật được đơn hàng'
    );
  };

  const updateStatus = () => runAction(
    () => api(`/api/orders/${id}/status?status=${status}`, { method: 'PUT' }),
    'Đã cập nhật trạng thái',
    'Không cập nhật được trạng thái'
  );

  const updateShipping = () => runAction(
    () => api(`/api/orders/${id}/shipping`, {
      method: 'PUT',
      body: { ...shippingForm, estimatedDeliveryDate: shippingForm.estimatedDeliveryDate || null },
    }),
    'Đã cập nhật thông tin vận chuyển',
    'Không cập nhật được thông tin vận chuyển'
  );

  const cancelOrder = () => {
    if (!window.confirm(`Hủy đơn hàng #${id}?`)) return;
    runAction(() => api(`/api/orders/${id}`, { method: 'DELETE' }), 'Đã hủy đơn hàng', 'Không hủy được đơn hàng');
  };

  const confirmReceived = () => {
    if (!window.confirm('Xác nhận bạn đã nhận được đơn hàng?')) return;
    runAction(
      () => api(`/api/orders/${id}/confirm-received`, { method: 'PUT' }),
      'Đã xác nhận nhận hàng',
      'Không xác nhận được đơn hàng'
    );
  };

  useEffect(() => {
    if (user) refreshAll();
  }, [user, id]);

  if (!user) {
    return (
      <main className="order-detail-page">
        <section className="order-detail-auth">
          <span><ShieldCheck size={36} /></span><h1>Đăng nhập để xem đơn hàng</h1>
          <p>Thông tin đơn hàng chỉ hiển thị cho tài khoản của bạn.</p>
          <Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  if (loading && !order) {
    return <main className="order-detail-page"><div className="order-detail-skeleton"><span /><span /><span /></div></main>;
  }

  if (!order) {
    return (
      <main className="order-detail-page">
        <section className="order-detail-auth"><span><Package size={36} /></span><h1>Không tìm thấy đơn hàng</h1><Link to="/orders">Quay lại đơn hàng</Link></section>
      </main>
    );
  }

  const currentStatus = statusInfo[order.status] || statusInfo.PENDING;
  const StatusIcon = currentStatus.icon;

  return (
    <main className="order-detail-page antialiased">
      <div className="order-detail-container">
        <div className="order-detail-topbar">
          <Link to="/orders"><ArrowLeft size={16} /> Tất cả đơn hàng</Link>
          <button type="button" onClick={refreshAll} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Làm mới</button>
        </div>

        <header className="order-detail-heading">
          <div>
            <span>Chi tiết đơn hàng</span>
            <h1>Đơn hàng #{order.orderId}</h1>
            <p>Đặt lúc {formatDate(order.createdAt)}</p>
          </div>
          <span className={`detail-order-status status-${String(order.status).toLowerCase()}`}><StatusIcon size={17} /> {currentStatus.label}</span>
        </header>

        {order.status === 'CANCELLED' ? (
          <div className="cancelled-order-banner"><XCircle size={20} /><span><strong>Đơn hàng đã bị hủy</strong><small>Đơn hàng này không còn được xử lý.</small></span></div>
        ) : (
          <section className="order-progress" aria-label="Tiến trình đơn hàng">
            {progressStatuses.map((item, index) => {
              const info = statusInfo[item];
              const Icon = info.icon;
              const complete = index <= currentStep;
              return (
                <div className={complete ? 'complete' : ''} key={item}>
                  <span>{complete && index < currentStep ? <Check size={17} /> : <Icon size={17} />}</span>
                  <strong>{info.label}</strong>
                  <small>{index === currentStep ? 'Trạng thái hiện tại' : index < currentStep ? 'Hoàn tất' : 'Đang chờ'}</small>
                </div>
              );
            })}
          </section>
        )}

        <div className="order-detail-layout">
          <div className="order-detail-main">
            <section className="order-detail-section order-items-section">
              <div className="detail-section-heading"><h2>Sản phẩm</h2><span>{order.items?.length || 0} mặt hàng</span></div>
              <div className="order-detail-items">
                {order.items?.map((item) => (
                  <article key={item.orderItemId}>
                    <Link to={`/products/${item.productId}`}>
                      {item.imageUrl ? <img src={assetUrl(item.imageUrl)} alt={item.productName} /> : <ShoppingBag size={30} />}
                    </Link>
                    <div><Link to={`/products/${item.productId}`}>{item.productName}</Link><span>{item.variantName ? `${item.variantName} · ${item.variantSku} · ` : item.selectedColor ? `Màu ${item.selectedColor} · ` : ''}{currency(item.price)} · Số lượng {item.quantity}</span></div>
                    <strong>{currency(item.subtotal)}</strong>
                  </article>
                ))}
              </div>
            </section>

            {order.status === 'PENDING' && (
              <section className="order-detail-section">
                <div className="detail-section-heading"><div><h2>Chỉnh sửa giao hàng</h2><p>Chỉ có thể thay đổi khi đơn đang chờ xác nhận.</p></div><Edit3 size={18} /></div>
                <form className="order-edit-form" onSubmit={updateDetails}>
                  <label className="full-field">Địa chỉ giao hàng<input value={editForm.shippingAddress} required onChange={(event) => setEditForm((prev) => ({ ...prev, shippingAddress: event.target.value }))} /></label>
                  <label>Số điện thoại<input value={editForm.phoneNumber} required onChange={(event) => setEditForm((prev) => ({ ...prev, phoneNumber: event.target.value }))} /></label>
                  <label>Phương thức vận chuyển<select value={editForm.shippingMethod} onChange={(event) => setEditForm((prev) => ({ ...prev, shippingMethod: event.target.value }))}>{shippingOptions.map((option) => <option key={option} value={option}>{option === 'EXPRESS' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}</option>)}</select></label>
                  <button type="submit" disabled={actionLoading}><Save size={16} /> Lưu thay đổi</button>
                </form>
              </section>
            )}

            {isManager && (
              <section className="order-detail-section manager-order-tools">
                <div className="detail-section-heading"><div><h2>Công cụ quản lý</h2><p>Cập nhật trạng thái và thông tin bàn giao vận chuyển.</p></div><ShieldCheck size={18} /></div>
                <div className="manager-tools-grid">
                  <div className="manager-status-fields">
                    <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)}>{orderStatuses.map((item) => <option key={item} value={item}>{statusInfo[item].label}</option>)}</select></label>
                    <button type="button" onClick={updateStatus} disabled={actionLoading}>Cập nhật</button>
                  </div>
                  <div className="manager-shipping-fields">
                    <label>Hãng vận chuyển<input value={shippingForm.carrier} onChange={(event) => setShippingForm((current) => ({ ...current, carrier: event.target.value }))} placeholder="Ví dụ: GHN" /></label>
                    <label>Mã vận đơn<input value={shippingForm.trackingCode} onChange={(event) => setShippingForm((current) => ({ ...current, trackingCode: event.target.value }))} placeholder="Nhập mã tracking" /></label>
                    <label>Ngày giao dự kiến<input type="date" value={shippingForm.estimatedDeliveryDate} onChange={(event) => setShippingForm((current) => ({ ...current, estimatedDeliveryDate: event.target.value }))} /></label>
                    <button type="button" onClick={updateShipping} disabled={actionLoading}><Save size={14} /> Lưu vận chuyển</button>
                  </div>
                </div>
              </section>
            )}

            <section className="order-detail-section">
              <div className="detail-section-heading"><div><h2>Lịch sử đơn hàng</h2><p>Các thay đổi được ghi nhận theo thời gian.</p></div></div>
              {history.length ? (
                <div className="order-history-timeline">
                  {history.map((item, index) => (
                    <div key={`${item.changedAt}-${item.newStatus}-${index}`}>
                      <span><Check size={13} /></span>
                      <div><strong>{statusInfo[item.newStatus]?.label || item.newStatus}</strong><p>{item.note || `${item.oldStatus || 'Mới'} → ${item.newStatus}`}</p><small>{formatDate(item.changedAt)}</small></div>
                    </div>
                  ))}
                </div>
              ) : <p className="no-order-history">Chưa có lịch sử trạng thái.</p>}
            </section>
          </div>

          <aside className="order-detail-sidebar">
            <section className="order-summary-card">
              <h2>Tóm tắt thanh toán</h2>
              <div><span>Tạm tính</span><strong>{currency(order.subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>{currency(order.shippingFee)}</strong></div>
              <div className="discount"><span>Giảm giá</span><strong>-{currency(order.discountAmount)}</strong></div>
              <div className="grand-total"><span>Tổng cộng</span><strong>{currency(order.totalPrice)}</strong></div>
            </section>

            <section className="order-info-card">
              <h2>Thông tin giao hàng</h2>
              <p><MapPin size={16} /><span>{order.shippingAddress || 'Chưa có địa chỉ'}</span></p>
              <p><Phone size={16} /><span>{order.phoneNumber || 'Chưa có số điện thoại'}</span></p>
              <p><Truck size={16} /><span>{order.shippingMethod === 'EXPRESS' ? 'Giao hàng nhanh' : 'Giao hàng tiêu chuẩn'}</span></p>
              <p><Truck size={16} /><span>{order.carrier || 'Chưa có hãng vận chuyển'}</span></p>
              <p><Package size={16} /><span>{order.trackingCode || 'Chưa có mã vận đơn'}</span></p>
              <p><CalendarDays size={16} /><span>{order.estimatedDeliveryDate ? `Dự kiến giao ${new Intl.DateTimeFormat('vi-VN').format(new Date(`${order.estimatedDeliveryDate}T00:00:00`))}` : 'Chưa có ngày giao dự kiến'}</span></p>
            </section>

            <section className="order-info-card payment-card">
              <h2>Thanh toán</h2>
              <p><CreditCard size={16} /><span>{payment?.paymentMethod || 'Chưa xác định'}</span></p>
              <span className={`payment-status payment-${String(payment?.status || 'pending').toLowerCase()}`}>
                {payment?.status === 'PAID'
                  ? 'Đã thanh toán'
                  : payment?.status === 'REFUNDED'
                    ? 'Đã hoàn tiền'
                  : payment?.status === 'SUBMITTED'
                    ? 'Biên lai đang chờ duyệt'
                    : payment?.status === 'REJECTED'
                      ? 'Biên lai bị từ chối'
                  : payment?.paymentMethod === 'COD'
                    ? 'Thanh toán khi nhận hàng'
                    : payment?.paymentMethod === 'BANK_TRANSFER'
                      ? 'Chờ xác nhận chuyển khoản'
                      : payment?.status || 'Chờ thanh toán'}
              </span>
              {payment?.transactionId && <small>Mã giao dịch: {payment.transactionId}</small>}
              {payment?.refundReason && <small>Lý do hoàn tiền: {payment.refundReason}</small>}
            </section>

            <div className="order-detail-actions">
              {payment?.status === 'PENDING' && payment?.paymentMethod === 'MOCK_CARD' && order.status === 'PENDING' && <Link className="pay-order-button" to={`/checkout/payment/${id}`}><CircleDollarSign size={17} /> Thanh toán ngay</Link>}
              {['PENDING', 'SUBMITTED', 'REJECTED'].includes(payment?.status) && payment?.paymentMethod === 'BANK_TRANSFER' && order.status === 'PENDING' && <Link className="pay-order-button" to={`/checkout/payment/${id}`}><CircleDollarSign size={17} /> {payment.status === 'REJECTED' ? 'Gửi lại biên lai' : payment.status === 'SUBMITTED' ? 'Xem trạng thái biên lai' : 'Hướng dẫn chuyển khoản'}</Link>}
              {order.status === 'SHIPPING' && user.role === 'USER' && <button className="receive-order-button" type="button" onClick={confirmReceived} disabled={actionLoading}><PackageCheck size={17} /> Đã nhận hàng</button>}
              {order.status === 'PENDING' && payment?.status !== 'PAID' && <button className="cancel-detail-order" type="button" onClick={cancelOrder} disabled={actionLoading}><XCircle size={17} /> Hủy đơn hàng</button>}
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>{message && <motion.div className="order-detail-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}><Check size={18} /> {message}</motion.div>}</AnimatePresence>
    </main>
  );
}
