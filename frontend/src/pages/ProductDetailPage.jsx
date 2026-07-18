import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Heart,
  ImagePlus,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react';
import api, { assetUrl } from '../api';
import { formatVnd as currency } from '../utils/currency';
import './ProductDetailPage.css';

const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const colorSwatch = (name) => {
  const key = String(name || '').trim().toLowerCase();
  const colors = {
    'đen': '#111827', black: '#111827', 'trắng': '#ffffff', white: '#ffffff',
    'xanh': '#2563eb', blue: '#2563eb', 'xanh lá': '#16a34a', green: '#16a34a',
    'đỏ': '#dc2626', red: '#dc2626', 'vàng': '#eab308', yellow: '#eab308',
    'tím': '#7c3aed', purple: '#7c3aed', 'hồng': '#ec4899', pink: '#ec4899',
    'xám': '#64748b', gray: '#64748b', grey: '#64748b', 'bạc': '#cbd5e1', silver: '#cbd5e1',
    'vàng gold': '#d4a72c', gold: '#d4a72c', 'cam': '#ea580c', orange: '#ea580c',
  };
  return colors[key] || '#cbd5e1';
};

function RatingStars({ value, size = 17 }) {
  const rating = Number(value || 0);
  return (
    <span className="detail-stars" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} fill={index < Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export default function ProductDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const canModerate = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImage, setActiveImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewImage, setReviewImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const result = await api(`/api/products/${id}`);
      setProduct(result.data);
      setActiveImage(result.data?.imageUrl || result.data?.imageUrls?.[0] || '');
      setSelectedColor(result.data?.colors?.[0] || '');
      setQuantity(1);
      if (result.data?.categoryId) {
        try {
          const relatedResult = await api(`/api/products?categoryId=${result.data.categoryId}&page=0&size=8`);
          setRelatedProducts((relatedResult.data?.content || []).filter((item) => Number(item.id) !== Number(id)).slice(0, 4));
        } catch {
          setRelatedProducts([]);
        }
      } else {
        setRelatedProducts([]);
      }
    } catch (error) {
      showMessage(error?.message || 'Không tải được sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const path = canModerate
        ? `/api/products/${id}/reviews/admin?page=0&size=3`
        : `/api/products/${id}/reviews?page=0&size=3`;
      const result = await api(path);
      setReviews(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được đánh giá');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    try {
      const params = new URLSearchParams({ quantity: String(quantity) });
      if (selectedColor) params.set('selectedColor', selectedColor);
      await api(`/api/cart/add/${id}?${params.toString()}`, { method: 'POST' });
      showMessage('Đã thêm sản phẩm vào giỏ hàng');
      window.setTimeout(() => navigate('/cart'), 450);
    } catch (error) {
      showMessage(error?.message || 'Không thêm được sản phẩm vào giỏ hàng');
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để lưu sản phẩm yêu thích');
      return;
    }
    try {
      await api(`/api/products/${id}/like`, { method: 'POST' });
      showMessage('Đã cập nhật danh sách yêu thích');
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật yêu thích');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      showMessage('Vui lòng đăng nhập để nhận xét');
      return;
    }

    try {
      await api(`/api/products/${id}/reviews`, { method: 'POST', body: reviewForm });
      if (reviewImage) {
        const formData = new FormData();
        formData.append('file', reviewImage);
        await api(`/api/products/${id}/reviews/image`, { method: 'POST', body: formData });
      }
      showMessage('Đã gửi đánh giá');
      setReviewForm({ rating: 5, comment: '' });
      setReviewImage(null);
      loadReviews();
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Không gửi được đánh giá');
    }
  };

  const setReviewHidden = async (reviewId, hidden) => {
    try {
      await api(`/api/products/reviews/${reviewId}/hidden?hidden=${hidden}`, { method: 'PUT' });
      showMessage(hidden ? 'Đã ẩn đánh giá' : 'Đã hiện đánh giá');
      loadReviews();
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được đánh giá');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await api(`/api/products/reviews/${reviewId}`, { method: 'DELETE' });
      showMessage('Đã xóa đánh giá');
      loadReviews();
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Không xóa được đánh giá');
    }
  };

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [id, canModerate]);

  if (loading && !product) {
    return (
      <main className="product-detail-page">
        <div className="detail-skeleton"><span /><span /></div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-detail-page">
        <section className="detail-not-found">
          <ShoppingBag size={38} />
          <h1>Không tìm thấy sản phẩm</h1>
          <Link to="/">Quay lại cửa hàng</Link>
        </section>
      </main>
    );
  }

  const stock = Number(product.stockQuantity || 0);
  const rating = Number(product.averageRating || 0);
  const galleryImages = [...new Set([product.imageUrl, ...(product.imageUrls || [])].filter(Boolean))];

  return (
    <main className="product-detail-page antialiased">
      <div className="detail-container">
        <nav className="detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/"><ArrowLeft size={16} /> Cửa hàng</Link>
          <span>/</span>
          <span>{product.categoryName || 'Sản phẩm'}</span>
          <span>/</span>
          <strong>{product.name}</strong>
        </nav>

        <motion.section className="product-overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="product-gallery">
            <div className="main-product-image">
              {activeImage ? (
                <img src={assetUrl(activeImage)} alt={product.name} />
              ) : (
                <ShoppingBag size={72} />
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="product-thumbnails" aria-label="Ảnh sản phẩm">
                {galleryImages.map((imageUrl, index) => (
                  <button className={activeImage === imageUrl ? 'active' : ''} type="button" onClick={() => setActiveImage(imageUrl)} key={imageUrl} aria-label={`Xem ảnh ${index + 1}`}>
                    <img src={assetUrl(imageUrl)} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-purchase-info">
            <span className="detail-category">{product.categoryName || 'Sản phẩm'}</span>
            <h1>{product.name}</h1>
            <div className="detail-rating-row">
              <RatingStars value={rating} />
              <strong>{rating.toFixed(1)}</strong>
              <span>{product.reviewCount || 0} đánh giá</span>
              <span className="rating-divider" />
              <span>{product.likeCount || 0} lượt thích</span>
            </div>
            <strong className="detail-price">{currency(product.price)}</strong>
            <p className="detail-description">{product.description || 'Sản phẩm chính hãng với chất lượng được tuyển chọn.'}</p>

            {(product.brand || Number(product.warrantyMonths) > 0) && (
              <div className="product-attributes">
                {product.brand && <div><span>Thương hiệu</span><strong>{product.brand}</strong></div>}
                {Number(product.warrantyMonths) > 0 && <div><span>Bảo hành</span><strong>{product.warrantyMonths} tháng</strong></div>}
              </div>
            )}

            {product.colors?.length > 0 && (
              <div className="product-color-picker">
                <div><span>Màu sắc</span><strong>{selectedColor}</strong></div>
                <div>{product.colors.map((color) => <button className={selectedColor === color ? 'selected' : ''} type="button" key={color} onClick={() => setSelectedColor(color)}><i style={{ backgroundColor: colorSwatch(color) }} /> {color}{selectedColor === color && <Check size={13} />}</button>)}</div>
              </div>
            )}

            <div className={`stock-status ${stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {stock > 0 ? <Check size={16} /> : <PackageCheck size={16} />}
              {stock > 0 ? `Còn hàng · ${stock} sản phẩm` : 'Tạm hết hàng'}
            </div>

            <div className="purchase-controls">
              <div className="quantity-control" aria-label="Số lượng">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng">
                  <Minus size={17} />
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(Math.max(stock, 1), value + 1))} aria-label="Tăng số lượng">
                  <Plus size={17} />
                </button>
              </div>
              <button className="detail-cart-button" type="button" onClick={handleAddToCart} disabled={stock <= 0}>
                <ShoppingBag size={19} /> Thêm vào giỏ hàng
              </button>
              <button
                className={`detail-like-button ${product.isLikedByCurrentUser ? 'liked' : ''}`}
                type="button"
                onClick={handleToggleLike}
                aria-label={product.isLikedByCurrentUser ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                title={product.isLikedByCurrentUser ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
              >
                <Heart size={20} fill={product.isLikedByCurrentUser ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="purchase-benefits">
              <div><Truck size={20} /><span><strong>Giao hàng nhanh</strong><small>Theo dõi đơn hàng dễ dàng</small></span></div>
              <div><ShieldCheck size={20} /><span><strong>Mua sắm an tâm</strong><small>Sản phẩm chính hãng</small></span></div>
              <div><PackageCheck size={20} /><span><strong>Đổi trả thuận tiện</strong><small>Hỗ trợ sau mua hàng</small></span></div>
            </div>
          </div>
        </motion.section>

        <section className="product-reviews-section">
          <div className="reviews-heading">
            <div>
              <span className="detail-category">Đánh giá khách hàng</span>
              <h2>Trải nghiệm từ người mua</h2>
            </div>
            <div className="review-heading-actions">
              {canModerate && <span className="moderator-badge">Chế độ kiểm duyệt</span>}
              {Number(product.reviewCount || 0) > 0 && <Link className="review-see-all" to={`/products/${id}/reviews`}>Xem tất cả đánh giá</Link>}
            </div>
          </div>

          <div className="reviews-layout">
            <aside className="review-summary">
              <strong>{rating.toFixed(1)}</strong>
              <RatingStars value={rating} size={20} />
              <span>Dựa trên {product.reviewCount || 0} đánh giá</span>
            </aside>

            <div className="review-content">
              {user ? (
                <form onSubmit={handleReviewSubmit} className="detail-review-form">
                  <div className="review-form-heading">
                    <div>
                      <h3>Viết đánh giá</h3>
                      <p>Chia sẻ trải nghiệm của bạn về sản phẩm.</p>
                    </div>
                    <label className="review-rating-select">
                      <Star size={17} fill="currentColor" />
                      <select
                        value={reviewForm.rating}
                        aria-label="Số sao đánh giá"
                        onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                      >
                        {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} sao</option>)}
                      </select>
                    </label>
                  </div>
                  <textarea
                    value={reviewForm.comment}
                    placeholder="Sản phẩm này mang lại trải nghiệm như thế nào?"
                    aria-label="Nội dung đánh giá"
                    required
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                  />
                  <div className="review-form-actions">
                    <label className="review-upload-button">
                      <ImagePlus size={17} />
                      <span>{reviewImage ? reviewImage.name : 'Thêm hình ảnh'}</span>
                      <input type="file" accept="image/*" onChange={(event) => setReviewImage(event.target.files?.[0] || null)} />
                    </label>
                    <button type="submit">Gửi đánh giá</button>
                  </div>
                </form>
              ) : (
                <div className="review-login-prompt">
                  <UserRound size={28} />
                  <div><strong>Đăng nhập để đánh giá</strong><span>Chia sẻ trải nghiệm sau khi mua hàng.</span></div>
                  <Link to="/login">Đăng nhập</Link>
                </div>
              )}

              <div className="detail-review-list">
                {reviews.length ? reviews.map((review) => (
                  <article className={`detail-review-card ${review.hidden ? 'is-hidden' : ''}`} key={review.id}>
                    <div className="review-author-row">
                      <span className="review-avatar"><UserRound size={18} /></span>
                      <div>
                        <strong>{review.fullName || review.username}</strong>
                        <small>{formatDate(review.createdAt)}</small>
                      </div>
                      <RatingStars value={review.rating} size={15} />
                    </div>
                    <p>{review.comment}</p>
                    {review.imageUrl && <img className="detail-review-image" src={assetUrl(review.imageUrl)} alt="Ảnh đánh giá" />}
                    {canModerate && (
                      <div className="moderation-actions">
                        <span>{review.hidden ? 'Đang ẩn' : 'Đang hiển thị'}</span>
                        <button type="button" onClick={() => setReviewHidden(review.id, !review.hidden)}>
                          {review.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                          {review.hidden ? 'Hiện' : 'Ẩn'}
                        </button>
                        <button className="delete-review-button" type="button" onClick={() => deleteReview(review.id)}>
                          <Trash2 size={15} /> Xóa
                        </button>
                      </div>
                    )}
                  </article>
                )) : (
                  <div className="no-reviews"><Star size={28} /><strong>Chưa có đánh giá</strong><span>Hãy là người đầu tiên chia sẻ trải nghiệm.</span></div>
                )}
              </div>
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products-section">
            <div className="related-products-heading"><div><span className="detail-category">Có thể bạn cũng thích</span><h2>Sản phẩm liên quan</h2></div><Link to={`/?categoryId=${product.categoryId}`}>Xem thêm</Link></div>
            <div className="related-products-grid">
              {relatedProducts.map((item) => (
                <Link className="related-product-card" to={`/products/${item.id}`} key={item.id}>
                  <span>{item.imageUrl ? <img src={assetUrl(item.imageUrl)} alt={item.name} /> : <ShoppingBag size={34} />}</span>
                  <div><small>{item.categoryName}</small><strong>{item.name}</strong><p><Star size={13} fill="currentColor" /> {Number(item.averageRating || 0).toFixed(1)} · {item.salesCount || 0} đã bán</p><b>{currency(item.price)}</b></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className="detail-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Check size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
