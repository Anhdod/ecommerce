import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Edit3, ExternalLink, Eye, EyeOff, ImageOff, Images, Link2, Moon, Plus, RefreshCw, Search, Sun, Trash2, X } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import api, { assetUrl } from '../api';
import usePagination from '../hooks/usePagination';
import './AdminBannersPage.css';

const initialForm = { title: '', subtitle: '', imageUrl: '', linkUrl: '', active: true, sortOrder: 0 };
const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(value)) : 'Chưa rõ';

export default function AdminBannersPage({ user }) {
  const [banners, setBanners] = useState([]);
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

  const showMessage = (text, type = 'success') => { window.clearTimeout(messageTimer.current); setMessage({ text, type }); messageTimer.current = window.setTimeout(() => setMessage(null), 4000); };
  const loadBanners = async () => {
    try { setLoading(true); const result = await api('/api/banners'); setBanners((Array.isArray(result.data) ? result.data : []).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))); }
    catch (error) { showMessage(error?.message || 'Không tải được danh sách banner.', 'error'); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => ({ total: banners.length, active: banners.filter((banner) => banner.active).length, hidden: banners.filter((banner) => !banner.active).length, linked: banners.filter((banner) => banner.linkUrl).length }), [banners]);
  const visibleBanners = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return banners.filter((banner) => (!keyword || banner.title?.toLowerCase().includes(keyword) || banner.subtitle?.toLowerCase().includes(keyword)) && (filter === 'all' || (filter === 'active' ? banner.active : !banner.active)));
  }, [banners, filter, search]);
  const bannerPagination = usePagination(visibleBanners, 8, `${search}|${filter}`);

  const resetForm = () => { setForm(initialForm); setEditingId(null); setDrawerOpen(false); };
  const openCreate = () => { setForm(initialForm); setEditingId(null); setDrawerOpen(true); };
  const openEdit = (banner) => { setEditingId(banner.id); setForm({ title: banner.title || '', subtitle: banner.subtitle || '', imageUrl: banner.imageUrl || '', linkUrl: banner.linkUrl || '', active: banner.active !== false, sortOrder: banner.sortOrder ?? 0 }); setDrawerOpen(true); };
  const saveBanner = async (event) => {
    event.preventDefault();
    const payload = { ...form, title: form.title.trim(), subtitle: form.subtitle.trim(), imageUrl: form.imageUrl.trim(), linkUrl: form.linkUrl.trim(), sortOrder: Number(form.sortOrder || 0) };
    try { setSaving(true); if (editingId) await api(`/api/banners/${editingId}`, { method: 'PUT', body: payload }); else await api('/api/banners', { method: 'POST', body: payload }); showMessage(editingId ? 'Đã cập nhật banner.' : 'Đã tạo banner mới.'); resetForm(); await loadBanners(); }
    catch (error) { showMessage(error?.message || 'Không thể lưu banner.', 'error'); }
    finally { setSaving(false); }
  };
  const deleteBanner = async (banner) => {
    if (!window.confirm(`Xóa banner "${banner.title}"?`)) return;
    try { setBusyId(banner.id); await api(`/api/banners/${banner.id}`, { method: 'DELETE' }); showMessage('Đã xóa banner.'); await loadBanners(); }
    catch (error) { showMessage(error?.message || 'Không thể xóa banner.', 'error'); }
    finally { setBusyId(null); }
  };
  const toggleActive = async (banner) => {
    try { setBusyId(banner.id); await api(`/api/banners/${banner.id}`, { method: 'PUT', body: { title: banner.title, subtitle: banner.subtitle, imageUrl: banner.imageUrl, linkUrl: banner.linkUrl, active: !banner.active, sortOrder: banner.sortOrder } }); showMessage(banner.active ? 'Đã ẩn banner.' : 'Đã bật banner.'); await loadBanners(); }
    catch (error) { showMessage(error?.message || 'Không thể đổi trạng thái banner.', 'error'); }
    finally { setBusyId(null); }
  };
  const toggleTheme = () => setTheme((current) => { const next = current === 'light' ? 'dark' : 'light'; localStorage.setItem('adminTheme', next); return next; });
  useEffect(() => { if (canManage) loadBanners(); return () => window.clearTimeout(messageTimer.current); }, [user]);

  if (!canManage) return <main className="admin-banners-access"><section><span><Images size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý banner.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;

  return <main className={`admin-banners-shell admin-theme-${theme}`}>
    <AdminSidebar user={user} />
    <div className="admin-banners-content">
      <header className="admin-banners-topbar"><div><span>Quản trị / Nội dung</span><h1>Banner</h1></div><div><button className="admin-banner-icon-button" type="button" onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="admin-add-banner" type="button" onClick={openCreate}><Plus size={16} /> Thêm banner</button></div></header>
      <div className="admin-banners-inner">
        <section className="admin-banners-heading"><div><h2>Quản lý banner</h2><p>Sắp xếp nội dung quảng bá xuất hiện trên cửa hàng.</p></div><button type="button" onClick={loadBanners} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-banner-spinning' : ''} /> Làm mới</button></section>
        <section className="admin-banner-stats"><article><span><Images size={18} /></span><div><strong>{stats.total}</strong><small>Tổng banner</small></div></article><article><span className="active"><Eye size={18} /></span><div><strong>{stats.active}</strong><small>Đang hiển thị</small></div></article><article><span className="hidden"><EyeOff size={18} /></span><div><strong>{stats.hidden}</strong><small>Đang ẩn</small></div></article><article><span className="linked"><Link2 size={18} /></span><div><strong>{stats.linked}</strong><small>Có liên kết</small></div></article></section>
        <section className="admin-banners-panel">
          <div className="admin-banners-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tiêu đề hoặc nội dung..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="active">Đang hiển thị</option><option value="hidden">Đang ẩn</option></select></div>
          {loading && !banners.length ? <div className="admin-banners-loading"><span /><span /><span /></div> : visibleBanners.length ? <div className="admin-banners-grid">{bannerPagination.pageItems.map((banner) => <article key={banner.id}>
            <div className="admin-banner-media">{banner.imageUrl ? <img src={assetUrl(banner.imageUrl)} alt={banner.title} /> : <span><ImageOff size={28} /></span>}<i>#{banner.sortOrder ?? 0}</i><b className={banner.active ? 'active' : 'hidden'}>{banner.active ? 'Đang hiển thị' : 'Đang ẩn'}</b></div>
            <div className="admin-banner-body"><div><h3>{banner.title}</h3><p>{banner.subtitle || 'Chưa có nội dung phụ.'}</p></div><dl><div><dt>Liên kết</dt><dd>{banner.linkUrl ? <a href={banner.linkUrl} target="_blank" rel="noreferrer">{banner.linkUrl}<ExternalLink size={11} /></a> : 'Không có'}</dd></div><div><dt>Ngày tạo</dt><dd>{formatDate(banner.createdAt)}</dd></div></dl><footer><button type="button" onClick={() => toggleActive(banner)} disabled={busyId === banner.id}>{banner.active ? <EyeOff size={14} /> : <Eye size={14} />}{banner.active ? 'Ẩn' : 'Hiện'}</button><div><button type="button" title="Chỉnh sửa" onClick={() => openEdit(banner)} disabled={busyId === banner.id}><Edit3 size={15} /></button><button className="delete" type="button" title="Xóa" onClick={() => deleteBanner(banner)} disabled={busyId === banner.id}><Trash2 size={15} /></button></div></footer></div>
          </article>)}</div> : <div className="admin-banners-empty"><span><Images size={28} /></span><h3>Không tìm thấy banner</h3><p>Thay đổi bộ lọc hoặc tạo banner mới.</p><button type="button" onClick={openCreate}><Plus size={15} /> Thêm banner</button></div>}
          <Pagination {...bannerPagination} onPageChange={bannerPagination.setPage} label="banner" />
        </section>
      </div>
    </div>
    <AnimatePresence>{drawerOpen && <><motion.button className="admin-banner-drawer-overlay" type="button" onClick={resetForm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="admin-banner-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}><header><div><span>{editingId ? `Banner #${editingId}` : 'Banner mới'}</span><h2>{editingId ? 'Chỉnh sửa banner' : 'Thêm banner'}</h2></div><button type="button" onClick={resetForm}><X size={18} /></button></header><form onSubmit={saveBanner}><section className="admin-banner-preview">{form.imageUrl ? <img src={assetUrl(form.imageUrl)} alt="Xem trước banner" /> : <span><ImageOff size={28} />Nhập URL để xem trước</span>}<div><strong>{form.title || 'Tiêu đề banner'}</strong><small>{form.subtitle || 'Nội dung phụ sẽ hiển thị tại đây.'}</small></div></section><label>Tiêu đề<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Khuyến mãi mùa hè" required /></label><label>Nội dung phụ<textarea value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} placeholder="Thông điệp ngắn cho khách hàng" /></label><label>URL hình ảnh<input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://... hoặc /uploads/..." /></label><div className="admin-banner-form-row"><label>Link điều hướng<input value={form.linkUrl} onChange={(event) => setForm((current) => ({ ...current, linkUrl: event.target.value }))} placeholder="/products" /></label><label>Thứ tự<input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))} /></label></div><label className="admin-banner-active-control"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><span><strong>Hiển thị banner</strong><small>Banner xuất hiện trong danh sách nội dung đang hoạt động.</small></span></label><footer><button type="button" onClick={resetForm}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo banner'}</button></footer></form></motion.aside></>}</AnimatePresence>
    <AnimatePresence>{message && <motion.div className={`admin-banners-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
  </main>;
}
