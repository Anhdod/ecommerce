import { useEffect, useMemo, useState } from 'react';
import api, { assetUrl } from '../api';

const initialProduct = {
  name: '',
  description: '',
  price: '',
  stockQuantity: 0,
  categoryId: '',
  imageUrl: '',
  featured: false,
};

export default function AdminProductsPage({ user }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialProduct);
  const [editingId, setEditingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const selectedCategoryExists = useMemo(
    () => categories.some((category) => category.id === Number(form.categoryId)),
    [categories, form.categoryId]
  );

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load categories');
    }
  };

  const loadProducts = async () => {
    try {
      const query = new URLSearchParams({ size: '100' });
      if (search) query.set('keyword', search);
      const result = await api(`/api/products?${query.toString()}`);
      setProducts(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load products');
    }
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetForm = () => {
    setForm(initialProduct);
    setEditingId(null);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      stockQuantity: product.stockQuantity || 0,
      categoryId: product.categoryId || '',
      imageUrl: product.imageUrl || '',
      featured: product.featured === true,
    });
  };

  const buildPayload = () => ({
    name: form.name,
    description: form.description,
    price: Number(form.price),
    stockQuantity: Number(form.stockQuantity),
    categoryId: Number(form.categoryId),
    imageUrl: form.imageUrl || null,
    featured: form.featured,
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCategoryExists) {
      showMessage('Select a valid category');
      return;
    }

    try {
      if (editingId) {
        await api(`/api/products/${editingId}`, { method: 'PUT', body: buildPayload() });
        showMessage('Product updated');
      } else {
        await api('/api/products', { method: 'POST', body: buildPayload() });
        showMessage('Product created');
      }
      resetForm();
      loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Cannot save product');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api(`/api/products/${productId}`, { method: 'DELETE' });
      showMessage('Product deleted');
      loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Cannot delete product');
    }
  };

  const uploadImage = async (productId) => {
    const file = selectedFiles[productId];
    if (!file) {
      showMessage('Choose an image first');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api(`/api/products/${productId}/image`, { method: 'POST', body: formData });
      showMessage('Image uploaded');
      setSelectedFiles((prev) => ({ ...prev, [productId]: null }));
      loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Cannot upload image');
    }
  };

  const deleteImage = async (productId) => {
    try {
      await api(`/api/products/${productId}/image`, { method: 'DELETE' });
      showMessage('Image removed');
      loadProducts();
    } catch (error) {
      showMessage(error?.message || 'Cannot remove image');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadCategories();
      loadProducts();
    }
  }, [user]);

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Admin Products</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split wide-split">
        <aside className="sidebar">
          <h2>{editingId ? 'Edit Product' : 'Create Product'}</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Name
              <input value={form.name} onChange={handleChange('name')} minLength={3} required />
            </label>
            <label>
              Category
              <select value={form.categoryId} onChange={handleChange('categoryId')} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <input type="number" min="1" value={form.price} onChange={handleChange('price')} required />
            </label>
            <label>
              Stock
              <input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={handleChange('stockQuantity')}
                required
              />
            </label>
            <label>
              Image URL
              <input value={form.imageUrl} onChange={handleChange('imageUrl')} />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={handleChange('description')} />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
              />
              Featured product
            </label>
            <button type="submit">{editingId ? 'Update product' : 'Create product'}</button>
            {editingId && (
              <button type="button" className="small" onClick={resetForm}>
                Cancel
              </button>
            )}
          </form>
        </aside>

        <div>
          <div className="toolbar">
            <div className="search-group">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
              <button onClick={loadProducts}>Search</button>
            </div>
            <button className="small" onClick={loadProducts}>
              Refresh
            </button>
          </div>

          <div className="table-list">
            {products.map((product) => (
              <article className="card compact-card" key={product.id}>
                <div className="card-header">
                  <div>
                    <h3>{product.name}</h3>
                    <span className="muted">{product.categoryName}</span>
                  </div>
                  <div className="tag-group">
                    {product.featured && <span className="tag success-tag">Featured</span>}
                    <span className="tag">{product.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                {product.imageUrl && <img className="admin-thumb" src={assetUrl(product.imageUrl)} alt={product.name} />}
                <p>{product.description}</p>
                <div className="meta-grid">
                  <span>Price: {product.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                  <span>Stock: {product.stockQuantity}</span>
                  <span>Likes: {product.likeCount || 0}</span>
                  <span>Rating: {product.averageRating?.toFixed?.(1) || 0}</span>
                </div>
                <div className="row-actions">
                  <button className="small" onClick={() => handleEdit(product)}>
                    Edit
                  </button>
                  <button className="small danger" onClick={() => deleteProduct(product.id)}>
                    Delete
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setSelectedFiles((prev) => ({ ...prev, [product.id]: event.target.files?.[0] || null }))
                    }
                  />
                  <button className="small" onClick={() => uploadImage(product.id)}>
                    Upload image
                  </button>
                  <button className="small" onClick={() => deleteImage(product.id)}>
                    Remove image
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
        {message && <div className="message full-row">{message}</div>}
      </section>
    </main>
  );
}
