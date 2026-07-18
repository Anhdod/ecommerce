import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Check,
  History,
  Moon,
  PackageCheck,
  PackageOpen,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
  TriangleAlert,
  Warehouse,
  X,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import api, { assetUrl } from '../api';
import { formatVnd } from '../utils/currency';
import './AdminInventoryPage.css';

const initialForm = { quantityChange: 1, movementType: 'RESTOCK', reason: '', note: '' };
const movementLabels = {
  SALE: 'Bán hàng',
  RETURN: 'Hoàn trả',
  ADJUSTMENT: 'Điều chỉnh',
  RESTOCK: 'Nhập kho',
  DAMAGE: 'Hư hỏng',
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
  : 'Chưa có thời gian';

export default function AdminInventoryPage({ user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [threshold, setThreshold] = useState(10);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
      const query = new URLSearchParams({ page: '0', size: '1000', sort: 'nameAsc' });
      if (appliedSearch) query.set('keyword', appliedSearch);
      if (categoryFilter) query.set('categoryId', categoryFilter);
      const [productsResult, movementsResult] = await Promise.all([
        api(`/api/products?${query.toString()}`),
        api('/api/inventory/movements?page=0&size=30'),
      ]);
      setProducts(Array.isArray(productsResult.data?.content) ? productsResult.data.content : []);
      setMovements(Array.isArray(movementsResult.data?.content) ? movementsResult.data.content : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được dữ liệu kho hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh mục.', 'error');
    }
  };

  const stats = useMemo(() => {
    const totalUnits = products.reduce((sum, product) => sum + Number(product.stockQuantity || 0), 0);
    const outOfStock = products.filter((product) => Number(product.stockQuantity || 0) === 0).length;
    const lowStock = products.filter((product) => Number(product.stockQuantity || 0) > 0 && Number(product.stockQuantity || 0) < threshold).length;
    const healthy = products.filter((product) => Number(product.stockQuantity || 0) >= threshold).length;
    return { totalUnits, outOfStock, lowStock, healthy };
  }, [products, threshold]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const stock = Number(product.stockQuantity || 0);
    if (stockFilter === 'out') return stock === 0;
    if (stockFilter === 'low') return stock > 0 && stock < threshold;
    if (stockFilter === 'healthy') return stock >= threshold;
    return true;
  }), [products, stockFilter, threshold]);

  const loadProductMovements = async (productId) => {
    try {
      const result = await api(`/api/inventory/movements?productId=${productId}&page=0&size=30`);
      setMovements(Array.isArray(result.data?.content) ? result.data.content : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được lịch sử sản phẩm.', 'error');
    }
  };

  const openAdjustment = (product) => {
    setSelectedProduct(product);
    setForm(initialForm);
    setDrawerOpen(true);
    loadProductMovements(product.id);
  };

  const closeAdjustment = () => {
    setDrawerOpen(false);
    setSelectedProduct(null);
    setForm(initialForm);
    loadData();
  };

  const handleAdjust = async (event) => {
    event.preventDefault();
    const quantityChange = Number(form.quantityChange);
    if (!selectedProduct?.id || quantityChange === 0) {
      showMessage('Số lượng thay đổi phải khác 0.', 'error');
      return;
    }
    try {
      setSaving(true);
      const result = await api(`/api/inventory/adjust/${selectedProduct.id}`, {
        method: 'POST',
        body: { ...form, quantityChange, reason: form.reason.trim(), note: form.note.trim() },
      });
      const updatedStock = result.data?.newQuantity ?? Number(selectedProduct.stockQuantity) + quantityChange;
      setSelectedProduct((current) => ({ ...current, stockQuantity: updatedStock }));
      setForm(initialForm);
      showMessage('Đã cập nhật tồn kho.');
      await Promise.all([loadProductMovements(selectedProduct.id), loadData()]);
    } catch (error) {
      showMessage(error?.message || 'Không thể điều chỉnh tồn kho.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setAppliedSearch(search.trim());
  };

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('adminTheme', next);
      return next;
    });
  };

  useEffect(() => {
    if (canManage) loadCategories();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  useEffect(() => {
    if (canManage) loadData();
  }, [user, threshold, appliedSearch, categoryFilter]);

  if (!canManage) {
    return <main className="admin-inventory-access"><section><span><Warehouse size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý kho hàng.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;
  }

  return (
    <main className={`admin-inventory-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-inventory-content">
        <header className="admin-inventory-topbar">
          <div><span>Quản trị / Danh mục</span><h1>Kho hàng</h1></div>
          <div><button className="admin-inventory-icon-button" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></div>
        </header>

        <div className="admin-inventory-inner">
          <section className="admin-inventory-heading"><div><h2>Quản lý tồn kho</h2><p>Theo dõi số lượng và ghi nhận mọi biến động trong kho.</p></div><button type="button" onClick={loadData} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-inventory-spinning' : ''} /> Làm mới</button></section>

          <section className="admin-inventory-stats">
            <article><span><Boxes size={18} /></span><div><strong>{stats.totalUnits}</strong><small>Tổng đơn vị tồn</small></div></article>
            <article><span className="healthy"><PackageCheck size={18} /></span><div><strong>{stats.healthy}</strong><small>Sản phẩm ổn định</small></div></article>
            <article><span className="warning"><TriangleAlert size={18} /></span><div><strong>{stats.lowStock}</strong><small>Tồn kho thấp</small></div></article>
            <article><span className="danger"><PackageOpen size={18} /></span><div><strong>{stats.outOfStock}</strong><small>Đã hết hàng</small></div></article>
          </section>

          <section className="admin-inventory-panel">
            <div className="admin-inventory-toolbar">
              <form onSubmit={submitSearch}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm trong kho..." /><button type="submit">Tìm</button></form>
              <div><label>Ngưỡng thấp<input type="number" min="1" max="999" value={threshold} onChange={(event) => setThreshold(Math.max(1, Number(event.target.value) || 1))} /></label><select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="all">Tất cả tồn kho</option><option value="healthy">Ổn định</option><option value="low">Tồn thấp</option><option value="out">Hết hàng</option></select></div>
            </div>

            <nav className="admin-inventory-category-tabs" aria-label="Lọc kho hàng theo danh mục">
              <button className={!categoryFilter ? 'active' : ''} type="button" onClick={() => setCategoryFilter('')}>Tất cả</button>
              {categories.map((category) => <button className={categoryFilter === String(category.id) ? 'active' : ''} type="button" onClick={() => setCategoryFilter(String(category.id))} key={category.id}>{category.name}</button>)}
            </nav>

            {loading && !products.length ? <div className="admin-inventory-loading"><span /><span /><span /><span /></div> : visibleProducts.length ? (
              <div className="admin-inventory-table-wrap"><table className="admin-inventory-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Tồn hiện tại</th><th>Tình trạng</th><th>Giá trị kho</th><th aria-label="Thao tác" /></tr></thead><tbody>{visibleProducts.map((product) => {
                const stock = Number(product.stockQuantity || 0);
                const status = stock === 0 ? 'out' : stock < threshold ? 'low' : 'healthy';
                return <tr key={product.id}><td><div className="admin-inventory-product"><span>{product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <PackageOpen size={20} />}</span><div><strong>{product.name}</strong><small>Mã sản phẩm #{product.id}</small></div></div></td><td><span className="admin-inventory-category">{product.categoryName || 'Chưa phân loại'}</span></td><td><strong className={`admin-inventory-stock ${status}`}>{stock}</strong></td><td><span className={`admin-inventory-status ${status}`}>{status === 'out' ? 'Hết hàng' : status === 'low' ? 'Sắp hết' : 'Ổn định'}</span></td><td><strong className="admin-inventory-value">{formatVnd(Number(product.price || 0) * stock)}</strong></td><td><button className="admin-adjust-stock" type="button" onClick={() => openAdjustment(product)}><SlidersHorizontal size={14} /> Điều chỉnh</button></td></tr>;
              })}</tbody></table></div>
            ) : <div className="admin-inventory-empty"><span><Warehouse size={28} /></span><h3>Không có sản phẩm phù hợp</h3><p>Thử thay đổi tìm kiếm hoặc bộ lọc tồn kho.</p></div>}
            <footer className="admin-inventory-footer">Hiển thị <strong>{visibleProducts.length}</strong> sản phẩm · Ngưỡng cảnh báo dưới {threshold}</footer>
          </section>

          <section className="admin-movements-section">
            <header><div><h3>Lịch sử biến động</h3><p>{selectedProduct ? `Đang xem ${selectedProduct.name}` : '30 hoạt động kho gần nhất'}</p></div>{selectedProduct && <button type="button" onClick={() => { setSelectedProduct(null); loadData(); }}>Xem tất cả</button>}</header>
            <div className="admin-movements-list">{movements.length ? movements.slice(0, 10).map((movement) => {
              const positive = Number(movement.quantityChange) > 0;
              return <article key={movement.id}><span className={positive ? 'positive' : 'negative'}>{positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><div><strong>{movement.productName}</strong><small>{movementLabels[movement.movementType] || movement.movementType} · {movement.reason || 'Không có lý do'}</small></div><div className="admin-movement-quantity"><strong className={positive ? 'positive' : 'negative'}>{positive ? '+' : ''}{movement.quantityChange}</strong><small>{movement.previousQuantity} → {movement.newQuantity}</small></div><div className="admin-movement-meta"><strong>{movement.performedBy || 'system'}</strong><small>{formatDate(movement.createdAt)}</small></div></article>;
            }) : <div className="admin-movements-empty"><History size={24} /><span>Chưa có biến động kho nào.</span></div>}</div>
          </section>
        </div>
      </div>

      <AnimatePresence>{drawerOpen && selectedProduct && <><motion.button className="admin-inventory-drawer-overlay" type="button" aria-label="Đóng form" onClick={closeAdjustment} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="admin-inventory-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}><header><div><span>Điều chỉnh kho</span><h2>{selectedProduct.name}</h2></div><button type="button" onClick={closeAdjustment}><X size={18} /></button></header><div className="admin-selected-stock"><span>{selectedProduct.imageUrl ? <img src={assetUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} /> : <PackageOpen size={24} />}</span><div><small>Tồn hiện tại</small><strong>{selectedProduct.stockQuantity} sản phẩm</strong></div></div><form onSubmit={handleAdjust}><div className="admin-inventory-form-row"><label>Loại biến động<select value={form.movementType} onChange={(event) => setForm((current) => ({ ...current, movementType: event.target.value }))}><option value="RESTOCK">Nhập kho</option><option value="RETURN">Hoàn trả</option><option value="ADJUSTMENT">Điều chỉnh</option><option value="DAMAGE">Hư hỏng</option></select></label><label>Số lượng thay đổi<input type="number" value={form.quantityChange} onChange={(event) => setForm((current) => ({ ...current, quantityChange: event.target.value }))} required /></label></div><p className="admin-stock-result">Tồn sau điều chỉnh: <strong>{Math.max(0, Number(selectedProduct.stockQuantity) + Number(form.quantityChange || 0))}</strong></p><label>Lý do<input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Ví dụ: Nhập hàng từ nhà cung cấp" /></label><label>Ghi chú<textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Thông tin bổ sung cho lần điều chỉnh" /></label><footer><button type="button" onClick={closeAdjustment}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}</button></footer></form></motion.aside></>}</AnimatePresence>
      <AnimatePresence>{message && <motion.div className={`admin-inventory-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
