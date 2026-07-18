import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban,
  CalendarClock,
  Check,
  CircleDollarSign,
  Copy,
  Edit3,
  Moon,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sun,
  TicketPercent,
  TimerOff,
  UsersRound,
  X,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import api from '../api';
import usePagination from '../hooks/usePagination';
import { formatVnd as money } from '../utils/currency';
import './AdminCouponsPage.css';

const initialForm = { code: '', description: '', discountType: 'PERCENT', discountValue: '', minOrderAmount: '', maxDiscountAmount: '', usageLimit: '', active: true, expiresAt: '' };
const dateTime = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Không giới hạn';

const getStatus = (coupon) => {
  if (!coupon.active) return { key: 'disabled', label: 'Đã tắt' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { key: 'expired', label: 'Hết hạn' };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return { key: 'exhausted', label: 'Hết lượt' };
  return { key: 'active', label: 'Hoạt động' };
};

export default function AdminCouponsPage({ user }) {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const result = await api('/api/coupons');
      setCoupons(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được mã giảm giá.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: coupons.length,
    active: coupons.filter((coupon) => getStatus(coupon).key === 'active').length,
    expired: coupons.filter((coupon) => getStatus(coupon).key === 'expired').length,
    used: coupons.reduce((sum, coupon) => sum + Number(coupon.usedCount || 0), 0),
  }), [coupons]);

  const visibleCoupons = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return coupons.filter((coupon) => {
      const status = getStatus(coupon).key;
      const matchesSearch = !keyword || coupon.code?.toLowerCase().includes(keyword) || coupon.description?.toLowerCase().includes(keyword);
      return matchesSearch && (filter === 'all' || status === filter);
    });
  }, [coupons, filter, search]);
  const couponPagination = usePagination(visibleCoupons, 10, `${search}|${filter}`);

  const resetForm = () => { setForm(initialForm); setEditingId(null); setDrawerOpen(false); };
  const openCreate = () => { setForm(initialForm); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm({ code: coupon.code || '', description: coupon.description || '', discountType: coupon.discountType || 'PERCENT', discountValue: coupon.discountValue ?? '', minOrderAmount: coupon.minOrderAmount ?? '', maxDiscountAmount: coupon.maxDiscountAmount ?? '', usageLimit: coupon.usageLimit ?? '', active: coupon.active !== false, expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '' });
    setDrawerOpen(true);
  };

  const toPayload = () => ({
    code: form.code.trim().toUpperCase(), description: form.description.trim(), discountType: form.discountType,
    discountValue: Number(form.discountValue), minOrderAmount: form.minOrderAmount === '' ? 0 : Number(form.minOrderAmount),
    maxDiscountAmount: form.maxDiscountAmount === '' ? null : Number(form.maxDiscountAmount), usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
    active: form.active, expiresAt: form.expiresAt ? `${form.expiresAt}:00` : null,
  });

  const saveCoupon = async (event) => {
    event.preventDefault();
    if (form.discountType === 'PERCENT' && Number(form.discountValue) > 100) { showMessage('Mức giảm phần trăm không được vượt quá 100%.', 'error'); return; }
    try {
      setSaving(true);
      if (editingId) await api(`/api/coupons/${editingId}`, { method: 'PUT', body: toPayload() });
      else await api('/api/coupons', { method: 'POST', body: toPayload() });
      showMessage(editingId ? 'Đã cập nhật mã giảm giá.' : 'Đã tạo mã giảm giá mới.');
      resetForm();
      await loadCoupons();
    } catch (error) {
      showMessage(error?.message || 'Không thể lưu mã giảm giá.', 'error');
    } finally { setSaving(false); }
  };

  const disableCoupon = async (coupon) => {
    if (!window.confirm(`Tắt mã giảm giá "${coupon.code}"?`)) return;
    try { setBusyId(coupon.id); await api(`/api/coupons/${coupon.id}`, { method: 'DELETE' }); showMessage('Đã tắt mã giảm giá.'); await loadCoupons(); }
    catch (error) { showMessage(error?.message || 'Không thể tắt mã giảm giá.', 'error'); }
    finally { setBusyId(null); }
  };

  const copyCode = async (code) => {
    try { await navigator.clipboard.writeText(code); showMessage(`Đã sao chép mã ${code}.`); }
    catch { showMessage('Không thể sao chép mã.', 'error'); }
  };

  const toggleTheme = () => setTheme((current) => { const next = current === 'light' ? 'dark' : 'light'; localStorage.setItem('adminTheme', next); return next; });
  useEffect(() => { if (canManage) loadCoupons(); return () => window.clearTimeout(messageTimer.current); }, [user]);

  if (!canManage) return <main className="admin-coupons-access"><section><span><TicketPercent size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý mã giảm giá.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;

  return <main className={`admin-coupons-shell admin-theme-${theme}`}>
    <AdminSidebar user={user} />
    <div className="admin-coupons-content">
      <header className="admin-coupons-topbar"><div><span>Quản trị / Kinh doanh</span><h1>Mã giảm giá</h1></div><div><button className="admin-coupon-icon-button" type="button" onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="admin-add-coupon" type="button" onClick={openCreate}><Plus size={16} /> Tạo mã</button></div></header>
      <div className="admin-coupons-inner">
        <section className="admin-coupons-heading"><div><h2>Chiến dịch giảm giá</h2><p>Tạo mã, đặt điều kiện và theo dõi hiệu quả sử dụng.</p></div><button type="button" onClick={loadCoupons} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-coupon-spinning' : ''} /> Làm mới</button></section>
        <section className="admin-coupon-stats"><article><span><TicketPercent size={18} /></span><div><strong>{stats.total}</strong><small>Tổng số mã</small></div></article><article><span className="active"><Check size={18} /></span><div><strong>{stats.active}</strong><small>Đang hoạt động</small></div></article><article><span className="expired"><TimerOff size={18} /></span><div><strong>{stats.expired}</strong><small>Đã hết hạn</small></div></article><article><span className="used"><UsersRound size={18} /></span><div><strong>{stats.used}</strong><small>Lượt đã sử dụng</small></div></article></section>
        <section className="admin-coupons-panel">
          <div className="admin-coupons-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc mô tả..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Hoạt động</option><option value="expired">Hết hạn</option><option value="exhausted">Hết lượt</option><option value="disabled">Đã tắt</option></select></div>
          {loading && !coupons.length ? <div className="admin-coupons-loading"><span /><span /><span /><span /></div> : visibleCoupons.length ? <div className="admin-coupons-table-wrap"><table className="admin-coupons-table"><thead><tr><th>Mã giảm giá</th><th>Ưu đãi</th><th>Điều kiện</th><th>Lượt dùng</th><th>Hạn sử dụng</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead><tbody>{couponPagination.pageItems.map((coupon) => {
            const status = getStatus(coupon); const percent = coupon.usageLimit ? Math.min(100, Math.round((coupon.usedCount / coupon.usageLimit) * 100)) : 0;
            return <tr key={coupon.id}><td><div className="admin-coupon-code"><span><TicketPercent size={17} /></span><div><strong>{coupon.code}</strong><small>{coupon.description || 'Chưa có mô tả'}</small></div><button type="button" title="Sao chép mã" onClick={() => copyCode(coupon.code)}><Copy size={13} /></button></div></td><td><strong className="admin-coupon-discount">{coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : money(coupon.discountValue)}</strong><small>{coupon.maxDiscountAmount ? `Tối đa ${money(coupon.maxDiscountAmount)}` : 'Không giới hạn mức giảm'}</small></td><td><span className="admin-coupon-min">Đơn từ {money(coupon.minOrderAmount)}</span></td><td><div className="admin-coupon-usage"><span><strong>{coupon.usedCount}</strong> / {coupon.usageLimit || '∞'}</span>{coupon.usageLimit && <i><b style={{ width: `${percent}%` }} /></i>}</div></td><td><span className="admin-coupon-date"><CalendarClock size={13} /> {dateTime(coupon.expiresAt)}</span></td><td><span className={`admin-coupon-status ${status.key}`}>{status.label}</span></td><td><div className="admin-coupon-actions"><button type="button" onClick={() => openEdit(coupon)} disabled={busyId === coupon.id}><Edit3 size={15} /></button>{coupon.active && <button className="disable" type="button" onClick={() => disableCoupon(coupon)} disabled={busyId === coupon.id}><Ban size={15} /></button>}</div></td></tr>;
          })}</tbody></table></div> : <div className="admin-coupons-empty"><span><TicketPercent size={28} /></span><h3>Không tìm thấy mã giảm giá</h3><p>Thay đổi bộ lọc hoặc tạo chiến dịch mới.</p><button type="button" onClick={openCreate}><Plus size={15} /> Tạo mã</button></div>}
          <Pagination {...couponPagination} onPageChange={couponPagination.setPage} label="mã giảm giá" />
        </section>
      </div>
    </div>
    <AnimatePresence>{drawerOpen && <><motion.button className="admin-coupon-drawer-overlay" type="button" onClick={resetForm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="admin-coupon-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}><header><div><span>{editingId ? `Mã #${editingId}` : 'Chiến dịch mới'}</span><h2>{editingId ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá'}</h2></div><button type="button" onClick={resetForm}><X size={18} /></button></header><form onSubmit={saveCoupon}><label>Mã giảm giá<input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} maxLength={50} placeholder="SUMMER2026" required /></label><div className="admin-coupon-form-row"><label>Loại ưu đãi<select value={form.discountType} onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value }))}><option value="PERCENT">Phần trăm</option><option value="FIXED">Số tiền cố định</option></select></label><label>Giá trị<input type="number" min="1" max={form.discountType === 'PERCENT' ? 100 : undefined} value={form.discountValue} onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))} required /></label></div><div className="admin-coupon-form-row"><label>Đơn tối thiểu<input type="number" min="0" value={form.minOrderAmount} onChange={(event) => setForm((current) => ({ ...current, minOrderAmount: event.target.value }))} placeholder="0" /></label><label>Giảm tối đa<input type="number" min="0" value={form.maxDiscountAmount} onChange={(event) => setForm((current) => ({ ...current, maxDiscountAmount: event.target.value }))} placeholder="Không giới hạn" /></label></div><div className="admin-coupon-form-row"><label>Giới hạn lượt dùng<input type="number" min="1" value={form.usageLimit} onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} placeholder="Không giới hạn" /></label><label>Hạn sử dụng<input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} /></label></div><label>Mô tả<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Nội dung ngắn về chương trình" /></label><label className="admin-coupon-active-control"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><span><strong>Kích hoạt mã</strong><small>Khách hàng có thể dùng mã ngay khi đủ điều kiện.</small></span></label><section className="admin-coupon-preview"><span>{form.discountType === 'PERCENT' ? <Percent size={20} /> : <CircleDollarSign size={20} />}</span><div><small>Ưu đãi xem trước</small><strong>{form.code || 'MÃ GIẢM GIÁ'}</strong><p>{form.discountValue ? `Giảm ${form.discountType === 'PERCENT' ? `${form.discountValue}%` : money(form.discountValue)}` : 'Nhập giá trị ưu đãi'}</p></div></section><footer><button type="button" onClick={resetForm}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mã'}</button></footer></form></motion.aside></>}</AnimatePresence>
    <AnimatePresence>{message && <motion.div className={`admin-coupons-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
  </main>;
}
