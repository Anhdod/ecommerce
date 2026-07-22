import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

const pageRange = (page, totalPages) => {
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const end = Math.min(totalPages, start + 5);
  return Array.from({ length: end - start }, (_, index) => start + index);
};

export default function Pagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  onPageChange,
  label = 'mục',
  className = '',
  scrollTargetId,
}) {
  if (totalPages <= 1) return null;

  const changePage = (nextPage) => {
    if (nextPage < 0 || nextPage >= totalPages || nextPage === page) return;
    onPageChange(nextPage);
    if (scrollTargetId) {
      document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className={`app-pagination ${className}`.trim()} aria-label="Phân trang">
      <p>Hiển thị <strong>{from}-{to}</strong> trong {totalItems} {label}</p>
      <div>
        <button type="button" onClick={() => changePage(page - 1)} disabled={page === 0} title="Trang trước" aria-label="Trang trước">
          <ChevronLeft size={16} />
        </button>
        {pageRange(page, totalPages).map((pageNumber) => (
          <button
            type="button"
            className={pageNumber === page ? 'active' : ''}
            onClick={() => changePage(pageNumber)}
            aria-current={pageNumber === page ? 'page' : undefined}
            key={pageNumber}
          >
            {pageNumber + 1}
          </button>
        ))}
        <button type="button" onClick={() => changePage(page + 1)} disabled={page === totalPages - 1} title="Trang sau" aria-label="Trang sau">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
