import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ImageOff,
  ImagePlus,
  Moon,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import api, { assetUrl } from '../../api';
import { formatVnd as currency } from '../../utils/currency';
import './AdminProductsPage.css';

const initialProduct = {
  name: '',
  description: '',
  price: '',
  costPrice: '',
  stockQuantity: 0,
  categoryId: '',
  imageUrl: '',
  brand: '',
  warrantyMonths: 12,
  colors: '',
  variants: [],
  featured: false,
};

const createVariant = (source = {}) => ({
  id: source.id || null,
  sku: source.sku || '',
  name: source.name || '',
  color: source.attributes?.['Màu sắc'] || source.attributes?.color || '',
  capacity: source.attributes?.['Dung lượng'] || '',
  size: source.attributes?.['Kích thước'] || '',
  price: source.price ?? '',
  costPrice: source.costPrice ?? '',
  stockQuantity: source.stockQuantity ?? 0,
  imageUrl: source.imageUrl || '',
  active: source.active !== false,
});

export default function AdminProductsPage({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('categoryId') || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialProduct);
  const [formImage, setFormImage] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(categoryParam);
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const selectedCategoryExists = useMemo(
    () => categories.some((category) => category.id === Number(form.categoryId)),
    [categories, form.categoryId]
  );

  const previewUrl = useMemo(() => {
    if (formImage) return URL.createObjectURL(formImage);
    return form.imageUrl ? assetUrl(form.imageUrl) : '';
  }, [formImage, form.imageUrl]);

  const pageStats = useMemo(() => ({
    lowStock: products.filter((product) => Number(product.stockQuantity || 0) <= 5).length,
    featured: products.filter((product) => product.featured).length,
    outOfStock: products.filter((product) => Number(product.stockQuantity || 0) === 0).length,
  }), [products]);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh mục.', 'error');
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ page: String(page), size: '12', sort });
      if (appliedSearch) query.set('keyword', appliedSearch);
      if (categoryFilter) query.set('categoryId', categoryFilter);
      const result = await api(`/api/products?${query.toString()}`);
      const pageData = result.data || {};
      setProducts(Array.isArray(pageData.content) ? pageData.content : []);
      setTotalPages(Number(pageData.totalPages || 0));
      setTotalElements(Number(pageData.totalElements || 0));
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách sản phẩm.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const resetForm = () => {
    setForm(initialProduct);
    setFormImage(null);
    setGalleryFiles([]);
    setGalleryImages([]);
    setEditingId(null);
    setDrawerOpen(false);
  };

  const openCreateForm = () => {
    setForm(initialProduct);
    setFormImage(null);
    setGalleryFiles([]);
    setGalleryImages([]);
    setEditingId(null);
    setDrawerOpen(true);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormImage(null);
    setGalleryFiles([]);
    setGalleryImages(product.imageUrls || []);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      costPrice: product.costPrice ?? '',
      stockQuantity: product.stockQuantity || 0,
      categoryId: product.categoryId || '',
      imageUrl: product.imageUrl || '',
      brand: product.brand || '',
      warrantyMonths: product.warrantyMonths ?? 0,
      colors: (product.colors || []).join(', '),
      variants: (product.variants || []).map(createVariant),
      featured: product.featured === true,
    });
    setDrawerOpen(true);
  };

  const buildPayload = () => {
    const variants = form.variants.map((variant) => ({
      id: variant.id || null,
      sku: variant.sku.trim(),
      name: variant.name.trim() || null,
      attributes: Object.fromEntries([
        ['Màu sắc', variant.color.trim()],
        ['Dung lượng', variant.capacity.trim()],
        ['Kích thước', variant.size.trim()],
      ].filter(([, value]) => value)),
      price: Number(variant.price),
      costPrice: Number(variant.costPrice),
      stockQuantity: Number(variant.stockQuantity),
      imageUrl: variant.imageUrl.trim() || null,
      active: variant.active,
    }));
    const activeVariants = variants.filter((variant) => variant.active);
    const variantPrices = activeVariants.map((variant) => variant.price).filter((value) => Number.isFinite(value) && value > 0);
    const variantCosts = activeVariants.map((variant) => variant.costPrice).filter(Number.isFinite);

    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price: variantPrices.length ? Math.min(...variantPrices) : Number(form.price),
      costPrice: variantCosts.length ? Math.min(...variantCosts) : Number(form.costPrice),
      stockQuantity: activeVariants.length
        ? activeVariants.reduce((sum, variant) => sum + variant.stockQuantity, 0)
        : Number(form.stockQuantity),
      categoryId: Number(form.categoryId),
      imageUrl: form.imageUrl.trim() || null,
      brand: form.brand.trim() || null,
      warrantyMonths: Number(form.warrantyMonths || 0),
      colors: activeVariants.length
        ? [...new Set(activeVariants.map((variant) => variant.attributes['Màu sắc']).filter(Boolean))]
        : form.colors.split(',').map((color) => color.trim()).filter(Boolean),
      variants,
      featured: form.featured,
    };
  };

  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...current.variants, createVariant({
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      price: current.price,
      costPrice: current.costPrice,
    })],
  }));

  const updateVariant = (index, field, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, [field]: value } : variant
    )),
  }));

  const removeVariant = (index) => setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
  }));

  const uploadFile = async (productId, file) => {
    const data = new FormData();
    data.append('file', file);
    await api(`/api/products/${productId}/image`, { method: 'POST', body: data });
  };

  const uploadGalleryFiles = async (productId, files) => {
    if (!files.length) return;
    const data = new FormData();
    files.forEach((file) => data.append('files', file));
    await api(`/api/products/${productId}/images`, { method: 'POST', body: data });
  };

  const removeGalleryImage = async (imageUrl) => {
    if (!editingId) return;
    try {
      const params = new URLSearchParams({ imageUrl });
      await api(`/api/products/${editingId}/images?${params.toString()}`, { method: 'DELETE' });
      setGalleryImages((current) => current.filter((url) => url !== imageUrl));
      showMessage('Đã xóa ảnh khỏi gallery.');
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa ảnh gallery.', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCategoryExists) {
      showMessage('Vui lòng chọn danh mục hợp lệ.', 'error');
      return;
    }
    try {
      setSaving(true);
      const result = editingId
        ? await api(`/api/products/${editingId}`, { method: 'PUT', body: buildPayload() })
        : await api('/api/products', { method: 'POST', body: buildPayload() });
      const productId = editingId || result.data?.id;
      if (formImage && productId) await uploadFile(productId, formImage);
      if (galleryFiles.length && productId) await uploadGalleryFiles(productId, galleryFiles);
      showMessage(editingId ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm mới.');
      resetForm();
      await loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Không thể lưu sản phẩm.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Ngừng kinh doanh sản phẩm "${product.name}"?`)) return;
    try {
      setBusyId(product.id);
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      showMessage('Đã ngừng kinh doanh sản phẩm.');
      if (products.length === 1 && page > 0) setPage((current) => current - 1);
      else await loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa sản phẩm.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const uploadRowImage = async (productId, file) => {
    if (!file) return;
    try {
      setBusyId(productId);
      await uploadFile(productId, file);
      showMessage('Đã cập nhật ảnh sản phẩm.');
      await loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Không thể tải ảnh lên.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const deleteImage = async (product) => {
    if (!window.confirm(`Xóa ảnh của "${product.name}"?`)) return;
    try {
      setBusyId(product.id);
      await api(`/api/products/${product.id}/image`, { method: 'DELETE' });
      showMessage('Đã xóa ảnh sản phẩm.');
      await loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa ảnh.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(0);
    setAppliedSearch(search.trim());
  };

  const selectCategory = (categoryId) => {
    setCategoryFilter(categoryId);
    setPage(0);
    setSearchParams(categoryId ? { categoryId } : {}, { replace: true });
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
    setCategoryFilter(categoryParam);
    setPage(0);
  }, [categoryParam]);

  useEffect(() => {
    if (canManage) loadProducts();
  }, [user, page, appliedSearch, categoryFilter, sort]);

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (!canManage) {
    return <main className="admin-products-access"><section><span><ShoppingBag size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý sản phẩm.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;
  }

  return (
    <main className={`admin-products-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-products-content">
        <header className="admin-products-topbar">
          <div><span>Quản trị / Danh mục</span><h1>Sản phẩm</h1></div>
          <div><button className="admin-product-icon-button" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="admin-add-product" type="button" onClick={openCreateForm}><Plus size={16} /> Thêm sản phẩm</button></div>
        </header>

        <div className="admin-products-inner">
          <section className="admin-products-heading"><div><h2>Quản lý sản phẩm</h2><p>Cập nhật danh mục, giá bán, tồn kho và hình ảnh.</p></div><button type="button" onClick={loadProducts} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-product-spinning' : ''} /> Làm mới</button></section>

          <section className="admin-product-stats">
            <article><span><Boxes size={18} /></span><div><strong>{totalElements}</strong><small>Tổng sản phẩm</small></div></article>
            <article><span className="featured"><Star size={18} /></span><div><strong>{pageStats.featured}</strong><small>Nổi bật trong trang</small></div></article>
            <article><span className="warning"><ShoppingBag size={18} /></span><div><strong>{pageStats.lowStock}</strong><small>Sắp hết hàng</small></div></article>
            <article><span className="danger"><X size={18} /></span><div><strong>{pageStats.outOfStock}</strong><small>Hết hàng</small></div></article>
          </section>

          <section className="admin-products-panel">
            <div className="admin-products-toolbar">
              <form onSubmit={submitSearch}><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên sản phẩm..." /><button type="submit">Tìm</button></form>
              <div><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }}><option value="latest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="priceAsc">Giá tăng dần</option><option value="priceDesc">Giá giảm dần</option><option value="nameAsc">Tên A-Z</option><option value="soldDesc">Bán chạy</option></select></div>
            </div>

            <nav className="admin-product-category-tabs" aria-label="Lọc sản phẩm theo danh mục">
              <button className={!categoryFilter ? 'active' : ''} type="button" onClick={() => selectCategory('')}>Tất cả</button>
              {categories.map((category) => <button className={categoryFilter === String(category.id) ? 'active' : ''} type="button" onClick={() => selectCategory(String(category.id))} key={category.id}>{category.name}</button>)}
            </nav>

            {loading && !products.length ? (
              <div className="admin-products-loading"><span /><span /><span /><span /></div>
            ) : products.length ? (
              <div className="admin-products-table-wrap">
                <table className="admin-products-table">
                  <thead><tr><th>Sản phẩm</th><th>Danh mục</th><th>Giá bán</th><th>Giá vốn</th><th>Tồn kho</th><th>Hiệu suất</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead>
                  <tbody>{products.map((product) => (
                    <tr key={product.id}>
                      <td><div className="admin-product-cell"><span>{product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <ImageOff size={20} />}</span><div><strong>{product.name}</strong><small>#{product.id} · {product.description || 'Chưa có mô tả'}</small></div></div></td>
                      <td><span className="admin-category-tag">{product.categoryName || 'Chưa phân loại'}</span></td>
                      <td><strong className="admin-product-price">{currency(product.price)}</strong></td>
                      <td><div className="admin-product-cost"><strong>{currency(product.costPrice || 0)}</strong><small>{Number(product.price) > 0 ? `${Math.max(0, ((Number(product.price) - Number(product.costPrice || 0)) / Number(product.price)) * 100).toFixed(1)}% biên LN` : '0% biên LN'}</small></div></td>
                      <td><span className={`admin-stock-value ${Number(product.stockQuantity) === 0 ? 'empty' : Number(product.stockQuantity) <= 5 ? 'low' : ''}`}>{product.stockQuantity}</span></td>
                      <td><div className="admin-product-performance"><span><Star size={12} fill="currentColor" /> {Number(product.averageRating || 0).toFixed(1)}</span><small>{product.salesCount || 0} đã bán</small></div></td>
                      <td><div className="admin-product-badges">{product.featured && <span className="is-featured">Nổi bật</span>}<span className={product.active ? 'is-active' : 'is-inactive'}>{product.active ? 'Đang bán' : 'Đã ẩn'}</span></div></td>
                      <td><div className="admin-product-actions"><button type="button" title="Chỉnh sửa" disabled={busyId === product.id} onClick={() => handleEdit(product)}><Edit3 size={15} /></button><label title="Tải ảnh mới"><Upload size={15} /><input type="file" accept="image/*" disabled={busyId === product.id} onChange={(event) => { uploadRowImage(product.id, event.target.files?.[0]); event.target.value = ''; }} /></label>{product.imageUrl && <button type="button" title="Xóa ảnh" disabled={busyId === product.id} onClick={() => deleteImage(product)}><ImageOff size={15} /></button>}<button className="delete-product" type="button" title="Ngừng kinh doanh" disabled={busyId === product.id} onClick={() => deleteProduct(product)}><Trash2 size={15} /></button></div></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : (
              <div className="admin-products-empty"><span><PackagePlus size={28} /></span><h3>Không tìm thấy sản phẩm</h3><p>Thử thay đổi bộ lọc hoặc tạo sản phẩm mới.</p><button type="button" onClick={openCreateForm}><Plus size={15} /> Thêm sản phẩm</button></div>
            )}

            {totalPages > 1 && <nav className="admin-products-pagination" aria-label="Phân trang sản phẩm"><span>Hiển thị {products.length} / {totalElements} sản phẩm</span><div><button type="button" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /></button><span>Trang <strong>{page + 1}</strong> / {totalPages}</span><button type="button" disabled={page >= totalPages - 1 || loading} onClick={() => setPage((current) => current + 1)}><ChevronRight size={16} /></button></div></nav>}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button className="admin-product-drawer-overlay" type="button" aria-label="Đóng form" onClick={resetForm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="admin-product-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}>
              <header><div><span>{editingId ? `Sản phẩm #${editingId}` : 'Sản phẩm mới'}</span><h2>{editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h2></div><button type="button" onClick={resetForm} title="Đóng"><X size={18} /></button></header>
              <form onSubmit={handleSubmit}>
                <label className="admin-product-image-field"><span>Hình ảnh sản phẩm</span><div className="admin-product-image-preview">{previewUrl ? <img src={previewUrl} alt="Xem trước sản phẩm" /> : <ImagePlus size={30} />}</div><input type="file" accept="image/*" onChange={(event) => setFormImage(event.target.files?.[0] || null)} /><small>PNG, JPG hoặc WEBP, tối đa 10 MB.</small></label>
                <div className="admin-product-gallery-field">
                  <span>Gallery ảnh phụ</span>
                  {galleryImages.length > 0 && <div className="admin-product-gallery-list">{galleryImages.map((url) => <div key={url}><img src={assetUrl(url)} alt="Ảnh phụ sản phẩm" /><button type="button" onClick={() => removeGalleryImage(url)} title="Xóa ảnh"><X size={13} /></button></div>)}</div>}
                  <label><ImagePlus size={18} /><span>{galleryFiles.length ? `${galleryFiles.length} ảnh đã chọn` : 'Chọn nhiều ảnh'}</span><input type="file" accept="image/*" multiple onChange={(event) => setGalleryFiles(Array.from(event.target.files || []))} /></label>
                  <small>Tối đa 8 ảnh phụ cho mỗi sản phẩm.</small>
                </div>
                <label>Tên sản phẩm<input value={form.name} onChange={handleChange('name')} minLength={3} maxLength={255} placeholder="Nhập tên sản phẩm" required /></label>
                <div className="admin-product-form-row"><label>Danh mục<select value={form.categoryId} onChange={handleChange('categoryId')} required><option value="">Chọn danh mục</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label><label>Giá bán<input type="number" min="1" step="1" value={form.price} onChange={handleChange('price')} placeholder="0 VND" required /></label></div>
                <div className="admin-product-form-row"><label>Giá vốn<input type="number" min="0" step="1" value={form.costPrice} onChange={handleChange('costPrice')} placeholder="0 VND" required /><small className="admin-field-hint">Giá nhập của một sản phẩm.</small></label><label>Biên lợi nhuận<input value={Number(form.price) > 0 && form.costPrice !== '' ? `${(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1)}%` : '0%'} readOnly /></label></div>
                <div className="admin-product-form-row"><label>Tồn kho<input type="number" min="0" value={form.stockQuantity} onChange={handleChange('stockQuantity')} required /></label><label>URL hình ảnh<input value={form.imageUrl} onChange={handleChange('imageUrl')} placeholder="https://..." /></label></div>
                <div className="admin-product-form-row"><label>Thương hiệu<input value={form.brand} onChange={handleChange('brand')} maxLength={100} placeholder="Apple, Sony..." /></label><label>Bảo hành (tháng)<input type="number" min="0" value={form.warrantyMonths} onChange={handleChange('warrantyMonths')} /></label></div>
                <section className="admin-variant-editor">
                  <div className="admin-variant-heading"><div><strong>Biến thể sản phẩm</strong><small>Mỗi SKU có giá và tồn kho riêng.</small></div><button type="button" onClick={addVariant}><Plus size={14} /> Thêm biến thể</button></div>
                  {form.variants.length ? form.variants.map((variant, index) => (
                    <article className="admin-variant-card" key={variant.id || `new-${index}`}>
                      <header><strong>Biến thể {index + 1}</strong><label><input type="checkbox" checked={variant.active} onChange={(event) => updateVariant(index, 'active', event.target.checked)} /> Đang bán</label><button type="button" onClick={() => removeVariant(index)} title="Bỏ biến thể"><Trash2 size={14} /></button></header>
                      <div className="admin-product-form-row"><label>SKU<input value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} maxLength={100} required /></label><label>Tên hiển thị<input value={variant.name} onChange={(event) => updateVariant(index, 'name', event.target.value)} placeholder="Xanh / 256GB" /></label></div>
                      <div className="admin-variant-attributes"><label>Màu sắc<input value={variant.color} onChange={(event) => updateVariant(index, 'color', event.target.value)} placeholder="Titan xanh" /></label><label>Dung lượng<input value={variant.capacity} onChange={(event) => updateVariant(index, 'capacity', event.target.value)} placeholder="256GB" /></label><label>Kích thước<input value={variant.size} onChange={(event) => updateVariant(index, 'size', event.target.value)} placeholder="M, 42mm..." /></label></div>
                      <div className="admin-variant-numbers"><label>Giá bán<input type="number" min="1" value={variant.price} onChange={(event) => updateVariant(index, 'price', event.target.value)} required /></label><label>Giá vốn<input type="number" min="0" value={variant.costPrice} onChange={(event) => updateVariant(index, 'costPrice', event.target.value)} required /></label><label>Tồn kho<input type="number" min="0" value={variant.stockQuantity} onChange={(event) => updateVariant(index, 'stockQuantity', event.target.value)} required /></label></div>
                      <label>URL ảnh riêng<input value={variant.imageUrl} onChange={(event) => updateVariant(index, 'imageUrl', event.target.value)} placeholder="Để trống sẽ dùng ảnh sản phẩm" /></label>
                    </article>
                  )) : <div className="admin-variant-empty"><Boxes size={20} /><span>Chưa có biến thể. Sản phẩm sẽ dùng giá và tồn kho chung.</span></div>}
                </section>
                {!form.variants.length && <label>Màu sắc cũ<input value={form.colors} onChange={handleChange('colors')} placeholder="Đen, Trắng, Xanh" /><small className="admin-field-hint">Dùng cho sản phẩm chưa có SKU riêng.</small></label>}
                <label>Mô tả<textarea value={form.description} onChange={handleChange('description')} placeholder="Thông tin nổi bật của sản phẩm" /></label>
                <label className="admin-featured-control"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} /><span><strong>Sản phẩm nổi bật</strong><small>Hiển thị sản phẩm ở khu vực nổi bật trên trang chủ.</small></span></label>
                <footer><button type="button" onClick={resetForm}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button></footer>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{message && <motion.div className={`admin-products-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
