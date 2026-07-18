import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Boxes,
  Check,
  CircleDollarSign,
  Clock3,
  Moon,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Sun,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import api from '../api';
import { formatCompactVnd as compactCurrency, formatVnd as currency, toVndAmount } from '../utils/currency';
import './AdminDashboardPage.css';

const statusMeta = {
  PENDING: { label: 'Chờ xác nhận', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#3b82f6' },
  SHIPPING: { label: 'Đang giao', color: '#8b5cf6' },
  DELIVERED: { label: 'Đã giao', color: '#10b981' },
  CANCELLED: { label: 'Đã hủy', color: '#f43f5e' },
};

export default function AdminDashboardPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [revenueGroup, setRevenueGroup] = useState('day');
  const [revenueFrom, setRevenueFrom] = useState('');
  const [revenueTo, setRevenueTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const statCards = useMemo(() => summary ? [
    { label: 'Doanh thu', value: currency(summary.totalRevenue), helper: `${summary.totalPaidPayments || 0} giao dịch thành công`, icon: CircleDollarSign, tone: 'blue' },
    { label: 'Tổng đơn hàng', value: Number(summary.totalOrders || 0).toLocaleString('vi-VN'), helper: `${summary.pendingOrders || 0} đơn chờ xử lý`, icon: ShoppingBag, tone: 'orange' },
    { label: 'Sản phẩm', value: Number(summary.totalProducts || 0).toLocaleString('vi-VN'), helper: 'Đang có trong danh mục', icon: Boxes, tone: 'violet' },
    { label: 'Khách hàng', value: Number(summary.totalCustomers || 0).toLocaleString('vi-VN'), helper: 'Tài khoản trong hệ thống', icon: UsersRound, tone: 'green' },
  ] : [], [summary]);

  const chartData = useMemo(() => {
    const max = Math.max(...revenue.map((item) => toVndAmount(item.revenue)), 1);
    const width = 920;
    const height = 220;
    return revenue.map((item, index) => ({
      ...item,
      amount: toVndAmount(item.revenue),
      x: revenue.length === 1 ? width / 2 : 20 + (index / (revenue.length - 1)) * (width - 40),
      y: height - 20 - (toVndAmount(item.revenue) / max) * (height - 50),
    }));
  }, [revenue]);

  const linePath = useMemo(() => chartData.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '), [chartData]);
  const areaPath = chartData.length ? `${linePath} L ${chartData.at(-1).x} 220 L ${chartData[0].x} 220 Z` : '';

  const totalStatusOrders = orderStatus.reduce((total, item) => total + Number(item.total || 0), 0);
  const donutBackground = useMemo(() => {
    if (!totalStatusOrders) return '#e2e8f0';
    let cursor = 0;
    const segments = orderStatus.map((item) => {
      const start = cursor;
      cursor += (Number(item.total || 0) / totalStatusOrders) * 100;
      return `${statusMeta[item.status]?.color || '#94a3b8'} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }, [orderStatus, totalStatusOrders]);

  const showMessage = (text, type = 'error') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadDashboard = async () => {
    if (revenueFrom && revenueTo && revenueFrom > revenueTo) {
      showMessage('Ngày bắt đầu phải trước ngày kết thúc.');
      return;
    }
    const revenueQuery = new URLSearchParams({ groupBy: revenueGroup });
    if (revenueFrom) revenueQuery.set('from', revenueFrom);
    if (revenueTo) revenueQuery.set('to', revenueTo);
    try {
      setLoading(true);
      const [summaryResult, topSellingResult, topCustomersResult, statusResult, revenueResult] = await Promise.all([
        api('/api/admin/dashboard/summary'),
        api('/api/admin/dashboard/top-selling?limit=5'),
        api('/api/admin/dashboard/top-customers?limit=5'),
        api('/api/admin/dashboard/order-status'),
        api(`/api/admin/dashboard/revenue?${revenueQuery.toString()}`),
      ]);
      setSummary(summaryResult.data || null);
      setTopSelling(Array.isArray(topSellingResult.data) ? topSellingResult.data : []);
      setTopCustomers(Array.isArray(topCustomersResult.data) ? topCustomersResult.data : []);
      setOrderStatus(Array.isArray(statusResult.data) ? statusResult.data : []);
      setRevenue(Array.isArray(revenueResult.data) ? revenueResult.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được dữ liệu Dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('adminTheme', next);
      return next;
    });
  };

  useEffect(() => {
    if (canManage) loadDashboard();
    return () => window.clearTimeout(messageTimer.current);
  }, [user, revenueGroup, revenueFrom, revenueTo]);

  if (!user || !canManage) {
    return (
      <main className="admin-access-page">
        <section><span><PackageCheck size={34} /></span><h1>{user ? 'Không có quyền truy cập' : 'Đăng nhập quản trị'}</h1><p>{user ? 'Chỉ ADMIN hoặc STAFF có thể mở Dashboard.' : 'Đăng nhập bằng tài khoản quản trị để tiếp tục.'}</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section>
      </main>
    );
  }

  return (
    <main className={`admin-dashboard-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-dashboard-content">
        <header className="admin-dashboard-topbar">
          <div><span>Quản trị / Tổng quan</span><h1>Dashboard</h1></div>
          <div>
            <button className="admin-icon-button" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <button className="admin-refresh-button" type="button" onClick={loadDashboard} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-spinning' : ''} /> {loading ? 'Đang tải...' : 'Làm mới'}</button>
          </div>
        </header>

        <div className="admin-dashboard-inner">
          <section className="admin-welcome-row">
            <div><h2>Xin chào, {user.fullName || user.username}</h2><p>Đây là tình hình hoạt động mới nhất của cửa hàng.</p></div>
            <span><Clock3 size={15} /> {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date())}</span>
          </section>

          {summary ? (
            <section className="admin-stat-grid">
              {statCards.map((item, index) => {
                const Icon = item.icon;
                return <motion.article className={`admin-stat-card tone-${item.tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.helper}</small></div><i><Icon size={20} /></i></motion.article>;
              })}
            </section>
          ) : <div className="admin-stat-loading"><span /><span /><span /><span /></div>}

          <section className="admin-dashboard-grid">
            <article className="admin-data-panel admin-revenue-panel">
              <header><div><h2>Doanh thu</h2><p>Dòng tiền từ các giao dịch đã thanh toán</p></div><div className="admin-revenue-filters"><select value={revenueGroup} onChange={(event) => setRevenueGroup(event.target.value)}><option value="day">Theo ngày</option><option value="month">Theo tháng</option></select><input type="date" value={revenueFrom} aria-label="Từ ngày" onChange={(event) => setRevenueFrom(event.target.value)} /><input type="date" value={revenueTo} aria-label="Đến ngày" onChange={(event) => setRevenueTo(event.target.value)} /></div></header>
              {chartData.length ? (
                <div className="admin-line-chart">
                  <svg viewBox="0 0 920 240" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu">
                    {[50, 100, 150, 200].map((y) => <line className="chart-grid-line" x1="20" x2="900" y1={y} y2={y} key={y} />)}
                    <path className="chart-area" d={areaPath} /><path className="chart-line" d={linePath} />
                    {chartData.map((point) => <circle cx={point.x} cy={point.y} r="4" key={point.period}><title>{point.period}: {currency(point.revenue)}</title></circle>)}
                  </svg>
                  <div className="admin-chart-labels">{chartData.map((point) => <span key={point.period}>{point.period}<small>{compactCurrency(point.revenue)}</small></span>)}</div>
                </div>
              ) : <div className="admin-panel-empty"><TrendingUp size={26} /><span>Chưa có doanh thu trong khoảng thời gian này.</span></div>}
            </article>

            <article className="admin-data-panel admin-status-panel">
              <header><div><h2>Trạng thái đơn hàng</h2><p>Phân bổ toàn bộ đơn hàng</p></div><Link to="/admin/orders">Chi tiết <ArrowRight size={14} /></Link></header>
              <div className="admin-status-content">
                <div className="admin-donut-chart" style={{ background: donutBackground }}><div><strong>{totalStatusOrders}</strong><small>Đơn hàng</small></div></div>
                <div className="admin-status-list">{orderStatus.map((item) => <div key={item.status}><i style={{ background: statusMeta[item.status]?.color }} /><span>{statusMeta[item.status]?.label || item.status}</span><strong>{item.total}</strong></div>)}</div>
              </div>
            </article>

            <article className="admin-data-panel admin-products-panel">
              <header><div><h2>Sản phẩm bán chạy</h2><p>Xếp hạng theo số lượng đã bán</p></div><Link to="/admin/products">Quản lý <ArrowRight size={14} /></Link></header>
              {topSelling.length ? <div className="admin-ranking-table">{topSelling.map((item, index) => <div key={item.productId}><span className="admin-rank">{index + 1}</span><div><strong>{item.productName}</strong><small>Đã bán {item.totalSold}</small></div><b>{currency(item.revenue)}</b></div>)}</div> : <div className="admin-panel-empty"><Boxes size={25} /><span>Chưa có dữ liệu sản phẩm.</span></div>}
            </article>

            <article className="admin-data-panel admin-customers-panel">
              <header><div><h2>Khách hàng nổi bật</h2><p>Xếp hạng theo tổng chi tiêu</p></div>{user.role === 'ADMIN' && <Link to="/admin/users">Quản lý <ArrowRight size={14} /></Link>}</header>
              {topCustomers.length ? <div className="admin-customer-list">{topCustomers.map((item, index) => <div key={item.userId}><span>{(item.fullName || item.username || 'U').charAt(0).toUpperCase()}</span><div><strong>{item.fullName || item.username}</strong><small>{item.totalOrders} đơn hàng</small></div><b>{currency(item.totalSpent)}</b><i>#{index + 1}</i></div>)}</div> : <div className="admin-panel-empty"><UsersRound size={25} /><span>Chưa có dữ liệu khách hàng.</span></div>}
            </article>
          </section>
        </div>
      </div>

      <AnimatePresence>{message && <motion.div className={`admin-dashboard-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
