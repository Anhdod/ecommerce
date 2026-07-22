import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Eye, EyeOff, Image as ImageIcon, MessageSquareText, Moon, RefreshCw, Search, Star, Sun, Trash2, X } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import api, { assetUrl } from '../../api';
import usePagination from '../../hooks/usePagination';
import './AdminReviewsPage.css';

const formatDate = (value) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Chưa rõ';

export default function AdminReviewsPage({ user }) {
  const [reviews, setReviews] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const showMessage = (text, type = 'success') => { window.clearTimeout(messageTimer.current); setMessage({ text, type }); messageTimer.current = window.setTimeout(() => setMessage(null), 4000); };
  const loadReviews = async () => {
    try {
      setLoading(true);
      const [reviewsResult, productsResult] = await Promise.all([api('/api/products/reviews?page=0&size=1000'), api('/api/products?page=0&size=1000&sort=nameAsc')]);
      const nextReviews = Array.isArray(reviewsResult.data?.content) ? reviewsResult.data.content : [];
      const products = Array.isArray(productsResult.data?.content) ? productsResult.data.content : [];
      setReviews(nextReviews);
      setProductNames(Object.fromEntries(products.map((product) => [product.id, product.name])));
    } catch (error) { showMessage(error?.message || 'Không tải được danh sách đánh giá.', 'error'); }
    finally { setLoading(false); }
  };

  const stats = useMemo(() => ({
    total: reviews.length,
    visible: reviews.filter((review) => !review.hidden).length,
    hidden: reviews.filter((review) => review.hidden).length,
    average: reviews.length ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1) : '0.0',
  }), [reviews]);
  const visibleReviews = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return reviews.filter((review) => {
      const productName = productNames[review.productId] || '';
      const matchesSearch = !keyword || review.username?.toLowerCase().includes(keyword) || review.fullName?.toLowerCase().includes(keyword) || review.comment?.toLowerCase().includes(keyword) || productName.toLowerCase().includes(keyword);
      const matchesRating = ratingFilter === 'all' || Number(review.rating) === Number(ratingFilter);
      const matchesVisibility = visibilityFilter === 'all' || (visibilityFilter === 'hidden' ? review.hidden : !review.hidden);
      return matchesSearch && matchesRating && matchesVisibility;
    });
  }, [productNames, ratingFilter, reviews, search, visibilityFilter]);
  const reviewPagination = usePagination(visibleReviews, 10, `${search}|${ratingFilter}|${visibilityFilter}`);

  const setHidden = async (review, hidden) => {
    try { setBusyId(review.id); await api(`/api/products/reviews/${review.id}/hidden?hidden=${hidden}`, { method: 'PUT' }); showMessage(hidden ? 'Đã ẩn đánh giá.' : 'Đã hiển thị đánh giá.'); await loadReviews(); }
    catch (error) { showMessage(error?.message || 'Không thể cập nhật đánh giá.', 'error'); }
    finally { setBusyId(null); }
  };
  const deleteReview = async (review) => {
    if (!window.confirm(`Xóa đánh giá của ${review.fullName || review.username}?`)) return;
    try { setBusyId(review.id); await api(`/api/products/reviews/${review.id}`, { method: 'DELETE' }); showMessage('Đã xóa đánh giá.'); await loadReviews(); }
    catch (error) { showMessage(error?.message || 'Không thể xóa đánh giá.', 'error'); }
    finally { setBusyId(null); }
  };
  const toggleTheme = () => setTheme((current) => { const next = current === 'light' ? 'dark' : 'light'; localStorage.setItem('adminTheme', next); return next; });
  useEffect(() => { if (canManage) loadReviews(); return () => window.clearTimeout(messageTimer.current); }, [user]);

  if (!canManage) return <main className="admin-reviews-access"><section><span><MessageSquareText size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể kiểm duyệt đánh giá.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;

  return <main className={`admin-reviews-shell admin-theme-${theme}`}>
    <AdminSidebar user={user} />
    <div className="admin-reviews-content">
      <header className="admin-reviews-topbar"><div><span>Quản trị / Nội dung</span><h1>Đánh giá</h1></div><button className="admin-review-icon-button" type="button" onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button></header>
      <div className="admin-reviews-inner">
        <section className="admin-reviews-heading"><div><h2>Kiểm duyệt đánh giá</h2><p>Theo dõi phản hồi khách hàng và xử lý nội dung không phù hợp.</p></div><button type="button" onClick={loadReviews} disabled={loading}><RefreshCw size={16} className={loading ? 'admin-review-spinning' : ''} /> Làm mới</button></section>
        <section className="admin-review-stats"><article><span><MessageSquareText size={18} /></span><div><strong>{stats.total}</strong><small>Tổng đánh giá</small></div></article><article><span className="visible"><Eye size={18} /></span><div><strong>{stats.visible}</strong><small>Đang hiển thị</small></div></article><article><span className="hidden"><EyeOff size={18} /></span><div><strong>{stats.hidden}</strong><small>Đã ẩn</small></div></article><article><span className="rating"><Star size={18} /></span><div><strong>{stats.average}</strong><small>Điểm trung bình</small></div></article></section>
        <section className="admin-reviews-panel">
          <div className="admin-reviews-toolbar"><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm khách hàng, sản phẩm hoặc nội dung..." /></label><div><select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)}><option value="all">Tất cả số sao</option>{[5,4,3,2,1].map((rating) => <option value={rating} key={rating}>{rating} sao</option>)}</select><select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option></select></div></div>
          {loading && !reviews.length ? <div className="admin-reviews-loading"><span /><span /><span /><span /></div> : visibleReviews.length ? <div className="admin-reviews-table-wrap"><table className="admin-reviews-table"><thead><tr><th>Khách hàng</th><th>Sản phẩm</th><th>Đánh giá</th><th>Nội dung</th><th>Ảnh</th><th>Ngày gửi</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead><tbody>{reviewPagination.pageItems.map((review) => <tr key={review.id}><td><div className="admin-review-user"><span>{(review.fullName || review.username || 'U').charAt(0).toUpperCase()}</span><div><strong>{review.fullName || review.username}</strong><small>@{review.username}</small></div></div></td><td><Link className="admin-review-product" to={`/products/${review.productId}`}>{productNames[review.productId] || `Sản phẩm #${review.productId}`}</Link></td><td><div className="admin-review-rating">{[1,2,3,4,5].map((star) => <Star size={12} fill={star <= review.rating ? 'currentColor' : 'none'} className={star <= review.rating ? 'filled' : ''} key={star} />)}<strong>{review.rating}.0</strong></div></td><td><p className="admin-review-comment">{review.comment || 'Không có nội dung.'}</p></td><td>{review.imageUrl ? <button className="admin-review-image" type="button" onClick={() => setPreviewImage(assetUrl(review.imageUrl))}><img src={assetUrl(review.imageUrl)} alt="Ảnh đánh giá" /></button> : <span className="admin-review-no-image"><ImageIcon size={14} /></span>}</td><td><span className="admin-review-date">{formatDate(review.createdAt)}</span></td><td><span className={`admin-review-status ${review.hidden ? 'hidden' : 'visible'}`}>{review.hidden ? 'Đã ẩn' : 'Hiển thị'}</span></td><td><div className="admin-review-actions"><button type="button" title={review.hidden ? 'Hiện đánh giá' : 'Ẩn đánh giá'} onClick={() => setHidden(review, !review.hidden)} disabled={busyId === review.id}>{review.hidden ? <Eye size={15} /> : <EyeOff size={15} />}</button><button className="delete" type="button" title="Xóa đánh giá" onClick={() => deleteReview(review)} disabled={busyId === review.id}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="admin-reviews-empty"><span><MessageSquareText size={28} /></span><h3>Không tìm thấy đánh giá</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>}
          <Pagination {...reviewPagination} onPageChange={reviewPagination.setPage} label="đánh giá" />
        </section>
      </div>
    </div>
    <AnimatePresence>{previewImage && <motion.button className="admin-review-lightbox" type="button" onClick={() => setPreviewImage(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><span><img src={previewImage} alt="Ảnh đánh giá phóng lớn" /><i><X size={18} /></i></span></motion.button>}</AnimatePresence>
    <AnimatePresence>{message && <motion.div className={`admin-reviews-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
  </main>;
}
