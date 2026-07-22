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
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Sun,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api';
import { formatCompactVnd as compactCurrency, formatVnd as currency, toVndAmount } from '../../utils/currency';
import './AdminDashboardPage.css';

const statusMeta = {
  PENDING: { label: 'Chờ xác nhận', color: '#f59e0b' },
  CONFIRMED: { label: 'Đã xác nhận', color: '#3b82f6' },
  PROCESSING: { label: 'Đang đóng gói', color: '#eab308' },
  SHIPPING: { label: 'Đang giao', color: '#8b5cf6' },
  DELIVERED: { label: 'Đã giao', color: '#10b981' },
  CANCELLED: { label: 'Đã hủy', color: '#f43f5e' },
};

const chartLayout = { width: 920, height: 280, left: 78, right: 24, top: 22, bottom: 42 };

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPeriod = (period, group) => {
  const date = new Date(`${group === 'month' ? `${period}-01` : period}T00:00:00`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat('vi-VN', group === 'month'
    ? { month: 'short', year: 'numeric' }
    : { day: '2-digit', month: '2-digit' }).format(date);
};

const niceMaximum = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
};

const niceCountMaximum = (value) => Math.max(4, Math.ceil(value / 4) * 4);

export default function AdminDashboardPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [revenueGroup, setRevenueGroup] = useState('day');
  const [revenueFrom, setRevenueFrom] = useState('');
  const [revenueTo, setRevenueTo] = useState('');
  const [hoveredPeriod, setHoveredPeriod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const statCards = useMemo(() => summary ? [
    { label: 'Doanh thu', value: currency(summary.totalRevenue), helper: `Lợi nhuận ròng ${currency(summary.totalProfit || 0)} · ${Number(summary.profitMargin || 0).toFixed(1)}%`, icon: CircleDollarSign, tone: 'blue' },
    { label: 'Tổng đơn hàng', value: Number(summary.totalOrders || 0).toLocaleString('vi-VN'), helper: `${summary.pendingOrders || 0} đơn chờ xử lý`, icon: ShoppingBag, tone: 'orange' },
    { label: 'Sản phẩm', value: Number(summary.totalProducts || 0).toLocaleString('vi-VN'), helper: 'Đang có trong danh mục', icon: Boxes, tone: 'violet' },
    { label: 'Khách hàng', value: Number(summary.totalCustomers || 0).toLocaleString('vi-VN'), helper: 'Tài khoản trong hệ thống', icon: UsersRound, tone: 'green' },
  ] : [], [summary]);

  const chartData = useMemo(() => {
    const revenueAmounts = revenue.map((item) => toVndAmount(item.revenue));
    const profitAmounts = revenue.map((item) => toVndAmount(item.profit));
    const max = niceMaximum(Math.max(...revenueAmounts, ...profitAmounts, 0));
    const rawMin = Math.min(...profitAmounts, 0);
    const min = rawMin < 0 ? -niceMaximum(Math.abs(rawMin)) : 0;
    const countMax = niceCountMaximum(Math.max(...revenue.map((item) => Number(item.paymentCount || 0)), 0));
    const plotWidth = chartLayout.width - chartLayout.left - chartLayout.right;
    const plotHeight = chartLayout.height - chartLayout.top - chartLayout.bottom;
    const slotWidth = plotWidth / Math.max(revenue.length, 1);
    const range = max - min || 1;
    const valueToY = (value) => chartLayout.top + ((max - value) / range) * plotHeight;
    const zeroY = valueToY(0);
    return revenue.map((item, index) => {
      const amount = toVndAmount(item.revenue);
      const profit = toVndAmount(item.profit);
      return {
        ...item,
        amount,
        profit,
        cost: toVndAmount(item.cost),
        count: Number(item.paymentCount || 0),
        label: formatPeriod(item.period, revenueGroup),
        x: chartLayout.left + slotWidth * (index + .5),
        revenueY: valueToY(amount),
        profitY: valueToY(profit),
        countY: chartLayout.top + (1 - Number(item.paymentCount || 0) / countMax) * plotHeight,
        barWidth: Math.min(27, Math.max(6, slotWidth * .32)),
        max,
        min,
        zeroY,
        countMax,
      };
    });
  }, [revenue, revenueGroup]);

  const transactionLinePath = useMemo(() => chartData.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.countY}`).join(' '), [chartData]);
  const chartPlotBottom = chartLayout.height - chartLayout.bottom;
  const chartZeroY = chartData[0]?.zeroY ?? chartPlotBottom;
  const chartMax = chartData[0]?.max || 1;
  const chartMin = chartData[0]?.min || 0;
  const countMax = chartData[0]?.countMax || 4;
  const chartTicks = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const amount = chartMax - ((chartMax - chartMin) / 4) * index;
    const count = countMax - (countMax / 4) * index;
    const plotHeight = chartLayout.height - chartLayout.top - chartLayout.bottom;
    return { amount, count, y: chartLayout.top + (plotHeight / 4) * index };
  }), [chartMax, chartMin, countMax]);
  const labelStep = Math.max(1, Math.ceil(chartData.length / 6));
  const chartLabels = chartData.filter((_, index) => index % labelStep === 0 || index === chartData.length - 1);
  const hoveredPoint = chartData.find((point) => point.period === hoveredPeriod) || null;
  const revenueStats = useMemo(() => {
    const total = revenue.reduce((sum, item) => sum + toVndAmount(item.revenue), 0);
    const profit = revenue.reduce((sum, item) => sum + toVndAmount(item.profit), 0);
    const cost = revenue.reduce((sum, item) => sum + toVndAmount(item.cost), 0);
    const grossProfit = revenue.reduce((sum, item) => sum + toVndAmount(item.grossProfit), 0);
    const orderProfit = revenue.reduce((sum, item) => sum + toVndAmount(item.orderProfit), 0);
    const operatingExpense = revenue.reduce((sum, item) => sum + toVndAmount(item.operatingExpense), 0);
    const payments = revenue.reduce((sum, item) => sum + Number(item.paymentCount || 0), 0);
    const margin = total > 0 ? (profit / total) * 100 : 0;
    return { total, profit, cost, grossProfit, orderProfit, operatingExpense, payments, margin };
  }, [revenue]);

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

  const setQuickRange = (range) => {
    if (range === 'all') {
      setRevenueFrom('');
      setRevenueTo('');
      return;
    }

    const to = new Date();
    const from = new Date(to);
    if (range === '12m') {
      from.setMonth(from.getMonth() - 11, 1);
      setRevenueGroup('month');
    } else {
      from.setDate(from.getDate() - (Number(range) - 1));
      setRevenueGroup('day');
    }
    setRevenueFrom(toIsoDate(from));
    setRevenueTo(toIsoDate(to));
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
            <Link className="admin-expenses-link" to="/admin/expenses"><ReceiptText size={16} /> Quản lý chi phí</Link>
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
              <header><div><h2>Doanh thu và lợi nhuận ròng</h2><p>Đã trừ giá vốn, chi phí đơn hàng và chi phí vận hành</p></div><div className="admin-revenue-filters"><select value={revenueGroup} onChange={(event) => setRevenueGroup(event.target.value)}><option value="day">Theo ngày</option><option value="month">Theo tháng</option></select><input type="date" value={revenueFrom} aria-label="Từ ngày" onChange={(event) => setRevenueFrom(event.target.value)} /><input type="date" value={revenueTo} aria-label="Đến ngày" onChange={(event) => setRevenueTo(event.target.value)} /></div></header>
              <div className="admin-revenue-quick-ranges"><span>Khoảng nhanh</span><button type="button" onClick={() => setQuickRange('7')}>7 ngày</button><button type="button" onClick={() => setQuickRange('30')}>30 ngày</button><button type="button" onClick={() => setQuickRange('90')}>90 ngày</button><button type="button" onClick={() => setQuickRange('12m')}>12 tháng</button><button type="button" onClick={() => setQuickRange('all')}>Tất cả</button></div>
              {chartData.length ? (
                <>
                  <div className="admin-revenue-summary">
                    <div><span>Doanh thu trong kỳ</span><strong>{currency(revenueStats.total)}</strong></div>
                    <div><span>Lợi nhuận gộp</span><strong className={revenueStats.grossProfit < 0 ? 'negative' : 'positive'}>{currency(revenueStats.grossProfit)}</strong></div>
                    <div><span>Chi phí vận hành</span><strong>{currency(revenueStats.operatingExpense)}</strong></div>
                    <div><span>Lợi nhuận ròng · {revenueStats.margin.toFixed(1)}%</span><strong className={revenueStats.profit < 0 ? 'negative' : 'positive'}>{currency(revenueStats.profit)}</strong></div>
                  </div>
                  <div className="admin-chart-legend" aria-hidden="true">
                    <span><i className="revenue" />Doanh thu</span>
                    <span><i className="profit" />Lợi nhuận ròng</span>
                    <span><i className="transactions" />Số giao dịch</span>
                  </div>
                  <div className="admin-line-chart" onMouseLeave={() => setHoveredPeriod(null)}>
                    <svg viewBox={`0 0 ${chartLayout.width} ${chartLayout.height}`} role="img" aria-label="Biểu đồ doanh thu và số giao dịch">
                      {chartTicks.map((tick) => <g key={tick.amount}>
                        <line className="chart-grid-line" x1={chartLayout.left} x2={chartLayout.width - chartLayout.right} y1={tick.y} y2={tick.y} />
                        <text className="chart-y-label" x={chartLayout.left - 12} y={tick.y + 4}>{compactCurrency(tick.amount)}</text>
                        <text className="chart-y-label chart-y-label-right" x={chartLayout.width - chartLayout.right + 12} y={tick.y + 4}>{tick.count.toLocaleString('vi-VN')}</text>
                      </g>)}
                      {chartLabels.map((point) => <text className="chart-x-label" x={point.x} y={chartLayout.height - 14} key={point.period}>{point.label}</text>)}
                      {chartData.map((point, index) => <motion.rect
                        className="chart-revenue-bar"
                        x={point.x - point.barWidth - 2}
                        width={point.barWidth}
                        rx="4"
                        initial={{ y: chartZeroY, height: 0 }}
                        animate={{ y: Math.min(point.revenueY, chartZeroY), height: Math.abs(chartZeroY - point.revenueY) }}
                        transition={{ duration: .45, delay: index * .025 }}
                        key={`revenue-${point.period}`}
                      />)}
                      {chartData.map((point, index) => <motion.rect
                        className={`chart-profit-bar ${point.profit < 0 ? 'negative' : ''}`}
                        x={point.x + 2}
                        width={point.barWidth}
                        rx="4"
                        initial={{ y: chartZeroY, height: 0 }}
                        animate={{ y: Math.min(point.profitY, chartZeroY), height: Math.abs(chartZeroY - point.profitY) }}
                        transition={{ duration: .45, delay: index * .025 + .04 }}
                        key={`profit-${point.period}`}
                      />)}
                      <motion.path className="chart-transaction-line" d={transactionLinePath} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .65, ease: 'easeOut' }} />
                      {chartData.map((point) => <circle className="chart-transaction-point" cx={point.x} cy={point.countY} r={hoveredPeriod === point.period ? 6 : 4} key={`point-${point.period}`} />)}
                      {chartData.map((point) => <rect
                        className="chart-hover-column"
                        x={point.x - Math.max(point.barWidth * 2 + 8, 30) / 2}
                        y={chartLayout.top}
                        width={Math.max(point.barWidth * 2 + 8, 30)}
                        height={chartPlotBottom - chartLayout.top}
                        onMouseEnter={() => setHoveredPeriod(point.period)}
                        key={`hover-${point.period}`}
                      />)}
                      {hoveredPoint && <g className="chart-tooltip">
                        <line x1={hoveredPoint.x} x2={hoveredPoint.x} y1={chartLayout.top} y2={chartPlotBottom} />
                        <rect x={Math.min(Math.max(hoveredPoint.x - 102, chartLayout.left), chartLayout.width - chartLayout.right - 204)} y={Math.max(6, Math.min(hoveredPoint.revenueY, hoveredPoint.profitY, hoveredPoint.countY) - 108)} width="204" height="94" rx="7" />
                        <text x={Math.min(Math.max(hoveredPoint.x - 90, chartLayout.left + 12), chartLayout.width - chartLayout.right - 192)} y={Math.max(25, Math.min(hoveredPoint.revenueY, hoveredPoint.profitY, hoveredPoint.countY) - 88)}>
                          <tspan className="chart-tooltip-period">{hoveredPoint.label}</tspan>
                          <tspan className="chart-tooltip-value" x={Math.min(Math.max(hoveredPoint.x - 90, chartLayout.left + 12), chartLayout.width - chartLayout.right - 192)} dy="18">Doanh thu: {currency(hoveredPoint.amount)}</tspan>
                          <tspan className="chart-tooltip-profit" x={Math.min(Math.max(hoveredPoint.x - 90, chartLayout.left + 12), chartLayout.width - chartLayout.right - 192)} dy="17">LN gộp: {currency(hoveredPoint.grossProfit)}</tspan>
                          <tspan className="chart-tooltip-profit" x={Math.min(Math.max(hoveredPoint.x - 90, chartLayout.left + 12), chartLayout.width - chartLayout.right - 192)} dy="16">LN ròng: {currency(hoveredPoint.profit)}</tspan>
                          <tspan className="chart-tooltip-count" x={Math.min(Math.max(hoveredPoint.x - 90, chartLayout.left + 12), chartLayout.width - chartLayout.right - 192)} dy="15">{hoveredPoint.count.toLocaleString('vi-VN')} giao dịch · CP vận hành {currency(hoveredPoint.operatingExpense)}</tspan>
                        </text>
                      </g>}
                    </svg>
                  </div>
                </>
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
