'use client';

import { useEffect } from 'react';

/**
 * Keeps the art on the page: no "Save image as" menu or drag-out on images,
 * the map and the 3D view. Text stays selectable and links keep their menu.
 * A deterrent, not DRM: anything a browser shows can be captured.
 */
export function AssetGuard() {
  useEffect(() => {
    const art = (t: EventTarget | null) => t instanceof Element && Boolean(t.closest('img, canvas, video, picture, svg image, .maplibregl-map, [data-art]')) && !(t instanceof Element && t.closest('a[download]'));
    const block = (e: Event) => {
      if (art(e.target)) e.preventDefault();
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('dragstart', block);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('dragstart', block);
    };
  }, []);
  return null;
}
