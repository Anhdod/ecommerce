import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Heart, RefreshCw, ShoppingBag, Star } from 'lucide-react';
import api, { assetUrl } from '../../api';
import Pagination from '../../components/Pagination';
import usePagination from '../../hooks/usePagination';
import { formatVnd as currency } from '../../utils/currency';
import './WishlistPage.css';

export default function WishlistPage({ user }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const wishlistPagination = usePagination(products, 8);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const result = await api('/api/products/wishlist');
      setProducts(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (productId) => {
    try {
      setUpdatingId(productId);
      await api(`/api/products/${productId}/like`, { method: 'POST' });
      setProducts((items) => items.filter((product) => product.id !== productId));
      showMessage('Đã xóa khỏi danh sách yêu thích');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được danh sách yêu thích');
    } finally {
      setUpdatingId(null);
    }
  };

  const addToCart = async (product) => {
    if (product.variants?.length || product.colors?.length) {
      showMessage('Vui lòng chọn phiên bản trên trang chi tiết');
      navigate(`/products/${product.id}`);
      return;
    }
    try {
      setUpdatingId(product.id);
      await api(`/api/cart/add/${product.id}?quantity=1`, { method: 'POST' });
      showMessage('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) {
      showMessage(error?.message || 'Không thêm được sản phẩm vào giỏ hàng');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (user) loadWishlist();
  }, [user]);

  if (!user) {
    return (
      <main className="wishlist-page">
        <section className="wishlist-auth-state">
          <span><Heart size={34} /></span>
          <h1>Lưu lại sản phẩm yêu thích</h1>
          <p>Đăng nhập để đồng bộ danh sách yêu thích của bạn.</p>
          <div><Link to="/login">Đăng nhập</Link><Link to="/">Khám phá sản phẩm</Link></div>
        </section>
      </main>
    );
  }

  return (
    <main className="wishlist-page antialiased">
      <div className="wishlist-container">
        <div className="wishlist-topbar">
          <Link to="/"><ArrowLeft size={16} /> Tiếp tục mua sắm</Link>
          <button type="button" onClick={loadWishlist} disabled={loading}><RefreshCw size={16} className={loading ? 'spinning' : ''} /> Làm mới</button>
        </div>

        <header className="wishlist-heading">
          <div><span>Bộ sưu tập của bạn</span><h1>Sản phẩm yêu thích</h1><p>{products.length} sản phẩm đã lưu</p></div>
          <Heart size={28} fill="currentColor" />
        </header>

        {loading && !products.length ? (
          <div className="wishlist-loading">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div>
        ) : products.length ? (
          <><motion.section className="wishlist-grid" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <AnimatePresence>
              {wishlistPagination.pageItems.map((product) => {
                const rating = Number(product.averageRating || 0);
                const inStock = Number(product.stockQuantity || 0) > 0;
                return (
                  <motion.article
                    className="wishlist-card"
                    key={product.id}
                    layout
                    variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Xem chi tiết ${product.name}`}
                    onClick={() => navigate(`/products/${product.id}`)}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        navigate(`/products/${product.id}`);
                      }
                    }}
                  >
                    <div className="wishlist-card-media">
                      <span>{product.categoryName || 'Sản phẩm'}</span>
                      <button type="button" onClick={(event) => { event.stopPropagation(); toggleLike(product.id); }} disabled={updatingId === product.id} aria-label="Xóa khỏi yêu thích" title="Xóa khỏi yêu thích">
                        <Heart size={18} fill="currentColor" />
                      </button>
                      <div className="wishlist-card-product">
                        {product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <ShoppingBag size={44} />}
                      </div>
                    </div>
                    <div className="wishlist-card-body">
                      <div className="wishlist-rating"><Star size={14} fill="currentColor" /><strong>{rating.toFixed(1)}</strong><span>({product.reviewCount || 0})</span></div>
                      <h3 className="wishlist-product-name">{product.name}</h3>
                      <p>{product.description || 'Sản phẩm chính hãng được tuyển chọn.'}</p>
                      <div className="wishlist-price-row"><strong>{currency(product.price)}</strong><span className={inStock ? 'available' : 'unavailable'}>{inStock ? `Còn ${product.stockQuantity}` : 'Hết hàng'}</span></div>
                      <div className="wishlist-actions" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => addToCart(product)} disabled={!inStock || updatingId === product.id}><ShoppingBag size={16} /> Thêm giỏ hàng</button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.section><Pagination {...wishlistPagination} onPageChange={wishlistPagination.setPage} label="sản phẩm" /></>
        ) : (
          <section className="wishlist-empty-state">
            <span><Heart size={34} /></span>
            <h2>Chưa có sản phẩm yêu thích</h2>
            <p>Nhấn biểu tượng trái tim trên sản phẩm để lưu lại tại đây.</p>
            <Link to="/">Khám phá cửa hàng <ArrowRight size={17} /></Link>
          </section>
        )}
      </div>

      <AnimatePresence>{message && <motion.div className="wishlist-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}><Check size={18} /> {message}</motion.div>}</AnimatePresence>
    </main>
  );
}
