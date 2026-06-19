import { useEffect, useState } from 'react';
import api, { assetUrl } from '../api';

const initialForm = {
  quantityChange: 1,
  movementType: 'RESTOCK',
  reason: '',
  note: '',
};

export default function AdminInventoryPage({ user }) {
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [lowStock, setLowStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [threshold, setThreshold] = useState(10);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadLowStock = async () => {
    try {
      const result = await api(`/api/inventory/low-stock?threshold=${threshold}&page=0&size=50`);
      setLowStock(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load low stock products');
    }
  };

  const loadProducts = async () => {
    try {
      const query = new URLSearchParams({ page: '0', size: '100', sort: 'latest' });
      if (productSearch.trim()) query.set('keyword', productSearch.trim());
      const result = await api(`/api/products?${query.toString()}`);
      setProducts(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load products');
    }
  };

  const loadMovements = async (productId = selectedProductId) => {
    try {
      const query = productId ? `?productId=${productId}&page=0&size=30` : '?page=0&size=30';
      const result = await api(`/api/inventory/movements${query}`);
      setMovements(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load stock history');
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId);
    const product = products.find((item) => item.id === productId) || lowStock.find((item) => item.productId === productId);
    setSelectedProduct(product || null);
    loadMovements(productId);
  };

  const handleAdjust = async (event) => {
    event.preventDefault();
    if (!selectedProductId) {
      showMessage('Chon san pham truoc');
      return;
    }

    try {
      await api(`/api/inventory/adjust/${selectedProductId}`, {
        method: 'POST',
        body: {
          quantityChange: Number(form.quantityChange),
          movementType: form.movementType,
          reason: form.reason,
          note: form.note,
        },
      });
      showMessage('Dieu chinh stock thanh cong');
      setForm(initialForm);
      loadProducts();
      loadLowStock();
      loadMovements(selectedProductId);
    } catch (error) {
      showMessage(error?.message || 'Cannot adjust stock');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadProducts();
      loadLowStock();
      loadMovements();
    }
  }, [user, threshold]);

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Inventory</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split wide-split">
        <aside className="sidebar">
          <h2>Inventory</h2>
          <div className="search-group inventory-search">
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Search product"
            />
            <button className="small" onClick={loadProducts}>Search</button>
          </div>
          <h3>All Products</h3>
          <div className="table-list inventory-product-list">
            {products.map((product) => (
              <article
                className={`card compact-card ${selectedProductId === product.id ? 'selected-card' : ''}`}
                key={product.id}
                onClick={() => handleSelectProduct(product.id)}
              >
                <div className="card-header">
                  <h3>{product.name}</h3>
                  <span className="tag">{product.stockQuantity}</span>
                </div>
                <p>{product.categoryName}</p>
                <small className="muted">
                  {product.price?.toLocaleString?.('vi-VN', { style: 'currency', currency: 'VND' }) || product.price}
                </small>
              </article>
            ))}
            {!products.length && <p>No products found.</p>}
          </div>

          <h3>Low Stock Alerts</h3>
          <label>
            Low stock threshold
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            />
          </label>
          <div className="table-list">
            {lowStock.map((product) => (
              <article
                className={`card compact-card ${selectedProductId === product.productId ? 'selected-card' : ''}`}
                key={product.productId}
                onClick={() => handleSelectProduct(product.productId)}
              >
                <div className="card-header">
                  <h3>{product.productName}</h3>
                  <span className="tag">{product.stockQuantity}</span>
                </div>
                {product.imageUrl && <img className="admin-thumb" src={assetUrl(product.imageUrl)} alt={product.productName} />}
                <p>{product.categoryName}</p>
                <p>{product.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
              </article>
            ))}
            {!lowStock.length && <p>No low-stock products.</p>}
          </div>
        </aside>

        <div>
          <div className="panel nested-panel">
            <h3>Adjust Stock</h3>
            {selectedProduct ? (
              <div className="selected-stock-summary">
                <strong>{selectedProduct.name || selectedProduct.productName}</strong>
                <span>Current stock: {selectedProduct.stockQuantity}</span>
              </div>
            ) : (
              <p className="muted">Select a product to update stock.</p>
            )}
            <form onSubmit={handleAdjust} className="form-grid">
              <label>
                Change quantity
                <input
                  type="number"
                  value={form.quantityChange}
                  onChange={(event) => setForm((prev) => ({ ...prev, quantityChange: event.target.value }))}
                />
              </label>
              <label>
                Movement type
                <select
                  value={form.movementType}
                  onChange={(event) => setForm((prev) => ({ ...prev, movementType: event.target.value }))}
                >
                  <option value="RESTOCK">RESTOCK</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                  <option value="DAMAGE">DAMAGE</option>
                  <option value="RETURN">RETURN</option>
                </select>
              </label>
              <label>
                Reason
                <input value={form.reason} onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))} />
              </label>
              <label>
                Note
                <textarea value={form.note} onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
              </label>
              <button type="submit" disabled={!selectedProductId}>
                Save stock movement
              </button>
            </form>
          </div>

          <div className="panel nested-panel">
            <h3>Recent Movements</h3>
            {movements.length ? (
              <div className="table-list">
                {movements.map((movement) => (
                  <article className="card compact-card" key={movement.id}>
                    <div className="card-header">
                      <strong>{movement.productName}</strong>
                      <span className="tag">{movement.movementType}</span>
                    </div>
                    <p>
                      {movement.previousQuantity} {'->'} {movement.newQuantity} ({movement.quantityChange > 0 ? '+' : ''}
                      {movement.quantityChange})
                    </p>
                    <p>{movement.reason || 'No reason'}</p>
                    <small className="muted">
                      {movement.performedBy || 'system'} - {movement.createdAt ? new Date(movement.createdAt).toLocaleString() : ''}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p>No movements yet.</p>
            )}
          </div>

          {message && <div className="message">{message}</div>}
        </div>
      </section>
    </main>
  );
}
