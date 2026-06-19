import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const orderStatuses = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];

export default function OrdersPage({ user }) {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const isManager = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const filteredOrders = useMemo(() => {
    const value = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
      if (!value) return true;
      return [
        order.orderId,
        order.trackingCode,
        order.phoneNumber,
        order.shippingAddress,
        order.status,
        ...(order.items || []).map((item) => item.productName),
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value));
    });
  }, [orders, query, statusFilter]);

  const statusCounts = useMemo(
    () =>
      orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
    [orders]
  );

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadOrders = async () => {
    try {
      const path = isManager ? '/api/orders/admin' : '/api/orders';
      const result = await api(path);
      setOrders(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được đơn hàng');
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api(`/api/orders/${orderId}`, { method: 'DELETE' });
      showMessage('Order cancelled');
      loadOrders();
    } catch (error) {
      showMessage(error?.message || 'Khong huy duoc don hang');
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Orders</h2>
          <p>Đăng nhập để xem đơn hàng.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="card-header">
          <h2>{isManager ? 'All Orders (Admin)' : 'My Orders'}</h2>
          <button className="small" onClick={loadOrders}>Refresh</button>
        </div>

        {isManager && (
          <div className="toolbar order-admin-toolbar">
            <div className="search-group">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search order, tracking, phone, product"
              />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? `ALL (${orders.length})` : `${status} (${statusCounts[status] || 0})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {filteredOrders.length ? (
          <div className="order-list">
            {filteredOrders.map((order) => (
              <div key={order.orderId} className="card">
                <div className="card-header">
                  <h3>Order #{order.orderId}</h3>
                  <span className="tag">{order.status}</span>
                </div>
                <p>Total: {order.totalPrice?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                <p>Shipping: {order.shippingMethod}</p>
                <p>Tracking: {order.trackingCode || 'N/A'}</p>
                <p>{order.shippingAddress}</p>
                <p>Phone: {order.phoneNumber}</p>
                <div>
                  <strong>Items</strong>
                  <ul>
                    {order.items?.map((item) => (
                      <li key={item.productId}>
                        {item.productName} x{item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="row-actions">
                  <Link className="button small" to={`/orders/${order.orderId}`}>
                    Details
                  </Link>
                  {order.status === 'PENDING' && !isManager && (
                    <button className="small danger" onClick={() => cancelOrder(order.orderId)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Không có đơn hàng nào.</p>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
