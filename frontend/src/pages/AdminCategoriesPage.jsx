import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Edit3,
  FolderOpen,
  Layers3,
  Moon,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Sun,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import api from '../api';
import usePagination from '../hooks/usePagination';
import './AdminCategoriesPage.css';

const initialCategory = { name: '', description: '', featured: false };

const categoryColors = [
  { background: '#eff6ff', color: '#2563eb' },
  { background: '#f5f3ff', color: '#7c3aed' },
  { background: '#ecfdf5', color: '#059669' },
  { background: '#fff7ed', color: '#ea580c' },
  { background: '#fdf2f8', color: '#db2777' },
];

export default function AdminCategoriesPage({ user }) {
  const [categories, setCategories] = useState([]);
  const [productCounts, setProductCounts] = useState({});
  const [form, setForm] = useState(initialCategory);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoryResult, productResult] = await Promise.all([
        api('/api/categories'),
        api('/api/products?page=0&size=1000&sort=latest'),
      ]);
      const nextCategories = Array.isArray(categoryResult.data) ? categoryResult.data : [];
      const products = Array.isArray(productResult.data?.content) ? productResult.data.content : [];
      const counts = products.reduce((result, product) => {
        const categoryId = Number(product.categoryId);
        result[categoryId] = (result[categoryId] || 0) + 1;
        return result;
      }, {});
      setCategories(nextCategories);
      setProductCounts(counts);
    } catch (error) {
      showMessage(error?.message || 'Không tải được dữ liệu danh mục.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: categories.length,
    featured: categories.filter((category) => category.featured).length,
    inUse: categories.filter((category) => (productCounts[category.id] || 0) > 0).length,
    empty: categories.filter((category) => !productCounts[category.id]).length,
  }), [categories, productCounts]);

  const visibleCategories = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return categories.filter((category) => {
      const matchesSearch = !keyword
        || category.name?.toLocaleLowerCase('vi').includes(keyword)
        || category.description?.toLocaleLowerCase('vi').includes(keyword);
      const count = productCounts[category.id] || 0;
      const matchesFilter = filter === 'all'
        || (filter === 'featured' && category.featured)
        || (filter === 'in-use' && count > 0)
        || (filter === 'empty' && count === 0);
      return matchesSearch && matchesFilter;
    });
  }, [categories, filter, productCounts, search]);
  const categoryPagination = usePagination(visibleCategories, 10, `${search}|${filter}`);

  const resetForm = () => {
    setForm(initialCategory);
    setEditingId(null);
    setDrawerOpen(false);
  };

  const openCreateForm = () => {
    setForm(initialCategory);
    setEditingId(null);
    setDrawerOpen(true);
  };

  const openEditForm = (category) => {
    setForm({
      name: category.name || '',
      description: category.description || '',
      featured: category.featured === true,
    });
    setEditingId(category.id);
    setDrawerOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        featured: form.featured,
      };
      if (editingId) {
        await api(`/api/categories/${editingId}`, { method: 'PUT', body: payload });
      } else {
        await api('/api/categories', { method: 'POST', body: payload });
      }
      showMessage(editingId ? 'Đã cập nhật danh mục.' : 'Đã tạo danh mục mới.');
      resetForm();
      await loadData();
    } catch (error) {
      showMessage(error?.message || 'Không thể lưu danh mục.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const productCount = productCounts[category.id] || 0;
    const warning = productCount
      ? `Danh mục "${category.name}" đang có ${productCount} sản phẩm. Bạn vẫn muốn xóa?`
      : `Xóa danh mục "${category.name}"?`;
    if (!window.confirm(warning)) return;
    try {
      setBusyId(category.id);
      await api(`/api/categories/${category.id}`, { method: 'DELETE' });
      showMessage('Đã xóa danh mục.');
      await loadData();
    } catch (error) {
      showMessage(
        productCount
          ? 'Không thể xóa danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.'
          : error?.message || 'Không thể xóa danh mục.',
        'error'
      );
    } finally {
      setBusyId(null);
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
    if (canManage) loadData();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  if (!canManage) {
    return (
      <main className="admin-categories-access">
        <section>
          <span><Tags size={34} /></span>
          <h1>Không có quyền truy cập</h1>
          <p>Chỉ ADMIN hoặc STAFF có thể quản lý danh mục.</p>
          <Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={`admin-categories-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-categories-content">
        <header className="admin-categories-topbar">
          <div><span>Quản trị / Danh mục</span><h1>Danh mục</h1></div>
          <div>
            <button className="admin-category-icon-button" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <button className="admin-add-category" type="button" onClick={openCreateForm}><Plus size={16} /> Thêm danh mục</button>
          </div>
        </header>

        <div className="admin-categories-inner">
          <section className="admin-categories-heading">
            <div><h2>Quản lý danh mục</h2><p>Sắp xếp sản phẩm và lựa chọn nhóm nổi bật trên cửa hàng.</p></div>
            <button type="button" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-category-spinning' : ''} /> Làm mới</button>
          </section>

          <section className="admin-category-stats">
            <article><span><Layers3 size={18} /></span><div><strong>{stats.total}</strong><small>Tổng danh mục</small></div></article>
            <article><span className="featured"><Star size={18} /></span><div><strong>{stats.featured}</strong><small>Đang nổi bật</small></div></article>
            <article><span className="active"><Package size={18} /></span><div><strong>{stats.inUse}</strong><small>Có sản phẩm</small></div></article>
            <article><span className="empty"><FolderOpen size={18} /></span><div><strong>{stats.empty}</strong><small>Danh mục trống</small></div></article>
          </section>

          <section className="admin-categories-panel">
            <div className="admin-categories-toolbar">
              <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mô tả danh mục..." /></label>
              <div role="group" aria-label="Lọc danh mục">
                {[
                  ['all', 'Tất cả'],
                  ['featured', 'Nổi bật'],
                  ['in-use', 'Có sản phẩm'],
                  ['empty', 'Trống'],
                ].map(([value, label]) => <button className={filter === value ? 'active' : ''} type="button" onClick={() => setFilter(value)} key={value}>{label}</button>)}
              </div>
            </div>

            {loading && !categories.length ? (
              <div className="admin-categories-loading"><span /><span /><span /><span /></div>
            ) : visibleCategories.length ? (
              <div className="admin-categories-table-wrap">
                <table className="admin-categories-table">
                  <thead><tr><th>Danh mục</th><th>Mô tả</th><th>Sản phẩm</th><th>Hiển thị</th><th aria-label="Thao tác" /></tr></thead>
                  <tbody>{categoryPagination.pageItems.map((category, index) => {
                    const color = categoryColors[(categoryPagination.page * 10 + index) % categoryColors.length];
                    const count = productCounts[category.id] || 0;
                    return (
                      <tr key={category.id}>
                        <td><div className="admin-category-name"><span style={color}><Tags size={17} /></span><div><strong>{category.name}</strong><small>Danh mục #{category.id}</small></div></div></td>
                        <td><p className="admin-category-description">{category.description || 'Chưa có mô tả cho danh mục này.'}</p></td>
                        <td><Link className={`admin-category-count ${count ? '' : 'empty'}`} to="/admin/products"><Package size={13} /> {count} sản phẩm</Link></td>
                        <td>{category.featured ? <span className="admin-category-featured"><Sparkles size={12} /> Nổi bật</span> : <span className="admin-category-normal">Thông thường</span>}</td>
                        <td><div className="admin-category-actions"><button type="button" title="Chỉnh sửa" disabled={busyId === category.id} onClick={() => openEditForm(category)}><Edit3 size={15} /></button><button className="delete-category" type="button" title="Xóa danh mục" disabled={busyId === category.id} onClick={() => handleDelete(category)}><Trash2 size={15} /></button></div></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : (
              <div className="admin-categories-empty"><span><Tags size={28} /></span><h3>Không tìm thấy danh mục</h3><p>Thay đổi từ khóa, bộ lọc hoặc tạo danh mục mới.</p><button type="button" onClick={openCreateForm}><Plus size={15} /> Thêm danh mục</button></div>
            )}

            <Pagination {...categoryPagination} onPageChange={categoryPagination.setPage} label="danh mục" />
          </section>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button className="admin-category-drawer-overlay" type="button" aria-label="Đóng form" onClick={resetForm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="admin-category-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.22 }}>
              <header><div><span>{editingId ? `Danh mục #${editingId}` : 'Danh mục mới'}</span><h2>{editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}</h2></div><button type="button" onClick={resetForm} title="Đóng"><X size={18} /></button></header>
              <form onSubmit={handleSubmit}>
                <label>Tên danh mục<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={100} placeholder="Ví dụ: Điện thoại" required /></label>
                <label>Mô tả<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} maxLength={500} placeholder="Mô tả ngắn về nhóm sản phẩm" /><small>{form.description.length}/500 ký tự</small></label>
                <label className="admin-category-featured-control"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /><span><strong>Danh mục nổi bật</strong><small>Hiển thị danh mục tại khu vực khám phá trên trang chủ.</small></span></label>
                <section className="admin-category-preview"><span>Xem trước</span><div><i><Tags size={19} /></i><div><strong>{form.name.trim() || 'Tên danh mục'}</strong><small>{form.description.trim() || 'Mô tả danh mục sẽ hiển thị tại đây.'}</small></div>{form.featured && <Sparkles size={15} />}</div></section>
                <footer><button type="button" onClick={resetForm}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo danh mục'}</button></footer>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{message && <motion.div className={`admin-categories-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
