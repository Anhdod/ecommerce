import { useEffect, useState } from 'react';
import api from '../api';

const statuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export default function PaymentsPage({ user }) {
  const [payments, setPayments] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadMyPayments = async () => {
    try {
      const result = await api('/api/payments/me');
      setPayments(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được payment của bạn');
    }
  };

  const loadAdminPayments = async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') return;
    try {
      const result = await api(`/api/payments/admin?status=${statusFilter}`);
      setAdminPayments(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được payment admin');
    }
  };

  const confirmPayment = async (paymentId) => {
    try {
      await api(`/api/payments/admin/confirm/${paymentId}`, { method: 'PUT' });
      showMessage('Payment confirmed');
      loadAdminPayments();
    } catch (error) {
      showMessage(error?.message || 'Không xác nhận được payment');
    }
  };

  const processPayment = async (payment) => {
    try {
      await api(`/api/payments/order/${payment.orderId}?paymentMethod=${payment.paymentMethod}`, { method: 'POST' });
      showMessage('Payment processed');
      loadMyPayments();
      loadAdminPayments();
    } catch (error) {
      showMessage(error?.message || 'Khong thanh toan duoc payment');
    }
  };

  useEffect(() => {
    if (user) {
      loadMyPayments();
      loadAdminPayments();
    }
  }, [user, statusFilter]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Payments</h2>
          <p>Đăng nhập để xem thông tin thanh toán.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <h2>My Payments</h2>
        {payments.length ? (
          <div className="payment-list">
            {payments.map((payment) => (
              <div key={payment.paymentId} className="card">
                <p>Order #{payment.orderId}</p>
                <p>Amount: {payment.amount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                <p>Method: {payment.paymentMethod}</p>
                <p>Status: {payment.status}</p>
                <p>{payment.note}</p>
                {payment.status === 'PENDING' && (
                  <button className="small" onClick={() => processPayment(payment)}>
                    Pay now
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>Không có payment nào.</p>
        )}

        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <div className="panel admin-panel">
            <h3>Admin payment approval</h3>
            <label>
              Status filter
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            {adminPayments.length ? (
              <div className="payment-list">
                {adminPayments.map((payment) => (
                  <div key={payment.paymentId} className="card">
                    <p>Order #{payment.orderId}</p>
                    <p>Amount: {payment.amount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                    <p>Method: {payment.paymentMethod}</p>
                    <p>Status: {payment.status}</p>
                    {payment.status === 'PENDING' && (
                      <button onClick={() => confirmPayment(payment.paymentId)}>Confirm</button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>Không có payment admin.</p>
            )}
          </div>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
