import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Single-page apps keep the scroll position between pages by default.
// This scrolls to the top on every new page, or to an element when the URL
// has a hash (for example "/#latest").
export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
