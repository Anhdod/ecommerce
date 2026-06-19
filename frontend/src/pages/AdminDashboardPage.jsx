import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const currency = (value) => Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const managerLinks = [
  { to: '/admin/products', title: 'Products', description: 'Catalog, prices, images' },
  { to: '/admin/categories', title: 'Categories', description: 'Groups and featured sections' },
  { to: '/admin/coupons', title: 'Coupons', description: 'Discount codes and campaigns' },
  { to: '/admin/inventory', title: 'Inventory', description: 'Stock and movement history' },
  { to: '/admin/banners', title: 'Banners', description: 'Homepage promotions' },
  { to: '/admin/reviews', title: 'Reviews', description: 'Moderation and feedback' },
  { to: '/orders', title: 'Orders', description: 'Fulfillment and tracking' },
  { to: '/payments', title: 'Payments', description: 'Payment confirmation' },
];

export default function AdminDashboardPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [revenueGroup, setRevenueGroup] = useState('day');
  const [message, setMessage] = useState('');

  const links = useMemo(
    () => (user?.role === 'ADMIN' ? [...managerLinks, { to: '/admin/users', title: 'Users', description: 'Roles and account status' }] : managerLinks),
    [user?.role]
  );

  const statCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Orders', value: summary.totalOrders },
      { label: 'Revenue', value: currency(summary.totalRevenue), featured: true },
      { label: 'Paid', value: summary.totalPaidPayments },
      { label: 'Pending', value: summary.totalPendingPayments },
      { label: 'Products', value: summary.totalProducts },
      { label: 'Customers', value: summary.totalCustomers },
    ];
  }, [summary]);

  const maxRevenue = useMemo(
    () => Math.max(...revenue.map((item) => Number(item.revenue || 0)), 0),
    [revenue]
  );

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadDashboard = async () => {
    try {
      const [summaryResult, topSellingResult, topCustomersResult, statusResult, revenueResult] = await Promise.all([
        api('/api/admin/dashboard/summary'),
        api('/api/admin/dashboard/top-selling?limit=5'),
        api('/api/admin/dashboard/top-customers?limit=5'),
        api('/api/admin/dashboard/order-status'),
        api(`/api/admin/dashboard/revenue?groupBy=${revenueGroup}`),
      ]);

      setSummary(summaryResult.data);
      setTopSelling(topSellingResult.data || []);
      setTopCustomers(topCustomersResult.data || []);
      setOrderStatus(statusResult.data || []);
      setRevenue(revenueResult.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load admin dashboard');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadDashboard();
    }
  }, [user, revenueGroup]);

  if (!user) {
    return (
      <main className="page-shell admin-page">
        <section className="panel compact-empty">
          <h2>Admin Dashboard</h2>
          <p>Dang nhap admin de xem trang nay.</p>
        </section>
      </main>
    );
  }

  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return (
      <main className="page-shell admin-page">
        <section className="panel compact-empty">
          <h2>Unauthorized</h2>
          <p>Chi ADMIN hoac STAFF moi co the truy cap.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell admin-page">
      <section className="admin-hero">
        <div>
          <span className="eyebrow">Admin</span>
          <h1>Dashboard</h1>
          <p>Quan ly san pham, don hang, ton kho va chien dich trong mot man hinh gon.</p>
        </div>
        <button className="small" onClick={loadDashboard}>
          Refresh
        </button>
      </section>

      <section className="admin-nav-grid" aria-label="Admin shortcuts">
        {links.map((item) => (
          <Link className="admin-nav-card" to={item.to} key={item.to}>
            <strong>{item.title}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </section>

      {summary ? (
        <section className="dashboard-grid admin-stats">
          {statCards.map((item) => (
            <article className={`stat-card ${item.featured ? 'primary-stat' : ''}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </section>
      ) : (
        <section className="panel compact-empty">
          <p>Loading dashboard data...</p>
        </section>
      )}

      <section className="panel admin-section">
        <div className="card-header">
          <div>
            <h2>Revenue</h2>
            <p className="muted">Paid payment timeline</p>
          </div>
          <select className="compact-select" value={revenueGroup} onChange={(event) => setRevenueGroup(event.target.value)}>
            <option value="day">By day</option>
            <option value="month">By month</option>
          </select>
        </div>
        {revenue.length ? (
          <div className="bar-chart">
            {revenue.map((item) => (
              <div className="bar-row" key={item.period}>
                <span>{item.period}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${maxRevenue ? (Number(item.revenue || 0) / maxRevenue) * 100 : 0}%` }} />
                </div>
                <strong>{currency(item.revenue)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No paid revenue yet.</p>
        )}
      </section>

      <div className="dashboard-columns">
        <section className="panel admin-section">
          <h2>Order Status</h2>
          <div className="status-grid">
            {orderStatus.map((item) => (
              <div className="status-pill" key={item.status}>
                <strong>{item.total}</strong>
                <span>{item.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel admin-section">
          <h2>Top Customers</h2>
          <div className="rank-list">
            {topCustomers.map((item, index) => (
              <div className="rank-row" key={item.userId}>
                <span>#{index + 1}</span>
                <strong>{item.fullName || item.username}</strong>
                <small>{item.totalOrders} orders</small>
                <b>{currency(item.totalSpent)}</b>
              </div>
            ))}
            {!topCustomers.length && <p className="muted">No customer data yet.</p>}
          </div>
        </section>
      </div>

      <section className="panel admin-section">
        <h2>Top Selling Products</h2>
        <div className="rank-list">
          {topSelling.map((item, index) => (
            <div className="rank-row" key={item.productId}>
              <span>#{index + 1}</span>
              <strong>{item.productName}</strong>
              <small>Sold {item.totalSold}</small>
              <b>{currency(item.revenue)}</b>
            </div>
          ))}
          {!topSelling.length && <p className="muted">No top selling data yet.</p>}
        </div>
      </section>

      {message && <div className="message page-notice">{message}</div>}
    </main>
  );
}
