import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Client-side pagination. Pass `resetKey` (e.g. filter signature) to jump back to page 0
 * when filters change — do NOT call resetPage from an effect that lists resetPage itself.
 */
export function usePagination<T>(
  items: T[],
  initialPageSize = 25,
  resetKey: string | number = '',
) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPagesRef = useRef(1);

  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  totalPagesRef.current = totalPages;

  // Clamp if items shrink (e.g. filter) without forcing page 0 on every data refresh
  const safePage = Math.min(currentPage, totalPages - 1);

  const paginatedItems = useMemo(() => {
    const start = safePage * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  // Reset only when the caller’s filter key changes — not when item count flickers
  const prevResetKey = useRef(resetKey);
  useEffect(() => {
    if (prevResetKey.current === resetKey) return;
    prevResetKey.current = resetKey;
    setCurrentPage(0);
  }, [resetKey]);

  const setPage = useCallback((page: number) => {
    const max = totalPagesRef.current - 1;
    setCurrentPage(Math.max(0, Math.min(page, max)));
  }, []);

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
