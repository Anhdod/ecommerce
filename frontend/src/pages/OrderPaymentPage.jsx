import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Check,
  Copy,
  CreditCard,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import api from '../api';
import { formatVnd as currency } from '../utils/currency';
import './OrderPaymentPage.css';

const formatCardNumber = (value) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export default function OrderPaymentPage({ user }) {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [payment, setPayment] = useState(null);
  const [form, setForm] = useState({ cardNumber: '', cardholder: '', expiry: '', cvv: '' });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const transferContent = useMemo(
    () => `SHOPZONE ${orderId} ${payment?.transactionId || ''}`.trim(),
    [orderId, payment?.transactionId]
  );

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError('');
      const [orderResult, paymentResult] = await Promise.all([
        api(`/api/orders/${orderId}`),
        api(`/api/payments/order/${orderId}`),
      ]);
      setOrder(orderResult.data);
      setPayment(paymentResult.data);
    } catch (requestError) {
      setError(requestError?.message || 'Không tải được thông tin thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  const copyValue = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };

  const submitCardPayment = async (event) => {
    event.preventDefault();
    const cardDigits = form.cardNumber.replace(/\D/g, '');
    const [month] = form.expiry.split('/').map(Number);
    if (cardDigits.length !== 16 || !form.cardholder.trim() || !/^\d{2}\/\d{2}$/.test(form.expiry) || month < 1 || month > 12 || !/^\d{3,4}$/.test(form.cvv)) {
      setError('Vui lòng nhập đầy đủ thông tin thẻ hợp lệ.');
      return;
    }

    try {
      setProcessing(true);
      setError('');
      await api(`/api/payments/order/${orderId}?paymentMethod=MOCK_CARD`, { method: 'POST' });
      await loadPayment();
    } catch (requestError) {
      setError(requestError?.message || 'Thanh toán không thành công. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (user) loadPayment();
    else setLoading(false);
  }, [user, orderId]);

  if (!user) {
    return (
      <main className="order-payment-page">
        <section className="payment-page-state">
          <span><ShieldCheck size={34} /></span>
          <h1>Đăng nhập để thanh toán</h1>
          <p>Phiên thanh toán chỉ dành cho chủ đơn hàng.</p>
          <Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  if (loading && !payment) {
    return <main className="order-payment-page"><div className="order-payment-loading"><span /><span /></div></main>;
  }

  if (error && !payment) {
    return (
      <main className="order-payment-page">
        <section className="payment-page-state error">
          <span><ReceiptText size={34} /></span>
          <h1>Không thể mở thanh toán</h1>
          <p>{error}</p>
          <Link to="/orders">Về danh sách đơn hàng</Link>
        </section>
      </main>
    );
  }

  if (payment?.status === 'PAID') {
    return (
      <main className="order-payment-page">
        <motion.section className="payment-page-state success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <span><Check size={35} /></span>
          <small>Thanh toán thành công</small>
          <h1>Thanh toán đã hoàn tất.</h1>
          <p>Giao dịch <strong>{payment.transactionId}</strong> thành công. Đơn hàng <strong>#{orderId}</strong> đang chờ cửa hàng xác nhận.</p>
          <div className="payment-result-total"><span>Tổng thanh toán</span><strong>{currency(payment.amount)}</strong></div>
          <div className="payment-state-actions"><Link to={`/orders/${orderId}`}>Theo dõi đơn hàng</Link><Link to="/">Tiếp tục mua sắm</Link></div>
        </motion.section>
      </main>
    );
  }

  if (payment?.status !== 'PENDING') {
    return (
      <main className="order-payment-page">
        <section className="payment-page-state error">
          <span><ReceiptText size={34} /></span><h1>Giao dịch đã đóng</h1>
          <p>Đơn hàng này không còn giao dịch đang chờ thanh toán.</p>
          <Link to={`/orders/${orderId}`}>Xem đơn hàng</Link>
        </section>
      </main>
    );
  }

  if (payment.paymentMethod === 'COD') {
    return (
      <main className="order-payment-page">
        <section className="payment-page-state">
          <span><Check size={34} /></span><h1>Đơn hàng đã được ghi nhận</h1>
          <p>Bạn sẽ thanh toán {currency(payment.amount)} khi nhận hàng, không cần thanh toán trực tuyến.</p>
          <Link to={`/orders/${orderId}`}>Theo dõi đơn hàng</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="order-payment-page antialiased">
      <div className="order-payment-container">
        <Link className="payment-back-link" to={`/orders/${orderId}`}><ArrowLeft size={16} /> Quay lại đơn hàng</Link>
        <div className="order-payment-heading">
          <div><span>Thanh toán đơn hàng</span><h1>Đơn hàng #{orderId}</h1><p>Kiểm tra số tiền và hoàn tất bước thanh toán.</p></div>
          <div><small>Số tiền cần thanh toán</small><strong>{currency(payment.amount)}</strong></div>
        </div>

        {payment.paymentMethod === 'BANK_TRANSFER' ? (
          <section className="bank-transfer-layout">
            <div className="bank-transfer-panel">
              <span className="payment-method-mark"><Landmark size={25} /></span>
              <div><small>Chuyển khoản ngân hàng</small><h2>Thông tin nhận thanh toán</h2><p>Chuyển đúng số tiền và nội dung để quản trị viên xác nhận đơn nhanh hơn.</p></div>
              <div className="bank-detail-list">
                <div><span>Ngân hàng</span><strong>MB Bank</strong></div>
                <div><span>Số tài khoản</span><strong>0123 456 789</strong><button type="button" onClick={() => copyValue('account', '0123456789')} title="Sao chép số tài khoản">{copied === 'account' ? <Check size={16} /> : <Copy size={16} />}</button></div>
                <div><span>Chủ tài khoản</span><strong>SHOPZONE DEMO</strong></div>
                <div><span>Nội dung</span><strong>{transferContent}</strong><button type="button" onClick={() => copyValue('content', transferContent)} title="Sao chép nội dung">{copied === 'content' ? <Check size={16} /> : <Copy size={16} />}</button></div>
                <div className="bank-transfer-total"><span>Số tiền</span><strong>{currency(payment.amount)}</strong></div>
              </div>
            </div>
            <aside className="transfer-status-panel">
              <span><Building2 size={22} /></span><h2>Chờ xác nhận chuyển khoản</h2>
              <p>Đơn hàng đã được tạo. Sau khi nhận tiền, quản trị viên sẽ xác nhận và chuyển đơn sang bước xử lý.</p>
              <div><small>Mã giao dịch</small><strong>{payment.transactionId}</strong></div>
              <Link to={`/orders/${orderId}`}>Theo dõi trạng thái</Link>
            </aside>
          </section>
        ) : (
          <section className="card-payment-layout">
            <form className="card-payment-form" onSubmit={submitCardPayment}>
              <div className="card-form-heading"><span><CreditCard size={22} /></span><div><h2>Thanh toán bằng thẻ</h2><p>Đây là cổng thanh toán mô phỏng, không lưu thông tin thẻ.</p></div></div>
              <label>Số thẻ<input inputMode="numeric" autoComplete="cc-number" value={form.cardNumber} onChange={(event) => setForm((current) => ({ ...current, cardNumber: formatCardNumber(event.target.value) }))} placeholder="4242 4242 4242 4242" /></label>
              <label>Chủ thẻ<input autoComplete="cc-name" value={form.cardholder} onChange={(event) => setForm((current) => ({ ...current, cardholder: event.target.value.toUpperCase() }))} placeholder="NGUYEN VAN A" /></label>
              <div className="card-form-row">
                <label>Ngày hết hạn<input inputMode="numeric" autoComplete="cc-exp" value={form.expiry} onChange={(event) => setForm((current) => ({ ...current, expiry: formatExpiry(event.target.value) }))} placeholder="MM/YY" /></label>
                <label>CVV<input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength="4" value={form.cvv} onChange={(event) => setForm((current) => ({ ...current, cvv: event.target.value.replace(/\D/g, '') }))} placeholder="123" /></label>
              </div>
              {error && <p className="card-payment-error">{error}</p>}
              <button type="submit" disabled={processing}>{processing ? 'Đang xử lý...' : `Thanh toán ${currency(payment.amount)}`} <LockKeyhole size={17} /></button>
              <small className="card-security-note"><ShieldCheck size={14} /> Dữ liệu chỉ dùng để kiểm tra giao diện thanh toán demo.</small>
            </form>
            <aside className="payment-order-summary">
              <span>Đơn hàng #{orderId}</span><h2>Tóm tắt</h2>
              <div><span>Tạm tính</span><strong>{currency(order?.subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>{currency(order?.shippingFee)}</strong></div>
              <div><span>Giảm giá</span><strong>-{currency(order?.discountAmount)}</strong></div>
              <div className="payment-summary-total"><span>Tổng cộng</span><strong>{currency(order?.totalPrice || payment.amount)}</strong></div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
