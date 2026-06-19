import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../api';

const currency = (value) =>
  Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function ProductListPage({ user }) {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState('latest');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (selectedCategory && product.categoryId !== selectedCategory) return false;
      if (minRating && Number(product.averageRating || 0) < Number(minRating)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'ratingDesc') return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      if (sort === 'soldDesc') return Number(b.salesCount || 0) - Number(a.salesCount || 0);
      return 0;
    });
  }, [products, selectedCategory, minRating, sort]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const fetchCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Khong tai duoc danh muc');
    }
  };

  const fetchBanners = async () => {
    try {
      const result = await api('/api/banners/active');
      setBanners(result.data || []);
    } catch {
      setBanners([]);
    }
  };

  const fetchFeatured = async () => {
    try {
      const [categoryResult, productResult] = await Promise.all([
        api('/api/categories/featured'),
        api('/api/products/featured?size=8'),
      ]);
      setFeaturedCategories(categoryResult.data || []);
      setFeaturedProducts(productResult.data?.content || []);
    } catch {
      setFeaturedCategories([]);
      setFeaturedProducts([]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set('keyword', search);
      if (selectedCategory) query.set('categoryId', selectedCategory);
      if (minPrice) query.set('minPrice', minPrice);
      if (maxPrice) query.set('maxPrice', maxPrice);
      if (minRating) query.set('minRating', minRating);
      query.set('sort', sort);
      query.set('size', '100');
      const result = await api(`/api/products?${query.toString()}`);
      setProducts(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Khong tai duoc san pham');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      showMessage('Dang nhap de them san pham vao gio hang');
      return;
    }
    try {
      await api(`/api/cart/add/${productId}?quantity=1`, { method: 'POST' });
      showMessage('Da them vao gio hang');
    } catch (error) {
      showMessage(error?.message || 'Khong them duoc san pham vao gio hang');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchBanners();
    fetchFeatured();
    fetchProducts();
  }, []);

  return (
    <main className="page-shell">
      <section className="panel">
        {banners.length > 0 && (
          <section className="home-banners">
            <div className="hero-banner">
              {banners[0].imageUrl && (
                <img className="hero-banner-image" src={assetUrl(banners[0].imageUrl)} alt={banners[0].title} />
              )}
              <div className="hero-banner-content">
                <h2>{banners[0].title}</h2>
                <p>{banners[0].subtitle}</p>
                {banners[0].linkUrl && (
                  <a className="button" href={banners[0].linkUrl}>
                    Open banner
                  </a>
                )}
              </div>
            </div>
            {banners.length > 1 && (
              <div className="banner-strip">
                {banners.slice(1, 4).map((banner) => (
                  <article className="banner-chip" key={banner.id}>
                    <strong>{banner.title}</strong>
                    <span>{banner.subtitle}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {(featuredCategories.length > 0 || featuredProducts.length > 0) && (
          <section className="featured-home">
            {featuredCategories.length > 0 && (
              <div>
                <h3>Featured Categories</h3>
                <div className="banner-strip">
                  {featuredCategories.map((category) => (
                    <button
                      className={`feature-chip ${selectedCategory === category.id ? 'active' : ''}`}
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <strong>{category.name}</strong>
                      <span>{category.description || 'Browse products'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {featuredProducts.length > 0 && (
              <div>
                <h3>Featured Products</h3>
                <div className="product-grid">
                  {featuredProducts.map((product) => (
                    <div className="card" key={product.id}>
                      <div className="card-header">
                        <h3>{product.name}</h3>
                        <span className="tag success-tag">Featured</span>
                      </div>
                      {product.imageUrl && <img className="product-image" src={assetUrl(product.imageUrl)} alt={product.name} />}
                      <p>
                        <strong>{currency(product.price)}</strong>
                      </p>
                      <div className="card-actions">
                        <Link className="button small" to={`/products/${product.id}`}>
                          Details
                        </Link>
                        <button onClick={() => handleAddToCart(product.id)}>Add to cart</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="toolbar">
          <div className="search-group">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tim kiem san pham..." />
            <button onClick={fetchProducts}>Search</button>
          </div>
          <div className="filter-grid">
            <label>
              Min price
              <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
            </label>
            <label>
              Max price
              <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
            </label>
            <label>
              Min rating
              <select value={minRating} onChange={(event) => setMinRating(event.target.value)}>
                <option value="">All</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </label>
            <label>
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="latest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="priceAsc">Price low to high</option>
                <option value="priceDesc">Price high to low</option>
                <option value="ratingDesc">Top rated</option>
                <option value="soldDesc">Best selling</option>
                <option value="nameAsc">Name A-Z</option>
                <option value="nameDesc">Name Z-A</option>
              </select>
            </label>
            <button onClick={fetchProducts}>Apply filters</button>
            <button
              className="small"
              onClick={() => {
                setSearch('');
                setMinPrice('');
                setMaxPrice('');
                setMinRating('');
                setSort('latest');
                setSelectedCategory(null);
                window.setTimeout(fetchProducts, 0);
              }}
            >
              Reset
            </button>
          </div>
          <div className="button-group">
            <button onClick={fetchProducts}>Refresh Products</button>
            <button onClick={fetchCategories}>Refresh Categories</button>
            {user?.role === 'ADMIN' || user?.role === 'STAFF' ? (
              <Link className="button" to="/admin/products">
                Manage Products
              </Link>
            ) : null}
          </div>
        </div>

        <div className="split">
          <aside className="sidebar">
            <h3>Categories</h3>
            <ul>
              <li className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory(null)}>
                All
              </li>
              {categories.map((category) => (
                <li
                  key={category.id}
                  className={selectedCategory === category.id ? 'active' : ''}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </li>
              ))}
            </ul>
          </aside>

          <section className="product-grid">
            {loading ? (
              <div>Loading products...</div>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => (
                <div className="card" key={product.id}>
                  <div className="card-header">
                    <h3>{product.name}</h3>
                    <span className="tag">{product.categoryName}</span>
                  </div>
                  {product.imageUrl && <img className="product-image" src={assetUrl(product.imageUrl)} alt={product.name} />}
                  <p>{product.description}</p>
                  <p>
                    <strong>{currency(product.price)}</strong>
                  </p>
                  <p>Stock: {product.stockQuantity}</p>
                  <p>Rating: {product.averageRating?.toFixed?.(1) || 0} / 5</p>
                  <p>Sold: {product.salesCount || 0}</p>
                  <div className="card-actions">
                    <Link className="button small" to={`/products/${product.id}`}>
                      Details
                    </Link>
                    <button onClick={() => handleAddToCart(product.id)}>Add to cart</button>
                  </div>
                </div>
              ))
            ) : (
              <div>Khong co san pham nao</div>
            )}
          </section>
        </div>
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
