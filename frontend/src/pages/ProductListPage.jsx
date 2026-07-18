import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import api, { assetUrl } from '../api';
import { formatVnd as currency } from '../utils/currency';
import './ProductListPage.css';

const normalize = (value) => String(value || '').toLowerCase();

const categoryCopy = {
  phones: 'Điện thoại mới nhất',
  laptops: 'Laptop cho mọi công việc',
  audio: 'Âm thanh chất lượng cao',
  accessories: 'Phụ kiện thiết yếu',
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function ProductCard({ product, onAddToCart, onToggleWishlist, featured = false }) {
  const rating = Number(product.averageRating || 4.7);

  return (
    <motion.article
      className={`shop-card ${featured ? 'featured-card' : ''}`}
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="shop-card-media">
        {featured && <span className="featured-label"><Sparkles size={13} /> Nổi bật</span>}
        <button
          className="favorite-button"
          aria-label={`Thêm ${product.name} vào yêu thích`}
          title="Thêm vào yêu thích"
          type="button"
          onClick={() => onToggleWishlist(product.id)}
        >
          <Heart size={18} />
        </button>
        <Link to={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
          {product.imageUrl ? (
            <img className="shop-card-image" src={assetUrl(product.imageUrl)} alt={product.name} />
          ) : (
            <div className="image-placeholder"><ShoppingBag size={42} /></div>
          )}
        </Link>
      </div>
      <div className="shop-card-body">
        <div className="product-meta-row">
          <span>{product.categoryName || 'Sản phẩm'}</span>
          <span className="rating-line"><Star size={14} fill="currentColor" /> {rating.toFixed(1)}</span>
        </div>
        <Link className="product-name" to={`/products/${product.id}`}>{product.name}</Link>
        <p className="product-description">{product.description || 'Sản phẩm chính hãng, giao hàng nhanh chóng.'}</p>
        <div className="product-price-row">
          <strong>{currency(product.price)}</strong>
          <small>{Number(product.stockQuantity || 0) > 0 ? `Còn ${product.stockQuantity}` : 'Hết hàng'}</small>
        </div>
        <div className="shop-card-actions">
          <Link className="outline-button" to={`/products/${product.id}`}>Chi tiết</Link>
          <button onClick={() => onAddToCart(product.id)} type="button" disabled={Number(product.stockQuantity || 0) <= 0}>
            <ShoppingBag size={17} /> Thêm giỏ hàng
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default function ProductListPage({ user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [featuredCategories, setFeaturedCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(searchParams.get('keyword') || '');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [sort, setSort] = useState('latest');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const visibleCategories = useMemo(() => {
    const merged = [...featuredCategories, ...categories].filter(
      (category, index, source) => source.findIndex((item) => item.id === category.id) === index
    );
    return merged.slice(0, 5);
  }, [categories, featuredCategories]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (selectedCategory && Number(product.categoryId) !== Number(selectedCategory)) return false;
      if (minRating && Number(product.averageRating || 0) < Number(minRating)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'priceAsc') return Number(a.price || 0) - Number(b.price || 0);
      if (sort === 'priceDesc') return Number(b.price || 0) - Number(a.price || 0);
      if (sort === 'ratingDesc') return Number(b.averageRating || 0) - Number(a.averageRating || 0);
      if (sort === 'soldDesc') return Number(b.salesCount || 0) - Number(a.salesCount || 0);
      if (sort === 'nameAsc') return String(a.name).localeCompare(String(b.name));
      if (sort === 'nameDesc') return String(b.name).localeCompare(String(a.name));
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [products, selectedCategory, minRating, sort]);

  const featuredItems = (featuredProducts.length ? featuredProducts : products).slice(0, 4);
  const heroProduct = featuredItems[0] || products[0];

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const fetchCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh mục');
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

  const fetchProducts = async (keyword = search) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ size: '100' });
      if (keyword) query.set('keyword', keyword);
      if (minPrice) query.set('minPrice', minPrice);
      if (maxPrice) query.set('maxPrice', maxPrice);
      const result = await api(`/api/products?${query.toString()}`);
      setProducts(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId) => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      return;
    }
    const product = [...products, ...featuredProducts].find((item) => Number(item.id) === Number(productId));
    if (product?.colors?.length) {
      navigate(`/products/${productId}`);
      return;
    }
    try {
      await api(`/api/cart/add/${productId}?quantity=1`, { method: 'POST' });
      showMessage('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) {
      showMessage(error?.message || 'Không thể thêm sản phẩm vào giỏ hàng');
    }
  };

  const handleToggleWishlist = async (productId) => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
      return;
    }
    try {
      await api(`/api/products/${productId}/like`, { method: 'POST' });
      showMessage('Đã cập nhật danh sách yêu thích');
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật yêu thích');
    }
  };

  const chooseCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetFilters = () => {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSort('latest');
    setSelectedCategory(null);
    window.setTimeout(() => fetchProducts(''), 0);
  };

  const submitSearch = (event) => {
    event.preventDefault();
    fetchProducts();
    setFiltersOpen(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchFeatured();
  }, []);

  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('categoryId');
    setSearch(keyword);
    setSelectedCategory(categoryId ? Number(categoryId) : null);
    fetchProducts(keyword);
  }, [searchParams]);

  return (
    <main className="shop-page antialiased selection:bg-blue-100 selection:text-blue-900">
      <motion.section className="shop-hero" initial="hidden" animate="visible" variants={fadeUp}>
        <div className="hero-copy">
          <span className="hero-eyebrow"><Sparkles size={15} /> Bộ sưu tập mới</span>
          <h1>Công nghệ tinh tế cho cuộc sống hiện đại.</h1>
          <p>Khám phá thiết bị chính hãng được tuyển chọn, trải nghiệm mua sắm nhanh và dịch vụ bạn có thể tin cậy.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#shop">Mua sắm ngay <ArrowRight size={18} /></a>
            {heroProduct && <Link className="secondary-cta" to={`/products/${heroProduct.id}`}>Xem sản phẩm nổi bật</Link>}
          </div>
          <div className="hero-benefits" aria-label="Store benefits">
            <span><Check size={15} /> Chính hãng</span>
            <span><Check size={15} /> Giao nhanh</span>
            <span><Check size={15} /> Đổi trả dễ dàng</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-product-info">
            <span>Sản phẩm nổi bật</span>
            <strong>{heroProduct?.name || 'Khám phá bộ sưu tập mới'}</strong>
            {heroProduct && <small>{currency(heroProduct.price)}</small>}
          </div>
          {heroProduct?.imageUrl ? (
            <motion.img
              src={assetUrl(heroProduct.imageUrl)}
              alt={heroProduct.name}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            />
          ) : (
            <ShoppingBag className="hero-placeholder" size={120} />
          )}
        </div>
      </motion.section>

      <section className="category-section" id="categories">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">Danh mục</span>
            <h2>Tìm đúng thứ bạn cần</h2>
          </div>
          <a href="#shop">Xem tất cả <ArrowRight size={16} /></a>
        </div>
        <motion.div className="category-grid" initial="hidden" animate="visible">
          {visibleCategories.map((category, index) => {
            const categoryProduct = products.find((product) => Number(product.categoryId) === Number(category.id));
            return (
              <motion.button
                className={selectedCategory === category.id ? 'active' : ''}
                key={category.id}
                variants={fadeUp}
                transition={{ delay: index * 0.06 }}
                onClick={() => chooseCategory(category.id)}
                type="button"
              >
                <span>
                  <small>{categoryCopy[normalize(category.name)] || category.description || 'Khám phá ngay'}</small>
                  <strong>{category.name}</strong>
                  <i><ArrowRight size={16} /></i>
                </span>
                {categoryProduct?.imageUrl && <img src={assetUrl(categoryProduct.imageUrl)} alt="" />}
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      <section className="featured-section">
        <div className="section-title-row">
          <div>
            <span className="section-kicker">Được yêu thích</span>
            <h2>Sản phẩm nổi bật</h2>
          </div>
        </div>
        <motion.div className="featured-products-row" initial="hidden" animate="visible">
          {featuredItems.map((product) => (
            <ProductCard
              featured
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
              onToggleWishlist={handleToggleWishlist}
            />
          ))}
        </motion.div>
      </section>

      <section className="catalog-section" id="shop">
        <div className="catalog-heading">
          <div>
            <span className="section-kicker">Cửa hàng</span>
            <h2>Tất cả sản phẩm</h2>
            <p>{filteredProducts.length} sản phẩm phù hợp</p>
          </div>
          <button className="mobile-filter-button" type="button" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal size={18} /> Bộ lọc
          </button>
        </div>

        <form className="catalog-toolbar" onSubmit={submitSearch}>
          <label className="catalog-search">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trong cửa hàng..." />
          </label>
          <label className="sort-control">
            <span>Sắp xếp</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="latest">Mới nhất</option>
              <option value="priceAsc">Giá thấp đến cao</option>
              <option value="priceDesc">Giá cao đến thấp</option>
              <option value="ratingDesc">Đánh giá cao</option>
              <option value="soldDesc">Bán chạy</option>
              <option value="nameAsc">Tên A-Z</option>
            </select>
            <ChevronDown size={16} />
          </label>
          <button className="apply-button" type="submit">Áp dụng</button>
        </form>

        <div className="catalog-layout">
          <aside className={`catalog-sidebar ${filtersOpen ? 'open' : ''}`}>
            <div className="filter-header">
              <h3>Bộ lọc</h3>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Đóng bộ lọc"><X size={19} /></button>
            </div>
            <div className="filter-group">
              <h4>Danh mục</h4>
              <button className={!selectedCategory ? 'active' : ''} onClick={() => setSelectedCategory(null)} type="button">
                Tất cả <span>{products.length}</span>
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={selectedCategory === category.id ? 'active' : ''}
                  onClick={() => setSelectedCategory(category.id)}
                  type="button"
                >
                  {category.name}
                </button>
              ))}
            </div>
            <div className="filter-group">
              <h4>Khoảng giá</h4>
              <div className="price-pair">
                <label>Thấp nhất<input type="number" min="0" placeholder="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
                <label>Cao nhất<input type="number" min="0" placeholder="50.000.000" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
              </div>
            </div>
            <div className="filter-group">
              <h4>Đánh giá</h4>
              {[4, 3, 2, 1].map((rating) => (
                <button
                  className={`rating-filter ${Number(minRating) === rating ? 'active' : ''}`}
                  key={rating}
                  onClick={() => setMinRating(Number(minRating) === rating ? '' : String(rating))}
                  type="button"
                >
                  <span className="stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill={index < rating ? 'currentColor' : 'none'} />)}</span>
                  <small>từ {rating} sao</small>
                </button>
              ))}
            </div>
            <div className="filter-actions">
              <button className="apply-button" type="button" onClick={() => { fetchProducts(); setFiltersOpen(false); }}>Áp dụng</button>
              <button className="reset-button" type="button" onClick={resetFilters}>Đặt lại</button>
            </div>
          </aside>

          <AnimatePresence mode="wait">
            <motion.div className="catalog-grid" key={`${loading}-${selectedCategory}-${sort}`} initial="hidden" animate="visible">
              {loading ? (
                Array.from({ length: 6 }, (_, index) => <div className="product-skeleton" key={index} />)
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))
              ) : (
                <div className="empty-state">
                  <Search size={34} />
                  <h3>Không tìm thấy sản phẩm</h3>
                  <p>Thử đổi từ khóa hoặc đặt lại bộ lọc.</p>
                  <button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <AnimatePresence>
        {message && (
          <motion.div className="toast-message" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Check size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>
      {filtersOpen && <button className="filter-backdrop" aria-label="Đóng bộ lọc" type="button" onClick={() => setFiltersOpen(false)} />}
    </main>
  );
}
