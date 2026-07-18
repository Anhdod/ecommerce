import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingBag, Star, UserRound } from 'lucide-react';
import api, { assetUrl } from '../api';
import './ProductReviewsPage.css';

const formatDate = (value) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

function RatingStars({ value, size = 16 }) {
  const rating = Number(value || 0);
  return (
    <span className="all-review-stars" aria-label={`${rating} trên 5 sao`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star key={index} size={size} fill={index < Math.round(rating) ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

export default function ProductReviewsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [productResult, reviewResult] = await Promise.all([
          api(`/api/products/${id}`),
          api(`/api/products/${id}/reviews?page=${page}&size=8`),
        ]);
        setProduct(productResult.data);
        setReviews(reviewResult.data?.content || []);
        setTotalPages(Number(reviewResult.data?.totalPages || 0));
        setTotalElements(Number(reviewResult.data?.totalElements || 0));
      } catch (requestError) {
        setError(requestError?.message || 'Không tải được đánh giá sản phẩm');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, page]);

  return (
    <main className="product-reviews-page">
      <div className="product-reviews-container">
        <Link className="all-reviews-back" to={`/products/${id}`}><ArrowLeft size={16} /> Quay lại sản phẩm</Link>

        {product && (
          <header className="all-reviews-header">
            <div className="all-reviews-product">
              <span>{product.imageUrl ? <img src={assetUrl(product.imageUrl)} alt={product.name} /> : <ShoppingBag size={30} />}</span>
              <div><small>Đánh giá sản phẩm</small><h1>{product.name}</h1><p>{totalElements} đánh giá từ khách hàng</p></div>
            </div>
            <div className="all-reviews-score"><strong>{Number(product.averageRating || 0).toFixed(1)}</strong><RatingStars value={product.averageRating} size={19} /><span>Điểm trung bình</span></div>
          </header>
        )}

        {loading ? (
          <div className="all-reviews-loading">{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
        ) : error ? (
          <section className="all-reviews-empty"><Star size={28} /><strong>Không thể hiển thị đánh giá</strong><span>{error}</span></section>
        ) : reviews.length ? (
          <section className="all-reviews-list">
            {reviews.map((review) => (
              <article className="all-review-item" key={review.id}>
                <header><span><UserRound size={18} /></span><div><strong>{review.fullName || review.username}</strong><small>{formatDate(review.createdAt)}</small></div><RatingStars value={review.rating} /></header>
                <p>{review.comment}</p>
                {review.imageUrl && <img src={assetUrl(review.imageUrl)} alt="Ảnh đánh giá" />}
              </article>
            ))}
          </section>
        ) : (
          <section className="all-reviews-empty"><Star size={28} /><strong>Chưa có đánh giá</strong><span>Chưa có khách hàng nào chia sẻ trải nghiệm.</span></section>
        )}

        {totalPages > 1 && (
          <nav className="all-reviews-pagination" aria-label="Phân trang đánh giá">
            <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}><ChevronLeft size={17} /> Trang trước</button>
            <span>Trang {page + 1}/{totalPages}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page + 1 >= totalPages}>Trang sau <ChevronRight size={17} /></button>
          </nav>
        )}
      </div>
    </main>
  );
}
