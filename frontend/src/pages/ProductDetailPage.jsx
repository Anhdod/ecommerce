import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { assetUrl } from '../api';

const currency = (value) => Number(value || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

export default function ProductDetailPage({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const canModerate = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewImage, setReviewImage] = useState(null);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadProduct = async () => {
    try {
      const result = await api(`/api/products/${id}`);
      setProduct(result.data);
    } catch (error) {
      showMessage(error?.message || 'Khong tai duoc san pham');
    }
  };

  const loadReviews = async () => {
    try {
      const path = canModerate
        ? `/api/products/${id}/reviews/admin?page=0&size=100`
        : `/api/products/${id}/reviews`;
      const result = await api(path);
      setReviews(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Khong tai duoc danh gia');
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      showMessage('Dang nhap de them vao gio hang');
      return;
    }
    try {
      await api(`/api/cart/add/${id}?quantity=1`, { method: 'POST' });
      showMessage('Da them vao gio hang');
      navigate('/cart');
    } catch (error) {
      showMessage(error?.message || 'Khong them duoc san pham vao gio hang');
    }
  };

  const handleToggleLike = async () => {
    if (!user) {
      showMessage('Dang nhap de like san pham');
      return;
    }
    try {
      await api(`/api/products/${id}/like`, { method: 'POST' });
      showMessage('Cap nhat luot thich thanh cong');
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Khong the like san pham');
    }
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      showMessage('Dang nhap de nhan xet');
      return;
    }

    try {
      await api(`/api/products/${id}/reviews`, {
        method: 'POST',
        body: reviewForm,
      });
      if (reviewImage) {
        const formData = new FormData();
        formData.append('file', reviewImage);
        await api(`/api/products/${id}/reviews/image`, {
          method: 'POST',
          body: formData,
        });
      }
      showMessage('Da gui danh gia');
      setReviewForm({ rating: 5, comment: '' });
      setReviewImage(null);
      loadReviews();
    } catch (error) {
      showMessage(error?.message || 'Khong gui duoc danh gia');
    }
  };

  const setReviewHidden = async (reviewId, hidden) => {
    try {
      await api(`/api/products/reviews/${reviewId}/hidden?hidden=${hidden}`, { method: 'PUT' });
      showMessage(hidden ? 'Review hidden' : 'Review visible');
      loadReviews();
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Khong cap nhat duoc review');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api(`/api/products/reviews/${reviewId}`, { method: 'DELETE' });
      showMessage('Review deleted');
      loadReviews();
      loadProduct();
    } catch (error) {
      showMessage(error?.message || 'Khong xoa duoc review');
    }
  };

  useEffect(() => {
    loadProduct();
    loadReviews();
  }, [id, canModerate]);

  if (!product) {
    return (
      <main className="page-shell">
        <section className="panel">Loading product...</section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="product-detail-header">
          <div>
            <h2>{product.name}</h2>
            <p className="muted">{product.categoryName}</p>
            <p>{product.description}</p>
          </div>
          <div className="product-meta">
            <p>
              <strong>{currency(product.price)}</strong>
            </p>
            <p>Stock: {product.stockQuantity}</p>
            <p>Rating: {product.averageRating?.toFixed(1) || 0} / 5</p>
            <p>Likes: {product.likeCount || 0}</p>
            <button onClick={handleAddToCart}>Add to cart</button>
            <button className="small" onClick={handleToggleLike}>
              {product.isLikedByCurrentUser ? 'Unlike' : 'Like'}
            </button>
          </div>
        </div>

        {product.imageUrl && <img className="product-image-large" src={assetUrl(product.imageUrl)} alt={product.name} />}

        <div className="review-section">
          <div className="card-header">
            <h3>Reviews</h3>
            {canModerate && <span className="tag">Admin view: includes hidden</span>}
          </div>
          <form onSubmit={handleReviewSubmit} className="review-form">
            <label>
              Rating
              <select
                value={reviewForm.rating}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Comment
              <textarea
                value={reviewForm.comment}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
              />
            </label>
            <label>
              Review image
              <input type="file" accept="image/*" onChange={(event) => setReviewImage(event.target.files?.[0] || null)} />
            </label>
            <button type="submit">Send review</button>
          </form>

          {reviews.length ? (
            <div className="review-list">
              {reviews.map((review) => (
                <div className={`card ${review.hidden ? 'muted-card' : ''}`} key={review.id}>
                  <div className="card-header">
                    <strong>{review.fullName || review.username}</strong>
                    <div className="tag-group">
                      <span className="tag">{review.rating} / 5</span>
                      {canModerate && (
                        <span className={`tag ${review.hidden ? 'danger-tag' : 'success-tag'}`}>
                          {review.hidden ? 'Hidden' : 'Visible'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p>{review.comment}</p>
                  {review.imageUrl && (
                    <img className="review-image" src={assetUrl(review.imageUrl)} alt="Review attachment" />
                  )}
                  {canModerate && (
                    <div className="row-actions">
                      {review.hidden ? (
                        <button className="small" onClick={() => setReviewHidden(review.id, false)}>
                          Show
                        </button>
                      ) : (
                        <button className="small" onClick={() => setReviewHidden(review.id, true)}>
                          Hide
                        </button>
                      )}
                      <button className="small danger" onClick={() => deleteReview(review.id)}>
                        Delete
                      </button>
                    </div>
                  )}
                  <small className="muted">{review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>No reviews yet.</p>
          )}
        </div>

        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
