import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';

const orderStatuses = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
const shippingOptions = ['STANDARD', 'EXPRESS'];

export default function OrderDetailPage({ user }) {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [payment, setPayment] = useState(null);
  const [editForm, setEditForm] = useState({ shippingAddress: '', phoneNumber: '', shippingMethod: 'STANDARD' });
  const [status, setStatus] = useState('PENDING');
  const [trackingCode, setTrackingCode] = useState('');
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadOrder = async () => {
    try {
      const result = await api(`/api/orders/${id}`);
      setOrder(result.data);
      setStatus(result.data.status);
      setTrackingCode(result.data.trackingCode || '');
      setEditForm({
        shippingAddress: result.data.shippingAddress || '',
        phoneNumber: result.data.phoneNumber || '',
        shippingMethod: result.data.shippingMethod || 'STANDARD',
      });
    } catch (error) {
      showMessage(error?.message || 'Cannot load order');
    }
  };

  const loadHistory = async () => {
    try {
      const result = await api(`/api/orders/${id}/history`);
      setHistory(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load order history');
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

  const refreshAll = () => {
    loadOrder();
    loadHistory();
    loadPayment();
  };

  const updateDetails = async (event) => {
    event.preventDefault();
    try {
      await api(`/api/orders/${id}/details`, { method: 'PUT', body: editForm });
      showMessage('Order details updated');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot update order');
    }
  };

  const updateStatus = async () => {
    try {
      await api(`/api/orders/${id}/status?status=${status}`, { method: 'PUT' });
      showMessage('Order status updated');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot update status');
    }
  };

  const updateTrackingCode = async () => {
    try {
      await api(`/api/orders/${id}/tracking?trackingCode=${encodeURIComponent(trackingCode)}`, { method: 'PUT' });
      showMessage('Tracking code updated');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot update tracking code');
    }
  };

  const cancelOrder = async () => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api(`/api/orders/${id}`, { method: 'DELETE' });
      showMessage('Order cancelled');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot cancel order');
    }
  };

  const processPayment = async () => {
    const method = payment?.paymentMethod || 'MOCK_CARD';
    try {
      await api(`/api/payments/order/${id}?paymentMethod=${method}`, { method: 'POST' });
      showMessage('Payment processed');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot process payment');
    }
  };

  const confirmReceived = async () => {
    if (!window.confirm('Confirm that you have received this order?')) return;
    try {
      await api(`/api/orders/${id}/confirm-received`, { method: 'PUT' });
      showMessage('Order confirmed as received');
      refreshAll();
    } catch (error) {
      showMessage(error?.message || 'Cannot confirm received');
    }
  };

  useEffect(() => {
    if (user) {
      refreshAll();
    }
  }, [user, id]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Order Detail</h2>
          <p>Login required.</p>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page-shell">
        <section className="panel">Loading order...</section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="card-header">
          <div>
            <h2>Order #{order.orderId}</h2>
            <p className="muted">Created {new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <span className="tag">{order.status}</span>
        </div>

        <div className="dashboard-grid">
          <div className="stat-card">
            <strong>{order.totalPrice?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</strong>
            <span>Total</span>
          </div>
          <div className="stat-card">
            <strong>{order.shippingFee?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</strong>
            <span>Shipping fee</span>
          </div>
          <div className="stat-card">
            <strong>{order.discountAmount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</strong>
            <span>Discount</span>
          </div>
          <div className="stat-card">
            <strong>{payment?.status || 'N/A'}</strong>
            <span>Payment</span>
          </div>
        </div>

        <div className="split">
          <div>
            <h3>Items</h3>
            <div className="table-list">
              {order.items?.map((item) => (
                <article className="card compact-card" key={item.productId}>
                  <strong>{item.productName}</strong>
                  <span>Qty: {item.quantity}</span>
                  <span>{item.subtotal?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className="sidebar">
            <h3>Shipping</h3>
            <p>{order.shippingAddress}</p>
            <p>{order.phoneNumber}</p>
            <p>{order.shippingMethod}</p>
            <p>Tracking: {order.trackingCode || 'N/A'}</p>
            <div className="row-actions">
              {order.status === 'PENDING' && (
                <button className="small danger" onClick={cancelOrder}>
                  Cancel order
                </button>
              )}
              {order.status === 'SHIPPING' && user.role === 'USER' && (
                <button className="small" onClick={confirmReceived}>
                  Confirm received
                </button>
              )}
              {payment?.status === 'PENDING' && (
                <button className="small" onClick={processPayment}>
                  Pay now
                </button>
              )}
              <Link className="button small" to="/orders">
                Back
              </Link>
            </div>
          </aside>
        </div>

        {order.status === 'PENDING' && (
          <div className="panel nested-panel">
            <h3>Edit Pending Order</h3>
            <form onSubmit={updateDetails} className="form-grid">
              <label>
                Shipping address
                <input
                  value={editForm.shippingAddress}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, shippingAddress: event.target.value }))}
                />
              </label>
              <label>
                Phone number
                <input
                  value={editForm.phoneNumber}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                />
              </label>
              <label>
                Shipping method
                <select
                  value={editForm.shippingMethod}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, shippingMethod: event.target.value }))}
                >
                  {shippingOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Save details</button>
            </form>
          </div>
        )}

        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
          <div className="panel nested-panel">
            <h3>Admin Status</h3>
            <div className="toolbar">
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {orderStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button onClick={updateStatus}>Update status</button>
            </div>
            <div className="toolbar">
              <input
                value={trackingCode}
                onChange={(event) => setTrackingCode(event.target.value)}
                placeholder="Tracking code"
              />
              <button onClick={updateTrackingCode}>Save tracking</button>
            </div>
          </div>
        )}

        <div className="panel nested-panel">
          <h3>Status History</h3>
          {history.length ? (
            <div className="timeline">
              {history.map((item) => (
                <div className="timeline-item" key={item.id || `${item.changedAt}-${item.newStatus}`}>
                  <strong>
                    {item.oldStatus || 'NEW'} {'->'} {item.newStatus}
                  </strong>
                  <span>{item.note}</span>
                  <small>{item.changedAt ? new Date(item.changedAt).toLocaleString() : ''}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>No history yet.</p>
          )}
        </div>

        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
