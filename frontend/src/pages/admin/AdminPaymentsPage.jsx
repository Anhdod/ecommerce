import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileImage,
  Landmark,
  Moon,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Sun,
  Undo2,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import api, { assetUrl } from '../../api';
import usePagination from '../../hooks/usePagination';
import { formatVnd as currency, toVndAmount } from '../../utils/currency';
import './AdminPaymentsPage.css';

const statuses = ['ALL', 'PENDING', 'SUBMITTED', 'PAID', 'REJECTED', 'FAILED', 'REFUNDED'];
const statusMeta = {
  PENDING: { label: 'Chờ xử lý', icon: Clock3 },
  SUBMITTED: { label: 'Chờ duyệt biên lai', icon: FileImage },
  PAID: { label: 'Đã thanh toán', icon: CheckCircle2 },
  REJECTED: { label: 'Biên lai bị từ chối', icon: XCircle },
  FAILED: { label: 'Thất bại', icon: XCircle },
  REFUNDED: { label: 'Đã hoàn tiền', icon: RefreshCw },
};
const methodMeta = {
  MOCK_CARD: { label: 'Thẻ thanh toán', icon: CreditCard },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: Landmark },
  COD: { label: 'Thanh toán COD', icon: Banknote },
};
const orderLabels = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang xử lý', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao', CANCELLED: 'Đã hủy' };

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Chưa hoàn tất';

export default function AdminPaymentsPage({ user }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [method, setMethod] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [proofPayment, setProofPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [refundPayment, setRefundPayment] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const result = await api('/api/payments/admin');
      setPayments(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được dữ liệu thanh toán.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) loadPayments();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  const counts = useMemo(() => payments.reduce((result, payment) => {
    result[payment.status] = (result[payment.status] || 0) + 1;
    return result;
  }, {}), [payments]);

  const paidTotal = useMemo(() => payments
    .filter((payment) => payment.status === 'PAID')
    .reduce((total, payment) => total + toVndAmount(payment.amount), 0), [payments]);

  const awaitingTransfer = useMemo(() => payments.filter((payment) => payment.status === 'SUBMITTED' && payment.paymentMethod === 'BANK_TRANSFER').length, [payments]);
  const awaitingCod = useMemo(() => payments.filter((payment) => payment.status === 'PENDING' && payment.paymentMethod === 'COD').length, [payments]);

  const filteredPayments = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return payments.filter((payment) => {
      if (status !== 'ALL' && payment.status !== status) return false;
      if (method !== 'ALL' && payment.paymentMethod !== method) return false;
      if (!keyword) return true;
      return [payment.paymentId, payment.orderId, payment.transactionId, payment.note, payment.orderStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [method, payments, query, status]);

  const paymentPagination = usePagination(filteredPayments, 12, `${query}|${status}|${method}`);

  const confirmPayment = async (payment) => {
    const action = payment.paymentMethod === 'COD' ? 'xác nhận đã thu tiền COD' : 'xác nhận đã nhận chuyển khoản';
    if (!window.confirm(`Bạn chắc chắn muốn ${action} cho đơn #${payment.orderId}?`)) return;
    try {
      setBusyId(payment.paymentId);
      await api(`/api/payments/admin/confirm/${payment.paymentId}`, { method: 'PUT' });
      showMessage(`Đã xác nhận thanh toán cho đơn #${payment.orderId}.`);
      setProofPayment(null);
      await loadPayments();
    } catch (error) {
      showMessage(error?.message || 'Không xác nhận được thanh toán.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const rejectPayment = async () => {
    if (!proofPayment) return;
    const reason = rejectionReason.trim();
    if (!reason) {
      showMessage('Vui lòng nhập lý do từ chối biên lai.', 'error');
      return;
    }
    try {
      setBusyId(proofPayment.paymentId);
      await api(`/api/payments/admin/reject/${proofPayment.paymentId}`, {
        method: 'PUT',
        body: { reason },
      });
      showMessage(`Đã từ chối biên lai của đơn #${proofPayment.orderId}.`);
      setProofPayment(null);
      setRejectionReason('');
      await loadPayments();
    } catch (error) {
      showMessage(error?.message || 'Không từ chối được biên lai.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const openProof = (payment) => {
    setProofPayment(payment);
    setRejectionReason('');
  };

  const openRefund = (payment) => {
    setRefundPayment(payment);
    setRefundReason('');
  };

  const submitRefund = async () => {
    if (!refundPayment) return;
    const reason = refundReason.trim();
    if (!reason) {
      showMessage('Vui lòng nhập lý do hoàn tiền.', 'error');
      return;
    }
    try {
      setBusyId(refundPayment.paymentId);
      await api(`/api/orders/${refundPayment.orderId}/refund-and-cancel`, {
        method: 'PUT',
        body: { reason },
      });
      showMessage(`Đã hoàn tiền và hủy đơn #${refundPayment.orderId}.`);
      setRefundPayment(null);
      setRefundReason('');
      await loadPayments();
    } catch (error) {
      showMessage(error?.message || 'Không hoàn tiền được giao dịch.', 'error');
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
    return <main className="admin-payments-access"><section><WalletCards size={34} /><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý thanh toán.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;
  }

  return (
    <main className={`admin-payments-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-payments-content">
        <header className="admin-payments-topbar">
          <div><span>Quản trị / Kinh doanh</span><h1>Thanh toán</h1></div>
          <div><button className="admin-payments-icon" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="admin-payments-refresh" type="button" onClick={loadPayments} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-payments-spinning' : ''} /> {loading ? 'Đang tải...' : 'Làm mới'}</button></div>
        </header>

        <div className="admin-payments-inner">
          <section className="admin-payments-title"><div><h2>Đối soát giao dịch</h2><p>Duyệt chuyển khoản và ghi nhận COD theo trạng thái giao hàng.</p></div><span>{filteredPayments.length} / {payments.length} giao dịch</span></section>

          <section className="admin-payments-stats">
            <article><span><ReceiptText size={18} /></span><div><small>Tổng giao dịch</small><strong>{payments.length}</strong></div></article>
            <article><span className="transfer"><Landmark size={18} /></span><div><small>Chờ duyệt chuyển khoản</small><strong>{awaitingTransfer}</strong></div></article>
            <article><span className="cod"><Banknote size={18} /></span><div><small>COD chưa thu</small><strong>{awaitingCod}</strong></div></article>
            <article><span className="paid"><WalletCards size={18} /></span><div><small>Đã thanh toán</small><strong>{currency(paidTotal)}</strong></div></article>
          </section>

          <section className="admin-payments-panel">
            <div className="admin-payments-toolbar">
              <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã giao dịch hoặc đơn hàng..." /></label>
              <div><select value={method} onChange={(event) => setMethod(event.target.value)} aria-label="Phương thức thanh toán"><option value="ALL">Tất cả phương thức</option>{Object.entries(methodMeta).map(([key, value]) => <option value={key} key={key}>{value.label}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Trạng thái thanh toán">{statuses.map((item) => <option value={item} key={item}>{item === 'ALL' ? 'Tất cả trạng thái' : statusMeta[item].label}</option>)}</select></div>
            </div>
            <div className="admin-payments-tabs">{statuses.map((item) => <button className={status === item ? 'active' : ''} type="button" onClick={() => setStatus(item)} key={item}>{item === 'ALL' ? 'Tất cả' : statusMeta[item].label}<span>{item === 'ALL' ? payments.length : counts[item] || 0}</span></button>)}</div>

            {loading && !payments.length ? <div className="admin-payments-loading"><span /><span /><span /></div> : filteredPayments.length ? (
              <><div className="admin-payments-table-wrap"><table className="admin-payments-table">
                <thead><tr><th>Giao dịch</th><th>Đơn hàng</th><th>Phương thức</th><th>Biên lai</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th><th aria-label="Thao tác" /></tr></thead>
                <tbody>{paymentPagination.pageItems.map((payment) => {
                  const paymentStatus = statusMeta[payment.status] || statusMeta.PENDING;
                  const StatusIcon = paymentStatus.icon;
                  const paymentMethod = methodMeta[payment.paymentMethod] || { label: payment.paymentMethod, icon: WalletCards };
                  const MethodIcon = paymentMethod.icon;
                  const canConfirmTransfer = payment.status === 'SUBMITTED' && payment.paymentMethod === 'BANK_TRANSFER' && Boolean(payment.proofImageUrl) && payment.orderStatus !== 'CANCELLED';
                  const canConfirmCod = payment.status === 'PENDING' && payment.paymentMethod === 'COD' && payment.orderStatus === 'DELIVERED';
                  const canRefund = payment.status === 'PAID' && ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(payment.orderStatus);
                  const waitingText = payment.paymentMethod === 'COD' ? 'Chờ giao hàng' : payment.paymentMethod === 'MOCK_CARD' ? 'Chờ khách thanh toán' : payment.status === 'REJECTED' ? 'Chờ khách gửi lại' : 'Chờ khách gửi biên lai';
                  return <tr key={payment.paymentId}>
                    <td><div className="admin-payment-id"><span><ReceiptText size={16} /></span><div><strong>#{payment.paymentId}</strong><small>{payment.transactionId || 'Chưa có mã giao dịch'}</small></div></div></td>
                    <td><Link className="admin-payment-order" to={`/orders/${payment.orderId}`}>Đơn #{payment.orderId}<ArrowRight size={13} /></Link><small className={`admin-payment-order-status ${String(payment.orderStatus).toLowerCase()}`}>{orderLabels[payment.orderStatus] || payment.orderStatus}</small></td>
                    <td><span className="admin-payment-method-cell"><MethodIcon size={15} /> {paymentMethod.label}</span></td>
                    <td>{payment.proofImageUrl ? <button className="admin-payment-proof" type="button" onClick={() => openProof(payment)} title="Xem biên lai"><img src={assetUrl(payment.proofImageUrl)} alt="Biên lai" /><Eye size={13} /></button> : <span className="admin-payment-no-proof">Chưa gửi</span>}</td>
                    <td><strong className="admin-payment-amount">{currency(payment.amount)}</strong></td>
                    <td><span className={`admin-payment-status ${String(payment.status).toLowerCase()}`}><StatusIcon size={13} /> {paymentStatus.label}</span></td>
                    <td><span className="admin-payment-date">{formatDate(payment.paymentDate)}</span></td>
                    <td><div className="admin-payment-actions">{canConfirmTransfer && <button type="button" onClick={() => openProof(payment)}><Eye size={14} /> Kiểm tra</button>}{canConfirmCod && <button type="button" disabled={busyId === payment.paymentId} onClick={() => confirmPayment(payment)}>{busyId === payment.paymentId ? <RefreshCw className="admin-payments-spinning" size={14} /> : <><Check size={14} /> Đã thu COD</>}</button>}{canRefund && <button className="refund" type="button" onClick={() => openRefund(payment)}><Undo2 size={14} /> Hoàn tiền</button>}{!canConfirmTransfer && !canConfirmCod && !canRefund && ['PENDING', 'REJECTED'].includes(payment.status) && waitingText && <span><Clock3 size={13} /> {waitingText}</span>}<Link to={`/orders/${payment.orderId}`} title="Xem đơn hàng"><ArrowRight size={14} /></Link></div></td>
                  </tr>;
                })}</tbody>
              </table></div><Pagination {...paymentPagination} onPageChange={paymentPagination.setPage} label="giao dịch" /></>
            ) : <div className="admin-payments-empty"><Search size={28} /><strong>Không tìm thấy giao dịch</strong><span>Hãy thay đổi từ khóa hoặc bộ lọc.</span><button type="button" onClick={() => { setQuery(''); setStatus('ALL'); setMethod('ALL'); }}>Đặt lại bộ lọc</button></div>}
          </section>
        </div>
      </div>
      <AnimatePresence>
        {proofPayment && (
          <motion.div className="admin-payment-proof-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setProofPayment(null)}>
            <motion.aside className="admin-payment-proof-drawer" initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ type: 'spring', stiffness: 330, damping: 32 }} onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <div><small>Đối soát chuyển khoản</small><h2>Biên lai đơn #{proofPayment.orderId}</h2></div>
                <button type="button" onClick={() => setProofPayment(null)} title="Đóng"><X size={17} /></button>
              </header>
              <div className="admin-payment-proof-image">
                <img src={assetUrl(proofPayment.proofImageUrl)} alt={`Biên lai đơn ${proofPayment.orderId}`} />
              </div>
              <dl>
                <div><dt>Số tiền cần nhận</dt><dd>{currency(proofPayment.amount)}</dd></div>
                <div><dt>Mã giao dịch</dt><dd>{proofPayment.transactionId}</dd></div>
                <div><dt>Khách gửi lúc</dt><dd>{formatDate(proofPayment.submittedAt)}</dd></div>
              </dl>
              {proofPayment.status === 'REJECTED' && <p className="admin-payment-old-rejection"><strong>Lý do đã từ chối:</strong> {proofPayment.rejectionReason}</p>}
              {proofPayment.status === 'SUBMITTED' && (
                <div className="admin-payment-proof-review">
                  <label>Lý do nếu từ chối<textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} maxLength="500" placeholder="Ví dụ: ảnh mờ, sai số tiền hoặc không thấy mã giao dịch..." /></label>
                  <div>
                    <button className="reject" type="button" disabled={busyId === proofPayment.paymentId} onClick={rejectPayment}><XCircle size={15} /> Từ chối</button>
                    <button className="approve" type="button" disabled={busyId === proofPayment.paymentId} onClick={() => confirmPayment(proofPayment)}>{busyId === proofPayment.paymentId ? <RefreshCw className="admin-payments-spinning" size={15} /> : <Check size={15} />} Duyệt biên lai</button>
                  </div>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {refundPayment && (
          <motion.div className="admin-refund-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setRefundPayment(null)}>
            <motion.section className="admin-refund-dialog" initial={{ opacity: 0, scale: .97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 10 }} onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <span><Undo2 size={18} /></span>
                <div><small>Hoàn tiền giao dịch</small><h2>Đơn hàng #{refundPayment.orderId}</h2></div>
                <button type="button" onClick={() => setRefundPayment(null)} title="Đóng"><X size={17} /></button>
              </header>
              <div className="admin-refund-summary"><span>Số tiền hoàn</span><strong>{currency(refundPayment.amount)}</strong></div>
              <p>Đơn hàng sẽ chuyển sang đã hủy và toàn bộ số lượng sản phẩm sẽ được trả lại kho.</p>
              <label>Lý do hoàn tiền<textarea value={refundReason} onChange={(event) => setRefundReason(event.target.value)} maxLength="500" autoFocus placeholder="Ví dụ: hết hàng, khách yêu cầu hủy trước khi giao..." /></label>
              <div className="admin-refund-actions">
                <button type="button" onClick={() => setRefundPayment(null)}>Đóng</button>
                <button className="confirm" type="button" disabled={busyId === refundPayment.paymentId} onClick={submitRefund}>{busyId === refundPayment.paymentId ? <RefreshCw className="admin-payments-spinning" size={15} /> : <Undo2 size={15} />} Xác nhận hoàn tiền</button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{message && <motion.div className={`admin-payments-toast ${message.type}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
