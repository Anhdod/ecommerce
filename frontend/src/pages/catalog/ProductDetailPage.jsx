import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
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
import api, { assetUrl } from '../../api';
import { formatVnd as currency } from '../../utils/currency';
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

const variantColor = (variant) => variant?.attributes?.['Màu sắc'] || variant?.attributes?.color || '';
const variantLabel = (variant) => {
  const attributes = variant?.attributes || {};
  const preferredKeys = ['Màu sắc', 'Dung lượng', 'Kích thước'];
  const values = preferredKeys.map((key) => attributes[key]).filter(Boolean);
  Object.entries(attributes).forEach(([key, value]) => {
    if (!preferredKeys.includes(key) && value) values.push(value);
  });
  return values.join(' · ') || variant?.name || variant?.sku;
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
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewImage, setReviewImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const result = await api(`/api/products/${id}`);
      setProduct(result.data);
      const firstVariant = (result.data?.variants || []).find((variant) => variant.active && Number(variant.stockQuantity) > 0)
        || (result.data?.variants || []).find((variant) => variant.active);
      setSelectedVariantId(firstVariant?.id || null);
      setActiveImage(firstVariant?.imageUrl || result.data?.imageUrl || result.data?.imageUrls?.[0] || '');
      setSelectedColor(firstVariant ? variantColor(firstVariant) : result.data?.colors?.[0] || '');
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

  const handlePurchase = async (intent = 'cart') => {
    if (!user) {
      showMessage('Vui lòng đăng nhập để thêm vào giỏ hàng');
      return;
    }
    if (product.variants?.length && !selectedVariantId) {
      showMessage('Vui lòng chọn phiên bản sản phẩm');
      return;
    }
    if (!product.variants?.length && product.colors?.length && !selectedColor) {
      showMessage('Vui lòng chọn màu sản phẩm');
      return;
    }
    try {
      setSubmitting(true);
      const params = new URLSearchParams({ quantity: String(quantity) });
      if (selectedVariantId) params.set('variantId', String(selectedVariantId));
      else if (selectedColor) params.set('selectedColor', selectedColor);
      const result = await api(`/api/cart/add/${id}?${params.toString()}`, { method: 'POST' });

      if (intent === 'buy') {
        const cartItem = (result.data?.items || []).find((item) => (
          Number(item.productId) === Number(id)
          && (selectedVariantId
            ? Number(item.variantId) === Number(selectedVariantId)
            : String(item.selectedColor || '').toLowerCase() === String(selectedColor || '').toLowerCase())
        ));
        navigate(cartItem ? `/checkout?cartItemIds=${cartItem.cartItemId}` : '/cart');
        return;
      }

      showMessage('Đã thêm sản phẩm vào giỏ hàng');
    } catch (error) {
      showMessage(error?.message || 'Không thêm được sản phẩm vào giỏ hàng');
    } finally {
      setSubmitting(false);
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

  const selectVariantAttribute = (attributeName, value) => {
    const variants = (product?.variants || []).filter((variant) => variant.active);
    const current = variants.find((variant) => Number(variant.id) === Number(selectedVariantId));
    const candidates = variants
      .filter((variant) => variant.attributes?.[attributeName] === value)
      .sort((first, second) => {
        const stockDifference = Number(second.stockQuantity > 0) - Number(first.stockQuantity > 0);
        if (stockDifference) return stockDifference;
        const score = (variant) => Object.entries(current?.attributes || {})
          .filter(([key]) => key !== attributeName)
          .filter(([key, currentValue]) => variant.attributes?.[key] === currentValue).length;
        return score(second) - score(first);
      });
    const nextVariant = candidates[0];
    if (!nextVariant) return;
    setSelectedVariantId(nextVariant.id);
    setSelectedColor(variantColor(nextVariant));
    setQuantity(1);
    if (nextVariant.imageUrl) setActiveImage(nextVariant.imageUrl);
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

  const selectedVariant = (product.variants || []).find((variant) => Number(variant.id) === Number(selectedVariantId));
  const activeVariants = (product.variants || []).filter((variant) => variant.active);
  const attributePriority = ['Màu sắc', 'Dung lượng', 'Kích thước'];
  const attributeNames = [...new Set(activeVariants.flatMap((variant) => Object.keys(variant.attributes || {})))];
  attributeNames.sort((first, second) => {
    const firstIndex = attributePriority.indexOf(first);
    const secondIndex = attributePriority.indexOf(second);
    return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
  });
  const variantAttributeGroups = attributeNames.map((name) => ({
    name,
    values: [...new Set(activeVariants.map((variant) => variant.attributes?.[name]).filter(Boolean))],
  }));
  const stock = Number(selectedVariant?.stockQuantity ?? product.stockQuantity ?? 0);
  const displayPrice = selectedVariant?.price ?? product.price;
  const rating = Number(product.averageRating || 0);
  const galleryImages = [...new Set([
    selectedVariant?.imageUrl,
    product.imageUrl,
    ...(product.imageUrls || []),
    ...(product.variants || []).map((variant) => variant.imageUrl),
  ].filter(Boolean))];
  const changeGalleryImage = (direction) => {
    if (galleryImages.length < 2) return;
    const currentIndex = Math.max(0, galleryImages.indexOf(activeImage));
    const nextIndex = (currentIndex + direction + galleryImages.length) % galleryImages.length;
    setActiveImage(galleryImages[nextIndex]);
  };

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
              {activeImage ? <img src={assetUrl(activeImage)} alt={product.name} /> : <ShoppingBag size={72} />}
              {galleryImages.length > 1 && (
                <>
                  <button className="gallery-arrow previous" type="button" onClick={() => changeGalleryImage(-1)} aria-label="Ảnh trước"><ChevronLeft size={23} /></button>
                  <button className="gallery-arrow next" type="button" onClick={() => changeGalleryImage(1)} aria-label="Ảnh tiếp theo"><ChevronRight size={23} /></button>
                </>
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
            <div className="product-title-block">
              <span className="detail-category">{product.categoryName || 'Sản phẩm'}</span>
              <h1>{product.name}</h1>
              <div className="detail-rating-row">
                <strong>{rating.toFixed(1)}</strong>
                <RatingStars value={rating} />
                <span className="rating-divider" />
                <span><b>{product.reviewCount || 0}</b> đánh giá</span>
                <span className="rating-divider" />
                <span><b>{product.salesCount || 0}</b> đã bán</span>
              </div>
            </div>

            <div className="detail-price-panel">
              <strong className="detail-price">{currency(displayPrice)}</strong>
              <span>Giá đã bao gồm VAT</span>
            </div>

            <div className="purchase-service-list">
              <div>
                <span>Vận chuyển</span>
                <p><Truck size={19} /><strong>Giao hàng toàn quốc</strong><small>Phí vận chuyển được tính khi đặt hàng</small></p>
              </div>
              <div>
                <span>An tâm mua sắm</span>
                <p><ShieldCheck size={19} /><strong>Đổi trả trong 15 ngày</strong><small>Sản phẩm chính hãng, hỗ trợ sau mua</small></p>
              </div>
            </div>

            {(product.brand || Number(product.warrantyMonths) > 0) && (
              <div className="product-attributes">
                {product.brand && <div><span>Thương hiệu</span><strong>{product.brand}</strong></div>}
                {Number(product.warrantyMonths) > 0 && <div><span>Bảo hành</span><strong>{product.warrantyMonths} tháng</strong></div>}
              </div>
            )}

            {product.variants?.length > 0 ? (
              <div className="product-variant-options">
                {variantAttributeGroups.map((group) => (
                  <div className="purchase-option-row product-variant-picker" key={group.name}>
                    <label>{group.name}</label>
                    <div>{group.values.map((value) => {
                      const isColor = group.name.toLowerCase().includes('màu') || group.name.toLowerCase() === 'color';
                      const selected = selectedVariant?.attributes?.[group.name] === value;
                      const available = activeVariants.some((variant) => variant.attributes?.[group.name] === value && Number(variant.stockQuantity) > 0);
                      return <button className={selected ? 'selected' : ''} type="button" key={value} disabled={!available} onClick={() => selectVariantAttribute(group.name, value)}>
                        {isColor && <i style={{ backgroundColor: colorSwatch(value) }} />}
                        <span>{value}</span>
                        {selected && <Check size={12} />}
                      </button>;
                    })}</div>
                  </div>
                ))}
                <small className="variant-selection-summary">{variantLabel(selectedVariant)} · SKU {selectedVariant?.sku}</small>
              </div>
            ) : product.colors?.length > 0 && (
              <div className="purchase-option-row product-color-picker">
                <label>Màu sắc</label>
                <div>{product.colors.map((color) => <button className={selectedColor === color ? 'selected' : ''} type="button" key={color} onClick={() => setSelectedColor(color)}><i style={{ backgroundColor: colorSwatch(color) }} /> {color}{selectedColor === color && <Check size={13} />}</button>)}</div>
              </div>
            )}

            <div className="purchase-option-row quantity-row">
              <label>Số lượng</label>
              <div className="quantity-control" aria-label="Số lượng">
                <button type="button" disabled={quantity <= 1 || submitting} onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Giảm số lượng"><Minus size={17} /></button>
                <span>{quantity}</span>
                <button type="button" disabled={quantity >= stock || submitting} onClick={() => setQuantity((value) => Math.min(Math.max(stock, 1), value + 1))} aria-label="Tăng số lượng"><Plus size={17} /></button>
              </div>
              <span className={`stock-status ${stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                {stock > 0 ? `${stock} sản phẩm có sẵn` : 'Tạm hết hàng'}
              </span>
            </div>

            <div className="purchase-actions">
              <button className="detail-cart-button" type="button" onClick={() => handlePurchase('cart')} disabled={stock <= 0 || submitting}>
                <ShoppingBag size={19} /> Thêm vào giỏ hàng
              </button>
              <button className="detail-buy-button" type="button" onClick={() => handlePurchase('buy')} disabled={stock <= 0 || submitting}>
                <CreditCard size={19} /> Mua ngay
              </button>
              <button className={`detail-like-button ${product.likedByCurrentUser ? 'liked' : ''}`} type="button" onClick={handleToggleLike} aria-label={product.likedByCurrentUser ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} title={product.likedByCurrentUser ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}>
                <Heart size={20} fill={product.likedByCurrentUser ? 'currentColor' : 'none'} />
              </button>
            </div>

            <p className="detail-description"><strong>Mô tả sản phẩm</strong>{product.description || 'Sản phẩm chính hãng với chất lượng được tuyển chọn.'}</p>
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
