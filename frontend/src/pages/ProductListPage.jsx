import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../api';
import './ProductListPage.css';

const currency = (value) => {
  const number = Number(value || 0);
  const displayValue = number > 0 && number < 10000 ? number * 25000 : number;
  return `${displayValue.toLocaleString('vi-VN')} đ`;
};

const categoryVisuals = {
  phones: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80',
  laptops: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
  audio: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80',
};

const normalize = (value) => String(value || '').toLowerCase();

const categoryImage = (category) => categoryVisuals[normalize(category?.name)] || categoryVisuals.audio;

export default function ProductListPage({ user }) {
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

  const visibleFeaturedCategories = useMemo(() => {
    const source = featuredCategories.length ? featuredCategories : categories;
    return source.slice(0, 2);
  }, [categories, featuredCategories]);

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

  const fetchFeatured = async () => {
    try {
      const [categoryResult, productResult] = await Promise.all([
        api('/api/categories/featured'),
        api('/api/products/featured?size=4'),
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

  const resetFilters = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSort('latest');
    setSelectedCategory(null);
    window.setTimeout(fetchProducts, 0);
  };

  useEffect(() => {
    fetchCategories();
    fetchFeatured();
    fetchProducts();
  }, []);

  return (
    <main className="shop-page">
      <section className="category-hero-grid">
        {visibleFeaturedCategories.map((category) => (
          <button
            className={`category-hero-card ${selectedCategory === category.id ? 'active' : ''}`}
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
          >
            <img src={categoryImage(category)} alt={category.name} />
            <span>
              <strong>{category.name}</strong>
              <small>{category.description || 'Explore curated products'}</small>
              <em>Explore -&gt;</em>
            </span>
          </button>
        ))}
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <h2>Featured Products</h2>
          <button className="link-button" onClick={() => window.scrollTo({ top: 640, behavior: 'smooth' })}>
            View all -&gt;
          </button>
        </div>
        <div className="featured-products-row">
          {(featuredProducts.length ? featuredProducts : products.slice(0, 4)).map((product) => (
            <article className="shop-card featured-card" key={product.id}>
              <span className="feature-badge">Featured</span>
              <img className="shop-card-image" src={assetUrl(product.imageUrl)} alt={product.name} />
              <div className="shop-card-body">
                <h3>{product.name}</h3>
                <strong>{currency(product.price)}</strong>
                <p className="rating-line">★ {(product.averageRating || 4.8).toFixed(1)} ({product.reviewCount || 24})</p>
                <div className="shop-card-actions">
                  <Link className="outline-button" to={`/products/${product.id}`}>
                    Details
                  </Link>
                  <button onClick={() => handleAddToCart(product.id)}>Add to cart</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="catalog-layout">
        <aside className="catalog-sidebar">
          <h3>Categories</h3>
          <button className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory(null)}>
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={selectedCategory === category.id ? 'active' : ''}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}

          <div className="sidebar-divider" />
          <h3>Price range</h3>
          <div className="price-pair">
            <input type="number" min="0" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
            <input type="number" min="0" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
          </div>

          <div className="sidebar-divider" />
          <h3>Rating</h3>
          {[4, 3, 2, 1].map((rating) => (
            <button
              className={`rating-filter ${Number(minRating) === rating ? 'active' : ''}`}
              key={rating}
              onClick={() => setMinRating(String(rating))}
            >
              {'★'.repeat(rating)}
              {'☆'.repeat(5 - rating)}
              <span>& up</span>
            </button>
          ))}
        </aside>

        <div className="catalog-main">
          <div className="catalog-toolbar">
            <div className="soft-search">
              <span>⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." />
            </div>
            <label>
              Sort by
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
            <button onClick={fetchProducts}>Apply</button>
            <button className="ghost-button" onClick={resetFilters}>
              Reset
            </button>
          </div>

          <div className="catalog-tabs">
            <button className="active">All Products</button>
            <button>On Sale</button>
            <span>{filteredProducts.length} products found</span>
          </div>

          <div className="catalog-grid">
            {loading ? (
              <div className="empty-state">Loading products...</div>
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => (
                <article className="shop-card compact-product-card" key={product.id}>
                  <div className="image-wrap">
                    <img className="shop-card-image" src={assetUrl(product.imageUrl)} alt={product.name} />
                    <span className="category-pill">{product.categoryName}</span>
                  </div>
                  <div className="shop-card-body">
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <strong>{currency(product.price)}</strong>
                    <small>Stock: {product.stockQuantity}</small>
                    <p className="rating-line">★ {(product.averageRating || 4.7).toFixed(1)} ({product.reviewCount || 18})</p>
                    <div className="shop-card-actions">
                      <Link className="outline-button" to={`/products/${product.id}`}>
                        Details
                      </Link>
                      <button onClick={() => handleAddToCart(product.id)}>Add to cart</button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">Khong co san pham nao</div>
            )}
          </div>
        </div>
      </section>

      {message && <div className="toast-message">{message}</div>}
    </main>
  );
}
