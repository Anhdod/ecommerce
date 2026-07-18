import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Info,
  Landmark,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import api from '../api';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { formatVnd as currency, toVndAmount } from '../utils/currency';
import './PaymentsPage.css';

const statuses = ['ALL', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];
const adminStatuses = statuses.filter((status) => status !== 'ALL');

const statusInfo = {
  PENDING: { label: 'Chờ thanh toán', icon: Clock3 },
  PAID: { label: 'Đã thanh toán', icon: CheckCircle2 },
  FAILED: { label: 'Thất bại', icon: XCircle },
  REFUNDED: { label: 'Đã hoàn tiền', icon: RotateCcw },
};

const methodInfo = {
  MOCK_CARD: { label: 'Thẻ thanh toán', icon: CreditCard },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: Landmark },
  COD: { label: 'Thanh toán khi nhận', icon: Banknote },
};

const formatDateTime = (value) => {
  if (!value) return 'Chưa hoàn tất';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ thời gian';
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return 'Chưa rõ thời gian';
  }
};

const paymentListFrom = (result) => (Array.isArray(result?.data) ? result.data.filter(Boolean) : []);

class PaymentsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="payments-page">
          <section className="payments-error-state">
            <span><AlertCircle size={34} /></span>
            <h1>Không thể hiển thị giao dịch</h1>
            <p>{this.state.error.message || 'Dữ liệu thanh toán không hợp lệ.'}</p>
            <button type="button" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>Tải lại trang</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function PaymentsPageContent({ user }) {
  const [payments, setPayments] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [view, setView] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [adminStatus, setAdminStatus] = useState('PENDING');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const messageTimer = useRef(null);
  const isManager = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const filteredPayments = useMemo(() => {
    const source = view === 'admin' ? adminPayments : payments;
    const search = query.trim().toLowerCase();
    return source.filter((payment) => {
      if (view === 'mine' && statusFilter !== 'ALL' && payment.status !== statusFilter) return false;
      if (!search) return true;
      return [payment.paymentId, payment.orderId, payment.transactionId, payment.paymentMethod, payment.status, payment.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [adminPayments, payments, query, statusFilter, view]);

  const paymentPagination = usePagination(filteredPayments, 8, `${view}|${query}|${statusFilter}|${adminStatus}`);

  const counts = useMemo(() => payments.reduce((result, payment) => {
    result[payment.status] = (result[payment.status] || 0) + 1;
    return result;
  }, {}), [payments]);

  const paidTotal = useMemo(() => payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((total, payment) => total + toVndAmount(payment.amount), 0), [payments]);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadMyPayments = async () => {
    try {
      setLoading(true);
      const result = await api('/api/payments/me');
      setPayments(paymentListFrom(result));
    } catch (error) {
      showMessage(error?.message || 'Không tải được lịch sử thanh toán.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminPayments = async (status = adminStatus) => {
    if (!isManager) return;
    try {
      setAdminLoading(true);
      const result = await api(`/api/payments/admin?status=${status}`);
      setAdminPayments(paymentListFrom(result));
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách duyệt thanh toán.', 'error');
    } finally {
      setAdminLoading(false);
    }
  };

  const refreshCurrentView = () => {
    if (view === 'admin') loadAdminPayments();
    else loadMyPayments();
  };

  const confirmPayment = async (paymentId) => {
    if (!window.confirm('Xác nhận giao dịch này đã được thanh toán?')) return;
    try {
      setBusyId(paymentId);
      await api(`/api/payments/admin/confirm/${paymentId}`, { method: 'PUT' });
      showMessage('Đã xác nhận thanh toán.');
      await loadAdminPayments();
    } catch (error) {
      showMessage(error?.message || 'Không thể xác nhận thanh toán.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (user) loadMyPayments();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  useEffect(() => {
    if (user && isManager) loadAdminPayments(adminStatus);
  }, [adminStatus, user]);

  if (!user) {
    return (
      <main className="payments-page">
        <section className="payments-auth-state">
          <span><ShieldCheck size={35} /></span>
          <h1>Lịch sử thanh toán</h1>
          <p>Đăng nhập để theo dõi các giao dịch của bạn.</p>
          <Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  const currentLoading = view === 'admin' ? adminLoading : loading;

  return (
    <main className="payments-page antialiased">
      <div className="payments-container">
        <header className="payments-heading">
          <div>
            <span>Tài chính</span>
            <h1>{view === 'admin' ? 'Duyệt thanh toán' : 'Thanh toán của tôi'}</h1>
            <p>{view === 'admin' ? 'Kiểm tra và xác nhận các giao dịch trong hệ thống.' : 'Theo dõi trạng thái và lịch sử giao dịch của bạn.'}</p>
          </div>
          <button type="button" onClick={refreshCurrentView} disabled={currentLoading} title="Làm mới danh sách">
            <RefreshCw size={17} className={currentLoading ? 'payments-spinning' : ''} /> Làm mới
          </button>
        </header>

        {isManager && (
          <div className="payment-view-switch" role="tablist" aria-label="Chế độ xem thanh toán">
            <button className={view === 'mine' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'mine'} onClick={() => { setView('mine'); setQuery(''); }}><WalletCards size={16} /> Giao dịch của tôi</button>
            <button className={view === 'admin' ? 'active' : ''} type="button" role="tab" aria-selected={view === 'admin'} onClick={() => { setView('admin'); setQuery(''); }}><ShieldCheck size={16} /> Quản lý giao dịch</button>
          </div>
        )}

        {view === 'mine' && (
          <section className="payments-summary">
            <div><span><ReceiptText size={18} /></span><div><strong>{payments.length}</strong><small>Tổng giao dịch</small></div></div>
            <div><span className="pending"><Clock3 size={18} /></span><div><strong>{counts.PENDING || 0}</strong><small>Đang chờ xử lý</small></div></div>
            <div><span className="paid"><CheckCircle2 size={18} /></span><div><strong>{currency(paidTotal)}</strong><small>Đã thanh toán</small></div></div>
          </section>
        )}

        <section className="payments-panel">
          <div className="payments-toolbar">
            <label className="payments-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã đơn hoặc giao dịch..." /></label>
            {view === 'mine' ? (
              <div className="payment-status-tabs">
                {statuses.map((status) => (
                  <button className={statusFilter === status ? 'active' : ''} type="button" onClick={() => setStatusFilter(status)} key={status}>
                    {status === 'ALL' ? 'Tất cả' : statusInfo[status].label}
                    {status === 'ALL' ? <span>{payments.length}</span> : counts[status] > 0 && <span>{counts[status]}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <label className="admin-status-select">Trạng thái<select value={adminStatus} onChange={(event) => setAdminStatus(event.target.value)}>{adminStatuses.map((status) => <option value={status} key={status}>{statusInfo[status].label}</option>)}</select></label>
            )}
          </div>

          {currentLoading && !(view === 'admin' ? adminPayments.length : payments.length) ? (
            <div className="payments-loading"><span /><span /><span /></div>
          ) : filteredPayments.length ? (
            <><div className="payment-list">
              {paymentPagination.pageItems.map((payment, index) => {
                const status = statusInfo[payment.status] || { label: payment.status, icon: AlertCircle };
                const method = methodInfo[payment.paymentMethod] || { label: payment.paymentMethod, icon: CircleDollarSign };
                const StatusIcon = status.icon;
                const MethodIcon = method.icon;
                const statusLabel = payment.status === 'PENDING' && payment.paymentMethod === 'COD'
                  ? 'Chờ thu hộ'
                  : payment.status === 'PENDING' && payment.paymentMethod === 'BANK_TRANSFER'
                    ? 'Chờ xác nhận'
                    : status.label;
                return (
                  <motion.article className="payment-row" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .035 }} key={payment.paymentId}>
                    <div className="payment-row-heading">
                      <span className="payment-method-icon"><MethodIcon size={20} /></span>
                      <div><strong>Đơn hàng #{payment.orderId}</strong><small>Giao dịch #{payment.paymentId}</small></div>
                      <span className={`payment-status-badge status-${String(payment.status).toLowerCase()}`}><StatusIcon size={14} /> {statusLabel}</span>
                    </div>
                    <div className="payment-row-details">
                      <div><small>Số tiền</small><strong>{currency(payment.amount)}</strong></div>
                      <div><small>Phương thức</small><strong>{method.label}</strong></div>
                      <div><small>Mã giao dịch</small><strong>{payment.transactionId || 'Chưa có'}</strong></div>
                      <div><small>Thời gian</small><strong>{formatDateTime(payment.paymentDate)}</strong></div>
                    </div>
                    {payment.note && <p className="payment-note"><Info size={14} /> {payment.note}</p>}
                    <div className="payment-row-actions">
                      <Link to={`/orders/${payment.orderId}`}>Chi tiết đơn hàng <ArrowRight size={15} /></Link>
                      {view === 'mine' && payment.status === 'PENDING' && payment.paymentMethod === 'MOCK_CARD' && <Link className="payment-action-primary" to={`/checkout/payment/${payment.orderId}`}><CircleDollarSign size={16} /> Thanh toán ngay</Link>}
                      {view === 'mine' && payment.status === 'PENDING' && payment.paymentMethod === 'BANK_TRANSFER' && <Link className="payment-action-primary" to={`/checkout/payment/${payment.orderId}`}><Landmark size={16} /> Hướng dẫn chuyển khoản</Link>}
                      {view === 'admin' && payment.status === 'PENDING' && payment.paymentMethod !== 'COD' && <button type="button" disabled={busyId === payment.paymentId} onClick={() => confirmPayment(payment.paymentId)}><Check size={16} /> {busyId === payment.paymentId ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</button>}
                      {view === 'admin' && payment.status === 'PENDING' && payment.paymentMethod === 'COD' && payment.orderStatus === 'DELIVERED' && <button type="button" disabled={busyId === payment.paymentId} onClick={() => confirmPayment(payment.paymentId)}><Check size={16} /> {busyId === payment.paymentId ? 'Đang xác nhận...' : 'Xác nhận đã thu tiền'}</button>}
                      {view === 'admin' && payment.status === 'PENDING' && payment.paymentMethod === 'COD' && payment.orderStatus !== 'DELIVERED' && <span className="payment-awaiting-delivery"><Clock3 size={15} /> Chờ giao hàng</span>}
                    </div>
                  </motion.article>
                );
              })}
            </div><Pagination {...paymentPagination} onPageChange={paymentPagination.setPage} label="giao dịch" /></>
          ) : (
            <div className="payments-empty-state">
              <span><ReceiptText size={30} /></span>
              <h2>Không có giao dịch</h2>
              <p>{query ? 'Không tìm thấy giao dịch phù hợp.' : view === 'admin' ? 'Không có giao dịch ở trạng thái này.' : 'Các giao dịch mới sẽ xuất hiện tại đây.'}</p>
              {query && <button type="button" onClick={() => setQuery('')}>Xóa tìm kiếm</button>}
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {message && <motion.div className={`payments-toast ${message.type}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>{message.type === 'success' ? <Check size={18} /> : <X size={18} />} {message.text}</motion.div>}
      </AnimatePresence>
    </main>
  );
}

export default function PaymentsPage(props) {
  return <PaymentsErrorBoundary><PaymentsPageContent {...props} /></PaymentsErrorBoundary>;
}
