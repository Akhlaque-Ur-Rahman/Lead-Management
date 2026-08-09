import { useCallback, useMemo, useState } from 'react';

export function usePagination<T>(items: T[], initialPageSize = 25) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const safePage = Math.min(currentPage, totalPages - 1);

  const paginatedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

  const setSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  }, []);

  const resetPage = useCallback(() => setCurrentPage(0), []);

  return {
    paginatedItems,
    currentPage: safePage,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize: setSize,
    resetPage,
  };
}
