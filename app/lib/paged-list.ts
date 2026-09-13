import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Keyset pagination against a list the prototype already holds in memory.
 *
 * `PRODUCT_ARCH_V0.md` §3 and every list response in `openapi.json` page by
 * cursor, not by offset, and return `next_cursor: null` at the end. Rendering
 * every row at once hid the states that matter: a page boundary, a failed next
 * page, and a filter change while a later page is on screen.
 *
 * The rules this enforces, which are the ones a real cursor API also has to:
 *
 * - Rows already on screen never move or disappear when the next page arrives.
 * - A row is never shown twice, even if the underlying list shifts underneath.
 * - Changing the filters starts a new list rather than appending to the old one.
 * - The end of the list is stated once, and only when there is no next cursor.
 */
export type PagedList<T> = {
  /** Everything loaded so far, in order. */
  rows: T[];
  /** Null once the list is exhausted, mirroring the API's `next_cursor`. */
  nextCursor: string | null;
  /** True while a next page is in flight. */
  loading: boolean;
  /** Set when the last next-page attempt failed; retrying clears it. */
  error: string | null;
  loadMore: () => void;
  retry: () => void;
  /** Total rows behind the cursor, for "showing X of Y" copy. */
  total: number;
};

export function usePagedList<T>(
  all: T[],
  keyOf: (row: T) => string,
  options: {
    pageSize?: number;
    /**
     * Restarts paging when it changes: a new filter is a new list, not more of
     * the current one.
     */
    resetKey?: string;
    /** Makes the next page fail once, for the retry state. */
    failNext?: boolean;
  } = {},
): PagedList<T> {
  const { pageSize = 8, resetKey = "", failNext = false } = options;
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // A filter change is a new list. Reset before rendering the next frame so a
  // stale page count never briefly shows rows from the previous filter.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the identity of the filter set, which is exactly what should restart paging.
  useEffect(() => {
    setPages(1);
    setError(null);
    setLoading(false);
  }, [resetKey]);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const row of all.slice(0, pages * pageSize)) {
      const key = keyOf(row);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }, [all, pages, pageSize, keyOf]);

  const nextCursor =
    rows.length < all.length ? `after:${keyOf(all[rows.length - 1] ?? all[0])}` : null;

  const request = () => {
    if (loading || !nextCursor) return;
    setLoading(true);
    setError(null);
    timer.current = window.setTimeout(() => {
      setLoading(false);
      if (failNext) {
        setError("We couldn't load the next page. Nothing already shown was lost.");
        return;
      }
      setPages((value) => value + 1);
    }, 350);
  };

  return {
    rows,
    nextCursor,
    loading,
    error,
    total: all.length,
    loadMore: request,
    retry: () => {
      setError(null);
      request();
    },
  };
}
