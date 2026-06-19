import { useEffect, useState } from 'react';
import api, { assetUrl } from '../api';

export default function AdminReviewsPage({ user }) {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadReviews = async () => {
    try {
      const result = await api('/api/products/reviews?page=0&size=100');
      setReviews(result.data?.content || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load reviews');
    }
  };

  const setHidden = async (reviewId, hidden) => {
    try {
      await api(`/api/products/reviews/${reviewId}/hidden?hidden=${hidden}`, { method: 'PUT' });
      showMessage(hidden ? 'Review hidden' : 'Review visible');
      loadReviews();
    } catch (error) {
      showMessage(error?.message || 'Cannot update review');
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await api(`/api/products/reviews/${reviewId}`, { method: 'DELETE' });
      showMessage('Review deleted');
      loadReviews();
    } catch (error) {
      showMessage(error?.message || 'Cannot delete review');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadReviews();
    }
  }, [user]);

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Review Moderation</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="card-header">
          <h2>Review Moderation</h2>
          <button className="small" onClick={loadReviews}>Refresh</button>
        </div>

        <div className="table-list">
          {reviews.map((review) => (
            <article className="card compact-card" key={review.id}>
              <div className="card-header">
                <div>
                  <h3>{review.fullName || review.username}</h3>
                  <span className="muted">Product #{review.productId}</span>
                </div>
                <div className="tag-group">
                  <span className="tag">{review.rating} / 5</span>
                  <span className={`tag ${review.hidden ? 'danger-tag' : 'success-tag'}`}>
                    {review.hidden ? 'Hidden' : 'Visible'}
                  </span>
                </div>
              </div>
              <p>{review.comment}</p>
              {review.imageUrl && <img className="review-image" src={assetUrl(review.imageUrl)} alt="Review attachment" />}
              <small className="muted">{review.createdAt ? new Date(review.createdAt).toLocaleString() : ''}</small>
              <div className="row-actions">
                {review.hidden ? (
                  <button className="small" onClick={() => setHidden(review.id, false)}>Show</button>
                ) : (
                  <button className="small" onClick={() => setHidden(review.id, true)}>Hide</button>
                )}
                <button className="small danger" onClick={() => deleteReview(review.id)}>Delete</button>
              </div>
            </article>
          ))}
          {!reviews.length && <p>No reviews found.</p>}
        </div>

        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
