import { ArrowLeft, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <section>
        <div className="not-found-code" aria-hidden="true"><span>4</span><i><Search size={42} /></i><span>4</span></div>
        <p className="not-found-label">Không tìm thấy trang</p>
        <h1>Đường dẫn này không tồn tại</h1>
        <p className="not-found-copy">Trang có thể đã được di chuyển, đổi tên hoặc đường dẫn bạn nhập chưa chính xác.</p>
        <div className="not-found-actions">
          <button type="button" onClick={() => window.history.back()}><ArrowLeft size={17} /> Quay lại</button>
          <Link to="/"><Home size={17} /> Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
