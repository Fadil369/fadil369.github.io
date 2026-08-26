import { useEffect } from 'react';
import { applyPageMeta, PageMeta } from '../lib/pageMeta';

/** Keep document.title + OG/Twitter/canonical in sync with the current page. */
export function usePageMeta(meta: PageMeta | null) {
  useEffect(() => {
    if (meta) applyPageMeta(meta);
  }, [
    meta?.title,
    meta?.description,
    meta?.image,
    meta?.url,
    meta?.type,
  ]);
}
