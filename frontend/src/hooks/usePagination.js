import { useEffect, useMemo, useState } from 'react';

export default function usePagination(items = [], pageSize = 10, resetKey = '') {
  const [page, setPage] = useState(0);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = page * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageItems,
    totalItems,
    totalPages,
    from: totalItems ? page * pageSize + 1 : 0,
    to: Math.min((page + 1) * pageSize, totalItems),
  };
}
